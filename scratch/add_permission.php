<?php
require_once __DIR__ . '/api/config/database.php';
$db = Database::getInstance();

try {
    $db->execute("INSERT IGNORE INTO permissions (kode, nama, modul) VALUES ('audit.view', 'Lihat Audit & Log', 'audit')");
    echo "Permission added successfully\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
