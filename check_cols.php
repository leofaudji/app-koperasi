<?php
require_once __DIR__ . '/api/config/database.php';
$db = Database::getInstance();
$cols = $db->fetchAll("DESCRIBE jenis_pinjaman");
echo json_encode($cols, JSON_PRETTY_PRINT);
