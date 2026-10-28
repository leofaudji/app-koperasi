-- =====================================================================
-- SQL QUERY PENAMBAHAN INDEKS DATABASE OPTIMALISASI SERVER PRODUKSI
-- Jalankan di phpMyAdmin / DBeaver / HeidiSQL jika menggunakan query SQL langsung
-- =====================================================================

-- 1. Pinjaman
ALTER TABLE `pinjaman` ADD INDEX IF NOT EXISTS `idx_pinjaman_status` (`status`);
ALTER TABLE `pinjaman` ADD INDEX IF NOT EXISTS `idx_pinjaman_tgl_cair` (`tgl_pencairan`);
ALTER TABLE `pinjaman` ADD INDEX IF NOT EXISTS `idx_pinjaman_tgl_pengajuan` (`tgl_pengajuan`);

-- 2. Angsuran
ALTER TABLE `angsuran` ADD INDEX IF NOT EXISTS `idx_angsuran_status` (`status`);
ALTER TABLE `angsuran` ADD INDEX IF NOT EXISTS `idx_angsuran_jatuh_tempo` (`tgl_jatuh_tempo`);
ALTER TABLE `angsuran` ADD INDEX IF NOT EXISTS `idx_angsuran_tgl_bayar` (`tgl_bayar`);

-- 3. Simpanan
ALTER TABLE `simpanan` ADD INDEX IF NOT EXISTS `idx_simpanan_tgl_trx` (`tgl_transaksi`);

-- 4. Anggota
ALTER TABLE `anggota` ADD INDEX IF NOT EXISTS `idx_anggota_nama` (`nama`);
ALTER TABLE `anggota` ADD INDEX IF NOT EXISTS `idx_anggota_status` (`status`);

-- 5. Jurnal Keuangan
ALTER TABLE `jurnal` ADD INDEX IF NOT EXISTS `idx_jurnal_tgl_transaksi` (`tgl_transaksi`);
ALTER TABLE `jurnal` ADD INDEX IF NOT EXISTS `idx_jurnal_ref` (`ref_tipe`, `ref_id`);

-- 6. Toko Retail
ALTER TABLE `toko_pesanan` ADD INDEX IF NOT EXISTS `idx_tp_status` (`status`);
ALTER TABLE `toko_pesanan` ADD INDEX IF NOT EXISTS `idx_tp_tgl` (`tgl_pesanan`);

-- 7. Push Notifikasi
ALTER TABLE `push_logs` ADD INDEX IF NOT EXISTS `idx_push_logs_created` (`created_at`);
