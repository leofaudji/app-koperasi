<?php
/**
 * DATABASE MIGRATION SCRIPT - v2.1.6
 * Run this script on the production server to update the database schema.
 */

require_once __DIR__ . '/api/config/env.php';
require_once __DIR__ . '/api/config/database.php';

$db = Database::getInstance();

echo "=== STARTING DATABASE MIGRATION TO v2.1.6 ===\n";

try {
    // 1. Check & Add 'metode_pembayaran' column in 'pinjaman' table
    $checkMetode = $db->fetch("SHOW COLUMNS FROM pinjaman LIKE 'metode_pembayaran'");
    if (!$checkMetode) {
        $db->execute("ALTER TABLE pinjaman ADD COLUMN metode_pembayaran VARCHAR(50) DEFAULT 'tunai'");
        echo "[OK] Column 'metode_pembayaran' added to 'pinjaman' table.\n";
    } else {
        echo "[INFO] Column 'metode_pembayaran' already exists.\n";
    }

    // 2. Check & Add 'akun_kas_id' column in 'pinjaman' table
    $checkKasId = $db->fetch("SHOW COLUMNS FROM pinjaman LIKE 'akun_kas_id'");
    if (!$checkKasId) {
        $db->execute("ALTER TABLE pinjaman ADD COLUMN akun_kas_id INT NULL DEFAULT NULL");
        echo "[OK] Column 'akun_kas_id' added to 'pinjaman' table.\n";
    } else {
        echo "[INFO] Column 'akun_kas_id' already exists.\n";
    }

    // 3. Alter 'topup_ref_id' column type to VARCHAR(255) in 'pinjaman' table
    $checkTopupId = $db->fetch("SHOW COLUMNS FROM pinjaman LIKE 'topup_ref_id'");
    if ($checkTopupId) {
        if (strpos(strtolower($checkTopupId['Type']), 'varchar') === false) {
            $db->execute("ALTER TABLE pinjaman MODIFY COLUMN topup_ref_id VARCHAR(255) NULL DEFAULT NULL");
            echo "[OK] Modified column 'topup_ref_id' to VARCHAR(255) to support multiple loans.\n";
        } else {
            echo "[INFO] Column 'topup_ref_id' is already VARCHAR/text type.\n";
        }
    } else {
        // Fallback if topup_ref_id somehow doesn't exist
        $db->execute("ALTER TABLE pinjaman ADD COLUMN topup_ref_id VARCHAR(255) NULL DEFAULT NULL");
        echo "[OK] Column 'topup_ref_id' added as VARCHAR(255) to 'pinjaman' table.\n";
    }

    echo "=== MIGRATION COMPLETED SUCCESSFULLY ===\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
