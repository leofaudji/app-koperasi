-- Menambahkan kolom penghasilan bulanan di tabel anggota untuk kebutuhan Credit Scoring / DSR
ALTER TABLE `anggota` ADD COLUMN `penghasilan_bulanan` DECIMAL(15,2) DEFAULT 0 AFTER `pekerjaan`;
