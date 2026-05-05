<?php
require_once __DIR__ . '/api/config/database.php';
$db = Database::getInstance();
$akuns = $db->fetchAll("SELECT id, kode, nama FROM akun WHERE (nama LIKE '%Pinjaman%' OR nama LIKE '%Piutang%') AND tipe='aset'");
echo json_encode($akuns, JSON_PRETTY_PRINT);
