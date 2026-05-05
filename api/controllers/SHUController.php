<?php
// SHU Controller
authCheck();
$db = Database::getInstance();

switch ($method) {
    case 'GET':
        if ($id === 'preview') {
            checkPermission('keuangan.laba_rugi');
            $tahun = $params['tahun'] ?? date('Y');
            $totalProfit = $params['total_profit'] ?? 0;
            $persenModal = $params['persen_modal'] ?? 40;
            $persenAnggota = $params['persen_anggota'] ?? 40;
            $paguSHU = $params['pagu_shu'] ?? $totalProfit;

            $cacheKey = "shu_preview_{$tahun}_{$totalProfit}_{$persenModal}_{$persenAnggota}_{$paguSHU}";
            $response = getCachedData($cacheKey, function() use ($db, $tahun, $totalProfit, $persenModal, $persenAnggota, $paguSHU) {
                // 1. Get total savings per member as "Jasa Modal" base
                $modalData = $db->fetchAll(
                    "SELECT a.id as anggota_id, a.nama as anggota_nama, a.no_anggota,
                            IFNULL(SUM(CASE WHEN kts.dk = 'D' THEN s.jumlah ELSE -s.jumlah END), 0) as total_simpanan
                    FROM anggota a
                    LEFT JOIN simpanan s ON a.id = s.anggota_id
                    LEFT JOIN kode_transaksi_simpanan kts ON s.kode_transaksi_id = kts.id
                    WHERE a.status = 'aktif'
                    GROUP BY a.id"
                );

                // 2. Get total loan interest paid per member as "Jasa Anggota" base
                $jasaData = $db->fetchAll(
                    "SELECT p.anggota_id, SUM(an.bunga) as total_jasa_paid
                    FROM angsuran an
                    JOIN pinjaman p ON an.pinjaman_id = p.id
                    WHERE an.status IN ('lunas', 'terlambat') AND YEAR(an.tgl_bayar) = ?
                    GROUP BY p.anggota_id",
                    [$tahun]
                );

                // Map jasa data for easy lookup
                $jasaLookup = [];
                foreach ($jasaData as $jd) {
                    $jasaLookup[$jd['anggota_id']] = (float) $jd['total_jasa_paid'];
                }

                $totalSimpananAll = array_sum(array_column($modalData, 'total_simpanan'));
                $totalJasaAll = array_sum(array_column($jasaData, 'total_jasa_paid'));

                $paguJasaModal = $paguSHU * ($persenModal / 100);
                $paguJasaAnggota = $paguSHU * ($persenAnggota / 100);

                $results = [];
                foreach ($modalData as $row) {
                    $anggotaId = $row['anggota_id'];
                    $simpanan = (float) $row['total_simpanan'];
                    $jasaPaid = $jasaLookup[$anggotaId] ?? 0;

                    $bagianModal = $totalSimpananAll > 0 ? ($simpanan / $totalSimpananAll) * $paguJasaModal : 0;
                    $bagianJasa = $totalJasaAll > 0 ? ($jasaPaid / $totalJasaAll) * $paguJasaAnggota : 0;

                    $results[] = [
                        'anggota_id' => $anggotaId,
                        'no_anggota' => $row['no_anggota'],
                        'anggota_nama' => $row['anggota_nama'],
                        'simpanan_total' => $simpanan,
                        'jasa_pinjaman_total' => $jasaPaid,
                        'bagian_jasa_modal' => round($bagianModal, 2),
                        'bagian_jasa_anggota' => round($bagianJasa, 2),
                        'total_shu' => round($bagianModal + $bagianJasa, 2)
                    ];
                }

                return [
                    'tahun' => $tahun,
                    'summary' => [
                        'total_profit' => $totalProfit,
                        'pagu_shu' => $paguSHU,
                        'total_jasa_modal' => $paguJasaModal,
                        'total_jasa_anggota' => $paguJasaAnggota,
                        'basis_simpanan' => $totalSimpananAll,
                        'basis_jasa' => $totalJasaAll
                    ],
                    'details' => $results
                ];
            });
            successResponse($response);
        }
        break;

    case 'POST':
        if ($id === 'proses') {
            checkPermission('keuangan.laba_rugi');
            $data = $params;

            if (empty($data['tahun']) || empty($data['details'])) {
                errorResponse('Data tidak lengkap');
            }

            $db->beginTransaction();
            try {
                // Save summary
                $shuId = $db->insert(
                    "INSERT INTO shu_pembagian (tahun, total_profit, pagu_shu, persen_jasa_modal, persen_jasa_anggota, total_jasa_modal, total_jasa_anggota, created_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                        $data['tahun'],
                        $data['summary']['total_profit'],
                        $data['summary']['pagu_shu'],
                        $data['persen_modal'],
                        $data['persen_anggota'],
                        $data['summary']['total_jasa_modal'],
                        $data['summary']['total_jasa_anggota'],
                        $_SESSION['user_id']
                    ]
                );

                // Save details
                foreach ($data['details'] as $det) {
                    $db->execute(
                        "INSERT INTO shu_detail (shu_pembagian_id, anggota_id, simpanan_rata_rata, jasa_pinjaman_total, bagian_jasa_modal, bagian_jasa_anggota, total_shu_diterima, status)
                         VALUES (?, ?, ?, ?, ?, ?, ?, 'proses')",
                        [
                            $shuId,
                            $det['anggota_id'],
                            $det['simpanan_total'],
                            $det['jasa_pinjaman_total'],
                            $det['bagian_jasa_modal'],
                            $det['bagian_jasa_anggota'],
                            $det['total_shu']
                        ]
                    );

                    // Optional: Automatically add to Simpanan Sukarela
                    // We need to find the id of 'Simpanan Sukarela' (usually SS or similar)
                    // and a transaction code for SHU Receipt
                }

                $db->commit();
                successResponse(['message' => 'Pembagian SHU berhasil diproses!']);
            } catch (Exception $e) {
                $db->rollBack();
                errorResponse('Gagal memproses SHU: ' . $e->getMessage());
            }
        }
        break;
}
