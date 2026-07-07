<?php
// Angsuran Controller
authCheck();
$db = Database::getInstance();

switch ($method) {
    case 'GET':
        checkPermission('angsuran.view');
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
                "SELECT ag.*, p.no_pinjaman, p.sisa_pinjaman, a.nama as anggota_nama, 
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

            successResponse($next);
        }

        if ($id && is_numeric($id)) {
            $data = $db->fetch(
                "SELECT ag.*, p.no_pinjaman, a.nama as anggota_nama, a.no_anggota,
                        (SELECT COUNT(*) FROM audit_logs WHERE table_name = 'angsuran' AND record_id = ag.id AND action = 'update') as is_edited
                 FROM angsuran ag
                 JOIN pinjaman p ON ag.pinjaman_id = p.id
                 JOIN anggota a ON p.anggota_id = a.id
                 WHERE ag.id = ?",
                [$id]
            );
            if (!$data)
                errorResponse('Angsuran tidak ditemukan', 404);
            successResponse($data);
        } else {
            $search = $params['search'] ?? '';
            $status = $params['status'] ?? '';
            $pinjamanId = $params['pinjaman_id'] ?? '';
            $page = $params['page'] ?? 1;
            $perPage = $params['per_page'] ?? PER_PAGE;

            $where = "WHERE 1=1";
            $binds = [];

            if ($search) {
                $where .= " AND (a.nama LIKE ? OR p.no_pinjaman LIKE ?)";
                $binds[] = "%$search%";
                $binds[] = "%$search%";
            }
            if ($status) {
                $where .= " AND ag.status = ?";
                $binds[] = $status;
            } else {
                $where .= " AND ag.tgl_bayar IS NOT NULL";
            }
            if ($pinjamanId) {
                $where .= " AND ag.pinjaman_id = ?";
                $binds[] = $pinjamanId;
            }

            $metode = $params['metode_pembayaran'] ?? '';
            if ($metode) {
                $where .= " AND ag.metode_pembayaran = ?";
                $binds[] = $metode;
            }

            paginatedResponse(
                "SELECT ag.*, p.no_pinjaman, a.nama as anggota_nama, a.no_anggota,
                        (SELECT COUNT(*) FROM audit_logs WHERE table_name = 'angsuran' AND record_id = ag.id AND action = 'update') as is_edited
                 FROM angsuran ag
                 JOIN pinjaman p ON ag.pinjaman_id = p.id
                 JOIN anggota a ON p.anggota_id = a.id
                 $where ORDER BY ag.tgl_jatuh_tempo DESC",
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
                clearCache(['loan', 'finance', 'audit', 'member' => $pinjaman['anggota_id']]);
                successResponse(null, 'Reversal angsuran berhasil');
            } catch (Exception $e) {
                $db->rollBack();
                errorResponse('Gagal melakukan reversal: ' . $e->getMessage());
            }
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

            $sisaBaru = $angsuran['sisa_pinjaman'] - $pokok;
            $db->execute("UPDATE pinjaman SET sisa_pinjaman = ? WHERE id = ?", [$sisaBaru, $pinjamanId]);

            if ($sisaBaru <= 0) {
                $db->execute("UPDATE pinjaman SET status = 'lunas', sisa_pinjaman = 0 WHERE id = ?", [$pinjamanId]);
            }

            $anggota = $db->fetch("SELECT nama FROM anggota WHERE id = ?", [$angsuran['anggota_id']]);
            $noBukti = generateNo('AG', 'jurnal', 'no_bukti');
            $ket = 'Angsuran ' . ($angsuran['angsuran_ke'] === 'Manual' ? 'Manual' : 'ke-' . $angsuran['angsuran_ke']) . ' ' . $angsuran['no_pinjaman'] . ' - ' . $anggota['nama'];
            if (!empty($params['keterangan']))
                $ket .= ' (' . $params['keterangan'] . ')';

            $jurnalId = $db->insert(
                "INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, ref_id, total_debit, total_kredit, created_by)
                 VALUES (?,?,?,?,?,?,?,?)",
                [$noBukti, $tglBayar, $ket, 'angsuran', $angsuranId, $totalBayar, $totalBayar, $_SESSION['user_id']]
            );

            if ($totalBayar > 0) {
                $debitAkunId = null;
                if ($metodePembayaran === 'transfer' && !empty($akunKasId)) {
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
            clearCache(['member' => $angsuran['anggota_id'], 'loan', 'finance', 'audit']);

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
                    if ($metodePembayaran === 'transfer' && !empty($akunKasId)) {
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
            clearCache(['member' => $pinjaman['anggota_id'], 'loan', 'finance', 'audit']);

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
