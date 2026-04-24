<?php
require 'api/config/database.php';
$db = Database::getInstance();
echo "--- TABLE REKENING_SIMPANAN ---\n";
print_r($db->fetchAll('DESCRIBE rekening_simpanan'));
echo "\n--- TABLE SIMPANAN ---\n";
print_r($db->fetchAll('DESCRIBE simpanan'));
echo "\n--- TABLE JURNAL ---\n";
print_r($db->fetchAll('DESCRIBE jurnal'));
echo "\n--- TABLE JURNAL_DETAIL ---\n";
print_r($db->fetchAll('DESCRIBE jurnal_detail'));
echo "\n--- DATA JENIS_SIMPANAN ---\n";
print_r($db->fetchAll('SELECT * FROM jenis_simpanan'));
echo "\n--- DATA KODE_TRANSAKSI_SIMPANAN ---\n";
print_r($db->fetchAll('SELECT * FROM kode_transaksi_simpanan'));
