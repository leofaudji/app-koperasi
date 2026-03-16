<?php
// Keuangan Controller
authCheck();
$db = Database::getInstance();

switch ($id) {
    case 'jurnal':
        checkPermission('keuangan.jurnal');
        if ($method === 'GET') {
            $dari = $params['dari'] ?? date('Y-m-01');
            $sampai = $params['sampai'] ?? date('Y-m-d');
            $page = $params['page'] ?? 1;
            $perPage = $params['per_page'] ?? PER_PAGE;

            $where = "WHERE j.tgl_transaksi BETWEEN ? AND ?";
            $binds = [$dari, $sampai];

            if (!empty($params['search'])) {
                $where .= " AND (j.no_bukti LIKE ? OR j.keterangan LIKE ?)";
                $binds[] = "%{$params['search']}%";
                $binds[] = "%{$params['search']}%";
            }

            $offset = ($page - 1) * $perPage;
            $total = $db->count("SELECT COUNT(*) FROM jurnal j $where", $binds);

            $jurnals = $db->fetchAll(
                "SELECT j.*, u.nama_lengkap as created_by_nama
                 FROM jurnal j LEFT JOIN users u ON j.created_by = u.id
                 $where ORDER BY j.tgl_transaksi DESC, j.id DESC
                 LIMIT $perPage OFFSET $offset",
                $binds
            );

            // Get details for each jurnal
            foreach ($jurnals as &$jurnal) {
                $jurnal['details'] = $db->fetchAll(
                    "SELECT jd.*, ak.kode as akun_kode, ak.nama as akun_nama
                     FROM jurnal_detail jd JOIN akun ak ON jd.akun_id = ak.id
                     WHERE jd.jurnal_id = ? ORDER BY jd.debit DESC",
                    [$jurnal['id']]
                );
            }

            jsonResponse([
                'success' => true,
                'data' => $jurnals,
                'pagination' => [
                    'page' => (int) $page,
                    'per_page' => (int) $perPage,
                    'total' => (int) $total,
                    'total_pages' => ceil($total / $perPage)
                ]
            ]);
        } elseif ($method === 'POST') {
            // Manual journal entry
            $tgl = $params['tgl_transaksi'] ?? date('Y-m-d');
            $keterangan = $params['keterangan'] ?? '';
            $details = $params['details'] ?? [];

            if (empty($details))
                errorResponse('Detail jurnal wajib diisi');

            $totalDebit = array_sum(array_column($details, 'debit'));
            $totalKredit = array_sum(array_column($details, 'kredit'));

            if (abs($totalDebit - $totalKredit) > 0.01) {
                errorResponse('Total debit harus sama dengan total kredit');
            }

            $db->beginTransaction();
            try {
                $noBukti = generateNo('JRN', 'jurnal', 'no_bukti');
                $jurnalId = $db->insert(
                    "INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, total_debit, total_kredit, created_by)
                     VALUES (?,?,?,'manual',?,?,?)",
                    [$noBukti, $tgl, $keterangan, $totalDebit, $totalKredit, $_SESSION['user_id']]
                );

                foreach ($details as $detail) {
                    $db->execute(
                        "INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit, keterangan) VALUES (?,?,?,?,?)",
                        [$jurnalId, $detail['akun_id'], $detail['debit'] ?? 0, $detail['kredit'] ?? 0, $detail['keterangan'] ?? '']
                    );
                }

                $db->commit();
                successResponse(['id' => $jurnalId, 'no_bukti' => $noBukti], 'Jurnal berhasil dibuat', 201);
            } catch (Exception $e) {
                $db->rollBack();
                errorResponse('Gagal membuat jurnal: ' . $e->getMessage());
            }
        }
        break;

    case 'buku-besar':
        checkPermission('keuangan.buku_besar');
        $akunId = $action ?? ($params['akun_id'] ?? '');
        $dari = $params['dari'] ?? date('Y-m-01');
        $sampai = $params['sampai'] ?? date('Y-m-d');

        if (empty($akunId)) {
            // List all accounts with saldo
            $akuns = $db->fetchAll(
                "SELECT ak.*, 
                    COALESCE(SUM(jd.debit),0) as total_debit,
                    COALESCE(SUM(jd.kredit),0) as total_kredit,
                    CASE WHEN ak.saldo_normal='D' 
                        THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0)
                        ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0)
                    END as saldo
                 FROM akun ak
                 LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id
                 LEFT JOIN jurnal j ON jd.jurnal_id = j.id AND j.tgl_transaksi BETWEEN ? AND ?
                 WHERE ak.is_active = 1
                 GROUP BY ak.id ORDER BY ak.kode",
                [$dari, $sampai]
            );
            successResponse($akuns);
        } else {
            $akun = $db->fetch("SELECT * FROM akun WHERE id = ?", [$akunId]);
            if (!$akun)
                errorResponse('Akun tidak ditemukan', 404);

            $details = $db->fetchAll(
                "SELECT j.tgl_transaksi, j.no_bukti, j.keterangan, jd.debit, jd.kredit
                 FROM jurnal_detail jd
                 JOIN jurnal j ON jd.jurnal_id = j.id
                 WHERE jd.akun_id = ? AND j.tgl_transaksi BETWEEN ? AND ?
                 ORDER BY j.tgl_transaksi, j.id",
                [$akunId, $dari, $sampai]
            );

            // Calculate running balance
            $saldo = 0;
            foreach ($details as &$row) {
                if ($akun['saldo_normal'] === 'D') {
                    $saldo += $row['debit'] - $row['kredit'];
                } else {
                    $saldo += $row['kredit'] - $row['debit'];
                }
                $row['saldo'] = $saldo;
            }

            successResponse(['akun' => $akun, 'details' => $details, 'saldo_akhir' => $saldo]);
        }
        break;

    case 'neraca':
        checkPermission('keuangan.neraca');
        $tgl = $params['tanggal'] ?? date('Y-m-d');
        $mode = $params['mode'] ?? 'sesudah';
        $modeFilter = ($mode === 'sebelum') ? "AND j.ref_tipe != 'akhir_tahun'" : '';

        $akuns = $db->fetchAll(
            "SELECT ak.kode, ak.nama, ak.tipe, ak.saldo_normal,
                CASE WHEN ak.saldo_normal='D' 
                    THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0)
                    ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0)
                END as saldo
             FROM akun ak
             LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id
             LEFT JOIN jurnal j ON jd.jurnal_id = j.id AND j.tgl_transaksi <= ? $modeFilter
             WHERE ak.is_active = 1 AND ak.tipe IN ('aset','kewajiban','modal')
             GROUP BY ak.id ORDER BY ak.kode",
            [$tgl]
        );

        $aset = array_filter($akuns, fn($a) => $a['tipe'] === 'aset');
        $kewajiban = array_filter($akuns, fn($a) => $a['tipe'] === 'kewajiban');
        $modal = array_filter($akuns, fn($a) => $a['tipe'] === 'modal');

        $totalAset = array_sum(array_column(array_values($aset), 'saldo'));
        $totalKewajiban = array_sum(array_column(array_values($kewajiban), 'saldo'));
        $totalModal = array_sum(array_column(array_values($modal), 'saldo'));

        // ── Laba/Rugi Berjalan: 1 Januari s/d tanggal neraca ──
        // Query identik dengan endpoint laba-rugi agar nilainya selalu sama
        $tahunNeraca = date('Y', strtotime($tgl));
        $tglAwalTahun = $tahunNeraca . '-01-01';

        $lrAkuns = $db->fetchAll(
            "SELECT ak.tipe, ak.saldo_normal,
                CASE WHEN ak.saldo_normal='D'
                    THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0)
                    ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0)
                END as saldo
             FROM akun ak
             LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id
             LEFT JOIN jurnal j ON jd.jurnal_id = j.id
                 AND j.tgl_transaksi BETWEEN ? AND ? $modeFilter
             WHERE ak.is_active = 1 AND ak.tipe IN ('pendapatan','beban')
             GROUP BY ak.id",
            [$tglAwalTahun, $tgl]
        );

        $totalPendapatan = 0;
        $totalBeban = 0;
        foreach ($lrAkuns as $lr) {
            if ($lr['tipe'] === 'pendapatan')
                $totalPendapatan += (float) $lr['saldo'];
            if ($lr['tipe'] === 'beban')
                $totalBeban += (float) $lr['saldo'];
        }
        $labaRugiBerjalan = $totalPendapatan - $totalBeban;

        successResponse([
            'tanggal' => $tgl,
            'mode' => $mode,
            'aset' => array_values($aset),
            'kewajiban' => array_values($kewajiban),
            'modal' => array_values($modal),
            'total_aset' => $totalAset,
            'total_kewajiban' => $totalKewajiban,
            'total_modal' => $totalModal,
            'laba_rugi_berjalan' => $labaRugiBerjalan,
            'periode_lr' => ['dari' => $tglAwalTahun, 'sampai' => $tgl],
            'total_pasiva' => $totalKewajiban + $totalModal + $labaRugiBerjalan
        ]);
        break;

    case 'laba-rugi':
        checkPermission('keuangan.laba_rugi');
        $dari = $params['dari'] ?? date('Y-01-01');
        $sampai = $params['sampai'] ?? date('Y-m-d');
        $mode = $params['mode'] ?? 'sesudah'; // 'sebelum' | 'sesudah'
        $modeFilter = ($mode === 'sebelum') ? "AND j.ref_tipe != 'akhir_tahun'" : '';

        $akuns = $db->fetchAll(
            "SELECT ak.kode, ak.nama, ak.tipe, ak.saldo_normal,
                CASE WHEN ak.saldo_normal='D' 
                    THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0)
                    ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0)
                END as saldo
             FROM akun ak
             LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id
             LEFT JOIN jurnal j ON jd.jurnal_id = j.id AND j.tgl_transaksi BETWEEN ? AND ?
             WHERE ak.is_active = 1 AND ak.tipe IN ('pendapatan','beban')
             GROUP BY ak.id ORDER BY ak.kode",
            [$dari, $sampai]
        );

        $pendapatan = array_filter($akuns, fn($a) => $a['tipe'] === 'pendapatan');
        $beban = array_filter($akuns, fn($a) => $a['tipe'] === 'beban');

        $totalPendapatan = array_sum(array_column(array_values($pendapatan), 'saldo'));
        $totalBeban = array_sum(array_column(array_values($beban), 'saldo'));

        successResponse([
            'periode' => ['dari' => $dari, 'sampai' => $sampai],
            'mode' => $mode,
            'pendapatan' => array_values($pendapatan),
            'beban' => array_values($beban),
            'total_pendapatan' => $totalPendapatan,
            'total_beban' => $totalBeban,
            'laba_rugi' => $totalPendapatan - $totalBeban
        ]);
        break;

    case 'akun':
        checkPermission('keuangan.akun');
        if ($method === 'GET') {
            if ($action) {
                $data = $db->fetch("SELECT * FROM akun WHERE id = ?", [$action]);
                if (!$data)
                    errorResponse('Akun tidak ditemukan', 404);
                successResponse($data);
            } else {
                $data = $db->fetchAll("SELECT * FROM akun ORDER BY kode");
                successResponse($data);
            }
        } elseif ($method === 'POST') {
            $kode = $params['kode'] ?? '';
            $nama = $params['nama'] ?? '';
            $tipe = $params['tipe'] ?? '';
            if (empty($kode) || empty($nama) || empty($tipe))
                errorResponse('Kode, nama, dan tipe wajib diisi');

            $exists = $db->count("SELECT COUNT(*) FROM akun WHERE kode = ?", [$kode]);
            if ($exists)
                errorResponse('Kode akun sudah digunakan');

            $saldoNormal = in_array($tipe, ['aset', 'beban']) ? 'D' : 'K';
            $newId = $db->insert(
                "INSERT INTO akun (kode, nama, tipe, saldo_normal) VALUES (?,?,?,?)",
                [$kode, $nama, $tipe, $params['saldo_normal'] ?? $saldoNormal]
            );
            successResponse(['id' => $newId], 'Akun berhasil ditambahkan', 201);
        } elseif ($method === 'PUT') {
            if (!$action)
                errorResponse('ID akun diperlukan');
            $db->execute(
                "UPDATE akun SET nama=?, tipe=?, saldo_normal=?, is_active=? WHERE id=?",
                [$params['nama'] ?? '', $params['tipe'] ?? 'aset', $params['saldo_normal'] ?? 'D', $params['is_active'] ?? 1, $action]
            );
            successResponse(null, 'Akun berhasil diupdate');
        } elseif ($method === 'DELETE') {
            if (!$action)
                errorResponse('ID akun diperlukan');
            $used = $db->count("SELECT COUNT(*) FROM jurnal_detail WHERE akun_id = ?", [$action]);
            if ($used)
                errorResponse('Akun sudah digunakan dalam jurnal');
            $db->execute("DELETE FROM akun WHERE id = ?", [$action]);
            successResponse(null, 'Akun berhasil dihapus');
        }
        break;

    default:
        errorResponse('Route keuangan tidak ditemukan', 404);
}
