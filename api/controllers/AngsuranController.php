<?php
// Angsuran Controller
authCheck();
$db = Database::getInstance();
require_once __DIR__ . '/../config/finance_helpers.php';

switch ($method) {
    case 'GET':
        checkPermission('angsuran.view');

        if ($id === 'pengajuan') {
            if ($action === 'count') {
                $count = $db->fetch("SELECT COUNT(*) as total FROM pengajuan_angsuran WHERE status = 'pending'")['total'] ?? 0;
                successResponse([
                    'count' => (int) $count,
                    'pending_count' => (int) $count
                ]);
            }
            $status = $params['status'] ?? 'pending';
            $where = "WHERE 1=1";
            $sqlParams = [];
            if (!empty($status) && $status !== 'all') {
                $where .= " AND pa.status = ?";
                $sqlParams[] = $status;
            }
            $search = $params['search'] ?? '';
            if (!empty($search)) {
                $where .= " AND (a.nama LIKE ? OR a.no_anggota LIKE ? OR p.no_pinjaman LIKE ? OR pa.no_pengajuan LIKE ?)";
                $like = "%$search%";
                $sqlParams = array_merge($sqlParams, [$like, $like, $like, $like]);
            }

            $list = $db->fetchAll(
                "SELECT pa.*, a.nama as anggota_nama, a.nama as nama_anggota, a.no_anggota, a.telepon,
                        p.no_pinjaman, p.jumlah as jumlah_pinjaman, p.sisa_pinjaman, p.tenor,
                        jp.nama as jenis_pinjaman_nama,
                        ag.tgl_jatuh_tempo, ag.status as status_angsuran,
                        u.nama_lengkap as approver_nama,
                        COALESCE(rs.no_rekening, (
                            SELECT no_rekening FROM rekening_simpanan rs2 
                            WHERE rs2.anggota_id = pa.anggota_id 
                              AND rs2.jenis_simpanan_id = (SELECT id FROM jenis_simpanan WHERE kode = 'SS' OR LOWER(nama) LIKE '%sukarela%' LIMIT 1) 
                              AND rs2.status = 'aktif' 
                            LIMIT 1
                        )) as no_rekening,
                        COALESCE(rs.saldo, (
                            SELECT saldo FROM rekening_simpanan rs2 
                            WHERE rs2.anggota_id = pa.anggota_id 
                              AND rs2.jenis_simpanan_id = (SELECT id FROM jenis_simpanan WHERE kode = 'SS' OR LOWER(nama) LIKE '%sukarela%' LIMIT 1) 
                              AND rs2.status = 'aktif' 
                            LIMIT 1
                        ), 0) as saldo_sukarela,
                        COALESCE(rs.saldo, (
                            SELECT saldo FROM rekening_simpanan rs2 
                            WHERE rs2.anggota_id = pa.anggota_id 
                              AND rs2.jenis_simpanan_id = (SELECT id FROM jenis_simpanan WHERE kode = 'SS' OR LOWER(nama) LIKE '%sukarela%' LIMIT 1) 
                              AND rs2.status = 'aktif' 
                            LIMIT 1
                        ), 0) as saldo_sukarela_terkini
                 FROM pengajuan_angsuran pa
                 JOIN anggota a ON pa.anggota_id = a.id
                 JOIN pinjaman p ON pa.pinjaman_id = p.id
                 LEFT JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
                 JOIN angsuran ag ON pa.angsuran_id = ag.id
                 LEFT JOIN rekening_simpanan rs ON pa.rekening_simpanan_id = rs.id
                 LEFT JOIN users u ON pa.approved_by = u.id
                 {$where}
                 ORDER BY (pa.status = 'pending') DESC, pa.id DESC",
                $sqlParams
            );
            successResponse($list);
        }

        if ($id === 'kalkulasi-lunas') {
            checkPermission('angsuran.create');
            $pinjamanId = $params['pinjaman_id'] ?? '';
            if (!$pinjamanId)
                errorResponse('ID pinjaman diperlukan');

            $pinjaman = $db->fetch(
                "SELECT p.*, a.nama as anggota_nama, a.no_anggota, jp.nama as jenis_pinjaman
                 FROM pinjaman p
                 JOIN anggota a ON p.anggota_id = a.id
                 JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
                 WHERE p.id = ? AND p.status = 'cair'",
                [$pinjamanId]
            );
            if (!$pinjaman)
                errorResponse('Pinjaman tidak ditemukan atau bukan status cair', 404);

            // Angsuran belum lunas
            $sisaAngsuran = $db->fetchAll(
                "SELECT * FROM angsuran WHERE pinjaman_id = ? AND status = 'belum' ORDER BY angsuran_ke",
                [$pinjamanId]
            );

            $today = strtotime('today');
            $bungaBerjalan = 0;
            $dendaBerjalan = 0;
            $bungaBelumJatuhTempo = 0;

            foreach ($sisaAngsuran as $ag) {
                $jatuhTempo = strtotime($ag['tgl_jatuh_tempo']);
                if ($jatuhTempo <= $today) {
                    // Sudah jatuh tempo — bunga dan denda masuk tagihan
                    $bungaBerjalan += $ag['bunga'];
                    $hariTerlambat = max(0, floor(($today - $jatuhTempo) / 86400));
                    $dendaBerjalan += $hariTerlambat > 0 ? $hariTerlambat * 5000 : 0;
                } else {
                    // Belum jatuh tempo — bunga dibebaskan (diskon pelunasan)
                    $bungaBelumJatuhTempo += $ag['bunga'];
                }
            }

            $sisaPokok = (float) $pinjaman['sisa_pinjaman'];
            $totalPelunasan = $sisaPokok + $bungaBerjalan + $dendaBerjalan;
            $jumlahSisaAngsuran = count($sisaAngsuran);

            successResponse([
                'pinjaman' => $pinjaman,
                'sisa_angsuran' => $jumlahSisaAngsuran,
                'sisa_pokok' => $sisaPokok,
                'bunga_berjalan' => $bungaBerjalan,
                'denda_berjalan' => $dendaBerjalan,
                'bunga_dibebaskan' => $bungaBelumJatuhTempo,
                'total_pelunasan' => $totalPelunasan,
            ]);
        }

        if ($id === 'next') {
            $pinjamanId = $params['pinjaman_id'] ?? '';
            if (!$pinjamanId)
                errorResponse('ID pinjaman diperlukan');

            $next = $db->fetch(
                "SELECT ag.*, p.no_pinjaman, p.sisa_pinjaman, p.anggota_id, a.nama as anggota_nama, 
                        (SELECT COUNT(*) FROM angsuran WHERE pinjaman_id = p.id AND status != 'belum') as terbayar,
                        p.tenor
                 FROM angsuran ag
                 JOIN pinjaman p ON ag.pinjaman_id = p.id
                 JOIN anggota a ON p.anggota_id = a.id
                 WHERE ag.pinjaman_id = ? AND ag.status = 'belum'
                 ORDER BY ag.angsuran_ke ASC LIMIT 1",
                [$pinjamanId]
            );

            if (!$next)
                successResponse(null, 'Semua angsuran sudah lunas');

            // Pre-calculate denda
            $denda = 0;
            if (strtotime($next['tgl_jatuh_tempo']) < strtotime('today')) {
                $hariTerlambat = floor((strtotime('today') - strtotime($next['tgl_jatuh_tempo'])) / 86400);
                $denda = $hariTerlambat * 5000;
            }
            $next['denda_hitung'] = $denda;
            $next['total_tagihan'] = $next['total'] + $denda;

            // Saldo Simpanan Sukarela anggota
            $jenisSS = $db->fetch("SELECT id FROM jenis_simpanan WHERE kode = 'SS' OR LOWER(nama) LIKE '%sukarela%' LIMIT 1");
            $saldoSukarela = 0;
            $rekeningSSId = null;
            if ($jenisSS) {
                $rekSS = $db->fetch(
                    "SELECT id, saldo FROM rekening_simpanan WHERE anggota_id = ? AND jenis_simpanan_id = ? AND status = 'aktif' LIMIT 1",
                    [$next['anggota_id'], $jenisSS['id']]
                );
                if ($rekSS) {
                    $saldoSukarela = (float) $rekSS['saldo'];
                    $rekeningSSId = $rekSS['id'];
                } else {
                    $sumSS = $db->fetch(
                        "SELECT COALESCE(SUM(CASE WHEN kt.dk = 'D' THEN s.jumlah ELSE -s.jumlah END), 0) as saldo
                         FROM simpanan s
                         JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                         WHERE s.anggota_id = ? AND s.jenis_simpanan_id = ?",
                        [$next['anggota_id'], $jenisSS['id']]
                    );
                    $saldoSukarela = (float) ($sumSS['saldo'] ?? 0);
                }
            }
            $next['saldo_sukarela'] = $saldoSukarela;
            $next['rekening_sukarela_id'] = $rekeningSSId;

            successResponse($next);
        }

        if ($id && is_numeric($id)) {
            $data = $db->fetch(
                "SELECT ag.*, p.no_pinjaman, p.anggota_id, a.nama as anggota_nama, a.no_anggota,
                        (SELECT COUNT(*) FROM audit_logs WHERE table_name = 'angsuran' AND record_id = ag.id AND action = 'update') as is_edited
                 FROM angsuran ag
                 JOIN pinjaman p ON ag.pinjaman_id = p.id
                 JOIN anggota a ON p.anggota_id = a.id
                 WHERE ag.id = ?",
                [$id]
            );
            if (!$data)
                errorResponse('Angsuran tidak ditemukan', 404);

            $jenisSS = $db->fetch("SELECT id FROM jenis_simpanan WHERE kode = 'SS' OR LOWER(nama) LIKE '%sukarela%' LIMIT 1");
            $saldoSukarela = 0;
            if ($jenisSS) {
                $rekSS = $db->fetch(
                    "SELECT saldo FROM rekening_simpanan WHERE anggota_id = ? AND jenis_simpanan_id = ? AND status = 'aktif' LIMIT 1",
                    [$data['anggota_id'], $jenisSS['id']]
                );
                $saldoSukarela = $rekSS ? (float) $rekSS['saldo'] : 0;
            }
            $data['saldo_sukarela'] = $saldoSukarela;

            successResponse($data);
        } else {
            $search = $params['search'] ?? '';
            $status = $params['status'] ?? '';
            $pinjamanId = $params['pinjaman_id'] ?? '';
            $anggotaId = $params['anggota_id'] ?? '';
            $page = $params['page'] ?? 1;
            $perPage = $params['per_page'] ?? PER_PAGE;
            $dari = $params['dari'] ?? $params['from'] ?? '';
            $sampai = $params['sampai'] ?? $params['to'] ?? '';
            $metode = $params['metode_pembayaran'] ?? '';

            $where = "WHERE 1=1";
            $binds = [];

            if ($search) {
                $where .= " AND (a.nama LIKE ? OR a.no_anggota LIKE ? OR p.no_pinjaman LIKE ? OR ag.no_transaksi LIKE ?)";
                $binds[] = "%$search%";
                $binds[] = "%$search%";
                $binds[] = "%$search%";
                $binds[] = "%$search%";
            }

            if ($status === 'belum') {
                $where .= " AND ag.status = 'belum'";
            } elseif ($status === 'lunas' || $status === 'terlambat') {
                $where .= " AND ag.status = ? AND ag.tgl_bayar IS NOT NULL";
                $binds[] = $status;
            } elseif ($status) {
                $where .= " AND ag.status = ?";
                $binds[] = $status;
            } elseif (!$pinjamanId) {
                // Di menu pembayaran angsuran, tampilkan transaksi pembayaran yang sudah dibayar
                $where .= " AND ag.tgl_bayar IS NOT NULL";
            }

            if ($pinjamanId) {
                $where .= " AND ag.pinjaman_id = ?";
                $binds[] = $pinjamanId;
            }

            if ($anggotaId) {
                $where .= " AND p.anggota_id = ?";
                $binds[] = $anggotaId;
            }

            if ($metode) {
                $where .= " AND ag.metode_pembayaran = ?";
                $binds[] = $metode;
            }

            // Filter Periode Tanggal
            $dateField = ($status === 'belum') ? 'ag.tgl_jatuh_tempo' : 'ag.tgl_bayar';
            if ($dari) {
                $where .= " AND $dateField >= ?";
                $binds[] = $dari;
            }
            if ($sampai) {
                $where .= " AND $dateField <= ?";
                $binds[] = $sampai;
            }

            // Urutan tampilan data
            if ($pinjamanId) {
                $orderBy = "ORDER BY ag.angsuran_ke ASC";
            } elseif ($status === 'belum') {
                $orderBy = "ORDER BY ag.tgl_jatuh_tempo ASC, ag.id ASC";
            } else {
                $orderBy = "ORDER BY ag.tgl_bayar DESC, ag.id DESC";
            }

            paginatedResponse(
                "SELECT ag.*, p.no_pinjaman, a.nama as anggota_nama, a.no_anggota,
                        (SELECT COUNT(*) FROM audit_logs WHERE table_name = 'angsuran' AND record_id = ag.id AND action = 'update') as is_edited
                 FROM angsuran ag
                 JOIN pinjaman p ON ag.pinjaman_id = p.id
                 JOIN anggota a ON p.anggota_id = a.id
                 $where $orderBy",
                "SELECT COUNT(*) FROM angsuran ag JOIN pinjaman p ON ag.pinjaman_id = p.id JOIN anggota a ON p.anggota_id = a.id $where",
                $binds,
                $page,
                $perPage
            );
        }
        break;

    case 'POST':
        if ($id === 'reverse') {
            checkPermission('angsuran.create');
            $targetId = $params['id'] ?? null;
            if (!$targetId) errorResponse('ID Angsuran diperlukan');

            $angsuran = $db->fetch("SELECT * FROM angsuran WHERE id = ?", [$targetId]);
            if (!$angsuran) errorResponse('Angsuran tidak ditemukan');
            if ($angsuran['status'] === 'belum') errorResponse('Angsuran belum dibayar, tidak bisa direversal');

            $pinjaman = $db->fetch("SELECT * FROM pinjaman WHERE id = ?", [$angsuran['pinjaman_id']]);

            $db->beginTransaction();
            try {
                // 1. Revert angsuran status
                $db->execute(
                    "UPDATE angsuran SET status = 'belum', tgl_bayar = NULL, denda = 0 WHERE id = ?",
                    [$targetId]
                );

                // 2. Update pinjaman balance (add back principal)
                $db->execute(
                    "UPDATE pinjaman SET sisa_pinjaman = sisa_pinjaman + ?, status = 'cair' WHERE id = ?",
                    [$angsuran['pokok'], $angsuran['pinjaman_id']]
                );

                // 2b. Kembalikan saldo simpanan sukarela jika dibayar via sukarela
                if ($angsuran['metode_pembayaran'] === 'sukarela') {
                    $jenisSS = $db->fetch("SELECT id FROM jenis_simpanan WHERE kode = 'SS' OR LOWER(nama) LIKE '%sukarela%' LIMIT 1");
                    if ($jenisSS) {
                        $rekSS = $db->fetch("SELECT id, saldo FROM rekening_simpanan WHERE anggota_id = ? AND jenis_simpanan_id = ? LIMIT 1", [$pinjaman['anggota_id'], $jenisSS['id']]);
                        $saldoSebelum = $rekSS ? (float)$rekSS['saldo'] : 0;
                        $saldoSesudah = $saldoSebelum + (float)$angsuran['total'];

                        if ($rekSS) {
                            $db->execute("UPDATE rekening_simpanan SET saldo = ? WHERE id = ?", [$saldoSesudah, $rekSS['id']]);
                            $rekSSId = $rekSS['id'];
                        } else {
                            $noRekSS = "SS-" . date('Y') . str_pad($pinjaman['anggota_id'], 5, '0', STR_PAD_LEFT);
                            $rekSSId = $db->insert(
                                "INSERT INTO rekening_simpanan (no_rekening, anggota_id, jenis_simpanan_id, tgl_buka, saldo, status) VALUES (?, ?, ?, CURDATE(), ?, 'aktif')",
                                [$noRekSS, $pinjaman['anggota_id'], $jenisSS['id'], $saldoSesudah]
                            );
                        }

                        $kodeTrxSetoran = $db->fetch("SELECT id FROM kode_transaksi_simpanan WHERE kode = 'KRD' OR kode = 'STR' OR dk = 'D' ORDER BY (kode = 'KRD') DESC LIMIT 1");
                        $kodeTrxId = $kodeTrxSetoran ? $kodeTrxSetoran['id'] : 1;

                        $noTrxSimpanan = generateNo('REV', 'simpanan', 'no_transaksi');
                        $db->insert(
                            "INSERT INTO simpanan (no_transaksi, anggota_id, jenis_simpanan_id, rekening_id, kode_transaksi_id, tgl_transaksi, jumlah, saldo_sebelum, saldo_sesudah, keterangan, created_by, metode_pembayaran)
                             VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, 'sukarela')",
                            [
                                $noTrxSimpanan,
                                $pinjaman['anggota_id'],
                                $jenisSS['id'],
                                $rekSSId,
                                $kodeTrxId,
                                $angsuran['total'],
                                $saldoSebelum,
                                $saldoSesudah,
                                "[REVERSAL AG:{$angsuran['no_transaksi']}] Pengembalian Simpanan Sukarela Angsuran ke-{$angsuran['angsuran_ke']}",
                                $_SESSION['user_id']
                            ]
                        );
                    }
                }

                // 3. Reverse Jurnal
                $oldJurnal = $db->fetch("SELECT id, no_bukti, keterangan FROM jurnal WHERE ref_tipe='angsuran' AND ref_id=?", [$targetId]);
                if ($oldJurnal) {
                    $noBukti = generateNo('REV', 'jurnal', 'no_bukti');
                    $jurnalId = $db->insert(
                        "INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, ref_id, total_debit, total_kredit, created_by)
                         VALUES (?,CURDATE(),?, 'reversal', ?, ?, ?, ?)",
                        [$noBukti, "[REVERSAL] " . $oldJurnal['keterangan'], $oldJurnal['id'], $angsuran['total'], $angsuran['total'], $_SESSION['user_id']]
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
                clearCache(['loan', 'finance', 'audit', 'saving', 'member' => $pinjaman['anggota_id']]);
                successResponse(null, 'Reversal angsuran berhasil');
            } catch (Exception $e) {
                $db->rollBack();
                errorResponse('Gagal melakukan reversal: ' . $e->getMessage());
            }
        }

        if ($id === 'pengajuan-approve') {
            checkPermission('angsuran.create');
            $pengajuanId = (int) ($params['pengajuan_id'] ?? 0);
            if (!$pengajuanId) {
                errorResponse('ID pengajuan diperlukan');
            }

            $pa = $db->fetch(
                "SELECT pa.*, p.sisa_pinjaman, p.no_pinjaman, ag.status as angsuran_status, ag.tgl_jatuh_tempo, a.nama as anggota_nama, jp.akun_id as akun_piutang_id
                 FROM pengajuan_angsuran pa
                 JOIN pinjaman p ON pa.pinjaman_id = p.id
                 JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
                 JOIN angsuran ag ON pa.angsuran_id = ag.id
                 JOIN anggota a ON pa.anggota_id = a.id
                 WHERE pa.id = ?",
                [$pengajuanId]
            );

            if (!$pa) {
                errorResponse('Pengajuan tidak ditemukan', 404);
            }
            if ($pa['status'] !== 'pending') {
                errorResponse('Pengajuan ini sudah diproses sebelumnya (Status: ' . $pa['status'] . ')');
            }
            if ($pa['angsuran_status'] === 'lunas') {
                errorResponse('Angsuran ini sudah berstatus lunas');
            }

            $tglBayar = date('Y-m-d');
            checkAccountingPeriodLock($db, $tglBayar, 'Pembayaran Angsuran');

            // Cek saldo sukarela terkini
            $jenisSS = $db->fetch("SELECT id, akun_id, nama FROM jenis_simpanan WHERE kode = 'SS' OR LOWER(nama) LIKE '%sukarela%' LIMIT 1");
            if (!$jenisSS) {
                errorResponse('Jenis Simpanan Sukarela tidak ditemukan di sistem');
            }

            $rekSS = $db->fetch(
                "SELECT id, saldo FROM rekening_simpanan WHERE anggota_id = ? AND jenis_simpanan_id = ? AND status = 'aktif' LIMIT 1",
                [$pa['anggota_id'], $jenisSS['id']]
            );

            $saldoSukarela = 0;
            if ($rekSS) {
                $saldoSukarela = (float) $rekSS['saldo'];
            } else {
                $sumSS = $db->fetch(
                    "SELECT COALESCE(SUM(CASE WHEN kt.dk = 'D' THEN s.jumlah ELSE -s.jumlah END), 0) as saldo
                     FROM simpanan s
                     JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                     WHERE s.anggota_id = ? AND s.jenis_simpanan_id = ?",
                    [$pa['anggota_id'], $jenisSS['id']]
                );
                $saldoSukarela = (float) ($sumSS['saldo'] ?? 0);
            }

            $totalBayar = (float) $pa['total_bayar'];
            $pokok = (float) $pa['pokok'];
            $bunga = (float) $pa['bunga'];
            $denda = (float) ($pa['denda'] ?? 0);

            if ($saldoSukarela < $totalBayar) {
                errorResponse(
                    'Saldo Simpanan Sukarela anggota tidak mencukupi untuk disetujui. Saldo saat ini: Rp ' . 
                    number_format($saldoSukarela, 0, ',', '.') . ', Total tagihan: Rp ' . 
                    number_format($totalBayar, 0, ',', '.')
                );
            }

            $db->beginTransaction();
            try {
                // 1. Update status angsuran -> lunas
                $statusAng = $denda > 0 ? 'terlambat' : 'lunas';
                $db->execute(
                    "UPDATE angsuran SET tgl_bayar=?, denda=?, pokok=?, bunga=?, total=?, status=?, created_by=?, metode_pembayaran='sukarela', akun_kas_id=NULL WHERE id=?",
                    [
                        $tglBayar,
                        $denda,
                        $pokok,
                        $bunga,
                        $totalBayar,
                        $statusAng,
                        $_SESSION['user_id'],
                        $pa['angsuran_id']
                    ]
                );

                // 2. Potong saldo sukarela & catat mutasi simpanan
                $saldoBaruSukarela = $saldoSukarela - $totalBayar;
                $rekSSId = $rekSS ? $rekSS['id'] : null;

                if ($rekSSId) {
                    $db->execute("UPDATE rekening_simpanan SET saldo = ? WHERE id = ?", [$saldoBaruSukarela, $rekSSId]);
                } else {
                    $noRekSS = "SS-" . date('Y') . str_pad($pa['anggota_id'], 5, '0', STR_PAD_LEFT);
                    $rekSSId = $db->insert(
                        "INSERT INTO rekening_simpanan (no_rekening, anggota_id, jenis_simpanan_id, tgl_buka, saldo, status) VALUES (?, ?, ?, CURDATE(), ?, 'aktif')",
                        [$noRekSS, $pa['anggota_id'], $jenisSS['id'], $saldoBaruSukarela]
                    );
                }

                $kodeTrxPenarikan = $db->fetch("SELECT id FROM kode_transaksi_simpanan WHERE kode = 'TRK' OR dk = 'K' ORDER BY (kode = 'TRK') DESC LIMIT 1");
                $kodeTrxId = $kodeTrxPenarikan ? $kodeTrxPenarikan['id'] : 2;

                $noTrxSimpanan = generateNo('TB', 'simpanan', 'no_transaksi');
                $angsuranRow = $db->fetch("SELECT no_transaksi FROM angsuran WHERE id = ?", [$pa['angsuran_id']]);
                $actualAngsuranNoTrx = $angsuranRow ? $angsuranRow['no_transaksi'] : "AG-{$pa['angsuran_id']}";
                $ketSimpanan = "[AG:{$actualAngsuranNoTrx}] Pembayaran Angsuran ke-{$pa['angsuran_ke']} - {$pa['no_pinjaman']}";

                $simpananId = $db->insert(
                    "INSERT INTO simpanan (no_transaksi, anggota_id, jenis_simpanan_id, rekening_id, kode_transaksi_id, tgl_transaksi, jumlah, saldo_sebelum, saldo_sesudah, keterangan, created_by, metode_pembayaran)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sukarela')",
                    [
                        $noTrxSimpanan,
                        $pa['anggota_id'],
                        $jenisSS['id'],
                        $rekSSId,
                        $kodeTrxId,
                        $tglBayar,
                        $totalBayar,
                        $saldoSukarela,
                        $saldoBaruSukarela,
                        $ketSimpanan,
                        $_SESSION['user_id']
                    ]
                );

                // 3. Update sisa pinjaman & auto-reschedule sisa angsuran
                $sisaBaru = $pa['sisa_pinjaman'] - $pokok;
                $db->execute("UPDATE pinjaman SET sisa_pinjaman = ? WHERE id = ?", [$sisaBaru, $pa['pinjaman_id']]);
                if ($sisaBaru <= 0) {
                    $db->execute("UPDATE pinjaman SET status = 'lunas', sisa_pinjaman = 0 WHERE id = ?", [$pa['pinjaman_id']]);
                    $db->execute("UPDATE angsuran SET status = 'lunas', pokok = 0, total = bunga WHERE pinjaman_id = ? AND status = 'belum'", [$pa['pinjaman_id']]);
                } else {
                    // Reschedule sisa jadwal angsuran yang belum lunas agar total pokok selalu sinkron dengan sisa pinjaman
                    $unpaidAngsuran = $db->fetchAll(
                        "SELECT id, angsuran_ke, bunga FROM angsuran WHERE pinjaman_id = ? AND status = 'belum' ORDER BY angsuran_ke ASC",
                        [$pa['pinjaman_id']]
                    );
                    $countUnpaid = count($unpaidAngsuran);
                    if ($countUnpaid > 0) {
                        $basePokok = floor($sisaBaru / $countUnpaid);
                        $lastPokok = $sisaBaru - ($basePokok * ($countUnpaid - 1));
                        foreach ($unpaidAngsuran as $uIdx => $u) {
                            $isLast = ($uIdx === $countUnpaid - 1);
                            $pVal = $isLast ? $lastPokok : $basePokok;
                            $totVal = $pVal + (float)$u['bunga'];
                            $db->execute("UPDATE angsuran SET pokok = ?, total = ? WHERE id = ?", [$pVal, $totVal, $u['id']]);
                        }
                    }
                }

                // 4. Jurnal akuntansi
                $noBukti = generateNo('AG', 'jurnal', 'no_bukti');
                $ketJurnal = "Angsuran ke-{$pa['angsuran_ke']} {$pa['no_pinjaman']} - {$pa['anggota_nama']} (Via Simpanan Sukarela - ACC Portal)";
                $jurnalId = $db->insert(
                    "INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, ref_id, total_debit, total_kredit, created_by)
                     VALUES (?,?,?,?,?,?,?,?)",
                    [$noBukti, $tglBayar, $ketJurnal, 'angsuran', $pa['angsuran_id'], $totalBayar, $totalBayar, $_SESSION['user_id']]
                );

                $debitAkunId = $jenisSS['akun_id'] ?? null;
                if (!$debitAkunId) {
                    $matchedAkun = $db->fetch("SELECT id FROM akun WHERE kode = '206' OR (nama LIKE '%sukarela%' AND tipe = 'kewajiban') OR (nama LIKE '%manasuka%' AND tipe = 'kewajiban') LIMIT 1");
                    $debitAkunId = $matchedAkun ? $matchedAkun['id'] : null;
                }
                if ($debitAkunId) {
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, ?, 0)", [$jurnalId, $debitAkunId, $totalBayar]);
                } else {
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT COALESCE((SELECT id FROM akun WHERE kode='1000' LIMIT 1), (SELECT id FROM akun WHERE kode='100' LIMIT 1), (SELECT id FROM akun WHERE nama LIKE '%Kas%' LIMIT 1))), ?, 0)", [$jurnalId, $totalBayar]);
                }

                if ($pokok > 0) {
                    $kreditAkunId = $pa['akun_piutang_id'] ?? null;
                    if (!$kreditAkunId) {
                        $matchedKredit = $db->fetch("SELECT id FROM akun WHERE kode = '103' OR kode = '104' OR (nama LIKE '%piutang%' AND tipe = 'aset') LIMIT 1");
                        $kreditAkunId = $matchedKredit ? $matchedKredit['id'] : 2;
                    }
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, 0, ?)", [$jurnalId, $kreditAkunId, $pokok]);
                }

                if ($bunga > 0) {
                    $db->execute(
                        "INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit)
                         VALUES (?, (SELECT COALESCE((SELECT id FROM akun WHERE kode='401' LIMIT 1), (SELECT id FROM akun WHERE nama LIKE '%Pendapatan Bunga%' LIMIT 1), 7)), 0, ?)",
                        [$jurnalId, $bunga]
                    );
                }

                if ($denda > 0) {
                    $db->execute(
                        "INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit)
                         VALUES (?, (SELECT COALESCE((SELECT id FROM akun WHERE kode='403' LIMIT 1), (SELECT id FROM akun WHERE nama LIKE '%Pendapatan Denda%' LIMIT 1), (SELECT id FROM akun WHERE kode='401' LIMIT 1), 7)), 0, ?)",
                        [$jurnalId, $denda]
                    );
                }

                // 5. Update pengajuan_angsuran
                $db->execute(
                    "UPDATE pengajuan_angsuran SET status = 'disetujui', approved_by = ?, tgl_approval = NOW() WHERE id = ?",
                    [$_SESSION['user_id'], $pengajuanId]
                );

                $db->commit();
                clearCache(['loan', 'finance', 'audit', 'saving', 'member' => $pa['anggota_id']]);

                if (!empty($simpananId)) {
                    try {
                        require_once __DIR__ . '/../config/WebPushHelper.php';
                        WebPushHelper::getInstance()->notifySimpananTransaksi((int) $simpananId);
                    } catch (\Throwable $e) {}
                }

                successResponse(null, 'Pengajuan angsuran berhasil disetujui (ACC). Saldo sukarela dipotong dan angsuran lunas.');
            } catch (Exception $e) {
                $db->rollBack();
                errorResponse('Gagal menyetujui pengajuan angsuran: ' . $e->getMessage());
            }
        }

        if ($id === 'pengajuan-reject') {
            checkPermission('angsuran.create');
            $pengajuanId = (int) ($params['pengajuan_id'] ?? 0);
            $alasan = trim($params['alasan'] ?? 'Pengajuan ditolak oleh bendahara');
            if (!$pengajuanId) {
                errorResponse('ID pengajuan diperlukan');
            }

            $pa = $db->fetch("SELECT id, status, anggota_id FROM pengajuan_angsuran WHERE id = ?", [$pengajuanId]);
            if (!$pa) {
                errorResponse('Pengajuan tidak ditemukan', 404);
            }
            if ($pa['status'] !== 'pending') {
                errorResponse('Pengajuan ini sudah diproses sebelumnya (Status: ' . $pa['status'] . ')');
            }

            $db->execute(
                "UPDATE pengajuan_angsuran SET status = 'ditolak', alasan_penolakan = ?, approved_by = ?, tgl_approval = NOW() WHERE id = ?",
                [$alasan, $_SESSION['user_id'], $pengajuanId]
            );

            clearCache(['loan', 'member' => $pa['anggota_id']]);
            successResponse(null, 'Pengajuan angsuran berhasil ditolak.');
        }

        checkPermission('angsuran.create');
        $angsuranId = $params['angsuran_id'] ?? '';
        $pinjamanId = $params['pinjaman_id'] ?? '';
        $manualPokok = $params['pokok'] ?? null;
        $manualBunga = $params['bunga'] ?? null;
        $manualDenda = $params['denda'] ?? null;
        $tglTransaksi = $params['tgl_transaksi'] ?? null;
        $metodePembayaran = $params['metode_pembayaran'] ?? 'tunai';
        $akunKasId = $params['akun_kas_id'] ?? null;

        $tglBayar = $tglTransaksi ? $tglTransaksi : date('Y-m-d');

        if (empty($angsuranId) && empty($pinjamanId)) {
            errorResponse('ID angsuran atau ID pinjaman diperlukan');
        }

        if ($angsuranId) {
            $angsuran = $db->fetch(
                "SELECT ag.*, p.anggota_id, p.id as p_id, p.no_pinjaman, p.jumlah as jumlah_pinjaman, p.sisa_pinjaman, jp.akun_id
                 FROM angsuran ag 
                 JOIN pinjaman p ON ag.pinjaman_id = p.id
                 JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
                 WHERE ag.id = ? AND ag.status = 'belum'",
                [$angsuranId]
            );
            if (!$angsuran)
                errorResponse('Angsuran tidak ditemukan atau sudah dibayar');

            $pinjamanId = $angsuran['p_id'];
            $pokok = $manualPokok !== null ? $manualPokok : $angsuran['pokok'];
            $bunga = $manualBunga !== null ? $manualBunga : $angsuran['bunga'];
            $denda = $manualDenda !== null ? $manualDenda : 0;

            if ($manualDenda === null && strtotime($angsuran['tgl_jatuh_tempo']) < strtotime($tglBayar)) {
                $hariTerlambat = floor((strtotime($tglBayar) - strtotime($angsuran['tgl_jatuh_tempo'])) / 86400);
                $denda = $hariTerlambat * 5000;
            }
        } else {
            $pinjaman = $db->fetch(
                "SELECT p.*, jp.akun_id 
                 FROM pinjaman p 
                 JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id 
                 WHERE p.id = ?",
                [$pinjamanId]
            );
            if (!$pinjaman)
                errorResponse('Pinjaman tidak ditemukan');

            $pokok = $manualPokok ?: 0;
            $bunga = $manualBunga ?: 0;
            $denda = $manualDenda ?: 0;

            $angsuran = [
                'pinjaman_id' => $pinjamanId,
                'anggota_id' => $pinjaman['anggota_id'],
                'no_pinjaman' => $pinjaman['no_pinjaman'],
                'sisa_pinjaman' => $pinjaman['sisa_pinjaman'],
                'angsuran_ke' => 'Manual'
            ];
        }

        $totalBayar = $pokok + $bunga + $denda;
        if ($totalBayar <= 0)
            errorResponse('Total pembayaran harus lebih dari 0');

        checkAccountingPeriodLock($db, $tglBayar, 'Pembayaran Angsuran');

        // Validasi Saldo jika metode pembayaran via Simpanan Sukarela
        $jenisSS = null;
        $rekSS = null;
        $saldoSukarela = 0;
        if ($metodePembayaran === 'sukarela') {
            $jenisSS = $db->fetch("SELECT id, akun_id, nama FROM jenis_simpanan WHERE kode = 'SS' OR LOWER(nama) LIKE '%sukarela%' LIMIT 1");
            if (!$jenisSS) {
                errorResponse('Jenis Simpanan Sukarela tidak ditemukan di sistem');
            }

            $rekSS = $db->fetch(
                "SELECT id, saldo FROM rekening_simpanan WHERE anggota_id = ? AND jenis_simpanan_id = ? AND status = 'aktif' LIMIT 1",
                [$angsuran['anggota_id'], $jenisSS['id']]
            );

            if ($rekSS) {
                $saldoSukarela = (float) $rekSS['saldo'];
            } else {
                $sumSS = $db->fetch(
                    "SELECT COALESCE(SUM(CASE WHEN kt.dk = 'D' THEN s.jumlah ELSE -s.jumlah END), 0) as saldo
                     FROM simpanan s
                     JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                     WHERE s.anggota_id = ? AND s.jenis_simpanan_id = ?",
                    [$angsuran['anggota_id'], $jenisSS['id']]
                );
                $saldoSukarela = (float) ($sumSS['saldo'] ?? 0);
            }

            if ($saldoSukarela < $totalBayar) {
                errorResponse(
                    'Saldo Simpanan Sukarela tidak mencukupi. Saldo saat ini: Rp ' . 
                    number_format($saldoSukarela, 0, ',', '.') . ', Total tagihan: Rp ' . 
                    number_format($totalBayar, 0, ',', '.')
                );
            }
        }

        $db->beginTransaction();
        try {
            if ($angsuranId) {
                $statusAng = $denda > 0 ? 'terlambat' : 'lunas';
                $db->execute(
                    "UPDATE angsuran SET tgl_bayar=?, denda=?, pokok=?, bunga=?, total=?, status=?, created_by=?, metode_pembayaran=?, akun_kas_id=? WHERE id=?",
                    [
                        $tglBayar,
                        $denda,
                        $pokok,
                        $bunga,
                        $totalBayar,
                        $statusAng,
                        $_SESSION['user_id'],
                        $metodePembayaran,
                        $metodePembayaran === 'transfer' ? $akunKasId : null,
                        $angsuranId
                    ]
                );
            } else {
                $noTrx = generateNo('AG', 'angsuran', 'no_transaksi');
                $angsuranId = $db->insert(
                    "INSERT INTO angsuran (no_transaksi, pinjaman_id, angsuran_ke, tgl_jatuh_tempo, tgl_bayar, pokok, bunga, denda, total, status, created_by, metode_pembayaran, akun_kas_id)
                     VALUES (?,?,0,?,?,?,?,?,?,?,?,?,?)",
                    [
                        $noTrx,
                        $pinjamanId,
                        $tglBayar,
                        $tglBayar,
                        $pokok,
                        $bunga,
                        $denda,
                        $totalBayar,
                        'lunas',
                        $_SESSION['user_id'],
                        $metodePembayaran,
                        $metodePembayaran === 'transfer' ? $akunKasId : null
                    ]
                );
            }

            // Jika pembayaran via Simpanan Sukarela, potong saldo dan catat mutasi simpanan
            if ($metodePembayaran === 'sukarela' && $jenisSS) {
                $saldoBaruSukarela = $saldoSukarela - $totalBayar;
                $rekSSId = $rekSS ? $rekSS['id'] : null;

                if ($rekSSId) {
                    $db->execute("UPDATE rekening_simpanan SET saldo = ? WHERE id = ?", [$saldoBaruSukarela, $rekSSId]);
                } else {
                    $noRekSS = "SS-" . date('Y') . str_pad($angsuran['anggota_id'], 5, '0', STR_PAD_LEFT);
                    $rekSSId = $db->insert(
                        "INSERT INTO rekening_simpanan (no_rekening, anggota_id, jenis_simpanan_id, tgl_buka, saldo, status) VALUES (?, ?, ?, CURDATE(), ?, 'aktif')",
                        [$noRekSS, $angsuran['anggota_id'], $jenisSS['id'], $saldoBaruSukarela]
                    );
                }

                $kodeTrxPenarikan = $db->fetch("SELECT id FROM kode_transaksi_simpanan WHERE kode = 'TRK' OR dk = 'K' ORDER BY (kode = 'TRK') DESC LIMIT 1");
                $kodeTrxId = $kodeTrxPenarikan ? $kodeTrxPenarikan['id'] : 2;

                $noTrxSimpanan = generateNo('TB', 'simpanan', 'no_transaksi');
                $actualAngsuranNoTrx = $angsuranId ? ($db->fetch("SELECT no_transaksi FROM angsuran WHERE id = ?", [$angsuranId])['no_transaksi'] ?? "AG-{$angsuranId}") : ($noTrx ?? "AG-{$angsuranId}");
                $angsuranKeLabel = $angsuran['angsuran_ke'] === 'Manual' ? 'Manual' : 'ke-' . $angsuran['angsuran_ke'];
                $ketSimpanan = "[AG:{$actualAngsuranNoTrx}] Pembayaran Angsuran {$angsuranKeLabel} - {$angsuran['no_pinjaman']}";

                $simpananId = $db->insert(
                    "INSERT INTO simpanan (no_transaksi, anggota_id, jenis_simpanan_id, rekening_id, kode_transaksi_id, tgl_transaksi, jumlah, saldo_sebelum, saldo_sesudah, keterangan, created_by, metode_pembayaran)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sukarela')",
                    [
                        $noTrxSimpanan,
                        $angsuran['anggota_id'],
                        $jenisSS['id'],
                        $rekSSId,
                        $kodeTrxId,
                        $tglBayar,
                        $totalBayar,
                        $saldoSukarela,
                        $saldoBaruSukarela,
                        $ketSimpanan,
                        $_SESSION['user_id']
                    ]
                );
            }

            // Update sisa pinjaman & auto-reschedule sisa angsuran
            $sisaBaru = $angsuran['sisa_pinjaman'] - $pokok;
            $db->execute("UPDATE pinjaman SET sisa_pinjaman = ? WHERE id = ?", [$sisaBaru, $pinjamanId]);

            if ($sisaBaru <= 0) {
                $db->execute("UPDATE pinjaman SET status = 'lunas', sisa_pinjaman = 0 WHERE id = ?", [$pinjamanId]);
                $db->execute("UPDATE angsuran SET status = 'lunas', pokok = 0, total = bunga WHERE pinjaman_id = ? AND status = 'belum'", [$pinjamanId]);
            } else {
                // Reschedule sisa jadwal angsuran yang belum lunas agar total pokok selalu sinkron dengan sisa pinjaman
                $unpaidAngsuran = $db->fetchAll(
                    "SELECT id, angsuran_ke, bunga FROM angsuran WHERE pinjaman_id = ? AND status = 'belum' ORDER BY angsuran_ke ASC",
                    [$pinjamanId]
                );
                $countUnpaid = count($unpaidAngsuran);
                if ($countUnpaid > 0) {
                    $basePokok = floor($sisaBaru / $countUnpaid);
                    $lastPokok = $sisaBaru - ($basePokok * ($countUnpaid - 1));
                    foreach ($unpaidAngsuran as $uIdx => $u) {
                        $isLast = ($uIdx === $countUnpaid - 1);
                        $pVal = $isLast ? $lastPokok : $basePokok;
                        $totVal = $pVal + (float)$u['bunga'];
                        $db->execute("UPDATE angsuran SET pokok = ?, total = ? WHERE id = ?", [$pVal, $totVal, $u['id']]);
                    }
                }
            }

            $anggota = $db->fetch("SELECT nama FROM anggota WHERE id = ?", [$angsuran['anggota_id']]);
            $noBukti = generateNo('AG', 'jurnal', 'no_bukti');
            $ket = 'Angsuran ' . ($angsuran['angsuran_ke'] === 'Manual' ? 'Manual' : 'ke-' . $angsuran['angsuran_ke']) . ' ' . $angsuran['no_pinjaman'] . ' - ' . $anggota['nama'];
            if ($metodePembayaran === 'sukarela') {
                $ket .= ' (Via Simpanan Sukarela)';
            }
            if (!empty($params['keterangan']))
                $ket .= ' (' . $params['keterangan'] . ')';

            $jurnalId = $db->insert(
                "INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, ref_id, total_debit, total_kredit, created_by)
                 VALUES (?,?,?,?,?,?,?,?)",
                [$noBukti, $tglBayar, $ket, 'angsuran', $angsuranId, $totalBayar, $totalBayar, $_SESSION['user_id']]
            );

            if ($totalBayar > 0) {
                $debitAkunId = null;
                if ($metodePembayaran === 'sukarela') {
                    $debitAkunId = $jenisSS['akun_id'] ?? null;
                    if (!$debitAkunId) {
                        $matchedAkun = $db->fetch("SELECT id FROM akun WHERE kode = '206' OR (nama LIKE '%sukarela%' AND tipe = 'kewajiban') OR (nama LIKE '%manasuka%' AND tipe = 'kewajiban') LIMIT 1");
                        $debitAkunId = $matchedAkun ? $matchedAkun['id'] : null;
                    }
                } elseif ($metodePembayaran === 'transfer' && !empty($akunKasId)) {
                    $checkedAkun = $db->fetch("SELECT id FROM akun WHERE id = ? AND is_active = 1", [$akunKasId]);
                    if ($checkedAkun) {
                        $debitAkunId = $checkedAkun['id'];
                    }
                }
                
                if ($debitAkunId) {
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, ?, 0)", [$jurnalId, $debitAkunId, $totalBayar]);
                } else {
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT COALESCE((SELECT id FROM akun WHERE kode='1000' LIMIT 1), (SELECT id FROM akun WHERE kode='100' LIMIT 1), (SELECT id FROM akun WHERE nama LIKE '%Kas%' LIMIT 1))), ?, 0)", [$jurnalId, $totalBayar]);
                }
            }
            if ($pokok > 0) {
                $piutangRow = $db->fetch("SELECT id FROM akun WHERE kode='1200' OR kode='190' OR nama LIKE '%Piutang%' LIMIT 1");
                $akunPiutangId = $angsuran['akun_id'] ?: ($piutangRow ? $piutangRow['id'] : null);
                $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, 0, ?)", [$jurnalId, $akunPiutangId, $pokok]);
            }
            if ($bunga > 0)
                $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT COALESCE((SELECT id FROM akun WHERE kode='4000' LIMIT 1), (SELECT id FROM akun WHERE kode='400' LIMIT 1), (SELECT id FROM akun WHERE nama LIKE '%Pendapatan Jasa%' LIMIT 1), (SELECT id FROM akun WHERE nama LIKE '%Bunga%' AND tipe='pendapatan' LIMIT 1))), 0, ?)", [$jurnalId, $bunga]);
            if ($denda > 0)
                $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT COALESCE((SELECT id FROM akun WHERE kode='4200' LIMIT 1), (SELECT id FROM akun WHERE kode='409' LIMIT 1), (SELECT id FROM akun WHERE nama LIKE '%Denda%' LIMIT 1), (SELECT id FROM akun WHERE nama LIKE '%Lain-lain%' LIMIT 1))), 0, ?)", [$jurnalId, $denda]);

            $db->commit();
            
            // Clear caches via central helper
            clearCache(['member' => $angsuran['anggota_id'], 'loan', 'finance', 'audit', 'saving']);

            // Trigger Web Push Notification if savings was deducted
            if (!empty($simpananId)) {
                try {
                    require_once __DIR__ . '/../config/WebPushHelper.php';
                    WebPushHelper::getInstance()->notifySimpananTransaksi((int) $simpananId);
                } catch (\Throwable $e) {}
            }

            // Log Activity (Payment)
            logActivity('create', 'angsuran', $angsuranId, null, [
                'no_pinjaman' => $angsuran['no_pinjaman'],
                'anggota' => $anggota['nama'],
                'total' => $totalBayar,
                'ke' => $angsuran['angsuran_ke']
            ]);

            successResponse([
                'angsuran_ke' => $angsuran['angsuran_ke'],
                'pokok' => $pokok,
                'bunga' => $bunga,
                'denda' => $denda,
                'total_bayar' => $totalBayar,
                'sisa_pinjaman' => max(0, $sisaBaru)
            ], 'Pembayaran angsuran berhasil');
        } catch (Exception $e) {
            $db->rollBack();
            errorResponse('Gagal memproses pembayaran: ' . $e->getMessage());
        }
        break;

    case 'PUT':
        if (isset($action) && $action === 'pelunasan') {
            checkPermission('angsuran.create');
            if (!$id || !is_numeric($id))
                errorResponse('ID pinjaman diperlukan');

            $pinjamanId = $id;
            $pinjaman = $db->fetch(
                "SELECT p.*, a.nama as anggota_nama, a.id as anggota_id, jp.akun_id
                 FROM pinjaman p 
                 JOIN anggota a ON p.anggota_id = a.id
                 JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
                 WHERE p.id = ? AND p.status = 'cair'",
                [$pinjamanId]
            );
            if (!$pinjaman)
                errorResponse('Pinjaman tidak ditemukan atau bukan status cair', 404);

            // Hitung ulang komponen (server-side, tidak percaya nilai dari client)
            $sisaAngsuran = $db->fetchAll(
                "SELECT * FROM angsuran WHERE pinjaman_id = ? AND status = 'belum' ORDER BY angsuran_ke",
                [$pinjamanId]
            );
            if (empty($sisaAngsuran))
                errorResponse('Tidak ada angsuran yang tersisa');

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

            $sisaPokok = (float) $pinjaman['sisa_pinjaman'];

            // Gunakan nilai bunga/denda custom jika diinput manual oleh admin dari frontend
            if (isset($params['bunga_custom'])) $bungaBerjalan = (float) $params['bunga_custom'];
            if (isset($params['denda_custom'])) $dendaBerjalan = (float) $params['denda_custom'];

            $totalPelunasan = $sisaPokok + $bungaBerjalan + $dendaBerjalan;
            $keterangan = trim($params['keterangan'] ?? '');

            checkAccountingPeriodLock($db, date('Y-m-d'), 'Pelunasan Pinjaman');

            $db->beginTransaction();
            try {
                // Mark semua angsuran sisa sebagai lunas
                $db->execute(
                    "UPDATE angsuran SET tgl_bayar = CURDATE(), status = 'lunas', created_by = ? WHERE pinjaman_id = ? AND status = 'belum'",
                    [$_SESSION['user_id'], $pinjamanId]
                );

                // Update pinjaman jadi lunas
                $db->execute(
                    "UPDATE pinjaman SET status = 'lunas', sisa_pinjaman = 0 WHERE id = ?",
                    [$pinjamanId]
                );

                // Buat jurnal pelunasan
                $noBukti = generateNo('AG', 'jurnal', 'no_bukti');
                $ket = 'Pelunasan Pinjaman ' . $pinjaman['no_pinjaman'] . ' - ' . $pinjaman['anggota_nama'];
                if ($keterangan)
                    $ket .= ' (' . $keterangan . ')';

                $jurnalId = $db->insert(
                    "INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, ref_id, total_debit, total_kredit, created_by)
                     VALUES (?,CURDATE(),?,?,?,?,?,?)",
                    [$noBukti, $ket, 'pelunasan_pinjaman', $pinjamanId, $totalPelunasan, $totalPelunasan, $_SESSION['user_id']]
                );

                // D: Kas — total yang diterima
                if ($totalPelunasan > 0)
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT COALESCE((SELECT id FROM akun WHERE kode='1000' LIMIT 1), (SELECT id FROM akun WHERE kode='100' LIMIT 1), (SELECT id FROM akun WHERE nama LIKE '%Kas%' LIMIT 1))), ?, 0)", [$jurnalId, $totalPelunasan]);
                // K: Piutang Pinjaman (Dynamic) — pokok
                if ($sisaPokok > 0) {
                    $piutangRow = $db->fetch("SELECT id FROM akun WHERE kode='1200' OR kode='190' OR nama LIKE '%Piutang%' LIMIT 1");
                    $akunPiutangId = $pinjaman['akun_id'] ?: ($piutangRow ? $piutangRow['id'] : null);
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, 0, ?)", [$jurnalId, $akunPiutangId, $sisaPokok]);
                }
                // K: Pendapatan Bunga
                if ($bungaBerjalan > 0)
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT COALESCE((SELECT id FROM akun WHERE kode='4000' LIMIT 1), (SELECT id FROM akun WHERE kode='400' LIMIT 1), (SELECT id FROM akun WHERE nama LIKE '%Pendapatan Jasa%' LIMIT 1), (SELECT id FROM akun WHERE nama LIKE '%Bunga%' AND tipe='pendapatan' LIMIT 1))), 0, ?)", [$jurnalId, $bungaBerjalan]);
                // K: Pendapatan Denda
                if ($dendaBerjalan > 0)
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT COALESCE((SELECT id FROM akun WHERE kode='4200' LIMIT 1), (SELECT id FROM akun WHERE kode='409' LIMIT 1), (SELECT id FROM akun WHERE nama LIKE '%Denda%' LIMIT 1), (SELECT id FROM akun WHERE nama LIKE '%Lain-lain%' LIMIT 1))), 0, ?)", [$jurnalId, $dendaBerjalan]);

                $db->commit();
                
                // Clear caches via central helper
                clearCache(['member' => $pinjaman['anggota_id'], 'loan', 'finance', 'audit']);

                // Log Activity (Payoff)
                logActivity('update', 'pinjaman', $pinjamanId, [
                    'status' => 'cair'
                ], [
                    'status' => 'lunas',
                    'action' => 'pelunasan_dipercepat',
                    'total_bayar' => $totalPelunasan,
                    'no_pinjaman' => $pinjaman['no_pinjaman']
                ]);

                successResponse([
                    'no_bukti' => $noBukti,
                    'sisa_pokok' => $sisaPokok,
                    'bunga' => $bungaBerjalan,
                    'denda' => $dendaBerjalan,
                    'total_pelunasan' => $totalPelunasan,
                ], 'Pelunasan pinjaman berhasil');
            } catch (Exception $e) {
                $db->rollBack();
                errorResponse('Gagal memproses pelunasan: ' . $e->getMessage());
            }
        } else {
            checkPermission('angsuran.create');
        if (empty($id)) {
            errorResponse('ID Angsuran diperlukan');
        }

        $original = $db->fetch(
            "SELECT ag.*, p.anggota_id, p.id as p_id, p.no_pinjaman, p.jumlah as jumlah_pinjaman, p.sisa_pinjaman, jp.akun_id
             FROM angsuran ag 
             JOIN pinjaman p ON ag.pinjaman_id = p.id
             JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
             WHERE ag.id = ?",
            [$id]
        );
        if (!$original) {
            errorResponse('Data angsuran tidak ditemukan');
        }
        if ($original['status'] === 'belum') {
            errorResponse('Angsuran belum dibayar, tidak dapat dikoreksi');
        }

        $pinjaman = $db->fetch("SELECT * FROM pinjaman WHERE id = ?", [$original['pinjaman_id']]);
        if (!$pinjaman) {
            errorResponse('Pinjaman tidak ditemukan');
        }

        $manualPokok = $params['pokok'] ?? $original['pokok'];
        $manualBunga = $params['bunga'] ?? $original['bunga'];
        $manualDenda = $params['denda'] ?? $original['denda'];
        $tglTransaksi = $params['tgl_transaksi'] ?? $original['tgl_bayar'];

        checkAccountingPeriodLock($db, $original['tgl_bayar'], 'Koreksi Angsuran');
        checkAccountingPeriodLock($db, $tglTransaksi, 'Koreksi Angsuran');
        $metodePembayaran = $params['metode_pembayaran'] ?? $original['metode_pembayaran'];
        $akunKasId = $params['akun_kas_id'] ?? $original['akun_kas_id'];

        $tglBayar = $tglTransaksi ? $tglTransaksi : date('Y-m-d');
        $pokok = floatval($manualPokok);
        $bunga = floatval($manualBunga);
        $denda = floatval($manualDenda);
        $totalBayar = $pokok + $bunga + $denda;

        $adjustment = floatval($original['pokok']) - $pokok;
        $newSisaPinjaman = floatval($pinjaman['sisa_pinjaman']) + $adjustment;

        if ($newSisaPinjaman < 0) {
            errorResponse('Sisa pinjaman tidak boleh negatif setelah koreksi. Sisa pinjaman saat ini: Rp ' . number_format($pinjaman['sisa_pinjaman'], 0, ',', '.'));
        }

        $db->beginTransaction();
        try {
            $statusAng = $denda > 0 ? 'terlambat' : 'lunas';

            $db->execute(
                "UPDATE angsuran SET 
                    tgl_bayar = ?, 
                    pokok = ?, 
                    bunga = ?, 
                    denda = ?, 
                    total = ?, 
                    status = ?, 
                    metode_pembayaran = ?, 
                    akun_kas_id = ? 
                 WHERE id = ?",
                [
                    $tglBayar,
                    $pokok,
                    $bunga,
                    $denda,
                    $totalBayar,
                    $statusAng,
                    $metodePembayaran,
                    $metodePembayaran === 'transfer' ? $akunKasId : null,
                    $id
                ]
            );

            $db->execute(
                "UPDATE pinjaman SET sisa_pinjaman = ? WHERE id = ?",
                [$newSisaPinjaman, $original['pinjaman_id']]
            );

            $jurnal = $db->fetch("SELECT id FROM jurnal WHERE ref_tipe='angsuran' AND ref_id=?", [$id]);
            if ($jurnal) {
                $anggota = $db->fetch("SELECT nama FROM anggota WHERE id = ?", [$pinjaman['anggota_id']]);
                $ket = "Angsuran Ke-" . $original['angsuran_ke'] . " - " . $anggota['nama'] . " (Pinjaman: " . $pinjaman['no_pinjaman'] . ")";
                if (!empty($params['keterangan'])) {
                    $ket .= ' (' . $params['keterangan'] . ')';
                }

                $db->execute(
                    "UPDATE jurnal SET 
                        tgl_transaksi = ?, 
                        keterangan = ?, 
                        total_debit = ?, 
                        total_kredit = ? 
                     WHERE id = ?",
                    [$tglBayar, $ket, $totalBayar, $totalBayar, $jurnal['id']]
                );

                $db->execute("DELETE FROM jurnal_detail WHERE jurnal_id = ?", [$jurnal['id']]);

                if ($totalBayar > 0) {
                    $debitAkunId = null;
                    if ($metodePembayaran === 'sukarela') {
                        $jenisSS = $db->fetch("SELECT akun_id FROM jenis_simpanan WHERE kode = 'SS' OR LOWER(nama) LIKE '%sukarela%' LIMIT 1");
                        $debitAkunId = $jenisSS ? $jenisSS['akun_id'] : null;
                        if (!$debitAkunId) {
                            $matchedAkun = $db->fetch("SELECT id FROM akun WHERE kode = '206' OR (nama LIKE '%sukarela%' AND tipe = 'kewajiban') OR (nama LIKE '%manasuka%' AND tipe = 'kewajiban') LIMIT 1");
                            $debitAkunId = $matchedAkun ? $matchedAkun['id'] : null;
                        }
                    } elseif ($metodePembayaran === 'transfer' && !empty($akunKasId)) {
                        $checkedAkun = $db->fetch("SELECT id FROM akun WHERE id = ? AND is_active = 1", [$akunKasId]);
                        if ($checkedAkun) {
                            $debitAkunId = $checkedAkun['id'];
                        }
                    }
                    
                    if ($debitAkunId) {
                        $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, ?, 0)", [$jurnal['id'], $debitAkunId, $totalBayar]);
                    } else {
                        $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT COALESCE((SELECT id FROM akun WHERE kode='1000' LIMIT 1), (SELECT id FROM akun WHERE kode='100' LIMIT 1), (SELECT id FROM akun WHERE nama LIKE '%Kas%' LIMIT 1))), ?, 0)", [$jurnal['id'], $totalBayar]);
                    }
                }
                if ($pokok > 0) {
                    $piutangRow = $db->fetch("SELECT id FROM akun WHERE kode='1200' OR kode='190' OR nama LIKE '%Piutang%' LIMIT 1");
                    $akunPiutangId = $original['akun_id'] ?: ($piutangRow ? $piutangRow['id'] : null);
                    if ($akunPiutangId) {
                        $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, 0, ?)", [$jurnal['id'], $akunPiutangId, $pokok]);
                    }
                }
                if ($bunga > 0) {
                    $pendapatanRow = $db->fetch("SELECT id FROM akun WHERE kode='4100' OR kode='410' OR nama LIKE '%Pendapatan Bunga%' OR nama LIKE '%Pendapatan Jasa%' LIMIT 1");
                    $akunPendapatanId = $pendapatanRow ? $pendapatanRow['id'] : null;
                    if ($akunPendapatanId) {
                        $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, 0, ?)", [$jurnal['id'], $akunPendapatanId, $bunga]);
                    }
                }
                if ($denda > 0) {
                    $dendaRow = $db->fetch("SELECT id FROM akun WHERE kode='4200' OR kode='420' OR nama LIKE '%Pendapatan Denda%' OR nama LIKE '%Denda%' LIMIT 1");
                    $akunDendaId = $dendaRow ? $dendaRow['id'] : null;
                    if ($akunDendaId) {
                        $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, 0, ?)", [$jurnal['id'], $akunDendaId, $denda]);
                    }
                }
            }

            $db->commit();
            clearCache(['member' => $pinjaman['anggota_id'], 'loan', 'finance', 'audit', 'saving']);

            logActivity('update', 'angsuran', $id, $original, [
                'tgl_bayar' => $tglBayar,
                'pokok' => $pokok,
                'bunga' => $bunga,
                'denda' => $denda,
                'total' => $totalBayar,
                'metode_pembayaran' => $metodePembayaran,
                'akun_kas_id' => $akunKasId
            ]);

            successResponse(['id' => $id, 'sisa_pinjaman' => $newSisaPinjaman], 'Koreksi pembayaran angsuran berhasil');
        } catch (Exception $e) {
            $db->rollBack();
            errorResponse('Gagal mengoreksi pembayaran: ' . $e->getMessage());
        }
        }
        break;

    default:
        errorResponse('Method not allowed', 405);
}
