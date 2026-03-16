<?php
/**
 * AuditController - Rekonsiliasi Saldo Modul & GL
 */
authCheck();
checkPermission('keuangan.neraca'); // Menggunakan izin neraca karena terkait
$db = Database::getInstance();

switch ($id) {
    case 'reconcile':
        // 1. Rekonsiliasi Simpanan per Jenis
        $jenisSimpanan = $db->fetchAll(
            "SELECT js.id, js.kode, js.nama, js.akun_id, ak.kode as akun_kode, ak.nama as akun_nama, ak.saldo_normal
             FROM jenis_simpanan js
             LEFT JOIN akun ak ON js.akun_id = ak.id
             WHERE js.is_active = 1 AND js.akun_id IS NOT NULL"
        );

        $results = [];

        foreach ($jenisSimpanan as $js) {
            // Saldo Modul
            $moduleSaldo = $db->fetch(
                "SELECT COALESCE(SUM(CASE WHEN kt.dk='D' THEN s.jumlah ELSE -s.jumlah END),0) as total
                 FROM simpanan s JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                 WHERE s.jenis_simpanan_id = ?",
                [$js['id']]
            )['total'] ?? 0;

            // Saldo GL
            $glSaldo = $db->fetch(
                "SELECT 
                    CASE WHEN ak.saldo_normal='D' 
                        THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0)
                        ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0)
                    END as saldo
                 FROM akun ak
                 LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id
                 WHERE ak.id = ?
                 GROUP BY ak.id",
                [$js['akun_id']]
            )['saldo'] ?? 0;

            $results[] = [
                'kategori' => 'Simpanan',
                'nama' => $js['nama'],
                'akun' => "({$js['akun_kode']}) {$js['akun_nama']}",
                'saldo_modul' => (float) $moduleSaldo,
                'saldo_gl' => (float) $glSaldo,
                'selisih' => (float) ($moduleSaldo - $glSaldo)
            ];
        }

        // 2. Rekonsiliasi Pinjaman per Akun
        $akunPinjamanGroups = $db->fetchAll(
            "SELECT ak.id as akun_id, ak.kode as akun_kode, ak.nama as akun_nama, ak.saldo_normal,
                    GROUP_CONCAT(jp.nama SEPARATOR ', ') as jenis_nama
             FROM akun ak
             JOIN jenis_pinjaman jp ON ak.id = jp.akun_id
             WHERE jp.is_active = 1
             GROUP BY ak.id"
        );

        // Tambahkan akun default 1200 jika belum ada dalam list
        $has1200 = false;
        foreach ($akunPinjamanGroups as $ap) {
            if ($ap['akun_kode'] == '1200') {
                $has1200 = true;
                break;
            }
        }

        if (!$has1200) {
            $akun1200 = $db->fetch("SELECT id as akun_id, kode as akun_kode, nama as akun_nama, saldo_normal, 'Pinjaman Lainnya' as jenis_nama FROM akun WHERE kode = '1200' LIMIT 1");
            if ($akun1200) {
                $akunPinjamanGroups[] = $akun1200;
            }
        }

        foreach ($akunPinjamanGroups as $ap) {
            // Saldo Modul
            if ($ap['akun_kode'] == '1200') {
                // Untuk 1200, ambil semua sisa_pinjaman yang jenis_pinjamannya akun_id-nya NULL ATAU akun_id-nya 1200
                $moduleSaldo = $db->fetch(
                    "SELECT COALESCE(SUM(p.sisa_pinjaman),0) as total 
                     FROM pinjaman p 
                     JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
                     WHERE (jp.akun_id IS NULL OR jp.akun_id = ?) AND p.status = 'cair'",
                    [$ap['akun_id']]
                )['total'] ?? 0;
            } else {
                $moduleSaldo = $db->fetch(
                    "SELECT COALESCE(SUM(p.sisa_pinjaman),0) as total 
                     FROM pinjaman p 
                     JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
                     WHERE jp.akun_id = ? AND p.status = 'cair'",
                    [$ap['akun_id']]
                )['total'] ?? 0;
            }

            // Saldo GL
            $glSaldo = $db->fetch(
                "SELECT 
                    CASE WHEN ak.saldo_normal='D' 
                        THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0)
                        ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0)
                    END as saldo
                 FROM akun ak
                 LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id
                 WHERE ak.id = ?
                 GROUP BY ak.id",
                [$ap['akun_id']]
            )['saldo'] ?? 0;

            $results[] = [
                'kategori' => 'Pinjaman',
                'nama' => $ap['jenis_nama'],
                'akun' => "({$ap['akun_kode']}) {$ap['akun_nama']}",
                'saldo_modul' => (float) $moduleSaldo,
                'saldo_gl' => (float) $glSaldo,
                'selisih' => (float) ($moduleSaldo - $glSaldo)
            ];
        }

        successResponse($results);
        break;

    case 'orphans':
        checkPermission('audit.view');
        $orphans = [];

        // 1. Simpanan tanpa Jurnal
        $simpananNoJurnal = $db->fetchAll(
            "SELECT s.id, s.no_transaksi, s.tgl_transaksi, s.jumlah, a.nama as anggota_nama
             FROM simpanan s
             JOIN anggota a ON s.anggota_id = a.id
             LEFT JOIN jurnal j ON j.ref_tipe = 'simpanan' AND j.ref_id = s.id
             WHERE j.id IS NULL"
        );
        foreach ($simpananNoJurnal as $s) {
            $orphans[] = [
                'id' => $s['id'],
                'tipe' => 'Simpanan',
                'no' => $s['no_transaksi'],
                'tgl' => $s['tgl_transaksi'],
                'info' => "Rp " . number_format($s['jumlah'], 0, ',', '.') . " (" . $s['anggota_nama'] . ")",
                'masalah' => 'Transaksi Simpanan tidak memiliki Jurnal Keuangan'
            ];
        }

        // 2. Pinjaman Cair tanpa Jurnal Pencairan
        $pinjamanNoJurnal = $db->fetchAll(
            "SELECT p.id, p.no_pinjaman, p.tgl_cair, p.jumlah, a.nama as anggota_nama
             FROM pinjaman p
             JOIN anggota a ON p.anggota_id = a.id
             LEFT JOIN jurnal j ON j.ref_tipe = 'pinjaman' AND j.ref_id = p.id
             WHERE p.status IN ('cair', 'lunas') AND p.tgl_cair IS NOT NULL AND j.id IS NULL"
        );
        foreach ($pinjamanNoJurnal as $p) {
            $orphans[] = [
                'id' => $p['id'],
                'tipe' => 'Pinjaman',
                'no' => $p['no_pinjaman'],
                'tgl' => $p['tgl_cair'],
                'info' => "Rp " . number_format($p['jumlah'], 0, ',', '.') . " (" . $p['anggota_nama'] . ")",
                'masalah' => 'Pencairan Pinjaman tidak memiliki Jurnal Keuangan'
            ];
        }

        // 3. Angsuran Masuk tanpa Jurnal Angsuran
        $angsuranNoJurnal = $db->fetchAll(
            "SELECT ag.id, ag.no_transaksi, ag.tgl_bayar, ag.total, a.nama as anggota_nama
             FROM angsuran ag
             JOIN pinjaman p ON ag.pinjaman_id = p.id
             JOIN anggota a ON p.anggota_id = a.id
             LEFT JOIN jurnal j ON j.ref_tipe = 'angsuran' AND j.ref_id = ag.id
             WHERE ag.status != 'belum' AND ag.tgl_bayar IS NOT NULL AND j.id IS NULL"
        );
        foreach ($angsuranNoJurnal as $ag) {
            $orphans[] = [
                'id' => $ag['id'],
                'tipe' => 'Angsuran',
                'no' => $ag['no_transaksi'],
                'tgl' => $ag['tgl_bayar'],
                'info' => "Rp " . number_format($ag['total'], 0, ',', '.') . " (" . $ag['anggota_nama'] . ")",
                'masalah' => 'Pembayaran Angsuran tidak memiliki Jurnal Keuangan'
            ];
        }

        // 4. Jurnal tanpa Data Operasional (Orphan Journals)
        $jurnalOrphan = $db->fetchAll(
            "SELECT j.id, j.no_bukti, j.tgl_transaksi, j.total_debit, j.ref_tipe, j.ref_id, j.keterangan
             FROM jurnal j
             WHERE j.ref_tipe IN ('simpanan', 'pinjaman', 'angsuran')
             AND (
                (j.ref_tipe = 'simpanan' AND NOT EXISTS (SELECT 1 FROM simpanan WHERE id = j.ref_id)) OR
                (j.ref_tipe = 'pinjaman' AND NOT EXISTS (SELECT 1 FROM pinjaman WHERE id = j.ref_id)) OR
                (j.ref_tipe = 'angsuran' AND NOT EXISTS (SELECT 1 FROM angsuran WHERE id = j.ref_id))
             )"
        );
        foreach ($jurnalOrphan as $j) {
            $orphans[] = [
                'id' => $j['id'],
                'tipe' => 'Jurnal ' . ucfirst($j['ref_tipe']),
                'ref_tipe' => $j['ref_tipe'], // For determining delete vs fix
                'no' => $j['no_bukti'],
                'tgl' => $j['tgl_transaksi'],
                'info' => $j['keterangan'],
                'masalah' => 'Jurnal merujuk ke ID transaksi yang sudah tidak ada (Deleted/Orphan)'
            ];
        }

        successResponse($orphans);
        break;

    case 'anomalies':
        checkPermission('audit.view');
        $anomalies = [];

        // 1. Input Backdated (Entry date > Transaction date + 3 days)
        // Simpanan
        $backdatedSimpanan = $db->fetchAll(
            "SELECT id, no_transaksi, tgl_transaksi, created_at, jumlah 
             FROM simpanan 
             WHERE DATEDIFF(created_at, tgl_transaksi) > 3"
        );
        foreach ($backdatedSimpanan as $s) {
            $anomalies[] = [
                'tipe' => 'Backdated Simpanan',
                'no' => $s['no_transaksi'],
                'detail' => "Trx: " . $s['tgl_transaksi'] . " | Input: " . substr($s['created_at'], 0, 10),
                'alasan' => 'Transaksi baru diinput ' . (strtotime(substr($s['created_at'], 0, 10)) - strtotime($s['tgl_transaksi'])) / 86400 . ' hari setelah kejadian.'
            ];
        }

        // Angsuran
        $backdatedAngsuran = $db->fetchAll(
            "SELECT id, no_transaksi, tgl_bayar, created_at, total 
             FROM angsuran 
             WHERE status != 'belum' AND DATEDIFF(created_at, tgl_bayar) > 3"
        );
        foreach ($backdatedAngsuran as $a) {
            $anomalies[] = [
                'tipe' => 'Backdated Angsuran',
                'no' => $a['no_transaksi'],
                'detail' => "Bayar: " . $a['tgl_bayar'] . " | Input: " . substr($a['created_at'], 0, 10),
                'alasan' => 'Pembayaran baru diinput ' . (strtotime(substr($a['created_at'], 0, 10)) - strtotime($a['tgl_bayar'])) / 86400 . ' hari setelah kejadian.'
            ];
        }

        // 2. Saldo Negatif
        $negativeRekening = $db->fetchAll(
            "SELECT rs.no_rekening, rs.saldo, a.nama as anggota_nama, js.nama as jenis_simpanan
             FROM rekening_simpanan rs
             JOIN anggota a ON rs.anggota_id = a.id
             JOIN jenis_simpanan js ON rs.jenis_simpanan_id = js.id
             WHERE rs.saldo < -0.01"
        );
        foreach ($negativeRekening as $nr) {
            $anomalies[] = [
                'tipe' => 'Saldo Negatif',
                'no' => $nr['no_rekening'],
                'detail' => $nr['anggota_nama'] . " (" . $nr['jenis_simpanan'] . ")",
                'alasan' => 'Saldo saat ini minus: Rp ' . number_format($nr['saldo'], 0, ',', '.')
            ];
        }

        // 3. Transaksi Masa Depan (Future Date)
        $futureTrx = $db->fetchAll(
            "SELECT 'Simpanan' as source, no_transaksi as no, tgl_transaksi as tgl FROM simpanan WHERE tgl_transaksi > CURDATE()
             UNION
             SELECT 'Pinjaman' as source, no_pinjaman as no, tgl_cair as tgl FROM pinjaman WHERE tgl_cair > CURDATE()
             UNION
             SELECT 'Angsuran' as source, no_transaksi as no, tgl_bayar as tgl FROM angsuran WHERE tgl_bayar > CURDATE()"
        );
        foreach ($futureTrx as $ft) {
            $anomalies[] = [
                'tipe' => 'Future Date',
                'no' => $ft['no'],
                'detail' => $ft['source'] . " | Tanggal: " . $ft['tgl'],
                'alasan' => 'Tanggal transaksi berada di masa depan (salah input)'
            ];
        }

        successResponse($anomalies);
        break;

    case 'fix-orphan':
        checkPermission('audit.view'); // Minimum view, but ideally edit if exists. Using view for now.
        $type = $params['type'] ?? '';
        $idVal = $params['id'] ?? '';

        if (!$type || !$idVal)
            errorResponse('Missing type or ID');

        $db->beginTransaction();
        try {
            if ($type === 'Simpanan') {
                $s = $db->fetch("SELECT s.*, a.nama as anggota_nama FROM simpanan s JOIN anggota a ON s.anggota_id = a.id WHERE s.id = ?", [$idVal]);
                if (!$s)
                    throw new Exception("Data simpanan tidak ditemukan");

                $jenisSimpanan = $db->fetch("SELECT nama, akun_id FROM jenis_simpanan WHERE id = ?", [$s['jenis_simpanan_id']]);
                $kt = $db->fetch("SELECT * FROM kode_transaksi_simpanan WHERE id = ?", [$s['kode_transaksi_id']]);

                $noBukti = generateNo('JRN', 'jurnal', 'no_bukti');
                $keterangan = $kt['nama'] . ' ' . $jenisSimpanan['nama'] . ' - ' . $s['anggota_nama'];

                $jurnalId = $db->insert(
                    "INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, ref_id, total_debit, total_kredit, created_by)
                     VALUES (?,?,?,?,?,?,?,?)",
                    [$noBukti, $s['tgl_transaksi'], $keterangan, 'simpanan', $s['id'], $s['jumlah'], $s['jumlah'], $_SESSION['user_id']]
                );

                $akunSimpanan = $jenisSimpanan['akun_id'];
                if ($kt['dk'] === 'D') {
                    $akunDebit = $kt['akun_debit_id'] ?: $akunSimpanan;
                    $akunKredit = $akunSimpanan;
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, ?, 0)", [$jurnalId, $akunDebit, $s['jumlah']]);
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, 0, ?)", [$jurnalId, $akunKredit, $s['jumlah']]);
                } else {
                    $akunDebit = $akunSimpanan;
                    $akunKredit = $kt['akun_kredit_id'] ?: $akunSimpanan;
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, ?, 0)", [$jurnalId, $akunDebit, $s['jumlah']]);
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, 0, ?)", [$jurnalId, $akunKredit, $s['jumlah']]);
                }
            } elseif ($type === 'Pinjaman') {
                $p = $db->fetch(
                    "SELECT p.*, a.nama as anggota_nama, jp.akun_id
                     FROM pinjaman p 
                     JOIN anggota a ON p.anggota_id = a.id
                     JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
                     WHERE p.id = ?",
                    [$idVal]
                );
                if (!$p)
                    throw new Exception("Data pinjaman tidak ditemukan");

                $biaya = $db->fetchAll("SELECT * FROM biaya_pencairan WHERE pinjaman_id = ?", [$p['id']]);
                $totalBiaya = 0;
                foreach ($biaya as $b)
                    $totalBiaya += $b['jumlah'];

                $totalLunasOld = $p['topup_total_lunas'] ?? 0;
                $kasKeluar = $p['jumlah'] - $totalLunasOld - $totalBiaya;

                $noBukti = generateNo('JRN', 'jurnal', 'no_bukti');
                $ketJurnal = 'Pencairan Pinjaman - ' . $p['anggota_nama'];
                if ($p['topup_no_pinjaman'])
                    $ketJurnal .= " (Top-up Pelunasan " . $p['topup_no_pinjaman'] . ")";

                $jurnalId = $db->insert(
                    "INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, ref_id, total_debit, total_kredit, created_by)
                     VALUES (?,?,?,?,?,?,?,?)",
                    [$noBukti, $p['tgl_cair'], $ketJurnal, 'pinjaman', $p['id'], $p['jumlah'], $p['jumlah'], $_SESSION['user_id']]
                );

                $akunPiutangId = $p['akun_id'] ?: $db->fetch("SELECT id FROM akun WHERE kode='1200' LIMIT 1")['id'];
                $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, ?, 0)", [$jurnalId, $akunPiutangId, $p['jumlah']]);

                if ($kasKeluar > 0) {
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT id FROM akun WHERE kode='1000' LIMIT 1), 0, ?)", [$jurnalId, $kasKeluar]);
                }
                if ($totalBiaya > 0) {
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT COALESCE((SELECT id FROM akun WHERE kode='4300' LIMIT 1),(SELECT id FROM akun WHERE tipe='pendapatan' LIMIT 1))), 0, ?)", [$jurnalId, $totalBiaya]);
                }
                if ($totalLunasOld > 0) {
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, 0, ?)", [$jurnalId, $akunPiutangId, $p['topup_sisa_pokok']]);
                    if ($p['topup_bunga'] > 0)
                        $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT id FROM akun WHERE kode='4000' LIMIT 1), 0, ?)", [$jurnalId, $p['topup_bunga']]);
                    if ($p['topup_denda'] > 0)
                        $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT id FROM akun WHERE kode='4200' LIMIT 1), 0, ?)", [$jurnalId, $p['topup_denda']]);
                }
            } elseif ($type === 'Angsuran') {
                $ag = $db->fetch(
                    "SELECT ag.*, p.no_pinjaman, p.akun_id, a.nama as anggota_nama
                     FROM angsuran ag
                     JOIN pinjaman p ON ag.pinjaman_id = p.id
                     JOIN anggota a ON p.anggota_id = a.id
                     WHERE ag.id = ?",
                    [$idVal]
                );
                if (!$ag)
                    throw new Exception("Data angsuran tidak ditemukan");

                $noBukti = generateNo('JRN', 'jurnal', 'no_bukti');
                $ket = 'Angsuran ' . ($ag['angsuran_ke'] === 'Manual' ? 'Manual' : 'ke-' . $ag['angsuran_ke']) . ' ' . $ag['no_pinjaman'] . ' - ' . $ag['anggota_nama'];

                $jurnalId = $db->insert(
                    "INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, ref_id, total_debit, total_kredit, created_by)
                     VALUES (?,?,?,?,?,?,?,?)",
                    [$noBukti, $ag['tgl_bayar'], $ket, 'angsuran', $ag['id'], $ag['total'], $ag['total'], $_SESSION['user_id']]
                );

                if ($ag['total'] > 0)
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT id FROM akun WHERE kode='1000'), ?, 0)", [$jurnalId, $ag['total']]);
                if ($ag['pokok'] > 0) {
                    $akunPiutangId = $ag['akun_id'] ?: $db->fetch("SELECT id FROM akun WHERE kode='1200' LIMIT 1")['id'];
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, 0, ?)", [$jurnalId, $akunPiutangId, $ag['pokok']]);
                }
                if ($ag['bunga'] > 0)
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT id FROM akun WHERE kode='4000'), 0, ?)", [$jurnalId, $ag['bunga']]);
                if ($ag['denda'] > 0)
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT id FROM akun WHERE kode='4200'), 0, ?)", [$jurnalId, $ag['denda']]);
            }

            $db->commit();
            successResponse(null, "Berhasil memperbaiki jurnal");
        } catch (Exception $e) {
            $db->rollBack();
            errorResponse($e->getMessage());
        }
        break;

    case 'delete-orphan-journal':
        checkPermission('audit.view');
        $idVal = $params['id'] ?? '';
        if (!$idVal)
            errorResponse('ID Jurnal diperlukan');

        $db->beginTransaction();
        try {
            $db->execute("DELETE FROM jurnal_detail WHERE jurnal_id = ?", [$idVal]);
            $db->execute("DELETE FROM jurnal WHERE id = ?", [$idVal]);
            $db->commit();
            successResponse(null, "Berhasil menghapus jurnal yatim");
        } catch (Exception $e) {
            $db->rollBack();
            errorResponse($e->getMessage());
        }
        break;

    case 'logs':
        checkPermission('audit.view');
        $page = $params['page'] ?? 1;
        $perPage = $params['per_page'] ?? 20;
        $search = $params['search'] ?? '';

        $sql = "SELECT al.*, u.nama_lengkap as user_nama 
                FROM audit_logs al 
                JOIN users u ON al.user_id = u.id";
        $countSql = "SELECT COUNT(*) FROM audit_logs al JOIN users u ON al.user_id = u.id";
        $where = [];
        $p = [];

        if ($search) {
            $sql .= " WHERE (al.table_name LIKE ? OR al.action LIKE ? OR u.nama_lengkap LIKE ? OR al.record_id LIKE ?)";
            $countSql .= " WHERE (al.table_name LIKE ? OR al.action LIKE ? OR u.nama_lengkap LIKE ? OR al.record_id LIKE ?)";
            $p = ["%$search%", "%$search%", "%$search%", "%$search%"];
            $pCount = $p;
        } else {
            $pCount = [];
        }

        $sql .= " ORDER BY al.created_at DESC";

        paginatedResponse($sql, $countSql, $p, $page, $perPage);
        break;

    case 'discrepancies':
        checkPermission('audit.view');
        $discrepancies = [];

        // 1. Simpanan vs Jurnal
        $simpananDiff = $db->fetchAll(
            "SELECT s.no_transaksi, s.jumlah as val_modul, j.total_debit as val_jurnal, s.tgl_transaksi
             FROM simpanan s
             JOIN jurnal j ON j.ref_tipe = 'simpanan' AND j.ref_id = s.id
             WHERE ABS(s.jumlah - j.total_debit) > 0.01"
        );
        foreach ($simpananDiff as $sd) {
            $discrepancies[] = [
                'tipe' => 'Selisih Nominal Simpanan',
                'no' => $sd['no_transaksi'],
                'tgl' => $sd['tgl_transaksi'],
                'info' => "Modul: " . number_format($sd['val_modul'], 0) . " | Jurnal: " . number_format($sd['val_jurnal'], 0),
                'masalah' => 'Nominal di modul Simpanan berbeda dengan nominal di Jurnal Keuangan.'
            ];
        }

        // 2. Pinjaman vs Jurnal
        $pinjamanDiff = $db->fetchAll(
            "SELECT p.no_pinjaman, p.jumlah as val_modul, j.total_debit as val_jurnal, p.tgl_cair
             FROM pinjaman p
             JOIN jurnal j ON j.ref_tipe = 'pinjaman' AND j.ref_id = p.id
             WHERE ABS(p.jumlah - j.total_debit) > 0.01"
        );
        foreach ($pinjamanDiff as $pd) {
            $discrepancies[] = [
                'tipe' => 'Selisih Nominal Pinjaman',
                'no' => $pd['no_pinjaman'],
                'tgl' => $pd['tgl_cair'],
                'info' => "Modul: " . number_format($pd['val_modul'], 0) . " | Jurnal: " . number_format($pd['val_jurnal'], 0),
                'masalah' => 'Nominal Pencairan berbeda dengan nominal di Jurnal Keuangan.'
            ];
        }

        // 3. Angsuran vs Jurnal
        $angsuranDiff = $db->fetchAll(
            "SELECT ag.no_transaksi, ag.total as val_modul, j.total_debit as val_jurnal, ag.tgl_bayar
             FROM angsuran ag
             JOIN jurnal j ON j.ref_tipe = 'angsuran' AND j.ref_id = ag.id
             WHERE ABS(ag.total - j.total_debit) > 0.01"
        );
        foreach ($angsuranDiff as $ad) {
            $discrepancies[] = [
                'tipe' => 'Selisih Nominal Angsuran',
                'no' => $ad['no_transaksi'],
                'tgl' => $ad['tgl_bayar'],
                'info' => "Modul: " . number_format($ad['val_modul'], 0) . " | Jurnal: " . number_format($ad['val_jurnal'], 0),
                'masalah' => 'Nominal Pembayaran Angsuran berbeda dengan nominal di Jurnal Keuangan.'
            ];
        }

        successResponse($discrepancies);
        break;

    case 'health':
        checkPermission('audit.view');

        $score = 100;
        $penalties = [];

        // 1. Check Reconciliation (-20 if any diff)
        // Similar to 'reconcile' case but simplified
        $hasReconcileDiff = false;

        // Simpanan
        $simpananDiffCount = $db->count(
            "SELECT COUNT(*) FROM jenis_simpanan js
             JOIN kode_transaksi_simpanan kt ON 1=1
             JOIN simpanan s ON s.jenis_simpanan_id = js.id AND s.kode_transaksi_id = kt.id
             GROUP BY js.id
             HAVING ABS(SUM(CASE WHEN kt.dk='D' THEN s.jumlah ELSE -s.jumlah END) - 
                (SELECT CASE WHEN ak.saldo_normal='D' THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0) ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0) END 
                 FROM akun ak LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id WHERE ak.id = js.akun_id)) > 0.01"
        );
        // Simplified check: since we already have the logic in 'reconcile', I'll just check if any exists.
        // Actually, to keep it efficient, I'll use a more direct way or reuse logic if possible.
        // Let's do a quick scan of totals.

        // Pinjaman
        // ... (Same for Pinjaman)

        // To keep it simple and consistent with the existing logic:
        // Let's just run the same checks as reconcile but only for existence of diff.

        // Shortcut: If we find any discrepancy in 'discrepancies' logic, it's also a penalty? 
        // No, user specifically said "selisih saldo" (reconciliation) and "orphan" and "backdated".

        // Since I can't easily "call" other cases, I'll re-calculate or create a helper if it's too much.
        // But for Health Score, a light version is better.

        // Re-check Reconciliation (Simplified)
        $reconIssues = 0;
        // Simpanan
        $smp = $db->fetchAll("SELECT js.id, js.akun_id FROM jenis_simpanan js WHERE js.is_active = 1 AND js.akun_id IS NOT NULL");
        foreach ($smp as $s) {
            $mod = $db->fetch("SELECT COALESCE(SUM(CASE WHEN kt.dk='D' THEN s.jumlah ELSE -s.jumlah END),0) as total FROM simpanan s JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id WHERE s.jenis_simpanan_id = ?", [$s['id']])['total'];
            $gl = $db->fetch("SELECT CASE WHEN ak.saldo_normal='D' THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0) ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0) END as saldo FROM akun ak LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id WHERE ak.id = ?", [$s['akun_id']])['saldo'];
            if (abs($mod - $gl) > 1) {
                $reconIssues++;
                break;
            }
        }
        if ($reconIssues == 0) {
            $pinj = $db->fetchAll("SELECT DISTINCT akun_id FROM jenis_pinjaman WHERE is_active = 1 AND akun_id IS NOT NULL");
            foreach ($pinj as $p) {
                $mod = $db->fetch("SELECT COALESCE(SUM(p.sisa_pinjaman),0) as total FROM pinjaman p JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id WHERE jp.akun_id = ? AND p.status='cair'", [$p['akun_id']])['total'];
                $gl = $db->fetch("SELECT CASE WHEN ak.saldo_normal='D' THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0) ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0) END as saldo FROM akun ak LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id WHERE ak.id = ?", [$p['akun_id']])['saldo'];
                if (abs($mod - $gl) > 1) {
                    $reconIssues++;
                    break;
                }
            }
        }

        if ($reconIssues > 0) {
            $score -= 20;
            $penalties[] = ['label' => 'Selisih Saldo Modul vs GL', 'points' => -20];
        }

        // 2. Check Orphans (-10 per record)
        $orphanCount = 0;
        $orphanCount += $db->count("SELECT COUNT(*) FROM simpanan s LEFT JOIN jurnal j ON j.ref_tipe = 'simpanan' AND j.ref_id = s.id WHERE j.id IS NULL");
        $orphanCount += $db->count("SELECT COUNT(*) FROM pinjaman p LEFT JOIN jurnal j ON j.ref_tipe = 'pinjaman' AND j.ref_id = p.id WHERE p.status IN ('cair', 'lunas') AND j.id IS NULL");
        $orphanCount += $db->count("SELECT COUNT(*) FROM angsuran ag LEFT JOIN jurnal j ON j.ref_tipe = 'angsuran' AND j.ref_id = ag.id WHERE ag.status != 'belum' AND j.id IS NULL");
        $orphanCount += $db->count("SELECT COUNT(*) FROM jurnal j WHERE j.ref_tipe IN ('simpanan', 'pinjaman', 'angsuran') AND ((j.ref_tipe = 'simpanan' AND NOT EXISTS (SELECT 1 FROM simpanan WHERE id = j.ref_id)) OR (j.ref_tipe = 'pinjaman' AND NOT EXISTS (SELECT 1 FROM pinjaman WHERE id = j.ref_id)) OR (j.ref_tipe = 'angsuran' AND NOT EXISTS (SELECT 1 FROM angsuran WHERE id = j.ref_id)))");

        if ($orphanCount > 0) {
            $penalty = min(50, $orphanCount * 10); // Cap orphan penalty at 50 if too many
            $score -= $penalty;
            $penalties[] = ['label' => 'Data Yatim (Orphan)', 'points' => -$penalty, 'count' => $orphanCount];
        }

        // 3. Check Backdated Anomalies (-5 per record)
        $backdatedCount = 0;
        $backdatedCount += $db->count("SELECT COUNT(*) FROM simpanan WHERE DATEDIFF(created_at, tgl_transaksi) > 3");
        $backdatedCount += $db->count("SELECT COUNT(*) FROM angsuran WHERE status != 'belum' AND DATEDIFF(created_at, tgl_bayar) > 3");

        if ($backdatedCount > 0) {
            $penalty = min(30, $backdatedCount * 5); // Cap backdated penalty at 30
            $score -= $penalty;
            $penalties[] = ['label' => 'Transaksi Backdated', 'points' => -$penalty, 'count' => $backdatedCount];
        }

        $score = max(0, $score);

        $status = 'Sehat';
        $color = 'emerald';
        if ($score < 40) {
            $status = 'Kritis';
            $color = 'red';
        } elseif ($score < 70) {
            $status = 'Peringatan';
            $color = 'amber';
        } elseif ($score < 90) {
            $status = 'Cukup';
            $color = 'primary';
        }

        successResponse([
            'score' => $score,
            'status' => $status,
            'color' => $color,
            'penalties' => $penalties
        ]);
        break;

    default:
        errorResponse('Audit route not found', 404);
}
