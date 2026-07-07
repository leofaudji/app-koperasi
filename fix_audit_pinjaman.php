<?php
/**
 * ============================================================
 *  SCRIPT PERBAIKAN REKONSILIASI AUDIT PINJAMAN
 *  Versi : 1.0.0
 *
 *  CARA PAKAI:
 *    php fix_audit_pinjaman.php --dry-run   (simulasi, tidak ubah data)
 *    php fix_audit_pinjaman.php             (eksekusi nyata)
 *
 *  AMAN: Setiap langkah dicek dulu (idempotent).
 *        Sudah pernah dijalankan tidak akan duplikat data.
 * ============================================================
 */

if (php_sapi_name() !== 'cli') {
    die("Script ini hanya bisa dijalankan dari CLI (command line).\n");
}

define('PREVENT_DIRECT_ACCESS', true);

// Auto-detect direktori root aplikasi
$scriptDir  = __DIR__;
$candidates = [$scriptDir, dirname($scriptDir), dirname(dirname($scriptDir))];
$rootDir    = null;
foreach ($candidates as $dir) {
    if (file_exists($dir . '/api/config/database.php')) {
        $rootDir = $dir;
        break;
    }
}
if (!$rootDir) {
    die("ERROR: Tidak dapat menemukan direktori root aplikasi.\nLetakkan script ini di dalam folder aplikasi.\n");
}

require $rootDir . '/api/config/env.php';
require $rootDir . '/api/config/app.php';
require $rootDir . '/api/config/database.php';

$dryRun = in_array('--dry-run', $argv);

function log_msg(string $msg, string $level = 'INFO'): void {
    $p = ['INFO' => '   ', 'OK' => ' ✅', 'WARN' => ' ⚠️ ', 'ERR' => ' ❌', 'SKIP' => '  ⏭'];
    echo ($p[$level] ?? '   ') . " {$msg}\n";
}

function section(string $title): void {
    echo "\n" . str_repeat('─', 62) . "\n  {$title}\n" . str_repeat('─', 62) . "\n";
}

echo "\n╔════════════════════════════════════════════════════════════╗\n";
echo "║       PERBAIKAN REKONSILIASI AUDIT PINJAMAN               ║\n";
echo "╚════════════════════════════════════════════════════════════╝\n";
echo ($dryRun ? "  MODE: DRY-RUN (simulasi — tidak ada perubahan data)\n" : "  MODE: EKSEKUSI NYATA\n");
echo "  Waktu: " . date('Y-m-d H:i:s') . "\n";

$db = Database::getInstance();

// ═══════════════════════════════════════════════════════════
// LANGKAH 0: DETEKSI OTOMATIS AKUN & JURNAL
// ═══════════════════════════════════════════════════════════
section("LANGKAH 0: Deteksi Konfigurasi");

$kodeToCheck   = ['104', '105', '106', '108'];
$akunPinjaman  = [];
foreach ($kodeToCheck as $kode) {
    $row = $db->fetch("SELECT id, kode, nama FROM akun WHERE kode = ?", [$kode]);
    if ($row) {
        $akunPinjaman[$kode] = $row;
        log_msg("[{$row['id']}] Akun {$kode} — {$row['nama']}", 'OK');
    } else {
        log_msg("Akun kode '{$kode}' tidak ditemukan — dilewati", 'WARN');
    }
}
if (empty($akunPinjaman)) {
    log_msg("Tidak ada akun pinjaman ditemukan. Script dibatalkan.", 'ERR');
    exit(1);
}
$akunIds      = array_map(fn($a) => $a['id'], $akunPinjaman);
$placeholders = implode(',', array_fill(0, count($akunIds), '?'));

// Cari jurnal saldo awal (jurnal yang punya debit ke akun piutang + tidak punya ref_tipe)
$openingJurnal = $db->fetch(
    "SELECT j.id, j.no_bukti, j.tgl_transaksi
     FROM jurnal j
     JOIN jurnal_detail jd ON j.id = jd.jurnal_id
     WHERE jd.akun_id IN ({$placeholders}) AND jd.debit > 0
     GROUP BY j.id
     ORDER BY SUM(jd.debit) DESC
     LIMIT 1",
    array_values($akunIds)
);
if ($openingJurnal) {
    log_msg("Jurnal Saldo Awal: [{$openingJurnal['id']}] {$openingJurnal['no_bukti']} ({$openingJurnal['tgl_transaksi']})", 'OK');
} else {
    log_msg("Jurnal Saldo Awal tidak ditemukan — langkah rekalibrasi akan dilewati", 'WARN');
}

$selisihAkun = $db->fetch("SELECT id, kode, nama FROM akun WHERE kode='3999' OR nama LIKE '%Selisih Saldo Awal%' LIMIT 1");
if ($selisihAkun) {
    log_msg("[{$selisihAkun['id']}] Akun Selisih Saldo Awal: {$selisihAkun['nama']}", 'OK');
} else {
    log_msg("Akun Selisih Saldo Awal tidak ditemukan", 'WARN');
}

$kasAkun = $db->fetch("SELECT id, kode, nama FROM akun WHERE kode='100' OR kode='1000' OR (nama LIKE '%Kas%' AND tipe='kas') ORDER BY kode LIMIT 1");
log_msg("[{$kasAkun['id']}] Akun Kas: {$kasAkun['nama']}", 'OK');

// ═══════════════════════════════════════════════════════════
// LANGKAH 1: BUAT JURNAL PENCAIRAN YANG HILANG
// ═══════════════════════════════════════════════════════════
section("LANGKAH 1: Pinjaman Cair Tanpa Jurnal Pencairan");

$loansNoJurnal = $db->fetchAll(
    "SELECT p.id, p.no_pinjaman, p.jumlah, p.tgl_pencairan, p.created_by,
            a.nama as anggota_nama, jp.akun_id as piutang_akun_id
     FROM pinjaman p
     JOIN anggota a ON p.anggota_id = a.id
     JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
     LEFT JOIN jurnal j ON j.ref_tipe = 'pinjaman' AND j.ref_id = p.id
     WHERE jp.akun_id IN ({$placeholders})
       AND p.status IN ('cair', 'lunas')
       AND p.tgl_pencairan IS NOT NULL
       AND j.id IS NULL
       AND NOT (p.keterangan LIKE '%Migrasi%' OR p.keterangan LIKE '%Saldo Awal%')
     ORDER BY p.tgl_pencairan, p.id",
    array_values($akunIds)
);

log_msg("Ditemukan " . count($loansNoJurnal) . " pinjaman tanpa jurnal");
$fix1Count = 0;

foreach ($loansNoJurnal as $loan) {
    $ym = date('Ym', strtotime($loan['tgl_pencairan']));
    log_msg("[{$loan['id']}] {$loan['no_pinjaman']} | {$loan['anggota_nama']} | Rp " . number_format($loan['jumlah']), 'WARN');

    if (!$dryRun) {
        $lastInMonth = $db->fetch(
            "SELECT no_bukti FROM jurnal WHERE no_bukti LIKE ? ORDER BY id DESC LIMIT 1",
            ['JRN' . $ym . '%']
        )['no_bukti'] ?? 'JRN' . $ym . '0000';
        preg_match('/(\d{4})$/', $lastInMonth, $m);
        $noBukti    = 'JRN' . $ym . str_pad(((int)($m[1] ?? 0)) + 1, 4, '0', STR_PAD_LEFT);
        $keterangan = "Pencairan Pinjaman - {$loan['anggota_nama']} ({$loan['no_pinjaman']})";

        $db->beginTransaction();
        try {
            $jurnalId = $db->insert(
                "INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, ref_id, total_debit, total_kredit, created_by) VALUES (?,?,?,'pinjaman',?,?,?,?)",
                [$noBukti, $loan['tgl_pencairan'], $keterangan, $loan['id'], $loan['jumlah'], $loan['jumlah'], $loan['created_by'] ?? 1]
            );
            $db->execute(
                "INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit, keterangan) VALUES (?,?,?,0,?)",
                [$jurnalId, $loan['piutang_akun_id'], $loan['jumlah'], $keterangan]
            );
            $db->execute(
                "INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit, keterangan) VALUES (?,?,0,?,?)",
                [$jurnalId, $kasAkun['id'], $loan['jumlah'], $keterangan]
            );
            $db->commit();
            log_msg("Jurnal {$noBukti} berhasil dibuat (ID:{$jurnalId})", 'OK');
            $fix1Count++;
        } catch (Exception $e) {
            $db->rollBack();
            log_msg("GAGAL: " . $e->getMessage(), 'ERR');
        }
    } else {
        log_msg("[DRY-RUN] Akan membuat jurnal pencairan", 'SKIP');
        $fix1Count++;
    }
}
log_msg("Fix 1 total: {$fix1Count} jurnal " . ($dryRun ? 'akan dibuat' : 'dibuat'));

// ═══════════════════════════════════════════════════════════
// LANGKAH 2: PERBAIKI sisa_pinjaman
// ═══════════════════════════════════════════════════════════
section("LANGKAH 2: Perbaiki sisa_pinjaman yang Tidak Akurat");

$mismatch = $db->fetchAll(
    "SELECT p.id, p.no_pinjaman, p.jumlah, p.sisa_pinjaman,
            COALESCE(SUM(ag.pokok), 0) as total_paid,
            (p.jumlah - COALESCE(SUM(ag.pokok), 0)) as expected_sisa
     FROM pinjaman p
     JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
     LEFT JOIN angsuran ag ON ag.pinjaman_id = p.id AND ag.status != 'belum'
     WHERE jp.akun_id IN ({$placeholders}) AND p.status = 'cair'
     GROUP BY p.id, p.no_pinjaman, p.jumlah, p.sisa_pinjaman
     HAVING ABS(p.sisa_pinjaman - expected_sisa) >= 1
     ORDER BY ABS(p.sisa_pinjaman - expected_sisa) DESC",
    array_values($akunIds)
);

log_msg("Ditemukan " . count($mismatch) . " pinjaman dengan sisa_pinjaman tidak akurat");
$fix2Count = 0;

foreach ($mismatch as $loan) {
    log_msg("[{$loan['id']}] {$loan['no_pinjaman']}: " . number_format($loan['sisa_pinjaman']) . " → " . number_format($loan['expected_sisa']), 'WARN');
    if (!$dryRun) {
        $db->execute("UPDATE pinjaman SET sisa_pinjaman=? WHERE id=?", [$loan['expected_sisa'], $loan['id']]);
        log_msg("sisa_pinjaman diperbarui", 'OK');
    } else {
        log_msg("[DRY-RUN] Akan update sisa_pinjaman", 'SKIP');
    }
    $fix2Count++;
}
log_msg("Fix 2 total: {$fix2Count} pinjaman " . ($dryRun ? 'akan diperbaiki' : 'diperbaiki'));

// ═══════════════════════════════════════════════════════════
// LANGKAH 3: PINJAMAN sisa=0 → STATUS LUNAS
// ═══════════════════════════════════════════════════════════
section("LANGKAH 3: Tandai Pinjaman sisa=0 sebagai Lunas");

$zeroSisa = $db->fetchAll(
    "SELECT p.id, p.no_pinjaman FROM pinjaman p
     JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
     WHERE jp.akun_id IN ({$placeholders}) AND p.status='cair' AND p.sisa_pinjaman <= 0",
    array_values($akunIds)
);

log_msg("Ditemukan " . count($zeroSisa) . " pinjaman sisa=0 masih berstatus 'cair'");
$fix3Count = 0;
foreach ($zeroSisa as $p) {
    log_msg("[{$p['id']}] {$p['no_pinjaman']}", 'WARN');
    if (!$dryRun) {
        $db->execute("UPDATE pinjaman SET status='lunas' WHERE id=?", [$p['id']]);
        log_msg("Status → lunas", 'OK');
    } else {
        log_msg("[DRY-RUN] Akan ubah ke lunas", 'SKIP');
    }
    $fix3Count++;
}
log_msg("Fix 3 total: {$fix3Count} pinjaman " . ($dryRun ? 'akan dilunaskan' : 'dilunaskan'));

// ═══════════════════════════════════════════════════════════
// LANGKAH 4: REKALIBRASI OPENING BALANCE
// ═══════════════════════════════════════════════════════════
section("LANGKAH 4: Rekalibrasi Saldo Awal Neraca");

if (!$openingJurnal || !$selisihAkun) {
    log_msg("Langkah dilewati — data tidak lengkap", 'WARN');
} else {
    $totalAdj     = 0;
    $adjDetails   = [];

    foreach ($akunPinjaman as $kode => $akun) {
        $akunId = $akun['id'];

        $modulSaldo = (float) ($db->fetch(
            "SELECT COALESCE(SUM(sisa_pinjaman),0) as t FROM pinjaman p JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id=jp.id WHERE jp.akun_id=? AND p.status='cair'",
            [$akunId]
        )['t'] ?? 0);

        $glBreak = $db->fetch(
            "SELECT COALESCE(SUM(jd.debit),0) as td, COALESCE(SUM(jd.kredit),0) as tk FROM jurnal_detail jd WHERE jd.akun_id=?",
            [$akunId]
        );
        $totalDebit  = (float)$glBreak['td'];
        $totalKredit = (float)$glBreak['tk'];

        $openEntry = $db->fetch(
            "SELECT id, debit FROM jurnal_detail WHERE jurnal_id=? AND akun_id=?",
            [$openingJurnal['id'], $akunId]
        );
        if (!$openEntry) {
            log_msg("Akun {$kode}: tidak ada di jurnal saldo awal — dilewati", 'WARN');
            continue;
        }

        $currentOpening  = (float)$openEntry['debit'];
        $postDebit       = $totalDebit - $currentOpening;
        $requiredOpening = $modulSaldo + $totalKredit - $postDebit;
        $adj             = $requiredOpening - $currentOpening;

        $glNet = $totalDebit - $totalKredit;
        $diff  = $modulSaldo - $glNet;
        $icon  = abs($diff) < 1 ? 'OK' : 'WARN';
        log_msg("Akun {$kode}: Modul=" . number_format($modulSaldo) . " | GL=" . number_format($glNet) . " | Selisih=" . number_format($diff), $icon);

        if (abs($adj) < 0.01) {
            log_msg("  Tidak perlu penyesuaian", 'OK');
            continue;
        }

        log_msg("  Opening: " . number_format($currentOpening) . " → " . number_format($requiredOpening) . " (" . ($adj >= 0 ? '+' : '') . number_format($adj) . ")");
        $totalAdj   += $adj;
        $adjDetails[] = ['id' => $openEntry['id'], 'new_debit' => $requiredOpening, 'kode' => $kode];
    }

    if (!empty($adjDetails)) {
        $selisihEntry = $db->fetch(
            "SELECT id, debit FROM jurnal_detail WHERE jurnal_id=? AND akun_id=?",
            [$openingJurnal['id'], $selisihAkun['id']]
        );
        $newSelisih = ((float)($selisihEntry['debit'] ?? 0)) - $totalAdj;
        log_msg("Selisih Saldo Awal: " . number_format($selisihEntry['debit'] ?? 0) . " → " . number_format($newSelisih));

        if (!$dryRun) {
            $db->beginTransaction();
            try {
                foreach ($adjDetails as $adj) {
                    $db->execute("UPDATE jurnal_detail SET debit=? WHERE id=?", [$adj['new_debit'], $adj['id']]);
                    log_msg("Akun {$adj['kode']}: opening diperbarui ke " . number_format($adj['new_debit']), 'OK');
                }
                if ($selisihEntry) {
                    $db->execute("UPDATE jurnal_detail SET debit=? WHERE id=?", [$newSelisih, $selisihEntry['id']]);
                    log_msg("Selisih Saldo Awal diperbarui", 'OK');
                }
                // Verifikasi balance
                $ver = $db->fetch("SELECT SUM(debit) as d, SUM(kredit) as k FROM jurnal_detail WHERE jurnal_id=?", [$openingJurnal['id']]);
                if (abs($ver['d'] - $ver['k']) < 0.02) {
                    $db->commit();
                    log_msg("Jurnal saldo awal BALANCE ✓", 'OK');
                } else {
                    $db->rollBack();
                    log_msg("ROLLBACK! Jurnal tidak balance (diff=" . number_format($ver['d'] - $ver['k']) . ")", 'ERR');
                }
            } catch (Exception $e) {
                $db->rollBack();
                log_msg("GAGAL: " . $e->getMessage(), 'ERR');
            }
        } else {
            log_msg("[DRY-RUN] Akan update " . count($adjDetails) . " entry + Selisih Saldo Awal", 'SKIP');
        }
    } else {
        log_msg("Tidak ada penyesuaian opening balance", 'OK');
    }
}

// ═══════════════════════════════════════════════════════════
// LANGKAH 5: CLEAR CACHE REDIS
// ═══════════════════════════════════════════════════════════
section("LANGKAH 5: Clear Cache Redis");

if (!$dryRun) {
    try {
        if (file_exists($rootDir . '/api/config/redis.php')) {
            require_once $rootDir . '/api/config/redis.php';
            $redis   = RedisManager::getInstance();
            $patterns = ['rep_audit_*', 'rep_npl', 'rep_pinjaman_*', 'rep_neraca_*', 'rep_labarugi_*'];
            $cleared = 0;
            foreach ($patterns as $pat) {
                foreach ($redis->getKeys($pat) as $key) {
                    $redis->delete($key);
                    $cleared++;
                }
            }
            log_msg("{$cleared} cache key dihapus", 'OK');
        } else {
            log_msg("Redis config tidak ditemukan", 'WARN');
        }
    } catch (Exception $e) {
        log_msg("Redis tidak tersedia: " . $e->getMessage(), 'WARN');
    }
} else {
    log_msg("[DRY-RUN] Akan clear cache Redis", 'SKIP');
}

// ═══════════════════════════════════════════════════════════
// VERIFIKASI AKHIR
// ═══════════════════════════════════════════════════════════
section("VERIFIKASI AKHIR: Rekonsiliasi Modul vs GL");

foreach ($akunPinjaman as $kode => $akun) {
    $akunId = $akun['id'];
    $mod    = (float)$db->fetch("SELECT COALESCE(SUM(sisa_pinjaman),0) as t FROM pinjaman p JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id=jp.id WHERE jp.akun_id=? AND p.status='cair'", [$akunId])['t'];
    $gl     = (float)$db->fetch("SELECT COALESCE(SUM(jd.debit),0)-COALESCE(SUM(jd.kredit),0) as s FROM jurnal_detail jd WHERE jd.akun_id=?", [$akunId])['s'];
    $diff   = $mod - $gl;
    $icon   = abs($diff) < 1 ? 'OK' : 'WARN';
    log_msg("Akun {$kode}: Modul=" . number_format($mod) . " | GL=" . number_format($gl) . " | Selisih=" . number_format($diff), $icon);
}

echo "\n";
echo $dryRun
    ? "  ℹ️  Dry-run selesai. Tidak ada data yang diubah.\n     Jalankan tanpa --dry-run untuk menerapkan perubahan.\n"
    : "  ✅ Script selesai dijalankan.\n";
echo "  Waktu selesai: " . date('Y-m-d H:i:s') . "\n\n";
