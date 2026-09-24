<?php
/**
 * ============================================================================
 * SCRIPT REKONSILIASI & PERBAIKAN BAKI DEBET PINJAMAN KE SALDO REAL
 * Koperasi Simpan Pinjam - Server Production & Development
 * ============================================================================
 * 
 * Penggunaan:
 *   php repair_bakidebet_saldo_real.php --dry-run   (Simulasi pengecekan)
 *   php repair_bakidebet_saldo_real.php             (Eksekusi perbaikan nyata)
 * 
 * Target Perbaikan Data Real:
 *   1. ERLITAWANTY  - Berjangka 1 (B1): Rp 6.600.000, Berjangka 2 (B2): Rp 16.200.000
 *   2. RICKY        - Berjangka 2 (B2): Rp 10.000.000 (Plafon & Sisa diselaraskan)
 *   3. USTATIK      - Berjangka 2 (B2): Rp 11.028.256
 *   4. SURURI       - Berjangka 2 (B2): Rp 3.000.000
 *   5. REO SUHANAFI - Berjangka 1 (B1): Rp 23.610.556, Insidental: Rp 5.000.000 (Aktifkan kembali)
 *   6. AFIF SUBHAN  - Berjangka 1 (B1): Rp 500.000 (Aktifkan kembali), Insidental: Rp 10.000.000 (Koreksi Plafon & Sisa)
 * ============================================================================
 */

if (php_sapi_name() !== 'cli') {
    die("Script ini hanya dapat dijalankan melalui terminal / CLI.\n");
}

define('PREVENT_DIRECT_ACCESS', true);

require_once __DIR__ . '/api/config/env.php';
require_once __DIR__ . '/api/config/app.php';
require_once __DIR__ . '/api/config/database.php';

$dryRun = in_array('--dry-run', $argv);

function out(string $msg, string $lvl = 'INFO'): void {
    $icons = [
        'INFO' => '  ℹ️ ',
        'OK'   => '  ✅',
        'WARN' => '  ⚠️ ',
        'ERR'  => '  ❌',
        'SKIP' => '  ⏭️ '
    ];
    echo ($icons[$lvl] ?? '     ') . " {$msg}\n";
}

function header_sec(string $title): void {
    echo "\n" . str_repeat('─', 72) . "\n  {$title}\n" . str_repeat('─', 72) . "\n";
}

echo "\n╔══════════════════════════════════════════════════════════════════════╗\n";
echo "║      PERBAIKAN & SINKRONISASI BAKI DEBET PINJAMAN KE SALDO REAL      ║\n";
echo "╚══════════════════════════════════════════════════════════════════════╝\n";
echo ($dryRun ? "  MODE: DRY-RUN (Hanya simulasi, data TIDAK diubah)\n" : "  MODE: EKSEKUSI NYATA (Data akan diperbarui ke database)\n");
echo "  Waktu Eksekusi: " . date('Y-m-d H:i:s') . "\n";

$db = Database::getInstance();
$pdo = $db->getConnection();

// Konfigurasi target perbaikan data real
$repairTargets = [
    [
        'anggota_nama' => 'ERLITAWANTY',
        'no_pinjaman'  => '25.31.0000088.01',
        'jenis_kode'   => 'PB1', // Pinjaman Berjangka 1
        'pinjaman_id'  => 1816,
        'target_sisa'  => 6600000,
        'target_plafon'=> null,
        'set_status'   => 'cair',
        'deskripsi'    => 'Erlitawanty B1 Saldo Real Rp 6.600.000'
    ],
    [
        'anggota_nama' => 'ERLITAWANTY',
        'no_pinjaman'  => '25.32.0000088.01',
        'jenis_kode'   => 'PB2', // Pinjaman Berjangka 2
        'pinjaman_id'  => 1817,
        'target_sisa'  => 16200000,
        'target_plafon'=> null,
        'set_status'   => 'cair',
        'deskripsi'    => 'Erlitawanty B2 Saldo Real Rp 16.200.000 (Sinkronisasi Jadwal Angsuran Pokok)'
    ],
    [
        'anggota_nama' => 'RICKY SETYA PRAYOGO',
        'no_pinjaman'  => '26.32.0000096.01',
        'jenis_kode'   => 'PB2', // Pinjaman Berjangka 2
        'pinjaman_id'  => 1862,
        'target_sisa'  => 10000000,
        'target_plafon'=> 10000000,
        'set_status'   => 'cair',
        'deskripsi'    => 'Ricky B2 Saldo Real Rp 10.000.000 (Penyesuaian Plafon & Baki Debet)'
    ],
    [
        'anggota_nama' => 'USTATIK',
        'no_pinjaman'  => '24.32.0000016.01',
        'jenis_kode'   => 'PB2', // Pinjaman Berjangka 2
        'pinjaman_id'  => 1805,
        'target_sisa'  => 11028256,
        'target_plafon'=> null,
        'set_status'   => 'cair',
        'deskripsi'    => 'Ustatik B2 Saldo Real Rp 11.028.256'
    ],
    [
        'anggota_nama' => 'SURURI',
        'no_pinjaman'  => '26.32.0000006.01',
        'jenis_kode'   => 'PB2', // Pinjaman Berjangka 2
        'pinjaman_id'  => 1798,
        'target_sisa'  => 3000000,
        'target_plafon'=> null,
        'set_status'   => 'cair',
        'deskripsi'    => 'Sururi B2 Saldo Real Rp 3.000.000'
    ],
    [
        'anggota_nama' => 'REO SUHANAFI',
        'no_pinjaman'  => '26.31.0000084.01',
        'jenis_kode'   => 'PB1', // Pinjaman Berjangka 1
        'pinjaman_id'  => 1848,
        'target_sisa'  => 23610556,
        'target_plafon'=> null,
        'set_status'   => 'cair',
        'deskripsi'    => 'Reo Suhanafi B1 Saldo Real Rp 23.610.556'
    ],
    [
        'anggota_nama' => 'REO SUHANAFI',
        'no_pinjaman'  => '26.33.0000084.01',
        'jenis_kode'   => 'PINS', // Pinjaman Insidental
        'pinjaman_id'  => 1849,
        'target_sisa'  => 5000000,
        'target_plafon'=> null,
        'set_status'   => 'cair',
        'deskripsi'    => 'Reo Suhanafi Insidental Saldo Real Rp 5.000.000 (Re-aktivasi Pinjaman)'
    ],
    [
        'anggota_nama' => 'AFIF SUBHAN',
        'no_pinjaman'  => '25.31.0000073.01',
        'jenis_kode'   => 'PB1', // Pinjaman Berjangka 1
        'pinjaman_id'  => 1840,
        'target_sisa'  => 500000,
        'target_plafon'=> null,
        'set_status'   => 'cair',
        'deskripsi'    => 'Afif Subhan B1 Saldo Real Rp 500.000 (Re-aktivasi Pinjaman Sisa 1x Angsuran)'
    ],
    [
        'anggota_nama' => 'AFIF SUBHAN',
        'no_pinjaman'  => '26.33.0000073.01',
        'jenis_kode'   => 'PINS', // Pinjaman Insidental
        'pinjaman_id'  => 1841,
        'target_sisa'  => 10000000,
        'target_plafon'=> 10000000,
        'set_status'   => 'cair',
        'deskripsi'    => 'Afif Subhan Insidental Saldo Real Rp 10.000.000 (Koreksi Typo Plafon 1jt -> 10jt)'
    ],
];

if (!$dryRun) {
    $pdo->beginTransaction();
}

$successCount = 0;
$failCount = 0;

foreach ($repairTargets as $idx => $t) {
    $num = $idx + 1;
    header_sec("TARGET #{$num}: {$t['deskripsi']}");

    // Ambil data pinjaman dari DB (utamakan no_pinjaman lalu fallback pinjaman_id)
    $pj = $db->fetch(
        "SELECT p.*, a.nama as nama_anggota, a.no_anggota, jp.nama as jenis_nama, jp.bunga_persen as jp_bunga_persen 
         FROM pinjaman p 
         JOIN anggota a ON p.anggota_id = a.id 
         JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id 
         WHERE p.no_pinjaman = ? OR p.id = ?",
        [$t['no_pinjaman'], $t['pinjaman_id']]
    );

    if (!$pj) {
        out("Pinjaman [{$t['no_pinjaman']}] / ID #{$t['pinjaman_id']} tidak ditemukan!", "ERR");
        $failCount++;
        continue;
    }

    out("Data Saat Ini: [{$pj['no_pinjaman']}] {$pj['nama_anggota']}");
    out("  Status Saat Ini  : {$pj['status']} → Target: {$t['set_status']}");
    out("  Plafon Saat Ini  : Rp " . number_format($pj['jumlah']) . ($t['target_plafon'] ? " → Target: Rp " . number_format($t['target_plafon']) : ""));
    out("  Sisa DB Saat Ini : Rp " . number_format($pj['sisa_pinjaman']) . " → Target: Rp " . number_format($t['target_sisa']));

    // Ambil baris jadwal angsuran
    $angs = $db->fetchAll(
        "SELECT id, angsuran_ke, tgl_jatuh_tempo, tgl_bayar, pokok, bunga, total, status 
         FROM angsuran 
         WHERE pinjaman_id = ? 
         ORDER BY angsuran_ke ASC",
        [$pj['id']]
    );

    $unpaidAngs = [];
    $paidAngs = [];
    foreach ($angs as $a) {
        if ($a['status'] === 'lunas' && $a['tgl_bayar'] !== null) {
            $paidAngs[] = $a;
        } elseif ($a['status'] === 'lunas' && $a['tgl_bayar'] === null) {
            // Migrasi lunas tanpa tgl_bayar
            $paidAngs[] = $a;
        } else {
            $unpaidAngs[] = $a;
        }
    }

    out("  Jadwal Angsuran  : Total " . count($angs) . " angsuran (" . count($paidAngs) . " lunas, " . count($unpaidAngs) . " belum lunas)");

    // Tentukan aksi penyesuaian jadwal angsuran
    $targetSisa = (float)$t['target_sisa'];
    $targetPlafon = $t['target_plafon'] ? (float)$t['target_plafon'] : (float)$pj['jumlah'];

    // Jika pinjaman tidak memiliki angsuran belum lunas (misal terlanjur di-set lunas semua seperti Afif B1),
    // kita ubah angsuran terakhir atau buat angsuran baru untuk menampung sisa saldo real
    if (count($unpaidAngs) === 0 && $targetSisa > 0) {
        $lastAng = end($angs);
        if ($lastAng) {
            out("  Membuka kembali angsuran terakhir (Ke-{$lastAng['angsuran_ke']}) menjadi status 'belum' dengan pokok Rp " . number_format($targetSisa), "WARN");
            if (!$dryRun) {
                $pdo->prepare("UPDATE angsuran SET status = 'belum', tgl_bayar = NULL, pokok = ?, total = ? + bunga WHERE id = ?")
                    ->execute([$targetSisa, $targetSisa, $lastAng['id']]);
            }
        }
    } elseif (count($unpaidAngs) > 0 && $targetSisa > 0) {
        // Redistribusi sisa saldo real ke baris angsuran yang belum lunas
        $countUnpaid = count($unpaidAngs);
        $basePokok = floor($targetSisa / $countUnpaid);
        $lastPokok = $targetSisa - ($basePokok * ($countUnpaid - 1));

        out("  Menyelaraskan {$countUnpaid} jadwal angsuran belum lunas (Base: Rp " . number_format($basePokok) . ", Terakhir: Rp " . number_format($lastPokok) . ")", "INFO");

        if (!$dryRun) {
            foreach ($unpaidAngs as $uIdx => $u) {
                $isLast = ($uIdx === $countUnpaid - 1);
                $pVal = $isLast ? $lastPokok : $basePokok;
                $bVal = (float)$u['bunga'];
                $totVal = $pVal + $bVal;

                $pdo->prepare("UPDATE angsuran SET pokok = ?, total = ?, status = 'belum' WHERE id = ?")
                    ->execute([$pVal, $totVal, $u['id']]);
            }
        }
    }

    // Update Header Pinjaman
    if (!$dryRun) {
        $updateSql = "UPDATE pinjaman SET sisa_pinjaman = ?, status = ?";
        $updateParams = [$targetSisa, $t['set_status']];

        if ($t['target_plafon']) {
            $updateSql .= ", jumlah = ?";
            $updateParams[] = $targetPlafon;
        }

        $updateSql .= " WHERE id = ?";
        $updateParams[] = $pj['id'];

        $pdo->prepare($updateSql)->execute($updateParams);

        out("Pinjaman [{$pj['no_pinjaman']}] (ID #{$pj['id']}) berhasil diperbarui ke Saldo Real Rp " . number_format($targetSisa), "OK");
    } else {
        out("[DRY-RUN] Akan memperbarui pinjaman [{$pj['no_pinjaman']}] (ID #{$pj['id']}) -> Sisa: Rp " . number_format($targetSisa) . ", Status: {$t['set_status']}", "SKIP");
    }

    $successCount++;
}

// Rekalibrasi GL jika diperlukan agar Modul dan GL 100% seimbang
header_sec("VERIFIKASI & PENYELARASAN REKONSILIASI GL VS MODUL PINJAMAN");

$openingJurnal = $db->fetch("SELECT id, no_bukti FROM jurnal WHERE no_bukti = 'JRN2026060008' OR ref_tipe = 'saldo_awal_neraca' LIMIT 1");
$selisihAkun = $db->fetch("SELECT id, kode, nama FROM akun WHERE kode = '3999' OR nama LIKE '%Selisih Saldo Awal%' LIMIT 1");

$allPinjAkun = $db->fetchAll(
    "SELECT ak.id as akun_id, ak.kode, ak.nama as akun_nama, ak.saldo_normal 
     FROM akun ak 
     JOIN jenis_pinjaman jp ON ak.id = jp.akun_id 
     WHERE jp.is_active = 1 
     GROUP BY ak.id"
);

foreach ($allPinjAkun as $ap) {
    $mod = (float)($db->fetch(
        "SELECT COALESCE(SUM(p.sisa_pinjaman),0) as t 
         FROM pinjaman p 
         JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id 
         WHERE jp.akun_id = ? AND p.status = 'cair'", 
        [$ap['akun_id']]
    )['t'] ?? 0);

    $gl = (float)($db->fetch(
        "SELECT CASE WHEN ak.saldo_normal='D' THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0) 
                     ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0) END as s 
         FROM akun ak 
         LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id 
         WHERE ak.id = ? 
         GROUP BY ak.id, ak.saldo_normal", 
        [$ap['akun_id']]
    )['s'] ?? 0);

    $diff = $mod - $gl;

    if (abs($diff) >= 1 && $openingJurnal && $selisihAkun) {
        $openEntry = $db->fetch("SELECT id, debit, kredit FROM jurnal_detail WHERE jurnal_id = ? AND akun_id = ?", [$openingJurnal['id'], $ap['akun_id']]);
        $selisihEntry = $db->fetch("SELECT id, debit FROM jurnal_detail WHERE jurnal_id = ? AND akun_id = ?", [$openingJurnal['id'], $selisihAkun['id']]);

        if ($openEntry && $selisihEntry) {
            $newDebitOpen = ((float)$openEntry['debit']) + $diff;
            $newDebitSelisih = ((float)$selisihEntry['debit']) - $diff;

            out("Menyelaraskan Akun {$ap['kode']} - {$ap['akun_nama']} di Saldo Awal: GL Rp " . number_format($gl) . " → Modul Rp " . number_format($mod) . " (Diff: " . ($diff >= 0 ? '+' : '') . number_format($diff) . ")", "WARN");

            if (!$dryRun) {
                $pdo->prepare("UPDATE jurnal_detail SET debit = ? WHERE id = ?")->execute([$newDebitOpen, $openEntry['id']]);
                $pdo->prepare("UPDATE jurnal_detail SET debit = ? WHERE id = ?")->execute([$newDebitSelisih, $selisihEntry['id']]);
            }
        }
    }

    // Re-check status
    $glAfter = (float)($db->fetch(
        "SELECT CASE WHEN ak.saldo_normal='D' THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0) 
                     ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0) END as s 
         FROM akun ak 
         LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id 
         WHERE ak.id = ? 
         GROUP BY ak.id, ak.saldo_normal", 
        [$ap['akun_id']]
    )['s'] ?? 0);
    $diffAfter = $mod - $glAfter;
    $status = abs($diffAfter) < 2 ? "OK" : "WARN";
    out(sprintf("%-25s | Modul: %15s | GL: %15s | Selisih: %12s", $ap['akun_nama'], number_format($mod, 2), number_format($glAfter, 2), number_format($diffAfter, 2)), $status);
}

if (!$dryRun) {
    $pdo->commit();
    out("\nSeluruh transaksi perbaikan berhasil di-COMMIT ke database.", "OK");

    // Bersihkan Cache Redis
    if (file_exists(__DIR__ . '/api/config/redis.php')) {
        try {
            require_once __DIR__ . '/api/config/redis.php';
            $redis = RedisManager::getInstance();
            $patterns = ['rep_audit_*', 'rep_npl*', 'rep_pinjaman_*', 'rep_neraca_*', 'portal_notif_*'];
            $cleared = 0;
            foreach ($patterns as $pat) {
                foreach ($redis->getKeys($pat) as $k) {
                    $redis->delete($k);
                    $cleared++;
                }
            }
            out("{$cleared} cache key Redis berhasil dibersihkan.", "OK");
        } catch (Exception $e) {
            out("Redis cache bypass: " . $e->getMessage(), "INFO");
        }
    }
} else {
    out("\n[DRY-RUN] Selesai tanpa ada data yang diubah. Jalankan tanpa --dry-run untuk mengeksekusi.", "INFO");
}

echo "\n" . str_repeat('=', 72) . "\n";
echo "Ringkasan: {$successCount} target diproses, {$failCount} gagal.\n";
echo str_repeat('=', 72) . "\n\n";
