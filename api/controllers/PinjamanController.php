<?php
// Pinjaman Controller
authCheck();
$db = Database::getInstance();

switch ($method) {
    case 'GET':
        if ($id === 'credit-score') {
            checkPermission('pinjaman.view');
            $anggotaId = $params['anggota_id'] ?? 0;
            $nominal = (float) ($params['nominal'] ?? 0);
            $tenor = (int) ($params['lama_angsuran'] ?? 1);
            $persenBunga = (float) ($params['bunga'] ?? 0);
            $nilaiAgunan = (float) ($params['nilai_agunan'] ?? 0);

            if (!$anggotaId || $nominal <= 0)
                errorResponse('Parameter tidak lengkap');

            $anggota = $db->fetch("SELECT penghasilan_bulanan FROM anggota WHERE id = ?", [$anggotaId]);
            if (!$anggota)
                errorResponse('Anggota tidak ditemukan');

            // 1. DSR (Debt Service Ratio)
            $pokokBln = $nominal / $tenor;
            $bungaBln = $nominal * ($persenBunga / 100);
            $cicilan = $pokokBln + $bungaBln;
            $gaji = (float) $anggota['penghasilan_bulanan'];

            $dsrRate = $gaji > 0 ? ($cicilan / $gaji) * 100 : 100; // Jika gaji 0 = Merah
            $dsrScore = 'hijau';
            if ($dsrRate >= 40)
                $dsrScore = 'merah';
            elseif ($dsrRate >= 30)
                $dsrScore = 'kuning';

            // 2. Histori Keterlambatan
            // Cek jumlah angsuran yang statusnya = terlambat
            $telatCount = $db->count(
                "SELECT COUNT(*) FROM angsuran a JOIN pinjaman p ON a.pinjaman_id = p.id WHERE p.anggota_id = ? AND a.status = 'terlambat'",
                [$anggotaId]
            );
            $historiScore = 'hijau';
            if ($telatCount > 3)
                $historiScore = 'merah';
            elseif ($telatCount > 0)
                $historiScore = 'kuning';

            // 3. Modal/Coverage (Simpanan + Agunan)
            $saldoSimpanan = $db->fetch(
                "SELECT COALESCE(SUM(CASE WHEN kt.dk='D' THEN s.jumlah ELSE -s.jumlah END),0) as total
                 FROM simpanan s
                 JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                 WHERE s.anggota_id = ?",
                [$anggotaId]
            )['total'] ?? 0;

            $totalCoverage = $saldoSimpanan + $nilaiAgunan;

            $simpananRate = ($totalCoverage / $nominal) * 100;
            $simpananScore = 'hijau';
            if ($simpananRate < 10)
                $simpananScore = 'merah';
            elseif ($simpananRate <= 20)
                $simpananScore = 'kuning';

            // Kesimpulan Akhir
            $scores = [$dsrScore, $historiScore, $simpananScore];
            $kesimpulan = 'Sangat Layak';
            $kesimpulanWarna = 'hijau';

            // Jika DSR Merah atau Histori Merah -> Pasti Merah
            if ($dsrScore === 'merah' || $historiScore === 'merah') {
                $kesimpulan = 'Beresiko Tinggi';
                $kesimpulanWarna = 'merah';
            }
            // Jika Simpanan Merah, tapi DSR & Histori Hijau -> Kuning (Perlu Perhatian)
            elseif ($simpananScore === 'merah' && $dsrScore === 'hijau' && $historiScore === 'hijau') {
                $kesimpulan = 'Perlu Perhatian';
                $kesimpulanWarna = 'kuning';
            }
            // Jika Simpanan Merah, dan minimal salah satu (DSR/Histori) Kuning -> Merah
            elseif ($simpananScore === 'merah') {
                $kesimpulan = 'Beresiko Tinggi';
                $kesimpulanWarna = 'merah';
            }
            // Jika mayoritas Kuning -> Kuning
            elseif (count(array_keys($scores, 'kuning')) >= 2 || in_array('kuning', $scores)) {
                $kesimpulan = 'Perlu Perhatian';
                $kesimpulanWarna = 'kuning';
            }

            successResponse([
                'dsr' => ['cicilan' => $cicilan, 'gaji' => $gaji, 'rate' => round($dsrRate, 1), 'score' => $dsrScore],
                'histori' => ['telat' => $telatCount, 'score' => $historiScore],
                'simpanan' => ['saldo' => $saldoSimpanan, 'rate' => round($simpananRate, 1), 'score' => $simpananScore],
                'kesimpulan' => $kesimpulan,
                'warna' => $kesimpulanWarna
            ]);
        }

        if ($id === 'laporan-saldo') {
            checkPermission('laporan.pinjaman_saldo');
            $data = $db->fetchAll(
                "SELECT a.no_anggota, a.nama as anggota_nama, 
                        SUM(p.jumlah) as total_pinjaman, 
                        SUM(p.jumlah - p.sisa_pinjaman) as total_terbayar, 
                        SUM(p.sisa_pinjaman) as sisa_pinjaman 
                 FROM anggota a 
                 JOIN pinjaman p ON a.id = p.anggota_id 
                 WHERE p.status IN ('cair','lunas') 
                 GROUP BY a.id, a.no_anggota, a.nama 
                 ORDER BY a.nama"
            );
            successResponse($data);
        }
        if ($id === 'laporan-baki-debet') {
            checkPermission('laporan.pinjaman_baki_debet');
            $data = $db->fetchAll(
                "SELECT p.no_pinjaman, a.nama as anggota_nama, p.tgl_pencairan, p.jumlah, p.tenor, p.sisa_pinjaman 
                 FROM pinjaman p 
                 JOIN anggota a ON p.anggota_id = a.id 
                 WHERE p.status = 'cair'
                 ORDER BY p.tgl_pencairan DESC"
            );
            successResponse($data);
        }
        if ($id === 'laporan-jasa-anggota') {
            checkPermission('laporan.pinjaman_saldo');
            $tahun = $params['tahun'] ?? date('Y');
            $data = $db->fetchAll(
                "SELECT a.no_anggota, a.nama as anggota_nama, 
                        SUM(an.bunga) as total_jasa,
                        SUM(an.denda) as total_denda
                 FROM angsuran an
                 JOIN pinjaman p ON an.pinjaman_id = p.id
                 JOIN anggota a ON p.anggota_id = a.id
                 WHERE an.status IN ('lunas', 'terlambat') AND YEAR(an.tgl_bayar) = ?
                 GROUP BY a.id, a.no_anggota, a.nama
                 ORDER BY total_jasa DESC",
                [$tahun]
            );
            successResponse($data);
        }

        if ($id === 'laporan-mutasi-angsuran') {
            checkPermission('laporan.pinjaman_saldo');
            $from = $params['from'] ?? date('Y-m-01');
            $to = $params['to'] ?? date('Y-m-t');

            $data = $db->fetchAll(
                "SELECT an.*, p.no_pinjaman, a.nama as anggota_nama, a.no_anggota, jp.nama as jenis_pinjaman
                 FROM angsuran an
                 JOIN pinjaman p ON an.pinjaman_id = p.id
                 JOIN anggota a ON p.anggota_id = a.id
                 JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
                 WHERE an.status IN ('lunas', 'terlambat') 
                 AND an.tgl_bayar BETWEEN ? AND ?
                 ORDER BY an.tgl_bayar DESC, an.id DESC",
                [$from, $to]
            );
            successResponse($data);
        }

        if ($id === 'laporan-agunan') {
            checkPermission('pinjaman.view');
            $data = $db->fetchAll(
                "SELECT p.id, p.no_pinjaman, p.jumlah, p.status, p.agunan, 
                        a.nama as anggota_nama, a.no_anggota, jp.nama as jenis_pinjaman
                 FROM pinjaman p
                 JOIN anggota a ON p.anggota_id = a.id
                 JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
                 WHERE p.agunan IS NOT NULL AND p.agunan != ''
                 ORDER BY p.created_at DESC"
            );

            foreach ($data as &$row) {
                if (!empty($row['agunan'])) {
                    $decoded = json_decode($row['agunan'], true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $row['agunan'] = $decoded;
                    }
                }
            }

            successResponse($data);
        }

        checkPermission('pinjaman.view');
        if ($id && is_numeric($id)) {
            $data = $db->fetch(
                "SELECT p.*, a.nama as anggota_nama, a.no_anggota, jp.nama as jenis_pinjaman,
                        u1.nama_lengkap as approved_by_nama, u2.nama_lengkap as created_by_nama
                 FROM pinjaman p
                 JOIN anggota a ON p.anggota_id = a.id
                 JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
                 LEFT JOIN users u1 ON p.approved_by = u1.id
                 LEFT JOIN users u2 ON p.created_by = u2.id
                 WHERE p.id = ?",
                [$id]
            );
            if (!$data)
                errorResponse('Pinjaman tidak ditemukan', 404);

            // Get angsuran schedule
            $angsuran = $db->fetchAll(
                "SELECT * FROM angsuran WHERE pinjaman_id = ? ORDER BY angsuran_ke",
                [$id]
            );
            $data['angsuran'] = $angsuran;

            // Get biaya pencairan
            $data['biaya_pencairan'] = $db->fetchAll(
                "SELECT * FROM biaya_pencairan WHERE pinjaman_id = ? ORDER BY id",
                [$id]
            );
            $data['total_biaya'] = array_sum(array_column($data['biaya_pencairan'], 'jumlah'));

            if (!empty($data['agunan'])) {
                $decoded = json_decode($data['agunan'], true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $data['agunan'] = $decoded;
                }
            }

            successResponse($data);
        } else {
            $search = $params['search'] ?? '';
            $status = $params['status'] ?? '';
            $page = $params['page'] ?? 1;
            $perPage = $params['per_page'] ?? PER_PAGE;

            $where = "WHERE 1=1";
            $binds = [];

            if ($search) {
                $where .= " AND (a.nama LIKE ? OR a.no_anggota LIKE ? OR p.no_pinjaman LIKE ?)";
                $binds[] = "%$search%";
                $binds[] = "%$search%";
                $binds[] = "%$search%";
            }
            if ($status) {
                $where .= " AND p.status = ?";
                $binds[] = $status;
            }

            paginatedResponse(
                "SELECT p.*, a.nama as anggota_nama, a.no_anggota, jp.nama as jenis_pinjaman
                 FROM pinjaman p
                 JOIN anggota a ON p.anggota_id = a.id
                 JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
                 $where ORDER BY p.created_at DESC",
                "SELECT COUNT(*) FROM pinjaman p JOIN anggota a ON p.anggota_id = a.id $where",
                $binds,
                $page,
                $perPage
            );
        }
        break;

    case 'POST':
        checkPermission('pinjaman.create');

        $anggotaId = $params['anggota_id'] ?? '';
        $jenisId = $params['jenis_pinjaman_id'] ?? '';
        $jumlah = (float) ($params['jumlah'] ?? 0);
        $tenor = (int) ($params['tenor'] ?? 0);
        $agunanInput = $params['agunan'] ?? null;
        $agunan = is_array($agunanInput) ? json_encode($agunanInput) : $agunanInput;
        $isTopup = isset($params['is_topup']) && $params['is_topup'] == 1 ? 1 : 0;
        $topupRefId = $params['topup_ref_id'] ?? null;

        if (empty($anggotaId) || empty($jenisId) || $jumlah <= 0 || $tenor <= 0) {
            errorResponse('Anggota, jenis pinjaman, jumlah, dan tenor wajib diisi');
        }

        $db->beginTransaction();

        // Validate jenis pinjaman
        $jenisPinjaman = $db->fetch("SELECT * FROM jenis_pinjaman WHERE id = ? AND is_active = 1", [$jenisId]);
        if (!$jenisPinjaman)
            errorResponse('Jenis pinjaman tidak valid');

        if ($tenor > $jenisPinjaman['max_tenor']) {
            errorResponse('Tenor melebihi maksimum (' . $jenisPinjaman['max_tenor'] . ' bulan)');
        }
        if ($jenisPinjaman['max_jumlah'] > 0 && $jumlah > $jenisPinjaman['max_jumlah']) {
            errorResponse('Jumlah melebihi maksimum (Rp ' . number_format($jenisPinjaman['max_jumlah']));
        }

        // Check existing active loan OF THE SAME TYPE
        $whereActive = "anggota_id = ? AND jenis_pinjaman_id = ? AND status IN ('pending','disetujui','cair')";
        if ($isTopup && $topupRefId) {
            $whereActive .= " AND id != " . (int) $topupRefId;
        }

        $activeLoan = $db->count(
            "SELECT COUNT(*) FROM pinjaman WHERE $whereActive",
            [$anggotaId, $jenisId]
        );
        if ($activeLoan > 0) {
            errorResponse('Anggota masih memiliki pinjaman aktif lain atau pengajuan yang sedang diproses');
        }

        if ($isTopup && $topupRefId) {
            $refLoan = $db->fetch("SELECT status FROM pinjaman WHERE id = ?", [$topupRefId]);
            if (!$refLoan || $refLoan['status'] !== 'cair') {
                errorResponse('Pinjaman yang akan ditop-up tidak valid atau tidak berstatus cair');
            }
        }

        // Generate No Pinjaman: YY.JP.AAAAAAA.NN
        $tglP = $params['tgl_pengajuan'] ?? date('Y-m-d');
        $yy = date('y', strtotime($tglP));
        $jp = str_pad($jenisPinjaman['kode_numerik'] ?: '00', 2, '0', STR_PAD_LEFT);

        $anggota = $db->fetch("SELECT no_anggota FROM anggota WHERE id = ?", [$anggotaId]);
        preg_match('/\d+/', $anggota['no_anggota'], $matches);
        $aaaaaaa = str_pad($matches[0] ?? '0', 7, '0', STR_PAD_LEFT);

        $prefix = "$yy.$jp.$aaaaaaa.";
        $lastRecord = $db->fetch("SELECT no_pinjaman FROM pinjaman WHERE no_pinjaman LIKE ? ORDER BY no_pinjaman DESC LIMIT 1", ["$prefix%"]);
        if ($lastRecord) {
            $lastIndex = (int) substr($lastRecord['no_pinjaman'], -2);
            $nn = str_pad($lastIndex + 1, 2, '0', STR_PAD_LEFT);
        } else {
            $nn = '01';
        }

        $noPinjaman = $prefix . $nn;

        $bungaPersen = $jenisPinjaman['bunga_persen'];
        $totalBunga = $jumlah * ($bungaPersen / 100) * $tenor;
        $totalBayar = $jumlah + $totalBunga;

        $pinjamanId = $db->insert(
            "INSERT INTO pinjaman (no_pinjaman, anggota_id, jenis_pinjaman_id, tgl_pengajuan, jumlah, tenor, bunga_persen, total_bunga, total_bayar, sisa_pinjaman, status, keterangan, agunan, is_topup, topup_ref_id, created_by)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [
                $noPinjaman,
                $anggotaId,
                $jenisId,
                $params['tgl_pengajuan'] ?? date('Y-m-d'),
                $jumlah,
                $tenor,
                $bungaPersen,
                $totalBunga,
                $totalBayar,
                $totalBayar,
                'pending',
                $params['keterangan'] ?? '',
                $agunan,
                $isTopup,
                $topupRefId,
                $_SESSION['user_id']
            ]
        );

        // ── Auto-insert ke tabel agunan (support single & multi) ──────────
        if ($pinjamanId && !empty($agunanInput) && is_array($agunanInput)) {

            // Normalize: bisa single object {tipe,data} atau array [{tipe,data},...]
            $agunanItems = isset($agunanInput['tipe']) ? [$agunanInput] : array_values($agunanInput);

            $tipeMap = [
                'Sertifikat Tanah (SHM/SHGB)' => 'SHM',
                'BPKB Kendaraan' => 'BPKB',
                'Deposito/Simpanan' => 'Deposito',
            ];

            // Helper ekstrak field dari agunan.data
            $extractField = function (array $data, array $keys) {
                foreach ($keys as $k) {
                    if (!empty($data[$k]))
                        return $data[$k];
                }
                return null;
            };

            // Cek existing untuk hindari duplikat total
            $existingCount = $db->count(
                "SELECT COUNT(*) FROM agunan WHERE pinjaman_id = ?",
                [$pinjamanId]
            );

            if ($existingCount === 0) {
                foreach ($agunanItems as $agunanItem) {
                    $rawTipe = $agunanItem['tipe'] ?? '';
                    $aguData = $agunanItem['data'] ?? [];

                    $tipeEnum = $tipeMap[$rawTipe] ?? 'Lainnya';

                    // JS menghasilkan key: title-case tanpa titik (mis. "No Sertifikat", "No Bpkb")
                    // Juga support format lama dengan titik untuk backward-compat
                    $noDokumen = $extractField($aguData, [
                        'No Sertifikat',
                        'No. Sertifikat',
                        'No Bpkb',
                        'No. Bpkb',
                        'No. BPKB',
                        'No Rekening',
                        'No. Rekening',
                    ]);
                    $pemilik = $extractField($aguData, [
                        'Nama Pemilik',
                        'Atas Nama',
                        'Nama Pemegang',
                    ]);
                    $nilaiRaw = $extractField($aguData, [
                        'Nilai Estimasi',
                        'Nominal Saldo',
                        'Estimasi Nilai',
                    ]) ?? '0';
                    $nilaiTaksasi = (float) preg_replace('/[^0-9]/', '', (string) $nilaiRaw);

                    // Deskripsi utama
                    $deskripsi = implode(' - ', array_filter([$rawTipe, $noDokumen])) ?: $rawTipe;

                    // Field tambahan (luas, nopol, merek, tahun, bank) → keterangan
                    $extraFields = [
                        'Luas' => 'm²',
                        'Nopol' => '',
                        'Merek Kendaraan' => '',
                        'Tahun' => '',
                        'Bank Atau Koperasi' => '',
                    ];
                    $ketParts = [];
                    foreach ($extraFields as $key => $suffix) {
                        if (!empty($aguData[$key])) {
                            $ketParts[] = "{$key}: {$aguData[$key]}{$suffix}";
                        }
                    }
                    $keterangan = implode(' | ', $ketParts);

                    $db->insert(
                        "INSERT INTO agunan
                            (pinjaman_id, tipe_agunan, deskripsi, no_dokumen, pemilik, nilai_taksasi, tgl_terima, status, keterangan, created_by)
                         VALUES (?,?,?,?,?,?,?,?,?,?)",
                        [
                            $pinjamanId,
                            $tipeEnum,
                            $deskripsi,
                            $noDokumen,
                            $pemilik,
                            $nilaiTaksasi,
                            $params['tgl_pengajuan'] ?? date('Y-m-d'),
                            'aktif',
                            $keterangan,
                            $_SESSION['user_id']
                        ]
                    );
                }
            }
        }


        $db->commit();

        logActivity('create', 'pinjaman', $pinjamanId, null, [
            'no_pinjaman' => $noPinjaman,
            'anggota' => $anggota['nama'],
            'jumlah' => $jumlah,
            'tenor' => $tenor
        ]);

        successResponse([
            'id' => $pinjamanId,
            'no_pinjaman' => $noPinjaman,
            'total_bunga' => $totalBunga,
            'total_bayar' => $totalBayar
        ], 'Pengajuan pinjaman berhasil', 201);
        break;


    case 'PUT':
        if (!$id)
            errorResponse('ID pinjaman diperlukan');

        if ($action === 'approve') {
            checkPermission('pinjaman.approve');
            $pinjaman = $db->fetch("SELECT p.*, jp.akun_id FROM pinjaman p JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id WHERE p.id = ? AND p.status = 'pending'", [$id]);
            if (!$pinjaman)
                errorResponse('Pinjaman tidak ditemukan atau sudah diproses');

            $statusApproval = $params['status'] ?? '';
            if (!in_array($statusApproval, ['disetujui', 'ditolak'])) {
                errorResponse('Status harus disetujui atau ditolak');
            }

            // Parse biaya pencairan dari request
            $biayaList = $params['biaya'] ?? [];
            if (!is_array($biayaList))
                $biayaList = [];

            $db->beginTransaction();
            try {
                // Jika Top-up, lunasi pinjaman lama terlebih dahulu
                if ($pinjaman['is_topup'] && $pinjaman['topup_ref_id']) {
                    $oldId = $pinjaman['topup_ref_id'];
                    $oldLoan = $db->fetch("SELECT * FROM pinjaman WHERE id = ? AND status = 'cair'", [$oldId]);

                    if ($oldLoan) {
                        $sisaAngsuran = $db->fetchAll("SELECT * FROM angsuran WHERE pinjaman_id = ? AND status = 'belum'", [$oldId]);
                        $today = strtotime('today');
                        $bungaBerjalan = 0;
                        $dendaBerjalan = 0;

                        foreach ($sisaAngsuran as $ag) {
                            $jatuhTempo = strtotime($ag['tgl_jatuh_tempo']);
                            if ($jatuhTempo <= $today) {
                                $bungaBerjalan += $ag['bunga'];
                                $hariTerlambat = max(0, floor(($today - $jatuhTempo) / 86400));
                                $dendaBerjalan += $hariTerlambat > 0 ? $hariTerlambat * 5000 : 0;
                            }
                        }

                        $sisaPokokOld = (float) $oldLoan['sisa_pinjaman'];
                        $totalLunasOld = $sisaPokokOld + $bungaBerjalan + $dendaBerjalan;

                        // Lunasi angsuran lama
                        $db->execute("UPDATE angsuran SET tgl_bayar=CURDATE(), status='lunas', created_by=? WHERE pinjaman_id=? AND status='belum'", [$_SESSION['user_id'], $oldId]);
                        // Update status pinjaman lama
                        $db->execute("UPDATE pinjaman SET status='lunas', sisa_pinjaman=0 WHERE id=?", [$oldId]);

                        $pinjaman['topup_sisa_pokok'] = $sisaPokokOld;
                        $pinjaman['topup_bunga'] = $bungaBerjalan;
                        $pinjaman['topup_denda'] = $dendaBerjalan;
                        $pinjaman['topup_total_lunas'] = $totalLunasOld;
                        $pinjaman['topup_no_pinjaman'] = $oldLoan['no_pinjaman'];
                    }
                }

                $db->execute(
                    "UPDATE pinjaman SET status=?, tgl_disetujui=CURDATE(), approved_by=? WHERE id=?",
                    [$statusApproval, $_SESSION['user_id'], $id]
                );

                if ($statusApproval === 'disetujui') {
                    // Generate angsuran schedule
                    $pokokPerBulan = $pinjaman['jumlah'] / $pinjaman['tenor'];
                    $bungaPerBulan = $pinjaman['jumlah'] * ($pinjaman['bunga_persen'] / 100);

                    for ($i = 1; $i <= $pinjaman['tenor']; $i++) {
                        $jatuhTempo = date('Y-m-d', strtotime("+$i month"));
                        $total = $pokokPerBulan + $bungaPerBulan;
                        $noTrx = generateNo('AGS', 'angsuran', 'no_transaksi');

                        $db->execute(
                            "INSERT INTO angsuran (no_transaksi, pinjaman_id, angsuran_ke, tgl_jatuh_tempo, pokok, bunga, total, status)
                             VALUES (?,?,?,?,?,?,?,?)",
                            [$noTrx, $id, $i, $jatuhTempo, $pokokPerBulan, $bungaPerBulan, $total, 'belum']
                        );
                    }

                    $anggota = $db->fetch("SELECT nama FROM anggota WHERE id = ?", [$pinjaman['anggota_id']]);

                    // ── Simpan & Hitung Total Biaya Pencairan ──
                    $totalBiaya = 0;
                    foreach ($biayaList as $b) {
                        $namaB = trim($b['nama'] ?? '');
                        $jmlB = (float) ($b['jumlah'] ?? 0);
                        $jenisId = isset($b['jenis_biaya_id']) && $b['jenis_biaya_id'] ? (int) $b['jenis_biaya_id'] : null;
                        if (empty($namaB) || $jmlB <= 0)
                            continue;

                        $db->execute(
                            "INSERT INTO biaya_pencairan (pinjaman_id, jenis_biaya_id, nama_biaya, jumlah) VALUES (?,?,?,?)",
                            [$id, $jenisId, $namaB, $jmlB]
                        );
                        $totalBiaya += $jmlB;
                    }

                    $totalLunasOld = $pinjaman['topup_total_lunas'] ?? 0;
                    $kasKeluar = $pinjaman['jumlah'] - $totalLunasOld - $totalBiaya;

                    // ── Jurnal Konsolidasi (Pencairan + Potongan + Topup) ──
                    $noBukti = generateNo('JRN', 'jurnal', 'no_bukti');
                    $ketJurnal = 'Pencairan Pinjaman - ' . $anggota['nama'];
                    if (isset($pinjaman['topup_no_pinjaman'])) {
                        $ketJurnal .= " (Top-up Pelunasan " . $pinjaman['topup_no_pinjaman'] . ")";
                    }
                    if ($totalBiaya > 0) {
                        $ketJurnal .= " - Potongan Biaya Rp " . number_format($totalBiaya, 0, ',', '.');
                    }

                    $jurnalId = $db->insert(
                        "INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, ref_id, total_debit, total_kredit, created_by)
                         VALUES (?,CURDATE(),?,?,?,?,?,?)",
                        [$noBukti, $ketJurnal, 'pinjaman', $id, $pinjaman['jumlah'], $pinjaman['jumlah'], $_SESSION['user_id']]
                    );

                    // 1. D: Piutang Pinjaman (Dynamic) - Gross Plafon
                    $akunPiutangId = $pinjaman['akun_id'] ?: $db->fetch("SELECT id FROM akun WHERE kode='1200' LIMIT 1")['id'];
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, ?, 0)", [$jurnalId, $akunPiutangId, $pinjaman['jumlah']]);

                    // 2. K: Kas (1000) - Sisa Cair (Net)
                    if ($kasKeluar > 0) {
                        $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT id FROM akun WHERE kode='1000' LIMIT 1), 0, ?)", [$jurnalId, $kasKeluar]);
                    }

                    // 3. K: Potongan Biaya -> Pendapatan Administrasi (4300)
                    if ($totalBiaya > 0) {
                        $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT COALESCE((SELECT id FROM akun WHERE kode='4300' LIMIT 1),(SELECT id FROM akun WHERE tipe='pendapatan' LIMIT 1))), 0, ?)", [$jurnalId, $totalBiaya]);
                    }

                    // 4. Jika Top-up, Kreditkan komponen pelunasan pinjaman lama
                    if ($totalLunasOld > 0) {
                        $sisaPokokOld = $pinjaman['topup_sisa_pokok'];
                        $bungaOld = $pinjaman['topup_bunga'];
                        $dendaOld = $pinjaman['topup_denda'];

                        if ($sisaPokokOld > 0) {
                            // Fetch old loan's account
                            $oldPinj = $db->fetch("SELECT jp.akun_id FROM pinjaman p JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id WHERE p.no_pinjaman = ?", [$pinjaman['topup_no_pinjaman']]);
                            $akunOldId = ($oldPinj && $oldPinj['akun_id']) ? $oldPinj['akun_id'] : $db->fetch("SELECT id FROM akun WHERE kode='1200' LIMIT 1")['id'];
                            $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, 0, ?)", [$jurnalId, $akunOldId, $sisaPokokOld]);
                        }
                        if ($bungaOld > 0) {
                            $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT id FROM akun WHERE kode='4000' LIMIT 1), 0, ?)", [$jurnalId, $bungaOld]);
                        }
                        if ($dendaOld > 0) {
                            $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT id FROM akun WHERE kode='4200' LIMIT 1), 0, ?)", [$jurnalId, $dendaOld]);
                        }
                    }

                    $db->execute("UPDATE pinjaman SET status='cair', tgl_pencairan=CURDATE() WHERE id=?", [$id]);
                }

                $db->commit();

                logActivity('update', 'pinjaman', $id, [
                    'status' => 'pending'
                ], [
                    'status' => $statusApproval,
                    'no_pinjaman' => $pinjaman['no_pinjaman'],
                    'anggota' => $anggota['nama'] ?? 'Anggota'
                ]);

                successResponse(null, 'Pinjaman berhasil ' . $statusApproval);
            } catch (Exception $e) {
                $db->rollBack();
                errorResponse('Gagal memproses pinjaman: ' . $e->getMessage());
            }
        }
        break;

    default:
        errorResponse('Method not allowed', 405);
}
