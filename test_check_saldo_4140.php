<?php
require_once __DIR__ . '/api/config/database.php';
$db = Database::getInstance();

echo "=== CEK DATA ANGGOTA 4140 (NURMALITA RAMADHANI, S.Pd.) ===\n";

// 1. Rekening Simpanan
$rekening = $db->fetchAll("
    SELECT rs.*, js.kode as kode_jenis, js.nama as nama_jenis, js.tipe
    FROM rekening_simpanan rs
    JOIN jenis_simpanan js ON rs.jenis_simpanan_id = js.id
    WHERE rs.anggota_id = 4140
");
echo "Rekening Simpanan:\n";
print_r($rekening);

// 2. Mutasi Simpanan
$mutasi = $db->fetchAll("
    SELECT s.*, js.kode, js.nama as jenis_nama, kt.kode as kode_trx, kt.dk
    FROM simpanan s
    JOIN jenis_simpanan js ON s.jenis_simpanan_id = js.id
    JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
    WHERE s.anggota_id = 4140
    ORDER BY s.id DESC
    LIMIT 10
");
echo "Mutasi Simpanan (10 terakhir):\n";
print_r($mutasi);

// 3. Hitung saldo berdasarkan mutasi per jenis simpanan
$saldoMutasi = $db->fetchAll("
    SELECT js.kode, js.nama,
           COALESCE(SUM(CASE WHEN kt.dk = 'D' THEN s.jumlah ELSE -s.jumlah END), 0) as saldo_d_minus_k,
           COALESCE(SUM(CASE WHEN kt.dk = 'K' THEN s.jumlah ELSE -s.jumlah END), 0) as saldo_k_minus_d
    FROM simpanan s
    JOIN jenis_simpanan js ON s.jenis_simpanan_id = js.id
    JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
    WHERE s.anggota_id = 4140
    GROUP BY js.id
");
echo "Saldo Kalkulasi Mutasi:\n";
print_r($saldoMutasi);
