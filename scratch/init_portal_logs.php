<?php
require_once __DIR__ . '/../api/config/env.php';
require_once __DIR__ . '/../api/config/database.php';

$db = Database::getInstance();

$sql = "CREATE TABLE IF NOT EXISTS portal_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    anggota_id INT NOT NULL,
    activity VARCHAR(255) NOT NULL,
    platform VARCHAR(50) DEFAULT NULL,
    browser VARCHAR(50) DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    location VARCHAR(100) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (anggota_id),
    INDEX (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

try {
    $db->execute($sql);
    echo "Table portal_logs created successfully\n";
} catch (Exception $e) {
    echo "Error creating table: " . $e->getMessage() . "\n";
}
