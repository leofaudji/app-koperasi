<?php
/**
 * DATABASE MIGRATION SCRIPT - v2.1.7
 * Menambahkan dukungan metode pembayaran Simpanan Sukarela pada angsuran dan simpanan
 */

require_once __DIR__ . '/api/config/env.php';
require_once __DIR__ . '/api/config/database.php';

$db = Database::getInstance();

echo "=== STARTING DATABASE MIGRATION TO v2.1.7 ===\n";

try {
    // 1. Modifikasi tipe kolom 'metode_pembayaran' di tabel 'angsuran' ke VARCHAR(50)
    $colAngsuran = $db->fetch("SHOW COLUMNS FROM angsuran LIKE 'metode_pembayaran'");
    if ($colAngsuran) {
        if (strpos(strtolower($colAngsuran['Type']), 'varchar') === false) {
            $db->execute("ALTER TABLE angsuran MODIFY COLUMN metode_pembayaran VARCHAR(50) DEFAULT 'tunai'");
            echo "[OK] Modified column 'metode_pembayaran' to VARCHAR(50) in 'angsuran' table.\n";
        } else {
            echo "[INFO] Column 'metode_pembayaran' in 'angsuran' table is already VARCHAR.\n";
        }
    } else {
        $db->execute("ALTER TABLE angsuran ADD COLUMN metode_pembayaran VARCHAR(50) DEFAULT 'tunai'");
        echo "[OK] Added column 'metode_pembayaran' as VARCHAR(50) to 'angsuran' table.\n";
    }

    // 2. Modifikasi tipe kolom 'metode_pembayaran' di tabel 'simpanan' ke VARCHAR(50)
    $colSimpanan = $db->fetch("SHOW COLUMNS FROM simpanan LIKE 'metode_pembayaran'");
    if ($colSimpanan) {
        if (strpos(strtolower($colSimpanan['Type']), 'varchar') === false) {
            $db->execute("ALTER TABLE simpanan MODIFY COLUMN metode_pembayaran VARCHAR(50) DEFAULT 'tunai'");
            echo "[OK] Modified column 'metode_pembayaran' to VARCHAR(50) in 'simpanan' table.\n";
        } else {
            echo "[INFO] Column 'metode_pembayaran' in 'simpanan' table is already VARCHAR.\n";
        }
    } else {
        $db->execute("ALTER TABLE simpanan ADD COLUMN metode_pembayaran VARCHAR(50) DEFAULT 'tunai'");
        echo "[OK] Added column 'metode_pembayaran' as VARCHAR(50) to 'simpanan' table.\n";
    }

    echo "=== MIGRATION COMPLETED SUCCESSFULLY ===\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
