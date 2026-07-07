<?php
/**
 * Script untuk memigrasikan tgl saldo awal impor (dari 30-06-2026 ke 31-05-2026) di Server Produksi.
 */
define('PREVENT_DIRECT_ACCESS', true);

// Load framework configuration and database connections
require_once __DIR__ . '/api/config/env.php';
require_once __DIR__ . '/api/config/app.php';
require_once __DIR__ . '/api/config/database.php';
require_once __DIR__ . '/api/config/redis.php';

$db = Database::getInstance();

echo "=== MEMULAI PROSES MIGRASI TANGGAL SALDO AWAL ===\n";

$db->beginTransaction();
try {
    // 1. Simpanan
    echo "1. Mengupdate tanggal transaksi simpanan (30-06-2026 -> 31-05-2026)...\n";
    $sCount = $db->execute(
        "UPDATE simpanan 
         SET tgl_transaksi = '2026-05-31' 
         WHERE tgl_transaksi = '2026-06-30' AND (keterangan LIKE '%Import%' OR keterangan LIKE '%Saldo Awal%')"
    );
    echo "   ✔ Selesai.\n";

    // 2. Pinjaman
    echo "2. Mengupdate tanggal pencairan pinjaman (30-06-2026 -> 31-05-2026)...\n";
    $pinjamanIds = $db->fetchAll(
        "SELECT id FROM pinjaman WHERE tgl_pencairan = '2026-06-30' AND (keterangan LIKE '%Migrasi%' OR keterangan LIKE '%Saldo Awal%')"
    );
    $ids = array_map(fn($p) => $p['id'], $pinjamanIds);

    $db->execute(
        "UPDATE pinjaman 
         SET tgl_pencairan = '2026-05-31', tgl_pengajuan = '2026-05-31' 
         WHERE tgl_pencairan = '2026-06-30' AND (keterangan LIKE '%Migrasi%' OR keterangan LIKE '%Saldo Awal%')"
    );
    echo "   ✔ Selesai.\n";

    // 3. Angsuran Schedules (Shift back by 1 month to match the new disbursement date)
    if (!empty($ids)) {
        echo "3. Menggeser jadwal jatuh tempo angsuran pinjaman (maju 1 bulan)...\n";
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $db->execute(
            "UPDATE angsuran 
             SET tgl_jatuh_tempo = DATE_SUB(tgl_jatuh_tempo, INTERVAL 1 MONTH) 
             WHERE pinjaman_id IN ($placeholders)",
            $ids
        );
        echo "   ✔ Selesai.\n";
    }

    // 4. Jurnal Saldo Awal (Neraca, Laba Rugi)
    echo "4. Mengupdate tanggal jurnal saldo awal (30-06-2026 -> 31-05-2026)...\n";
    $db->execute(
        "UPDATE jurnal 
         SET tgl_transaksi = '2026-05-31' 
         WHERE tgl_transaksi = '2026-06-30' AND (keterangan LIKE '%Import%' OR keterangan LIKE '%Saldo Awal%' OR keterangan LIKE '%Migrasi%')"
    );
    echo "   ✔ Selesai.\n";

    $db->commit();
    echo "=== PROSES MIGRASI TANGGAL SELESAI DENGAN SUKSES ===\n";

    // Clear Redis Cache
    $redis = RedisManager::getInstance();
    if ($redis->isConnected()) {
        $redis->delete('*');
        echo "✔ Cache Redis berhasil dibersihkan.\n";
    }
} catch (Exception $e) {
    $db->rollBack();
    echo "❌ Terjadi Error: " . $e->getMessage() . "\n";
}
