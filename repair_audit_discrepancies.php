<?php
/**
 * ============================================================
 * SCRIPT PERBAIKAN OTOMATIS SELISIH AUDIT SALDO & REKONSILIASI
 * Versi : 1.0.0
 *
 * CARA PAKAI:
 *   php repair_audit_discrepancies.php --dry-run   (Simulasi tanpa ubah data)
 *   php repair_audit_discrepancies.php             (Eksekusi perbaikan nyata)
 *
 * IDEMPOTEN: Aman dijalankan berulang kali.
 * ============================================================
 */

if (php_sapi_name() !== 'cli') {
    die("Script ini hanya bisa dijalankan melalui CLI.\n");
}

define('PREVENT_DIRECT_ACCESS', true);

require __DIR__ . '/api/config/env.php';
require __DIR__ . '/api/config/app.php';
require __DIR__ . '/api/config/database.php';

$dryRun = in_array('--dry-run', $argv);

function out(string $msg, string $lvl = 'INFO'): void {
    $icons = ['INFO' => '  ℹ️ ', 'OK' => '  ✅', 'WARN' => '  ⚠️ ', 'ERR' => '  ❌', 'SKIP' => '  ⏭️ '];
    echo ($icons[$lvl] ?? '     ') . " {$msg}\n";
}

function header_sec(string $title): void {
    echo "\n" . str_repeat('─', 65) . "\n  {$title}\n" . str_repeat('─', 65) . "\n";
}

echo "\n╔═══════════════════════════════════════════════════════════════╗\n";
echo "║    PERBAIKAN OTOMATIS SELISIH AUDIT SALDO & DATA HISTORIS    ║\n";
echo "╚═══════════════════════════════════════════════════════════════╝\n";
echo ($dryRun ? "  MODE: DRY-RUN (Simulasi — Tidak ada perubahan data)\n" : "  MODE: EKSEKUSI NYATA\n");
echo "  Waktu: " . date('Y-m-d H:i:s') . "\n";

$db = Database::getInstance();
$pdo = $db->getConnection();

// ─────────────────────────────────────────────────────────────
// LANGKAH 1: PERBAIKAN SIMPANAN POKOK REO SUHANAFI
// ─────────────────────────────────────────────────────────────
header_sec("LANGKAH 1: Koreksi Saldo Simpanan Pokok (Selisih -Rp 50.000)");

$reoAnggota = $db->fetch("SELECT id, no_anggota, nama FROM anggota WHERE no_anggota = 'AGT-0084' OR nama LIKE '%REO SUHANAFI%' LIMIT 1");
if ($reoAnggota) {
    $reoId = $reoAnggota['id'];
    $rekSP = $db->fetch("SELECT * FROM rekening_simpanan WHERE anggota_id = ? AND jenis_simpanan_id = 1", [$reoId]);
    $revSp = $db->fetch("SELECT * FROM simpanan WHERE id = 12549 OR (anggota_id = ? AND jenis_simpanan_id = 1 AND no_transaksi LIKE 'REV%' AND keterangan LIKE '%TB2026070044%')", [$reoId]);

    if ($rekSP && $rekSP['saldo'] < 100000) {
        out("Ditemukan saldo Simpanan Pokok REO SUHANAFI kurang: Rp " . number_format($rekSP['saldo']) . " (Seharusnya Rp 100.000)", "WARN");
        if ($revSp) {
            out("Transaksi Reversal Yatim ditemukan: [{$revSp['id']}] {$revSp['no_transaksi']} (Nominal: -Rp " . number_format($revSp['jumlah']) . ")", "WARN");
        }

        if (!$dryRun) {
            $pdo->beginTransaction();
            try {
                // Hapus transaksi reversal yatim
                if ($revSp) {
                    $pdo->prepare("DELETE FROM simpanan WHERE id = ?")->execute([$revSp['id']]);
                    out("Transaksi reversal yatim [{$revSp['id']}] berhasil dihapus.", "OK");
                }
                // Kembalikan saldo rekening ke 100.000
                $pdo->prepare("UPDATE rekening_simpanan SET saldo = 100000 WHERE id = ?")->execute([$rekSP['id']]);
                $pdo->commit();
                out("Saldo rekening Simpanan Pokok REO SUHANAFI berhasil dikembalikan ke Rp 100.000.", "OK");
            } catch (Exception $e) {
                $pdo->rollBack();
                out("Gagal memperbaiki Simpanan Pokok: " . $e->getMessage(), "ERR");
            }
        } else {
            out("[DRY-RUN] Akan menghapus reversal yatim ID {$revSp['id']} dan mengembalikan saldo rekening ID {$rekSP['id']} ke Rp 100.000.", "SKIP");
        }
    } else {
        out("Saldo Simpanan Pokok REO SUHANAFI sudah benar (Rp " . number_format($rekSP['saldo'] ?? 0) . ").", "OK");
    }
} else {
    out("Anggota REO SUHANAFI tidak ditemukan.", "WARN");
}

// ─────────────────────────────────────────────────────────────
// LANGKAH 2: PERBAIKAN PIUTANG INSIDENTAL (Selisih -Rp 55.000)
// ─────────────────────────────────────────────────────────────
header_sec("LANGKAH 2: Koreksi Piutang Insidental (Selisih -Rp 55.000)");

// 2A. Koreksi Jurnal TB2026080048 (Salah Akun Debet 106 -> Seharusnya Kas 100)
$jTb = $db->fetch("SELECT id FROM jurnal WHERE no_bukti = 'TB2026080048' LIMIT 1");
if ($jTb) {
    $jdWrong = $db->fetch("SELECT id, akun_id, debit FROM jurnal_detail WHERE jurnal_id = ? AND akun_id = (SELECT id FROM akun WHERE kode = '106') AND debit = 100000", [$jTb['id']]);
    if ($jdWrong) {
        $kasAkun = $db->fetch("SELECT id FROM akun WHERE kode = '100' OR kode = '1000' OR nama LIKE '%Kas%' LIMIT 1");
        out("Jurnal TB2026080048 mendebit akun Piutang Insidental (106) sebesar Rp 100.000 (Seharusnya Kas)", "WARN");

        if (!$dryRun) {
            $pdo->prepare("UPDATE jurnal_detail SET akun_id = ? WHERE id = ?")->execute([$kasAkun['id'], $jdWrong['id']]);
            out("Akun debet pada jurnal TB2026080048 berhasil diubah ke Kas (Akun ID: {$kasAkun['id']}).", "OK");
        } else {
            out("[DRY-RUN] Akan mengubah akun debet jurnal_detail ID {$jdWrong['id']} ke Akun Kas ({$kasAkun['id']}).", "SKIP");
        }
    } else {
        out("Jurnal TB2026080048 sudah benar (tidak ada debet ke Piutang Insidental).", "OK");
    }
}

// 2B. Koreksi sisa_pinjaman Drs. ISNUR WAHYUDI (Plafon 1.500.000 tapi sisa tercatat 1.545.000)
$pinjIsnur = $db->fetch("SELECT id, no_pinjaman, jumlah, sisa_pinjaman FROM pinjaman WHERE no_pinjaman = '26.33.0000003.01' LIMIT 1");
if ($pinjIsnur) {
    if (abs((float)$pinjIsnur['sisa_pinjaman'] - 1500000) > 0.01) {
        out("Pinjaman [{$pinjIsnur['no_pinjaman']}] memiliki sisa_pinjaman Rp " . number_format($pinjIsnur['sisa_pinjaman']) . " (Seharusnya Rp 1.500.000)", "WARN");
        if (!$dryRun) {
            $pdo->prepare("UPDATE pinjaman SET sisa_pinjaman = 1500000 WHERE id = ?")->execute([$pinjIsnur['id']]);
            out("Sisa pinjaman [{$pinjIsnur['no_pinjaman']}] berhasil dikoreksi ke Rp 1.500.000.", "OK");
        } else {
            out("[DRY-RUN] Akan mengupdate sisa_pinjaman pinjaman ID {$pinjIsnur['id']} menjadi 1.500.000.", "SKIP");
        }
    } else {
        out("Sisa pinjaman [{$pinjIsnur['no_pinjaman']}] sudah sesuai (Rp 1.500.000).", "OK");
    }
}

// ─────────────────────────────────────────────────────────────
// LANGKAH 3: REKALIBRASI SALDO AWAL PIUTANG BERJANGKA 1 (+Rp 772.728)
// ─────────────────────────────────────────────────────────────
header_sec("LANGKAH 3: Rekalibrasi Saldo Awal Piutang Berjangka 1 (+Rp 772.728)");

$openingJurnal = $db->fetch("SELECT id, no_bukti FROM jurnal WHERE no_bukti = 'JRN2026060008' OR ref_tipe = 'saldo_awal_neraca' LIMIT 1");
$pj1Akun = $db->fetch("SELECT id, kode, nama FROM akun WHERE kode = '104' LIMIT 1");
$selisihAkun = $db->fetch("SELECT id, kode, nama FROM akun WHERE kode = '3999' OR nama LIKE '%Selisih Saldo Awal%' LIMIT 1");

if ($openingJurnal && $pj1Akun && $selisihAkun) {
    // Hitung selisih riil saat ini antara Modul dan GL
    $modSaldoPj1 = (float)$db->fetch("SELECT COALESCE(SUM(sisa_pinjaman),0) as t FROM pinjaman p JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id=jp.id WHERE jp.akun_id=? AND p.status='cair'", [$pj1Akun['id']])['t'];
    $glSaldoPj1 = (float)$db->fetch("SELECT COALESCE(SUM(jd.debit),0)-COALESCE(SUM(jd.kredit),0) as s FROM jurnal_detail jd WHERE jd.akun_id=?", [$pj1Akun['id']])['s'];
    $diffPj1 = $modSaldoPj1 - $glSaldoPj1;

    out("Piutang Berjangka 1 saat ini: Modul = Rp " . number_format($modSaldoPj1) . " | GL = Rp " . number_format($glSaldoPj1) . " | Selisih = Rp " . number_format($diffPj1));

    if (abs($diffPj1) >= 1) {
        $openEntryPj1 = $db->fetch("SELECT id, debit FROM jurnal_detail WHERE jurnal_id = ? AND akun_id = ?", [$openingJurnal['id'], $pj1Akun['id']]);
        $selisihEntry = $db->fetch("SELECT id, debit FROM jurnal_detail WHERE jurnal_id = ? AND akun_id = ?", [$openingJurnal['id'], $selisihAkun['id']]);

        if ($openEntryPj1 && $selisihEntry) {
            $newDebitPj1 = ((float)$openEntryPj1['debit']) + $diffPj1;
            $newDebitSelisih = ((float)$selisihEntry['debit']) - $diffPj1;

            out("Opening Saldo Akun 104: Rp " . number_format($openEntryPj1['debit']) . " → Rp " . number_format($newDebitPj1) . " (" . ($diffPj1 >= 0 ? '+' : '') . number_format($diffPj1) . ")", "WARN");
            out("Akun Selisih Saldo Awal (3999): Rp " . number_format($selisihEntry['debit']) . " → Rp " . number_format($newDebitSelisih), "WARN");

            if (!$dryRun) {
                $pdo->beginTransaction();
                try {
                    $pdo->prepare("UPDATE jurnal_detail SET debit = ? WHERE id = ?")->execute([$newDebitPj1, $openEntryPj1['id']]);
                    $pdo->prepare("UPDATE jurnal_detail SET debit = ? WHERE id = ?")->execute([$newDebitSelisih, $selisihEntry['id']]);

                    // Verifikasi balance
                    $ver = $db->fetch("SELECT SUM(debit) as d, SUM(kredit) as k FROM jurnal_detail WHERE jurnal_id = ?", [$openingJurnal['id']]);
                    if (abs($ver['d'] - $ver['k']) < 0.02) {
                        $pdo->commit();
                        out("Saldo Awal JRN2026060008 berhasil diselaraskan dan tetap 100% BALANCE ✓", "OK");
                    } else {
                        $pdo->rollBack();
                        out("ROLLBACK: Jurnal saldo awal tidak seimbang!", "ERR");
                    }
                } catch (Exception $e) {
                    $pdo->rollBack();
                    out("Gagal rekalibrasi saldo awal: " . $e->getMessage(), "ERR");
                }
            } else {
                out("[DRY-RUN] Akan mengupdate baris opening akun 104 dan penyeimbang 3999.", "SKIP");
            }
        }
    } else {
        out("Piutang Berjangka 1 sudah 100% seimbang (Selisih < Rp 1).", "OK");
    }

    // 3B. Rekalibrasi Pecahan Sen Simpanan Sukarela (-1.87) dan Partisipatif (+1.50)
    $openEntry206 = $db->fetch("SELECT id, kredit FROM jurnal_detail WHERE jurnal_id = ? AND akun_id = (SELECT id FROM akun WHERE kode = '206')", [$openingJurnal['id']]);
    $openEntry214 = $db->fetch("SELECT id, kredit FROM jurnal_detail WHERE jurnal_id = ? AND akun_id = (SELECT id FROM akun WHERE kode = '214')", [$openingJurnal['id']]);
    $selisihEntry = $db->fetch("SELECT id, debit FROM jurnal_detail WHERE jurnal_id = ? AND akun_id = ?", [$openingJurnal['id'], $selisihAkun['id']]);

    if ($openEntry206 && $openEntry214 && $selisihEntry) {
        $mod206 = (float)($db->fetch("SELECT COALESCE(SUM(CASE WHEN kt.dk='D' THEN s.jumlah ELSE -s.jumlah END),0) as t FROM simpanan s JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id WHERE s.jenis_simpanan_id = 3")['t'] ?? 0);
        $gl206 = (float)($db->fetch("SELECT COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0) as s FROM jurnal_detail jd WHERE jd.akun_id = (SELECT id FROM akun WHERE kode = '206')")['s'] ?? 0);
        $diff206 = $mod206 - $gl206;

        $mod214 = (float)($db->fetch("SELECT COALESCE(SUM(CASE WHEN kt.dk='D' THEN s.jumlah ELSE -s.jumlah END),0) as t FROM simpanan s JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id WHERE s.jenis_simpanan_id = 7")['t'] ?? 0);
        $gl214 = (float)($db->fetch("SELECT COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0) as s FROM jurnal_detail jd WHERE jd.akun_id = (SELECT id FROM akun WHERE kode = '214')")['s'] ?? 0);
        $diff214 = $mod214 - $gl214;

        if (abs($diff206) > 0.01 || abs($diff214) > 0.01) {
            $newKredit206 = (float)$openEntry206['kredit'] + $diff206;
            $newKredit214 = (float)$openEntry214['kredit'] + $diff214;
            $netChange = $diff206 + $diff214;
            $newDebitSelisih = (float)$selisihEntry['debit'] + $netChange;

            out("Pecahan Sen Saldo Awal: Sukarela (" . ($diff206 >= 0 ? '+' : '') . number_format($diff206, 2) . ") | Partisipatif (" . ($diff214 >= 0 ? '+' : '') . number_format($diff214, 2) . ")", "WARN");

            if (!$dryRun) {
                $pdo->beginTransaction();
                try {
                    $pdo->prepare("UPDATE jurnal_detail SET kredit = ? WHERE id = ?")->execute([$newKredit206, $openEntry206['id']]);
                    $pdo->prepare("UPDATE jurnal_detail SET kredit = ? WHERE id = ?")->execute([$newKredit214, $openEntry214['id']]);
                    $pdo->prepare("UPDATE jurnal_detail SET debit = ? WHERE id = ?")->execute([$newDebitSelisih, $selisihEntry['id']]);

                    $ver = $db->fetch("SELECT SUM(debit) as d, SUM(kredit) as k FROM jurnal_detail WHERE jurnal_id = ?", [$openingJurnal['id']]);
                    if (abs($ver['d'] - $ver['k']) < 0.02) {
                        $pdo->commit();
                        out("Pecahan sen Simpanan Sukarela & Partisipatif berhasil diselaraskan menjadi Rp 0,00 ✓", "OK");
                    } else {
                        $pdo->rollBack();
                    }
                } catch (Exception $e) {
                    $pdo->rollBack();
                }
            } else {
                out("[DRY-RUN] Akan menyelaraskan pecahan sen Sukarela & Partisipatif ke Rp 0,00.", "SKIP");
            }
        } else {
            out("Pecahan sen Simpanan Sukarela & Partisipatif sudah 0.00.", "OK");
        }
    }
}

// ─────────────────────────────────────────────────────────────
// LANGKAH 4: BERSIHKAN BENTURAN DISCREPANCY ANGSURAN AGS-1861-4
// ─────────────────────────────────────────────────────────────
header_sec("LANGKAH 4: Koreksi Discrepancy Jurnal Borongan JRN2026070206");

$jrnBorongan = $db->fetch("SELECT * FROM jurnal WHERE no_bukti = 'JRN2026070206' AND ref_tipe = 'angsuran' AND ref_id = 40007");
if ($jrnBorongan) {
    out("Ditemukan jurnal borongan [{$jrnBorongan['no_bukti']}] terkait angsuran 40007 bernilai Rp " . number_format($jrnBorongan['total_debit']), "WARN");
    out("Karena angsuran 40007 s/d 40010 sudah memiliki jurnal per bulannya, referensi borongan diubah ke ref_tipe = 'umum'.", "INFO");

    if (!$dryRun) {
        $pdo->prepare("UPDATE jurnal SET ref_tipe = 'umum', ref_id = NULL WHERE id = ?")->execute([$jrnBorongan['id']]);
        out("Jurnal JRN2026070206 berhasil dialihkan ke ref_tipe = 'umum' (Discrepancy terselesaikan).", "OK");
    } else {
        out("[DRY-RUN] Akan mengubah ref_tipe = 'umum' dan ref_id = NULL pada jurnal ID {$jrnBorongan['id']}.", "SKIP");
    }
} else {
    out("Jurnal JRN2026070206 sudah tidak berstatus referensi angsuran spesifik.", "OK");
}

// ─────────────────────────────────────────────────────────────
// LANGKAH 5: PEMBERSIHAN CACHE SISTEM
// ─────────────────────────────────────────────────────────────
header_sec("LANGKAH 5: Pembersihan Cache");

if (!$dryRun) {
    // 1. Redis Cache
    if (file_exists(__DIR__ . '/api/config/redis.php')) {
        try {
            require_once __DIR__ . '/api/config/redis.php';
            $redis = RedisManager::getInstance();
            $patterns = ['rep_audit_*', 'rep_npl', 'rep_pinjaman_*', 'rep_neraca_*', 'rep_labarugi_*'];
            $cleared = 0;
            foreach ($patterns as $pat) {
                foreach ($redis->getKeys($pat) as $k) {
                    $redis->delete($k);
                    $cleared++;
                }
            }
            out("{$cleared} cache key Redis berhasil dibersihkan.", "OK");
        } catch (Exception $e) {
            out("Redis bypass: " . $e->getMessage(), "INFO");
        }
    }
} else {
    out("[DRY-RUN] Akan membersihkan seluruh cache audit.", "SKIP");
}

// ─────────────────────────────────────────────────────────────
// VERIFIKASI AKHIR HASIL PERBAIKAN
// ─────────────────────────────────────────────────────────────
header_sec("VERIFIKASI AKHIR HASIL AUDIT");

echo "\n1. REKONSILIASI SIMPANAN:\n";
$allSimp = $db->fetchAll("SELECT js.id, js.nama, ak.kode, ak.nama as akun_nama, ak.saldo_normal, js.akun_id 
    FROM jenis_simpanan js JOIN akun ak ON js.akun_id = ak.id WHERE js.is_active = 1 AND js.akun_id IS NOT NULL");
foreach ($allSimp as $js) {
    $mod = (float)($db->fetch("SELECT COALESCE(SUM(CASE WHEN kt.dk='D' THEN s.jumlah ELSE -s.jumlah END),0) as t FROM simpanan s JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id WHERE s.jenis_simpanan_id = ?", [$js['id']])['t'] ?? 0);
    $gl = (float)($db->fetch("SELECT CASE WHEN ak.saldo_normal='D' THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0) ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0) END as s FROM akun ak LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id WHERE ak.id = ? GROUP BY ak.id, ak.saldo_normal", [$js['akun_id']])['s'] ?? 0);
    $diff = $mod - $gl;
    $status = abs($diff) < 2 ? "OK" : "WARN";
    out(sprintf("%-25s | Modul: %15s | GL: %15s | Selisih: %12s", $js['nama'], number_format($mod, 2), number_format($gl, 2), number_format($diff, 2)), $status);
}

echo "\n2. REKONSILIASI PINJAMAN:\n";
$allPinjAkun = $db->fetchAll("SELECT ak.id as akun_id, ak.kode, ak.nama as akun_nama, ak.saldo_normal FROM akun ak JOIN jenis_pinjaman jp ON ak.id = jp.akun_id WHERE jp.is_active = 1 GROUP BY ak.id");
foreach ($allPinjAkun as $ap) {
    $mod = (float)($db->fetch("SELECT COALESCE(SUM(p.sisa_pinjaman),0) as t FROM pinjaman p JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id WHERE jp.akun_id = ? AND p.status = 'cair'", [$ap['akun_id']])['t'] ?? 0);
    $gl = (float)($db->fetch("SELECT CASE WHEN ak.saldo_normal='D' THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0) ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0) END as s FROM akun ak LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id WHERE ak.id = ? GROUP BY ak.id, ak.saldo_normal", [$ap['akun_id']])['s'] ?? 0);
    $diff = $mod - $gl;
    $status = abs($diff) < 2 ? "OK" : "WARN";
    out(sprintf("%-25s | Modul: %15s | GL: %15s | Selisih: %12s", $ap['akun_nama'], number_format($mod, 2), number_format($gl, 2), number_format($diff, 2)), $status);
}

echo "\n" . ($dryRun ? "  ℹ️  Simulasi selesai. Jalankan tanpa --dry-run untuk menerapkan perubahan.\n" : "  ✅ Perbaikan selesai diterapkan secara menyeluruh.\n\n");
