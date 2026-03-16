-- ============================================================
-- Migration: Manajemen Agunan (Jaminan)
-- Jalankan di MySQL: database db_koperasi
-- ============================================================

USE db_koperasi;

-- 1. Tabel Agunan
CREATE TABLE IF NOT EXISTS agunan (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    pinjaman_id     INT NOT NULL,
    tipe_agunan     ENUM('SHM','SHGB','BPKB','Deposito','Lainnya') NOT NULL DEFAULT 'Lainnya',
    deskripsi       VARCHAR(255) NOT NULL COMMENT 'Keterangan/nama jaminan',
    no_dokumen      VARCHAR(100) DEFAULT NULL COMMENT 'No. SHM / BPKB / dll',
    pemilik         VARCHAR(100) DEFAULT NULL COMMENT 'Nama pemilik jaminan',
    nilai_taksasi   DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Nilai taksasi/perkiraan',
    tgl_terima      DATE NOT NULL,
    tgl_kembali     DATE DEFAULT NULL,
    status          ENUM('aktif','dikembalikan') DEFAULT 'aktif',
    keterangan      TEXT DEFAULT NULL,
    created_by      INT DEFAULT NULL,
    updated_by      INT DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pinjaman_id) REFERENCES pinjaman(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by)  REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by)  REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Permissions baru
INSERT IGNORE INTO permissions (kode, nama, modul) VALUES
('agunan.view',   'Lihat Agunan',      'agunan'),
('agunan.manage', 'Kelola Agunan',     'agunan');

-- 3. Beri permission ke role Admin (role_id=1) dan Petugas (role_id=2)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE kode IN ('agunan.view','agunan.manage');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE kode IN ('agunan.view','agunan.manage');

-- 4. Menu: Manajemen Agunan di bawah parent Pinjaman (parent_id=10)
--    Cegah duplikat jika migration dijalankan ulang
INSERT INTO menus (parent_id, nama, icon, url, urutan, permission_id)
SELECT
    10,
    'Manajemen Agunan',
    'ri-shield-check-line',
    '#/agunan',
    3,
    (SELECT id FROM permissions WHERE kode = 'agunan.view' LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM menus WHERE url = '#/agunan'
);
