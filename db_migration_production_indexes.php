<?php
/**
 * =========================================================================
 * SCRIPT MIGRASI INDEKS DATABASE UNTUK SERVER PRODUKSI (HIGH PERFORMANCE)
 * =========================================================================
 * 
 * Kegunaan:
 * Menambahkan indeks database strategis pada tabel transaksi dan master
 * (pinjaman, angsuran, simpanan, anggota, jurnal, toko, web push) agar:
 * - Query filtering status, tanggal, dan sorting menjadi hingga 10x lebih cepat.
 * - Pembacaan laporan akuntansi dan kartu piutang tidak delay.
 * - Bersifat IDEMPOTENT (aman dijalankan berkali-kali tanpa risiko duplikasi error).
 * 
 * Cara Menjalankan di Server Produksi:
 * 1. Lewat Terminal / SSH:
 *    php db_migration_production_indexes.php
 * 
 * 2. Lewat Browser (Akses URL):
 *    http://domain-anda.com/db_migration_production_indexes.php
 */

header('Content-Type: text/plain; charset=utf-8');

require_once __DIR__ . '/api/config/env.php';
require_once __DIR__ . '/api/config/database.php';

try {
    $db = Database::getInstance()->getConnection();
} catch (\Throwable $e) {
    die("Koneksi Database Gagal: " . $e->getMessage() . "\n");
}

echo "===================================================================\n";
echo "🚀 MEMULAI MIGRASI INDEKS DATABASE OPTIMALISASI SERVER PRODUKSI\n";
echo "===================================================================\n\n";

$indexesToEnsure = [
    // 1. PINJAMAN (Filter status, tanggal cair, jatuh tempo)
    [
        'table' => 'pinjaman',
        'name'  => 'idx_pinjaman_status',
        'cols'  => '`status`'
    ],
    [
        'table' => 'pinjaman',
        'name'  => 'idx_pinjaman_tgl_cair',
        'cols'  => '`tgl_pencairan`'
    ],
    [
        'table' => 'pinjaman',
        'name'  => 'idx_pinjaman_tgl_pengajuan',
        'cols'  => '`tgl_pengajuan`'
    ],

    // 2. ANGSURAN (Filter status, jatuh tempo, tanggal bayar)
    [
        'table' => 'angsuran',
        'name'  => 'idx_angsuran_status',
        'cols'  => '`status`'
    ],
    [
        'table' => 'angsuran',
        'name'  => 'idx_angsuran_jatuh_tempo',
        'cols'  => '`tgl_jatuh_tempo`'
    ],
    [
        'table' => 'angsuran',
        'name'  => 'idx_angsuran_tgl_bayar',
        'cols'  => '`tgl_bayar`'
    ],

    // 3. SIMPANAN (Filter tanggal transaksi)
    [
        'table' => 'simpanan',
        'name'  => 'idx_simpanan_tgl_trx',
        'cols'  => '`tgl_transaksi`'
    ],

    // 4. ANGGOTA (Pencarian nama, filter status aktif)
    [
        'table' => 'anggota',
        'name'  => 'idx_anggota_nama',
        'cols'  => '`nama`'
    ],
    [
        'table' => 'anggota',
        'name'  => 'idx_anggota_status',
        'cols'  => '`status`'
    ],

    // 5. JURNAL UMUM (Pencarian tanggal transaksi, ref_tipe, ref_id)
    [
        'table' => 'jurnal',
        'name'  => 'idx_jurnal_tgl_transaksi',
        'cols'  => '`tgl_transaksi`'
    ],
    [
        'table' => 'jurnal',
        'name'  => 'idx_jurnal_ref',
        'cols'  => '`ref_tipe`, `ref_id`'
    ],

    // 6. TOKO PESANAN (Filter status dan tanggal pesanan)
    [
        'table' => 'toko_pesanan',
        'name'  => 'idx_tp_status',
        'cols'  => '`status`'
    ],
    [
        'table' => 'toko_pesanan',
        'name'  => 'idx_tp_tgl',
        'cols'  => '`tgl_pesanan`'
    ],

    // 7. PUSH NOTIFIKASI
    [
        'table' => 'push_logs',
        'name'  => 'idx_push_logs_created',
        'cols'  => '`created_at`'
    ],
    [
        'table' => 'push_logs',
        'name'  => 'idx_push_logs_status',
        'cols'  => '`status`'
    ]
];

$successCount = 0;
$skippedCount = 0;
$errorCount   = 0;

foreach ($indexesToEnsure as $idx) {
    $table = $idx['table'];
    $name  = $idx['name'];
    $cols  = $idx['cols'];

    // 1. Cek tabel ada atau tidak
    try {
        $chkTable = $db->query("SHOW TABLES LIKE '$table'")->fetch();
        if (!$chkTable) {
            echo "[-] Tabel `$table` tidak ditemukan (dilewati).\n";
            $skippedCount++;
            continue;
        }

        // 2. Cek apakah indeks sudah ada
        $chkIdx = $db->query("SHOW INDEX FROM `$table` WHERE Key_name = '$name'")->fetch();
        if ($chkIdx) {
            echo "[✓] Indeks `$name` pada tabel `$table` SUDAH ADA (dilewati).\n";
            $skippedCount++;
            continue;
        }

        // 3. Tambahkan indeks
        $db->exec("ALTER TABLE `$table` ADD INDEX `$name` ($cols)");
        echo "[+] BERHASIL: Menambahkan indeks `$name` pada tabel `$table` ($cols).\n";
        $successCount++;
    } catch (\PDOException $e) {
        echo "[!] GAGAL menambahkan `$name` pada `$table`: " . $e->getMessage() . "\n";
        $errorCount++;
    }
}

echo "\n===================================================================\n";
echo "📊 RINGKASAN MIGRASI:\n";
echo "   - Berhasil Ditambahkan : $successCount indeks\n";
echo "   - Sudah Ada / Dilewati : $skippedCount indeks\n";
echo "   - Gagal                : $errorCount indeks\n";
echo "===================================================================\n";
echo "✨ Migrasi indeks selesai dengan aman!\n";
