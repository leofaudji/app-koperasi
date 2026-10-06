<?php
/**
 * DATABASE MIGRATION SCRIPT - Portal Transparansi, Aspirasi Pengawas & Ekosistem Retail
 */

require_once __DIR__ . '/api/config/env.php';
require_once __DIR__ . '/api/config/database.php';

$db = Database::getInstance();

echo "=== STARTING DATABASE MIGRATION: Portal Transparansi, Aspirasi & Retail ===\n";

try {
    // 1. Tabel Aspirasi & Pengaduan ke Pengawas
    $sqlAspirasi = "CREATE TABLE IF NOT EXISTS portal_aspirasi (
        id INT AUTO_INCREMENT PRIMARY KEY,
        no_tiket VARCHAR(30) NOT NULL UNIQUE,
        anggota_id INT NOT NULL,
        nama_pengirim VARCHAR(150) NOT NULL,
        kategori ENUM('pelayanan', 'keuangan', 'pengawas', 'usulan') DEFAULT 'usulan',
        judul VARCHAR(255) NOT NULL,
        pesan TEXT NOT NULL,
        is_anonim TINYINT(1) DEFAULT 0,
        status ENUM('terkirim', 'ditinjau', 'dijawab') DEFAULT 'terkirim',
        tanggapan TEXT NULL,
        tgl_tanggapan DATETIME NULL,
        ditanggapi_oleh INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_anggota (anggota_id),
        INDEX idx_status (status),
        INDEX idx_kategori (kategori)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    $db->execute($sqlAspirasi);
    echo "[OK] Tabel 'portal_aspirasi' siap.\n";

    // 2. Tabel Produk Retail Toko Koperasi
    $sqlProduk = "CREATE TABLE IF NOT EXISTS toko_produk (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kode_produk VARCHAR(30) NOT NULL UNIQUE,
        nama_produk VARCHAR(150) NOT NULL,
        kategori VARCHAR(50) NOT NULL DEFAULT 'Sembako',
        deskripsi TEXT NULL,
        harga_umum DECIMAL(15,2) NOT NULL,
        harga_anggota DECIMAL(15,2) NOT NULL,
        stok INT NOT NULL DEFAULT 10,
        satuan VARCHAR(20) DEFAULT 'pcs',
        gambar VARCHAR(255) NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_kategori (kategori),
        INDEX idx_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    $db->execute($sqlProduk);
    echo "[OK] Tabel 'toko_produk' siap.\n";

    // 3. Tabel Pesanan Toko Koperasi
    $sqlPesanan = "CREATE TABLE IF NOT EXISTS toko_pesanan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        no_pesanan VARCHAR(30) NOT NULL UNIQUE,
        anggota_id INT NOT NULL,
        total_nominal DECIMAL(15,2) NOT NULL,
        metode_pembayaran ENUM('sukarela', 'tunai_ambil') DEFAULT 'sukarela',
        rekening_simpanan_id INT NULL,
        status ENUM('pending', 'diproses', 'siap_diambil', 'selesai', 'dibatalkan') DEFAULT 'pending',
        catatan VARCHAR(255) NULL,
        tgl_pesanan DATETIME DEFAULT CURRENT_TIMESTAMP,
        tgl_selesai DATETIME NULL,
        INDEX idx_anggota (anggota_id),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    $db->execute($sqlPesanan);
    echo "[OK] Tabel 'toko_pesanan' siap.\n";

    // 4. Tabel Detail Pesanan Toko Koperasi
    $sqlPesananDetail = "CREATE TABLE IF NOT EXISTS toko_pesanan_detail (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pesanan_id INT NOT NULL,
        produk_id INT NOT NULL,
        nama_produk VARCHAR(150) NOT NULL,
        harga_satuan DECIMAL(15,2) NOT NULL,
        qty INT NOT NULL,
        subtotal DECIMAL(15,2) NOT NULL,
        INDEX idx_pesanan (pesanan_id),
        INDEX idx_produk (produk_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    $db->execute($sqlPesananDetail);
    echo "[OK] Tabel 'toko_pesanan_detail' siap.\n";

    // 5. Seeding Contoh Produk Retail jika tabel kosong
    $checkCount = (int) $db->fetch("SELECT COUNT(*) as cnt FROM toko_produk")['cnt'];
    if ($checkCount === 0) {
        $sampleProducts = [
            ['PRD-001', 'Beras Premium Ramos 5kg', 'Sembako', 'Beras putih pulen kualitas premium hasil binaan petani anggota koperasi.', 78000, 72000, 50, 'sak', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300'],
            ['PRD-002', 'Minyak Goreng Refill 2 Liter', 'Sembako', 'Minyak goreng kelapa sawit higienis jernih berkualitas tinggi.', 36000, 33500, 80, 'pouch', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300'],
            ['PRD-003', 'Gula Pasir Kristal Putih 1kg', 'Sembako', 'Gula tebu murni manis alami untuk kebutuhan rumah tangga sehari-hari.', 18000, 16500, 65, 'kg', 'https://images.unsplash.com/photo-1622484216790-84564c784dd5?w=300'],
            ['PRD-004', 'Kopi Bubuk Asli Koperasi 250g', 'Minuman', 'Kopi robusta sangrai aroma kuat dari kebun petani daerah.', 28000, 24000, 40, 'bungkus', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300'],
            ['PRD-005', 'Telur Ayam Segar 1kg', 'Sembako', 'Telur ayam negeri segar langsung dari peternak anggota koperasi.', 31000, 28500, 30, 'kg', 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=300'],
            ['PRD-006', 'Teh Celup Melati Koperasi (Isi 25)', 'Minuman', 'Teh wangi melati pilihan dengan aroma khas nusantara.', 10000, 8500, 90, 'kotak', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300']
        ];

        foreach ($sampleProducts as $p) {
            $db->execute(
                "INSERT INTO toko_produk (kode_produk, nama_produk, kategori, deskripsi, harga_umum, harga_anggota, stok, satuan, gambar) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                $p
            );
        }
        echo "[OK] Seeding 6 contoh produk toko koperasi berhasil.\n";
    }

    echo "=== MIGRATION COMPLETED SUCCESSFULLY ===\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
