<?php
require 'api/config/database.php';
$db = Database::getInstance();

try {
    $db->beginTransaction();

    // 1. Create audit_logs table
    $db->execute("CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action ENUM('create', 'update', 'delete') NOT NULL,
        table_name VARCHAR(50) NOT NULL,
        record_id INT NOT NULL,
        old_data JSON DEFAULT NULL,
        new_data JSON DEFAULT NULL,
        ip_address VARCHAR(45) DEFAULT NULL,
        user_agent VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB");

    // 2. Add permission
    $permIdResult = $db->fetch("SELECT id FROM permissions WHERE kode = 'audit.logs'");
    if (!$permIdResult) {
        $permId = $db->insert("INSERT INTO permissions (kode, nama, modul) VALUES ('audit.logs', 'Lihat Log Audit', 'audit')");

        // Give to Admin (role_id 1)
        $db->execute("INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (1, ?)", [$permId]);
    } else {
        $permId = $permIdResult['id'];
        $db->execute("INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (1, ?)", [$permId]);
    }

    $db->commit();
    echo "Migration successful: audit_logs table and permissions created / verified.";
} catch (Exception $e) {
    // Simple fallback since we don't have inTransaction() helper
    try {
        $db->rollBack();
    } catch (Exception $ext) {
    }
    echo "Migration failed: " . $e->getMessage();
}
