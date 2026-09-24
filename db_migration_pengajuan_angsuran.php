<?php
require_once __DIR__ . '/api/config/database.php';
$db = Database::getInstance();

echo "Running migration: pengajuan_angsuran...\n";

$sql = "CREATE TABLE IF NOT EXISTS pengajuan_angsuran (
    id INT AUTO_INCREMENT PRIMARY KEY,
    no_pengajuan VARCHAR(30) NOT NULL UNIQUE,
    pinjaman_id INT NOT NULL,
    angsuran_id INT NOT NULL,
    anggota_id INT NOT NULL,
    rekening_simpanan_id INT NULL,
    angsuran_ke INT NOT NULL,
    pokok DECIMAL(15,2) NOT NULL,
    bunga DECIMAL(15,2) NOT NULL,
    denda DECIMAL(15,2) DEFAULT 0.00,
    total_bayar DECIMAL(15,2) NOT NULL,
    metode_pembayaran VARCHAR(50) DEFAULT 'sukarela',
    status ENUM('pending', 'disetujui', 'ditolak') DEFAULT 'pending',
    catatan VARCHAR(255) NULL,
    tgl_pengajuan DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_by INT NULL,
    tgl_approval DATETIME NULL,
    alasan_penolakan VARCHAR(255) NULL,
    INDEX idx_status (status),
    INDEX idx_pinjaman_id (pinjaman_id),
    INDEX idx_angsuran_id (angsuran_id),
    INDEX idx_anggota_id (anggota_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

$db->execute($sql);
echo "Migration pengajuan_angsuran completed successfully.\n";
