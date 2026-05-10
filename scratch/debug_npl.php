<?php
require_once __DIR__ . '/../api/config/database.php';
$db = Database::getInstance();
$terlambat = $db->count("SELECT COUNT(*) FROM angsuran WHERE status = 'terlambat'");
$total = $db->count("SELECT COUNT(*) FROM angsuran");
echo "Terlambat: $terlambat / Total: $total\n";

$npl_loans = $db->fetchAll("SELECT no_pinjaman, sisa_pinjaman FROM pinjaman WHERE id IN (SELECT DISTINCT pinjaman_id FROM angsuran WHERE status = 'terlambat')");
print_r($npl_loans);
