-- Migration to add top-up fields to pinjaman table
ALTER TABLE pinjaman ADD COLUMN topup_ref_id INT NULL AFTER agunan;
ALTER TABLE pinjaman ADD COLUMN is_topup TINYINT(1) DEFAULT 0 AFTER topup_ref_id;
