-- Migrasi: Biaya Pencairan Pinjaman
-- Tabel master jenis biaya
CREATE TABLE IF NOT EXISTS jenis_biaya_pinjaman (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nama        VARCHAR(100) NOT NULL,
    tipe        ENUM('nominal','persen') DEFAULT 'nominal',
    nilai       DECIMAL(15,4) DEFAULT 0 COMMENT 'Nilai nominal (Rp) atau persentase dari jumlah pinjaman',
    is_wajib    TINYINT(1) DEFAULT 0 COMMENT '1=wajib muncul di form, 0=opsional',
    is_active   TINYINT(1) DEFAULT 1,
    urutan      INT DEFAULT 0,
    akun_id     INT NULL COMMENT 'Akun kreditur biaya (pendapatan)',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Data default jenis biaya umum
INSERT IGNORE INTO jenis_biaya_pinjaman (nama, tipe, nilai, is_wajib, urutan) VALUES
  ('Biaya Provisi',        'persen',  0.5000, 1, 1),
  ('Biaya Administrasi',   'nominal', 50000,  1, 2),
  ('Biaya Materai',        'nominal', 10000,  1, 3),
  ('Biaya Asuransi',       'persen',  0.2000, 0, 4),
  ('Biaya Notaris',        'nominal', 0,      0, 5);

-- Tabel rincian biaya per pencairan
CREATE TABLE IF NOT EXISTS biaya_pencairan (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    pinjaman_id     INT NOT NULL,
    jenis_biaya_id  INT NULL COMMENT 'NULL jika biaya tambahan manual',
    nama_biaya      VARCHAR(100) NOT NULL,
    jumlah          DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pinjaman (pinjaman_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
