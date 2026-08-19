<?php
/**
 * Script Perbaikan Data Historis (Simpanan Pokok & Pinjaman Berjangka 1)
 * Jalankan file ini di server produksi untuk menyelaraskan modul transaksi dengan Buku Besar (GL).
 */

// Memastikan hanya bisa dijalankan via CLI (atau jika via Web, tambahkan token keamanan jika diperlukan)
$isCli = (php_sapi_name() === 'cli');
if (!$isCli) {
    echo "<pre>";
}

echo "=== MEMULAI PROSES PERBAIKAN DATA HISTORIS ===\n";

require_once __DIR__ . '/api/config/env.php';
require_once __DIR__ . '/api/config/database.php';

$db = Database::getInstance();

$db->beginTransaction();
try {
    // 1. Koreksi sisa_pinjaman Agus Tutiati (ID: 1883)
    $db->execute("
        UPDATE pinjaman 
        SET sisa_pinjaman = 10000000.00 
        WHERE id = 1883 AND no_pinjaman = '26.31.0000063.01'
    ");
    echo "[OK] 1. Sisa pinjaman AGUS TUTIATI (ID: 1883) diperbarui ke Rp 10.000.000,00 (Pokok saja).\n";

    // 2. Koreksi status & sisa_pinjaman Reo Suhanafi (ID: 1848)
    $db->execute("
        UPDATE pinjaman 
        SET status = 'cair', sisa_pinjaman = 22221112.00 
        WHERE id = 1848 AND no_pinjaman = '26.31.0000084.01'
    ");
    echo "[OK] 2. Status pinjaman lama REO SUHANAFI (ID: 1848) dipulihkan ke 'cair' dan sisa_pinjaman disesuaikan ke Rp 22.221.112,00.\n";

    // 3. Koreksi status angsuran Reo Suhanafi (ID: 1848, Angsuran 5 s/d 36)
    $db->execute("
        UPDATE angsuran 
        SET status = 'belum', tgl_bayar = NULL, created_by = NULL 
        WHERE pinjaman_id = 1848 AND tgl_bayar = '2026-07-13'
    ");
    echo "[OK] 3. Status 32 angsuran berjalan pinjaman lama REO SUHANAFI dipulihkan menjadi 'belum' (belum bayar).\n";

    // 4. Koreksi Simpanan Orphan (ID: 12477)
    $simp = $db->fetch("SELECT * FROM simpanan WHERE id = 12477 AND no_transaksi = 'TB2026070044'");
    if ($simp) {
        // Kurangi saldo di rekening simpanan wajib
        $db->execute("
            UPDATE rekening_simpanan 
            SET saldo = saldo - ? 
            WHERE id = ?
        ", [$simp['jumlah'], $simp['rekening_id']]);
        echo "[OK] 4a. Saldo rekening simpanan wajib disesuaikan (dikurangi Rp " . number_format($simp['jumlah'], 0, ',', '.') . ").\n";
        
        // Hapus transaksi simpanan menggantung
        $db->execute("DELETE FROM simpanan WHERE id = 12477");
        echo "[OK] 4b. Transaksi simpanan menggantung (ID: 12477) telah dihapus.\n";
    } else {
        echo "[INFO] 4. Transaksi simpanan ID: 12477 tidak ditemukan atau sudah dihapus sebelumnya.\n";
    }

    // 5. Koreksi sisa_pinjaman & status Pinjaman Insidental Baru
    // 5a. Holyda Firdaus (sudah lunas bayar pokok, namun sisa_pinjaman masih tersisa bunga 600,000)
    $db->execute("UPDATE pinjaman SET sisa_pinjaman = 0.00, status = 'lunas' WHERE id = 1885 AND no_pinjaman = '26.33.0000076.01'");
    echo "[OK] 5a. Pinjaman insidental HOLYDA FIRDAUS (ID: 1885) diperbarui menjadi 'lunas' dengan sisa_pinjaman Rp 0,00.\n";

    // 5b. Raka Pratama (ID: 1882) - Set sisa_pinjaman = 5,000,000 (pokok saja)
    $db->execute("UPDATE pinjaman SET sisa_pinjaman = 5000000.00 WHERE id = 1882 AND no_pinjaman = '26.33.0000126.01'");
    echo "[OK] 5b. Sisa pinjaman insidental RAKA PRATAMA (ID: 1882) disesuaikan ke Rp 5.000.000,00.\n";

    // 5c. Tri Wahjoedi (ID: 1884) - Set sisa_pinjaman = 1,000,000 (pokok saja)
    $db->execute("UPDATE pinjaman SET sisa_pinjaman = 1000000.00 WHERE id = 1884 AND no_pinjaman = '26.33.0000010.01'");
    echo "[OK] 5c. Sisa pinjaman insidental TRI WAHJOEDI (ID: 1884) disesuaikan ke Rp 1.000.000,00.\n";

    // 5d. Ricky Setya (ID: 1886) - Set sisa_pinjaman = 4,000,000 (pokok saja)
    $db->execute("UPDATE pinjaman SET sisa_pinjaman = 4000000.00 WHERE id = 1886 AND no_pinjaman = '26.33.0000096.01'");
    echo "[OK] 5d. Sisa pinjaman insidental RICKY SETYA (ID: 1886) disesuaikan ke Rp 4.000.000,00.\n";

    // 5e. Ahsana Amala (ID: 1887) - Set sisa_pinjaman = 800,000 (pokok saja)
    $db->execute("UPDATE pinjaman SET sisa_pinjaman = 800000.00 WHERE id = 1887 AND no_pinjaman = '26.33.0000068.01'");
    echo "[OK] 5e. Sisa pinjaman insidental AHSANA AMALA (ID: 1887) disesuaikan ke Rp 800.000,00.\n";

    $db->commit();
    echo "=== PERBAIKAN BERHASIL DISIMPAN (COMMITTED) ===\n";

} catch (Exception $e) {
    $db->rollBack();
    echo "[ERROR] Terjadi kesalahan: " . $e->getMessage() . "\n";
    echo "[INFO] Transaksi dibatalkan (ROLLBACK).\n";
}

if (!$isCli) {
    echo "</pre>";
}
