<?php
/**
 * Script Perbaikan Jurnal Biaya Provisi & Potongan Pencairan Pinjaman
 * 
 * Dapat dijalankan melalui:
 * 1. Terminal / CMD:
 *    php fix_provisi_journal.php            (mode simulasi / dry-run)
 *    php fix_provisi_journal.php --apply    (eksekusi perbaikan database)
 * 
 * 2. Browser:
 *    Buka http://localhost/fix_provisi_journal.php (atau sesuai domain local)
 */

require_once __DIR__ . '/api/config/env.php';
require_once __DIR__ . '/api/config/database.php';
require_once __DIR__ . '/api/config/finance_helpers.php';

$isCli = (php_sapi_name() === 'cli');
$apply = $isCli ? in_array('--apply', $argv ?? []) : (isset($_POST['apply']) && $_POST['apply'] == '1');

$db = Database::getInstance();

$output = [];
function out($text, $color = 'normal') {
    global $output, $isCli;
    $output[] = ['text' => $text, 'color' => $color];
    if ($isCli) {
        echo $text . "\n";
    }
}

out("====================================================================");
out(" SCRIPT PERBAIKAN JURNAL PROVISI & BIAYA PENCAIRAN PINJAMAN");
out(" Mode: " . ($apply ? "EKSEKUSI (--apply)" : "SIMULASI (Dry-Run)"));
out("====================================================================\n");

// 1. Update master jenis_biaya_pinjaman jika akun_id masih kosong
$akun409 = $db->fetch("SELECT id FROM akun WHERE kode = '409' LIMIT 1");
if ($akun409) {
    out("1. Menyesuaikan master data 'jenis_biaya_pinjaman'...");
    $unmapped = $db->fetchAll("SELECT id, nama FROM jenis_biaya_pinjaman WHERE id IN (2,3,4,5) AND akun_id IS NULL");
    if (!empty($unmapped)) {
        foreach ($unmapped as $u) {
            out("   -> [ID: {$u['id']}] {$u['nama']} diarahkan ke Akun [409] Pendapatan lain-lain");
        }
        if ($apply) {
            $db->execute("UPDATE jenis_biaya_pinjaman SET akun_id = ? WHERE id IN (2,3,4,5) AND akun_id IS NULL", [$akun409['id']]);
            out("   [OK] Master data jenis biaya berhasil diperbarui.", "success");
        }
    } else {
        out("   [OK] Master data jenis biaya sudah terpetakan.", "success");
    }
}
out("");

// 2. Ambil semua jurnal pencairan pinjaman (ref_tipe = 'pinjaman')
out("2. Memeriksa jurnal pencairan pinjaman (ref_tipe = 'pinjaman')...");
$journals = $db->fetchAll("
    SELECT j.id, j.no_bukti, j.keterangan, j.tgl_transaksi, j.total_debit, j.total_kredit,
           p.id as pinjaman_id, p.no_pinjaman, p.jumlah,
           jp.kode as jp_kode, jp.nama as jp_nama
    FROM jurnal j
    JOIN pinjaman p ON j.ref_id = p.id AND j.ref_tipe = 'pinjaman'
    JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
    ORDER BY j.id ASC
");

$fixedCount = 0;

foreach ($journals as $j) {
    $jurnalId = $j['id'];
    $pinjamanId = $j['pinjaman_id'];

    // Ambil rincian biaya_pencairan untuk pinjaman ini
    $biayas = $db->fetchAll("SELECT * FROM biaya_pencairan WHERE pinjaman_id = ?", [$pinjamanId]);
    if (empty($biayas)) {
        continue;
    }

    $totalBiaya = 0;
    foreach ($biayas as $b) {
        $totalBiaya += (float) $b['jumlah'];
    }
    if ($totalBiaya <= 0) {
        continue;
    }

    // Ambil detail kredit pendapatan pada jurnal ini
    $details = $db->fetchAll("
        SELECT jd.*, a.kode as akun_kode, a.nama as akun_nama, a.tipe as akun_tipe
        FROM jurnal_detail jd
        JOIN akun a ON jd.akun_id = a.id
        WHERE jd.jurnal_id = ? AND jd.kredit > 0 AND a.tipe = 'pendapatan'
    ", [$jurnalId]);

    if (empty($details)) {
        continue;
    }

    // Cari apakah ada baris akun 400 untuk potongan biaya ini
    $matchingFeeDetail = null;
    foreach ($details as $d) {
        if ($d['akun_kode'] === '400' && abs((float)$d['kredit'] - $totalBiaya) < 0.01) {
            $matchingFeeDetail = $d;
            break;
        }
    }

    // Jika tidak match persis total, cek apakah ada baris akun 400 seharga salah satu item biaya
    if (!$matchingFeeDetail) {
        foreach ($details as $d) {
            if ($d['akun_kode'] === '400') {
                foreach ($biayas as $b) {
                    if (abs((float)$d['kredit'] - (float)$b['jumlah']) < 0.01) {
                        $matchingFeeDetail = $d;
                        break 2;
                    }
                }
            }
        }
    }

    if (!$matchingFeeDetail) {
        continue;
    }

    out("--------------------------------------------------------------------");
    out("Jurnal [{$j['no_bukti']}] | Pinjaman: {$j['no_pinjaman']} ({$j['jp_kode']} - {$j['jp_nama']})");
    out("Keterangan: {$j['keterangan']}");
    out("Biaya Pencairan (Total: Rp " . number_format($totalBiaya) . "):");
    foreach ($biayas as $b) {
        out("  - {$b['nama_biaya']}: Rp " . number_format($b['jumlah']));
    }

    out("Ditemukan baris keliru di jurnal:");
    out("  [Detail ID: {$matchingFeeDetail['id']}] Akun [{$matchingFeeDetail['akun_kode']}] {$matchingFeeDetail['akun_nama']} | Kredit: Rp " . number_format($matchingFeeDetail['kredit']), "warn");

    // Siapkan baris jurnal baru yang seharusnya
    $newDetails = [];
    foreach ($biayas as $b) {
        $namaB = trim($b['nama_biaya'] ?? '');
        $jmlB = (float) ($b['jumlah'] ?? 0);
        $jenisId = isset($b['jenis_biaya_id']) && $b['jenis_biaya_id'] ? (int) $b['jenis_biaya_id'] : null;
        if (empty($namaB) || $jmlB <= 0) continue;

        $targetAkunId = null;
        // 1. Cek dari master jenis_biaya_pinjaman jika ada
        if ($jenisId) {
            $jbp = $db->fetch("SELECT akun_id FROM jenis_biaya_pinjaman WHERE id = ?", [$jenisId]);
            if (!empty($jbp['akun_id'])) {
                $targetAkunId = (int) $jbp['akun_id'];
            }
        }

        // 2. Jika belum, gunakan fungsi helper
        if (!$targetAkunId) {
            $isProvisi = ($jenisId == 1) || (stripos($namaB, 'provisi') !== false);
            if ($isProvisi) {
                $targetAkunId = getAkunProvisiByPinjaman($db, $j['jp_kode'], $j['jp_nama']);
            } else {
                $targetAkunId = getAkunBiayaLainByNama($db, $namaB, $jenisId);
            }
        }

        $targetAkun = $db->fetch("SELECT kode, nama FROM akun WHERE id = ?", [$targetAkunId]);
        $newDetails[] = [
            'akun_id' => $targetAkunId,
            'akun_kode' => $targetAkun['kode'] ?? '???',
            'akun_nama' => $targetAkun['nama'] ?? '???',
            'jumlah' => $jmlB,
            'keterangan' => 'Potongan ' . $namaB
        ];
    }

    out("Akan digantikan dengan baris rincian:");
    foreach ($newDetails as $nd) {
        out("  + Akun [{$nd['akun_kode']}] {$nd['akun_nama']} | Kredit: Rp " . number_format($nd['jumlah']) . " | Ket: {$nd['keterangan']}", "info");
    }

    if ($apply) {
        $db->beginTransaction();
        try {
            // Hapus baris keliru lama
            $db->execute("DELETE FROM jurnal_detail WHERE id = ?", [$matchingFeeDetail['id']]);

            // Masukkan baris baru per item biaya
            foreach ($newDetails as $nd) {
                $db->execute(
                    "INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit, keterangan) VALUES (?, ?, 0, ?, ?)",
                    [$jurnalId, $nd['akun_id'], $nd['jumlah'], $nd['keterangan']]
                );
            }

            // Hitung ulang total debit dan kredit jurnal
            $totals = $db->fetch("SELECT SUM(debit) as deb, SUM(kredit) as kre FROM jurnal_detail WHERE jurnal_id = ?", [$jurnalId]);
            $db->execute("UPDATE jurnal SET total_debit = ?, total_kredit = ? WHERE id = ?", [$totals['deb'], $totals['kre'], $jurnalId]);

            $db->commit();
            out("  >> [BERHASIL DIPERBAIKI]", "success");
            $fixedCount++;
        } catch (Exception $e) {
            $db->rollBack();
            out("  >> [GAGAL]: " . $e->getMessage(), "err");
        }
    } else {
        out("  >> [SIMULASI OK]", "success");
        $fixedCount++;
    }
}

out("\n====================================================================");
out(" SELESAI!");
out(" Total jurnal yang " . ($apply ? "diperbaiki" : "ditemukan perlu diperbaiki") . ": {$fixedCount}");
out("====================================================================");

if (!$isCli): ?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Perbaikan Jurnal Provisi & Biaya Pencairan</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen p-6 font-sans">
    <div class="max-w-4xl mx-auto space-y-6">
        <div class="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex items-center justify-between">
            <div>
                <h1 class="text-xl font-bold text-white flex items-center gap-2">
                    <span>⚡</span> Perbaikan Jurnal Biaya Provisi & Pencairan
                </h1>
                <p class="text-sm text-slate-400 mt-1">
                    Memindahkan kredit biaya pencairan dari <span class="text-amber-400 font-mono">[400] Pendapatan Jasa Berjangka 1</span> ke akun Provisi & Administrasi yang sesuai.
                </p>
            </div>
            <div>
                <?php if (!$apply): ?>
                    <form method="POST">
                        <input type="hidden" name="apply" value="1">
                        <button type="submit" class="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2">
                            <span>🚀</span> Jalankan Eksekusi Perbaikan
                        </button>
                    </form>
                <?php else: ?>
                    <a href="fix_provisi_journal.php" class="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all">
                        Cek Ulang Status
                    </a>
                <?php endif; ?>
            </div>
        </div>

        <div class="bg-black/60 p-6 rounded-2xl border border-slate-800 font-mono text-xs overflow-x-auto leading-relaxed space-y-1">
            <?php foreach ($output as $line): 
                $colorClass = 'text-slate-300';
                if ($line['color'] === 'success') $colorClass = 'text-emerald-400 font-bold';
                elseif ($line['color'] === 'warn') $colorClass = 'text-amber-400';
                elseif ($line['color'] === 'info') $colorClass = 'text-sky-400';
                elseif ($line['color'] === 'err') $colorClass = 'text-red-400 font-bold';
            ?>
                <div class="<?= $colorClass ?>"><?= htmlspecialchars($line['text']) ?></div>
            <?php endforeach; ?>
        </div>
    </div>
</body>
</html>
<?php endif; ?>
