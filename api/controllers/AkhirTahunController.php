<?php
/**
 * Akhir Tahun Controller — Proses Tutup Buku Tahunan
 *
 * Proses Tutup Buku (Closing Entries):
 *  1. Debit semua akun Pendapatan (untuk menolkan saldo)
 *  2. Kredit semua akun Beban     (untuk menolkan saldo)
 *  3. Selisih (SHU) dicatat ke akun Modal "SHU Tahun Berjalan" (tipe modal)
 *
 * Jurnal penutup bertipe ref_tipe = 'akhir_tahun' agar bisa difilter di laporan.
 */
authCheck();
checkPermission('keuangan.laba_rugi');
$db = Database::getInstance();

// ──────────────────────────────────────────────────────────────
// GET: Ringkasan dan status tutup buku per tahun
// ──────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $tahun = $params['tahun'] ?? date('Y');
    $tglAwal = "$tahun-01-01";
    $tglAkhir = "$tahun-12-31";

    // Cek apakah tahun ini sudah ditutup
    $jurnalTutup = $db->fetch(
        "SELECT id, no_bukti, tgl_transaksi, keterangan, created_at
         FROM jurnal
         WHERE ref_tipe = 'akhir_tahun' AND YEAR(tgl_transaksi) = ?
         ORDER BY id DESC LIMIT 1",
        [$tahun]
    );

    // Hitung pendapatan & beban tahun ini (SEBELUM tutup buku)
    $akuns = $db->fetchAll(
        "SELECT ak.kode, ak.nama, ak.tipe, ak.id,
            CASE WHEN ak.saldo_normal='D'
                THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0)
                ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0)
            END as saldo
         FROM akun ak
         LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id
         LEFT JOIN jurnal j ON jd.jurnal_id = j.id
             AND j.tgl_transaksi BETWEEN ? AND ?
             AND j.ref_tipe != 'akhir_tahun'
         WHERE ak.is_active = 1 AND ak.tipe IN ('pendapatan','beban')
         GROUP BY ak.id ORDER BY ak.kode",
        [$tglAwal, $tglAkhir]
    );

    $totalPendapatan = 0;
    $totalBeban = 0;
    $pendapatan = [];
    $beban = [];
    foreach ($akuns as $a) {
        if ($a['tipe'] === 'pendapatan') {
            $totalPendapatan += (float) $a['saldo'];
            $pendapatan[] = $a;
        } else {
            $totalBeban += (float) $a['saldo'];
            $beban[] = $a;
        }
    }
    $shu = $totalPendapatan - $totalBeban;

    // Cek akun tujuan SHU (cari akun modal dengan kode 3900 atau nama mengandung 'SHU')
    $akunSHU = $db->fetch(
        "SELECT * FROM akun WHERE tipe = 'modal' AND (kode LIKE '%SHU%' OR nama LIKE '%SHU%' OR nama LIKE '%Laba%' OR kode = '3900')
         ORDER BY kode LIMIT 1"
    );

    // Riwayat tutup buku
    $riwayat = $db->fetchAll(
        "SELECT j.id, j.no_bukti, j.tgl_transaksi, j.keterangan, j.total_debit as shu, u.nama_lengkap as diproses_oleh
         FROM jurnal j LEFT JOIN users u ON j.created_by = u.id
         WHERE j.ref_tipe = 'akhir_tahun'
         ORDER BY j.tgl_transaksi DESC
         LIMIT 10"
    );

    jsonResponse([
        'success' => true,
        'data' => [
            'tahun' => $tahun,
            'sudah_ditutup' => !empty($jurnalTutup),
            'jurnal_tutup' => $jurnalTutup,
            'pendapatan' => $pendapatan,
            'beban' => $beban,
            'total_pendapatan' => $totalPendapatan,
            'total_beban' => $totalBeban,
            'shu' => $shu,
            'akun_shu_id' => $akunSHU['id'] ?? null,
            'akun_shu_nama' => $akunSHU ? "{$akunSHU['kode']} - {$akunSHU['nama']}" : 'Belum dikonfigurasi',
            'riwayat' => $riwayat
        ]
    ]);
}

// ──────────────────────────────────────────────────────────────
// POST: Lakukan proses tutup buku
// ──────────────────────────────────────────────────────────────
elseif ($method === 'POST') {
    $tahun = $params['tahun'] ?? date('Y');
    $akunSHUId = $params['akun_shu_id'] ?? '';
    $tglTutup = $params['tgl_tutup'] ?? "$tahun-12-31";

    if (empty($akunSHUId))
        errorResponse('Akun tujuan SHU wajib dipilih');

    // Pastikan belum pernah ditutup tahun ini
    $sudahTutup = $db->count(
        "SELECT COUNT(*) FROM jurnal WHERE ref_tipe = 'akhir_tahun' AND YEAR(tgl_transaksi) = ?",
        [$tahun]
    );
    if ($sudahTutup > 0)
        errorResponse("Tahun $tahun sudah pernah ditutup. Gunakan fitur reset jika ingin mengulangi.");

    $tglAwal = "$tahun-01-01";
    $tglAkhir = "$tahun-12-31";

    // Ambil saldo pendapatan & beban (KECUALI jurnal akhir tahun sebelumnya)
    $akuns = $db->fetchAll(
        "SELECT ak.id, ak.kode, ak.nama, ak.tipe, ak.saldo_normal,
            CASE WHEN ak.saldo_normal='D'
                THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0)
                ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0)
            END as saldo
         FROM akun ak
         LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id
         LEFT JOIN jurnal j ON jd.jurnal_id = j.id
             AND j.tgl_transaksi BETWEEN ? AND ?
             AND j.ref_tipe != 'akhir_tahun'
         WHERE ak.is_active = 1 AND ak.tipe IN ('pendapatan','beban')
         GROUP BY ak.id
         HAVING saldo != 0
         ORDER BY ak.kode",
        [$tglAwal, $tglAkhir]
    );

    if (empty($akuns))
        errorResponse('Tidak ada akun pendapatan/beban yang perlu ditutup (semua saldo nol).');

    $totalPendapatan = 0;
    $totalBeban = 0;
    foreach ($akuns as $a) {
        if ($a['tipe'] === 'pendapatan')
            $totalPendapatan += (float) $a['saldo'];
        else
            $totalBeban += (float) $a['saldo'];
    }
    $shu = $totalPendapatan - $totalBeban;

    $db->beginTransaction();
    try {
        $noBukti = "JTB-$tahun-" . strtoupper(substr(uniqid(), -4));
        $keterangan = "Jurnal Penutup Tutup Buku Tahun $tahun";

        $jurnalId = $db->insert(
            "INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, ref_id, total_debit, total_kredit, created_by)
             VALUES (?, ?, ?, 'akhir_tahun', ?, ?, ?, ?)",
            [$noBukti, $tglTutup, $keterangan, $tahun, $totalPendapatan + $totalBeban, $totalPendapatan + $totalBeban, $_SESSION['user_id']]
        );

        // Buat jurnal detail per akun:
        //  - Pendapatan (saldo_normal K): Debit untuk menolkan
        //  - Beban (saldo_normal D): Kredit untuk menolkan
        foreach ($akuns as $a) {
            $saldo = (float) $a['saldo'];
            if ($saldo <= 0)
                continue;

            if ($a['tipe'] === 'pendapatan') {
                // Saldo normal K → untuk menolkan: Debit
                $db->execute(
                    "INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit, keterangan) VALUES (?,?,?,?,?)",
                    [$jurnalId, $a['id'], $saldo, 0, "Menutup " . $a['nama']]
                );
            } else {
                // Saldo normal D → untuk menolkan: Kredit
                $db->execute(
                    "INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit, keterangan) VALUES (?,?,?,?,?)",
                    [$jurnalId, $a['id'], 0, $saldo, "Menutup " . $a['nama']]
                );
            }
        }

        // Transfer SHU ke akun modal tujuan
        if ($shu > 0) {
            // Laba: Kredit ke modal SHU
            $db->execute(
                "INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit, keterangan) VALUES (?,?,?,?,?)",
                [$jurnalId, $akunSHUId, 0, $shu, "Transfer SHU Laba Tahun $tahun"]
            );
        } elseif ($shu < 0) {
            // Rugi: Debit dari modal SHU (mengurangi modal)
            $db->execute(
                "INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit, keterangan) VALUES (?,?,?,?,?)",
                [$jurnalId, $akunSHUId, abs($shu), 0, "Transfer SHU Rugi Tahun $tahun"]
            );
        }

        $db->commit();

        jsonResponse([
            'success' => true,
            'message' => "Tutup buku tahun $tahun berhasil! Jurnal penutup: $noBukti",
            'data' => [
                'jurnal_id' => $jurnalId,
                'no_bukti' => $noBukti,
                'shu' => $shu,
                'total_akun' => count($akuns)
            ]
        ]);
    } catch (Exception $e) {
        $db->rollBack();
        errorResponse('Gagal memproses tutup buku: ' . $e->getMessage());
    }
}

// ──────────────────────────────────────────────────────────────
// DELETE: Batalkan / Reset tutup buku tahun tertentu
// ──────────────────────────────────────────────────────────────
elseif ($method === 'DELETE') {
    checkPermission('role.view'); // Admin only
    $tahun = $params['tahun'] ?? $id ?? date('Y');

    // Hapus jurnal penutup dan detailnya
    $jurnals = $db->fetchAll(
        "SELECT id FROM jurnal WHERE ref_tipe = 'akhir_tahun' AND YEAR(tgl_transaksi) = ?",
        [$tahun]
    );

    if (empty($jurnals))
        errorResponse("Tidak ada tutup buku untuk tahun $tahun");

    $db->beginTransaction();
    try {
        foreach ($jurnals as $j) {
            $db->execute("DELETE FROM jurnal_detail WHERE jurnal_id = ?", [$j['id']]);
            $db->execute("DELETE FROM jurnal WHERE id = ?", [$j['id']]);
        }
        $db->commit();
        jsonResponse(['success' => true, 'message' => "Tutup buku tahun $tahun berhasil direset."]);
    } catch (Exception $e) {
        $db->rollBack();
        errorResponse('Gagal mereset tutup buku: ' . $e->getMessage());
    }
} else {
    errorResponse('Method not allowed', 405);
}
