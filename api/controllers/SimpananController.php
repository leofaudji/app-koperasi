<?php
// Simpanan Controller
authCheck();
$db = Database::getInstance();

switch ($method) {
    case 'GET':
        if ($id === 'laporan-mutasi-simpanan') {
            checkPermission('simpanan.view');
            $from = $params['from'] ?? date('Y-m-01');
            $to = $params['to'] ?? date('Y-m-t');

            $data = $db->fetchAll(
                "SELECT s.no_transaksi, s.tgl_transaksi, js.nama as jenis_simpanan,
                        rs.no_rekening,
                        kt.nama as nama_transaksi, kt.kode as kode_transaksi, kt.dk,
                        s.jumlah, s.saldo_sebelum, s.saldo_sesudah, s.keterangan,
                        a.nama as anggota_nama, a.no_anggota
                 FROM simpanan s
                 JOIN anggota a ON s.anggota_id = a.id
                 JOIN jenis_simpanan js ON s.jenis_simpanan_id = js.id
                 JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                 LEFT JOIN rekening_simpanan rs ON s.rekening_id = rs.id
                 WHERE s.tgl_transaksi BETWEEN ? AND ?
                 ORDER BY s.tgl_transaksi DESC, s.id DESC",
                [$from, $to]
            );
            successResponse($data);
        }

        if ($id === 'laporan-saldo') {
            checkPermission('laporan.simpanan_saldo');
            $cacheKey = 'rep_simpanan_saldo';
            $data = getCachedData($cacheKey, function() use ($db) {
                return $db->fetchAll(
                    "SELECT a.no_anggota, a.nama as anggota_nama, 
                            COALESCE(SUM(CASE WHEN js.kode = 'SP' THEN (CASE WHEN kt.dk = 'D' THEN s.jumlah ELSE -s.jumlah END) ELSE 0 END), 0) as pokok,
                            COALESCE(SUM(CASE WHEN js.kode = 'SW' THEN (CASE WHEN kt.dk = 'D' THEN s.jumlah ELSE -s.jumlah END) ELSE 0 END), 0) as wajib,
                            COALESCE(SUM(CASE WHEN js.kode = 'SS' THEN (CASE WHEN kt.dk = 'D' THEN s.jumlah ELSE -s.jumlah END) ELSE 0 END), 0) as sukarela,
                            COALESCE(SUM(CASE WHEN js.kode = 'SPRT' THEN (CASE WHEN kt.dk = 'D' THEN s.jumlah ELSE -s.jumlah END) ELSE 0 END), 0) as partisipatif,
                            COALESCE(SUM(CASE WHEN kt.dk = 'D' THEN s.jumlah ELSE -s.jumlah END), 0) as total_saldo
                    FROM anggota a
                    LEFT JOIN simpanan s ON a.id = s.anggota_id
                    LEFT JOIN jenis_simpanan js ON s.jenis_simpanan_id = js.id
                    LEFT JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                    WHERE a.status = 'aktif'
                    GROUP BY a.id, a.no_anggota, a.nama
                    ORDER BY a.nama"
                );
            });
            successResponse($data);
        }

        if ($id === 'monitoring-wajib') {
            checkPermission('simpanan.view');
            $tahun = isset($params['tahun']) ? (int)$params['tahun'] : (int)date('Y');

            // 1. Get all mandatory savings products (is_wajib = 1)
            $produkWajib = $db->fetchAll(
                "SELECT id, kode, nama, bunga_persen 
                 FROM jenis_simpanan 
                 WHERE is_wajib = 1 AND is_active = 1 
                 ORDER BY kode ASC"
            );

            if (empty($produkWajib)) {
                successResponse([
                    'tahun' => $tahun,
                    'produk' => [],
                    'data' => []
                ]);
            }

            // 2. Get all active members
            $members = $db->fetchAll(
                "SELECT id, no_anggota, nama, tgl_daftar, status 
                 FROM anggota 
                 WHERE status = 'aktif' 
                 ORDER BY no_anggota ASC"
            );

            // 3. For each wajib product, collect data
            //    - Cumulative total per anggota (for one-time like Simpanan Pokok)
            //    - Monthly totals for the selected year (for periodic like Simpanan Wajib)

            $produkIds = array_column($produkWajib, 'id');
            $produkKodeById = [];
            foreach ($produkWajib as $p) {
                $produkKodeById[$p['id']] = $p['kode'];
            }

            // Placeholders for IN clause
            $placeholders = implode(',', array_fill(0, count($produkIds), '?'));

            // 3a. Cumulative total per anggota per product (all-time)
            $cumulativeData = $db->fetchAll(
                "SELECT s.anggota_id, s.jenis_simpanan_id,
                        SUM(CASE WHEN kt.dk = 'D' THEN s.jumlah ELSE -s.jumlah END) as total
                 FROM simpanan s
                 JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                 WHERE s.jenis_simpanan_id IN ($placeholders)
                 GROUP BY s.anggota_id, s.jenis_simpanan_id",
                $produkIds
            );

            // cumMap[anggota_id][jenis_simpanan_id] = total
            $cumMap = [];
            foreach ($cumulativeData as $row) {
                $cumMap[$row['anggota_id']][$row['jenis_simpanan_id']] = (float)$row['total'];
            }

            // 3b. Monthly totals for the selected year per anggota per product
            $monthlyParams = array_merge($produkIds, [$tahun]);
            $monthlyData = $db->fetchAll(
                "SELECT s.anggota_id, s.jenis_simpanan_id, MONTH(s.tgl_transaksi) as bulan,
                        SUM(CASE WHEN kt.dk = 'D' THEN s.jumlah ELSE -s.jumlah END) as total
                 FROM simpanan s
                 JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                 WHERE s.jenis_simpanan_id IN ($placeholders) AND YEAR(s.tgl_transaksi) = ?
                 GROUP BY s.anggota_id, s.jenis_simpanan_id, MONTH(s.tgl_transaksi)",
                $monthlyParams
            );

            // monthMap[anggota_id][jenis_simpanan_id][bulan] = total
            $monthMap = [];
            foreach ($monthlyData as $row) {
                $monthMap[$row['anggota_id']][$row['jenis_simpanan_id']][$row['bulan']] = (float)$row['total'];
            }

            // 4. Find product ids for SP and SW so frontend gets flat flags
            $spId = null;
            $swId = null;
            foreach ($produkWajib as $p) {
                if ($p['kode'] === 'SP') {
                    $spId = $p['id'];
                }
                if ($p['kode'] === 'SW') {
                    $swId = $p['id'];
                }
            }

            // 5. Combine results
            $result = [];
            foreach ($members as $m) {
                $produkStatus = [];
                foreach ($produkWajib as $p) {
                    $pid = $p['id'];
                    $cumTotal = $cumMap[$m['id']][$pid] ?? 0;
                    
                    // Monthly breakdown for this year
                    $months = [];
                    for ($b = 1; $b <= 12; $b++) {
                        $months[$b] = $monthMap[$m['id']][$pid][$b] ?? 0;
                    }

                    $produkStatus[$pid] = [
                        'kode' => $p['kode'],
                        'nama' => $p['nama'],
                        'cum_total' => $cumTotal,
                        'lunas' => $cumTotal > 0,   // All-time paid > 0
                        'months' => $months
                    ];
                }

                $spTotal = $spId ? ($cumMap[$m['id']][$spId] ?? 0) : 0;
                $swMonths = [];
                for ($b = 1; $b <= 12; $b++) {
                    $swMonths[$b] = $swId ? ($monthMap[$m['id']][$swId][$b] ?? 0) : 0;
                }

                $result[] = [
                    'anggota_id' => $m['id'],
                    'no_anggota' => $m['no_anggota'],
                    'nama' => $m['nama'],
                    'tgl_daftar' => $m['tgl_daftar'],
                    'sp_lunas' => $spTotal > 0,
                    'sp_total' => $spTotal,
                    'sw_months' => $swMonths,
                    'produk' => $produkStatus
                ];
            }

            successResponse([
                'tahun' => $tahun,
                'produk_list' => $produkWajib,  // for frontend to know what columns to render
                'data' => $result
            ]);
        }

        checkPermission('simpanan.view');

        // Buku simpanan per rekening: GET /api/simpanan/buku/{rekening_id}
        if ($id === 'buku' && $action) {
            $rekeningId = $action;
            $dari = $params['dari'] ?? null;
            $sampai = $params['sampai'] ?? null;

            // Info rekening + anggota
            $rekening = $db->fetch(
                "SELECT rs.*, a.no_anggota, a.nama as anggota_nama, a.alamat,
                        js.nama as jenis_simpanan_nama, js.kode as jenis_kode
                 FROM rekening_simpanan rs
                 JOIN anggota a ON rs.anggota_id = a.id
                 JOIN jenis_simpanan js ON rs.jenis_simpanan_id = js.id
                 WHERE rs.id = ?",
                [$rekeningId]
            );
            if (!$rekening)
                errorResponse('Rekening tidak ditemukan', 404);

            $where = "WHERE s.rekening_id = ?";
            $binds = [$rekeningId];

            if ($dari) {
                $where .= " AND s.tgl_transaksi >= ?";
                $binds[] = $dari;
            }
            if ($sampai) {
                $where .= " AND s.tgl_transaksi <= ?";
                $binds[] = $sampai;
            }

            // Saldo awal (sebelum periode)
            $saldoAwal = 0;
            if ($dari) {
                $sa = $db->fetch(
                    "SELECT COALESCE(SUM(CASE WHEN kt.dk='D' THEN s.jumlah ELSE -s.jumlah END), 0) as saldo
                     FROM simpanan s
                     JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                     WHERE s.rekening_id = ? AND s.tgl_transaksi < ?",
                    [$rekeningId, $dari]
                );
                $saldoAwal = (float) ($sa['saldo'] ?? 0);
            }

            $transaksi = $db->fetchAll(
                "SELECT s.no_transaksi, s.tgl_transaksi,
                        kt.nama as nama_transaksi, kt.kode as kode_transaksi, kt.dk,
                        s.jumlah, s.saldo_sesudah, s.keterangan, s.created_at
                 FROM simpanan s
                 JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                 $where
                 ORDER BY s.tgl_transaksi ASC, s.id ASC",
                $binds
            );

            jsonResponse([
                'success' => true,
                'rekening' => $rekening,
                'saldo_awal' => $saldoAwal,
                'data' => $transaksi
            ]);
        }

        // Mutasi per anggota: GET /api/simpanan/mutasi/{anggota_id}
        elseif ($id === 'mutasi' && $action) {
            $anggotaId = $action;

            // Saldo per jenis
            $saldo = $db->fetchAll(
                "SELECT js.nama, js.kode,
                    COALESCE(SUM(CASE WHEN kt.dk='D' THEN s.jumlah ELSE -s.jumlah END),0) as saldo
                 FROM jenis_simpanan js
                 LEFT JOIN simpanan s ON js.id = s.jenis_simpanan_id AND s.anggota_id = ?
                 LEFT JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                 GROUP BY js.id, js.nama, js.kode ORDER BY js.kode",
                [$anggotaId]
            );

            $rekeningId = $params['rekening_id'] ?? '';
            $dari = $params['dari'] ?? date('Y-m-01');
            $sampai = $params['sampai'] ?? date('Y-m-d');
            $page = $params['page'] ?? 1;
            $perPage = $params['per_page'] ?? PER_PAGE;

            $where = "WHERE s.anggota_id = ? AND s.tgl_transaksi BETWEEN ? AND ?";
            $binds = [$anggotaId, $dari, $sampai];

            if ($rekeningId) {
                $where .= " AND s.rekening_id = ?";
                $binds[] = $rekeningId;
            }

            $jenisId = $params['jenis_simpanan_id'] ?? '';
            if ($jenisId) {
                $where .= " AND s.jenis_simpanan_id = ?";
                $binds[] = $jenisId;
            }

            $offset = ($page - 1) * $perPage;
            $total = $db->count("SELECT COUNT(*) FROM simpanan s $where", $binds);

            $data = $db->fetchAll(
                "SELECT s.no_transaksi, s.tgl_transaksi, js.nama as jenis_simpanan,
                        rs.no_rekening,
                        kt.nama as nama_transaksi, kt.kode as kode_transaksi, kt.dk,
                        s.jumlah, s.saldo_sesudah, s.keterangan
                 FROM simpanan s
                 JOIN jenis_simpanan js ON s.jenis_simpanan_id = js.id
                 JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                 LEFT JOIN rekening_simpanan rs ON s.rekening_id = rs.id
                 $where ORDER BY s.tgl_transaksi DESC, s.id DESC
                 LIMIT $perPage OFFSET $offset",
                $binds
            );

            jsonResponse([
                'success' => true,
                'data' => $data,
                'saldo' => $saldo,
                'pagination' => [
                    'page' => (int) $page,
                    'per_page' => (int) $perPage,
                    'total' => (int) $total,
                    'total_pages' => (int) ceil($total / max($perPage, 1))
                ]
            ]);
        }
        // Single or list
        elseif ($id && is_numeric($id)) {
            $data = $db->fetch(
                "SELECT s.*, a.nama as anggota_nama, a.no_anggota,
                        js.nama as jenis_simpanan, kt.nama as nama_transaksi, kt.kode as kode_transaksi, kt.dk
                 FROM simpanan s
                 JOIN anggota a ON s.anggota_id = a.id
                 JOIN jenis_simpanan js ON s.jenis_simpanan_id = js.id
                 JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                 WHERE s.id = ?",
                [$id]
            );
            if (!$data)
                errorResponse('Transaksi tidak ditemukan', 404);
            successResponse($data);
        } else {
            $search = $params['search'] ?? '';
            $page = $params['page'] ?? 1;
            $perPage = $params['per_page'] ?? PER_PAGE;

            $where = "WHERE 1=1";
            $binds = [];

            if ($search) {
                $where .= " AND (a.nama LIKE ? OR a.no_anggota LIKE ? OR s.no_transaksi LIKE ?)";
                $binds[] = "%$search%";
                $binds[] = "%$search%";
                $binds[] = "%$search%";
            }

            $anggotaId = $params['anggota_id'] ?? '';
            if ($anggotaId) {
                $where .= " AND s.anggota_id = ?";
                $binds[] = $anggotaId;
            }

            paginatedResponse(
                "SELECT s.*, a.nama as anggota_nama, a.no_anggota,
                        js.nama as jenis_simpanan, kt.nama as nama_transaksi,
                        kt.kode as kode_transaksi, kt.dk, rs.no_rekening
                 FROM simpanan s
                 JOIN anggota a ON s.anggota_id = a.id
                 JOIN jenis_simpanan js ON s.jenis_simpanan_id = js.id
                 JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                 LEFT JOIN rekening_simpanan rs ON s.rekening_id = rs.id
                 $where ORDER BY s.created_at DESC",
                "SELECT COUNT(*) FROM simpanan s JOIN anggota a ON s.anggota_id = a.id $where",
                $binds,
                $page,
                $perPage
            );
        }
        break;

    case 'POST':
        if ($id === 'reverse') {
            checkPermission('simpanan.create');
            $targetId = $params['id'] ?? null;
            if (!$targetId) errorResponse('ID Transaksi diperlukan');

            $original = $db->fetch(
                "SELECT s.*, kt.dk, js.nama as jenis_nama, js.akun_id as akun_simpanan_id,
                        kt.akun_debit_id, kt.akun_kredit_id, kt.nama as kt_nama
                 FROM simpanan s
                 JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                 JOIN jenis_simpanan js ON s.jenis_simpanan_id = js.id
                 WHERE s.id = ?",
                [$targetId]
            );
            if (!$original) errorResponse('Transaksi tidak ditemukan');
            
            // Check if already reversed
            $exists = $db->fetch("SELECT id FROM simpanan WHERE keterangan LIKE ?", ["%REVERSAL OF {$original['no_transaksi']}%"]);
            if ($exists) errorResponse('Transaksi ini sudah pernah direversal');

            // Current balance
            if ($original['rekening_id']) {
                $rekening = $db->fetch("SELECT saldo FROM rekening_simpanan WHERE id = ?", [$original['rekening_id']]);
                $saldoSekarang = (float) $rekening['saldo'];
            } else {
                $currentSaldo = $db->fetch(
                    "SELECT COALESCE(SUM(CASE WHEN kt.dk='D' THEN s.jumlah ELSE -s.jumlah END),0) as saldo
                     FROM simpanan s
                     JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                     WHERE s.anggota_id = ? AND s.jenis_simpanan_id = ?",
                    [$original['anggota_id'], $original['jenis_simpanan_id']]
                );
                $saldoSekarang = (float) $currentSaldo['saldo'];
            }

            $db->beginTransaction();
            try {
                $noTrx = generateNo('REV', 'simpanan', 'no_transaksi');
                $jumlah = $original['jumlah'];
                
                // Opposite effect
                if ($original['dk'] === 'D') {
                    // Original was Deposit, reversal is Withdrawal
                    $saldoSesudah = $saldoSekarang - $jumlah;
                    $kodeTrxRev = $db->fetch("SELECT id FROM kode_transaksi_simpanan WHERE kode = 'KRK' LIMIT 1")['id'] ?? $original['kode_transaksi_id'];
                } else {
                    // Original was Withdrawal, reversal is Deposit
                    $saldoSesudah = $saldoSekarang + $jumlah;
                    $kodeTrxRev = $db->fetch("SELECT id FROM kode_transaksi_simpanan WHERE kode = 'KRD' LIMIT 1")['id'] ?? $original['kode_transaksi_id'];
                }

                $revId = $db->insert(
                    "INSERT INTO simpanan (no_transaksi, anggota_id, jenis_simpanan_id, rekening_id, kode_transaksi_id, tgl_transaksi, jumlah, saldo_sebelum, saldo_sesudah, keterangan, created_by)
                     VALUES (?,?,?,?,?,CURDATE(),?,?,?,?,?)",
                    [
                        $noTrx, $original['anggota_id'], $original['jenis_simpanan_id'], $original['rekening_id'],
                        $kodeTrxRev, $jumlah, $saldoSekarang, $saldoSesudah,
                        "REVERSAL OF {$original['no_transaksi']}: {$original['keterangan']}",
                        $_SESSION['user_id']
                    ]
                );

                if ($original['rekening_id']) {
                    $db->execute("UPDATE rekening_simpanan SET saldo = ? WHERE id = ?", [$saldoSesudah, $original['rekening_id']]);
                }

                // Reverse Jurnal
                $oldJurnal = $db->fetch("SELECT id, no_bukti, keterangan FROM jurnal WHERE ref_tipe='simpanan' AND ref_id=?", [$targetId]);
                if ($oldJurnal) {
                    $noBukti = generateNo('REV', 'jurnal', 'no_bukti');
                    $jurnalId = $db->insert(
                        "INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, ref_id, total_debit, total_kredit, created_by)
                         VALUES (?,CURDATE(),?, 'reversal', ?, ?, ?, ?)",
                        [$noBukti, "[REVERSAL] " . $oldJurnal['keterangan'], $oldJurnal['id'], $jumlah, $jumlah, $_SESSION['user_id']]
                    );
                    
                    $oldDetails = $db->fetchAll("SELECT * FROM jurnal_detail WHERE jurnal_id = ?", [$oldJurnal['id']]);
                    foreach ($oldDetails as $od) {
                        $db->execute(
                            "INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit, keterangan) VALUES (?,?,?,?,?)",
                            [$jurnalId, $od['akun_id'], $od['kredit'], $od['debit'], $od['keterangan']]
                        );
                    }
                }

                $db->commit();
                clearCache(['member' => $original['anggota_id'], 'saving', 'finance']);
                successResponse(['id' => $revId, 'no_transaksi' => $noTrx], 'Reversal simpanan berhasil');
            } catch (Exception $e) {
                $db->rollBack();
                errorResponse('Gagal melakukan reversal: ' . $e->getMessage());
            }
        }

        checkPermission('simpanan.create');

        $anggotaId = $params['anggota_id'] ?? '';
        $jenisId = $params['jenis_simpanan_id'] ?? '';
        $kodeTransaksiId = $params['kode_transaksi_id'] ?? '';
        $jumlah = floatval($params['jumlah'] ?? 0);
        $tgl = $params['tgl_transaksi'] ?? date('Y-m-d');

        if (empty($anggotaId) || empty($jenisId) || empty($kodeTransaksiId) || $jumlah <= 0) {
            errorResponse('Anggota, jenis simpanan, kode transaksi, dan jumlah wajib diisi');
        }

        // Validate anggota
        $anggota = $db->fetch("SELECT id, nama, no_anggota FROM anggota WHERE id = ? AND status = 'aktif'", [$anggotaId]);
        if (!$anggota)
            errorResponse('Anggota tidak ditemukan atau tidak aktif');

        // Validate kode transaksi
        $kodeTransaksi = $db->fetch("SELECT * FROM kode_transaksi_simpanan WHERE id = ? AND is_active = 1", [$kodeTransaksiId]);
        if (!$kodeTransaksi)
            errorResponse('Kode transaksi tidak valid');

        // Validate rekening if provided
        $rekeningId = $params['rekening_id'] ?? null;
        if ($rekeningId) {
            $rekening = $db->fetch("SELECT * FROM rekening_simpanan WHERE id = ? AND anggota_id = ? AND jenis_simpanan_id = ?", [$rekeningId, $anggotaId, $jenisId]);
            if (!$rekening)
                errorResponse('Rekening tidak valid untuk anggota and jenis simpanan ini');
            $saldoSekarang = floatval($rekening['saldo']);
        } else {
            // Legacy/Optional: Get current total saldo for this jenis if no specific rekening
            $currentSaldo = $db->fetch(
                "SELECT COALESCE(SUM(CASE WHEN kt.dk='D' THEN s.jumlah ELSE -s.jumlah END),0) as saldo
                 FROM simpanan s
                 JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                 WHERE s.anggota_id = ? AND s.jenis_simpanan_id = ?",
                [$anggotaId, $jenisId]
            );
            $saldoSekarang = floatval($currentSaldo['saldo'] ?? 0);
        }

        // Calculate new saldo
        if ($kodeTransaksi['dk'] === 'D') {
            $saldoSesudah = $saldoSekarang + $jumlah;
        } else {
            if ($jumlah > $saldoSekarang) {
                errorResponse('Saldo tidak mencukupi. Saldo saat ini: Rp ' . number_format($saldoSekarang, 0, ',', '.'));
            }
            $saldoSesudah = $saldoSekarang - $jumlah;
        }

        $db->beginTransaction();
        try {
            $noTransaksi = generateNo('SMP', 'simpanan', 'no_transaksi');

            $simpananId = $db->insert(
                "INSERT INTO simpanan (no_transaksi, anggota_id, jenis_simpanan_id, rekening_id, kode_transaksi_id, tgl_transaksi, jumlah, saldo_sebelum, saldo_sesudah, keterangan, created_by)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                [
                    $noTransaksi,
                    $anggotaId,
                    $jenisId,
                    $rekeningId,
                    $kodeTransaksiId,
                    $tgl,
                    $jumlah,
                    $saldoSekarang,
                    $saldoSesudah,
                    $params['keterangan'] ?? '',
                    $_SESSION['user_id']
                ]
            );

            // Update balance in rekening_simpanan if used
            if ($rekeningId) {
                $db->execute("UPDATE rekening_simpanan SET saldo = ? WHERE id = ?", [$saldoSesudah, $rekeningId]);
            }

            // Create jurnal entry
            $jenisSimpanan = $db->fetch("SELECT nama, akun_id FROM jenis_simpanan WHERE id = ?", [$jenisId]);
            $noBukti = generateNo('JRN', 'jurnal', 'no_bukti');
            $keterangan = $kodeTransaksi['nama'] . ' ' . $jenisSimpanan['nama'] . ' - ' . $anggota['nama'];

            $jurnalId = $db->insert(
                "INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, ref_id, total_debit, total_kredit, created_by)
                 VALUES (?,?,?,?,?,?,?,?)",
                [$noBukti, $tgl, $keterangan, 'simpanan', $simpananId, $jumlah, $jumlah, $_SESSION['user_id']]
            );

            // Journal details — use COA from master data
            $akunSimpanan = $jenisSimpanan['akun_id']; // akun kewajiban dari jenis simpanan

            if ($kodeTransaksi['dk'] === 'D') {
                // Debit side: from kode_transaksi.akun_debit_id (e.g. Kas 1000)
                // Kredit side: jenis_simpanan.akun_id (e.g. Simpanan Anggota 2000)
                $akunDebit = $kodeTransaksi['akun_debit_id'] ?: $akunSimpanan;
                $akunKredit = $akunSimpanan;
                $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, ?, 0)", [$jurnalId, $akunDebit, $jumlah]);
                $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, 0, ?)", [$jurnalId, $akunKredit, $jumlah]);
            } else {
                // Debit side: jenis_simpanan.akun_id (e.g. Simpanan Anggota 2000)
                // Kredit side: from kode_transaksi.akun_kredit_id (e.g. Kas 1000)
                $akunDebit = $akunSimpanan;
                $akunKredit = $kodeTransaksi['akun_kredit_id'] ?: $akunSimpanan;
                $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, ?, 0)", [$jurnalId, $akunDebit, $jumlah]);
                $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, 0, ?)", [$jurnalId, $akunKredit, $jumlah]);
            }

            $db->commit();

            // Clear caches via central helper
            clearCache(['member' => $anggotaId, 'saving', 'finance', 'audit']);

            // Log Activity
            logActivity('create', 'simpanan', $simpananId, null, [
                'no_transaksi' => $noTransaksi,
                'anggota' => $anggota['nama'],
                'jumlah' => $jumlah,
                'tipe' => $kodeTransaksi['nama']
            ]);

            successResponse([
                'id' => $simpananId,
                'no_transaksi' => $noTransaksi,
                'saldo_sebelum' => $saldoSekarang,
                'saldo_sesudah' => $saldoSesudah
            ], 'Transaksi simpanan berhasil', 201);
        } catch (Exception $e) {
            $db->rollBack();
            errorResponse('Gagal menyimpan transaksi: ' . $e->getMessage());
        }
        break;

    default:
        errorResponse('Method not allowed', 405);
}
