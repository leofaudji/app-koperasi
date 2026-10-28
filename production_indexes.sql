-- =====================================================================
-- SQL QUERY PENAMBAHAN INDEKS DATABASE OPTIMALISASI SERVER PRODUKSI
-- Jalankan di phpMyAdmin / DBeaver / HeidiSQL / Navicat
-- =====================================================================

-- ---------------------------------------------------------------------
-- OPSI A: STANDAR MYSQL (MySQL 5.7, 8.0, 8.4+) & MARIADB
-- Gunakan query ini jika database Anda menggunakan Oracle MySQL
-- (karena MySQL standar tidak mendukung klausa "IF NOT EXISTS" pada ADD INDEX)
-- ---------------------------------------------------------------------

-- 1. Pinjaman
ALTER TABLE `pinjaman` ADD INDEX `idx_pinjaman_status` (`status`);
ALTER TABLE `pinjaman` ADD INDEX `idx_pinjaman_tgl_cair` (`tgl_pencairan`);
ALTER TABLE `pinjaman` ADD INDEX `idx_pinjaman_tgl_pengajuan` (`tgl_pengajuan`);

-- 2. Angsuran
ALTER TABLE `angsuran` ADD INDEX `idx_angsuran_status` (`status`);
ALTER TABLE `angsuran` ADD INDEX `idx_angsuran_jatuh_tempo` (`tgl_jatuh_tempo`);
ALTER TABLE `angsuran` ADD INDEX `idx_angsuran_tgl_bayar` (`tgl_bayar`);

-- 3. Simpanan
ALTER TABLE `simpanan` ADD INDEX `idx_simpanan_tgl_trx` (`tgl_transaksi`);

-- 4. Anggota
ALTER TABLE `anggota` ADD INDEX `idx_anggota_nama` (`nama`);
ALTER TABLE `anggota` ADD INDEX `idx_anggota_status` (`status`);

-- 5. Jurnal Keuangan
ALTER TABLE `jurnal` ADD INDEX `idx_jurnal_tgl_transaksi` (`tgl_transaksi`);
ALTER TABLE `jurnal` ADD INDEX `idx_jurnal_ref` (`ref_tipe`, `ref_id`);

-- 6. Toko Retail
ALTER TABLE `toko_pesanan` ADD INDEX `idx_tp_status` (`status`);
ALTER TABLE `toko_pesanan` ADD INDEX `idx_tp_tgl` (`tgl_pesanan`);

-- 7. Push Notifikasi
ALTER TABLE `push_logs` ADD INDEX `idx_push_logs_created` (`created_at`);
ALTER TABLE `push_logs` ADD INDEX `idx_push_logs_status` (`status`);


-- ---------------------------------------------------------------------
-- OPSI B: KHUSUS MARIADB (MariaDB 10.1.4+)
-- Mendukung sintaks "IF NOT EXISTS" sehingga aman dijalankan berulang kali
-- ---------------------------------------------------------------------
/*
ALTER TABLE `pinjaman` ADD INDEX IF NOT EXISTS `idx_pinjaman_status` (`status`);
ALTER TABLE `pinjaman` ADD INDEX IF NOT EXISTS `idx_pinjaman_tgl_cair` (`tgl_pencairan`);
ALTER TABLE `pinjaman` ADD INDEX IF NOT EXISTS `idx_pinjaman_tgl_pengajuan` (`tgl_pengajuan`);

ALTER TABLE `angsuran` ADD INDEX IF NOT EXISTS `idx_angsuran_status` (`status`);
ALTER TABLE `angsuran` ADD INDEX IF NOT EXISTS `idx_angsuran_jatuh_tempo` (`tgl_jatuh_tempo`);
ALTER TABLE `angsuran` ADD INDEX IF NOT EXISTS `idx_angsuran_tgl_bayar` (`tgl_bayar`);

ALTER TABLE `simpanan` ADD INDEX IF NOT EXISTS `idx_simpanan_tgl_trx` (`tgl_transaksi`);

ALTER TABLE `anggota` ADD INDEX IF NOT EXISTS `idx_anggota_nama` (`nama`);
ALTER TABLE `anggota` ADD INDEX IF NOT EXISTS `idx_anggota_status` (`status`);

ALTER TABLE `jurnal` ADD INDEX IF NOT EXISTS `idx_jurnal_tgl_transaksi` (`tgl_transaksi`);
ALTER TABLE `jurnal` ADD INDEX IF NOT EXISTS `idx_jurnal_ref` (`ref_tipe`, `ref_id`);

ALTER TABLE `toko_pesanan` ADD INDEX IF NOT EXISTS `idx_tp_status` (`status`);
ALTER TABLE `toko_pesanan` ADD INDEX IF NOT EXISTS `idx_tp_tgl` (`tgl_pesanan`);

ALTER TABLE `push_logs` ADD INDEX IF NOT EXISTS `idx_push_logs_created` (`created_at`);
ALTER TABLE `push_logs` ADD INDEX IF NOT EXISTS `idx_push_logs_status` (`status`);
*/

