<?php
require_once __DIR__ . '/../api/config/database.php';
$db = Database::getInstance();
$jenis = $db->fetchAll("SELECT id, kode, nama FROM jenis_simpanan");
echo json_encode($jenis, JSON_PRETTY_PRINT);
