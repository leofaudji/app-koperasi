-- ============================================
-- DATABASE KOPERASI SIMPAN PINJAM
-- ============================================

CREATE DATABASE IF NOT EXISTS db_koperasi
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_koperasi;

-- ============================================
-- TABEL RBAC & AUTH
-- ============================================

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(50) NOT NULL,
    keterangan VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode VARCHAR(50) NOT NULL UNIQUE,
    nama VARCHAR(100) NOT NULL,
    modul VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_perm (role_id, permission_id)
) ENGINE=InnoDB;

CREATE TABLE menus (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id INT DEFAULT NULL,
    nama VARCHAR(100) NOT NULL,
    icon VARCHAR(50) DEFAULT 'ri-circle-line',
    url VARCHAR(100) DEFAULT NULL,
    urutan INT DEFAULT 0,
    permission_id INT DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    FOREIGN KEY (parent_id) REFERENCES menus(id) ON DELETE SET NULL,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE anggota (
    id INT AUTO_INCREMENT PRIMARY KEY,
    no_anggota VARCHAR(20) NOT NULL UNIQUE,
    nama VARCHAR(100) NOT NULL,
    nik VARCHAR(16) DEFAULT NULL,
    tempat_lahir VARCHAR(50) DEFAULT NULL,
    tanggal_lahir DATE DEFAULT NULL,
    jenis_kelamin ENUM('L','P') DEFAULT 'L',
    alamat TEXT,
    telepon VARCHAR(20),
    email VARCHAR(100),
    pekerjaan VARCHAR(100),
    tgl_daftar DATE NOT NULL,
    status ENUM('aktif','nonaktif','keluar') DEFAULT 'aktif',
    foto VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nama_lengkap VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    role_id INT NOT NULL,
    anggota_id INT DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    last_login DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (anggota_id) REFERENCES anggota(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- TABEL MASTER SIMPANAN
-- ============================================

CREATE TABLE jenis_simpanan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode VARCHAR(10) NOT NULL UNIQUE,
    nama VARCHAR(50) NOT NULL,
    bunga_persen DECIMAL(5,2) DEFAULT 0.00,
    is_wajib TINYINT(1) DEFAULT 0,
    keterangan VARCHAR(255),
    akun_id INT DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (akun_id) REFERENCES akun(id)
) ENGINE=InnoDB;

CREATE TABLE kode_transaksi_simpanan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode VARCHAR(10) NOT NULL UNIQUE,
    nama VARCHAR(50) NOT NULL,
    dk ENUM('D','K') NOT NULL COMMENT 'D=Debit (masuk/tambah saldo), K=Kredit (keluar/kurang saldo)',
    deskripsi VARCHAR(255),
    akun_debit_id INT DEFAULT NULL,
    akun_kredit_id INT DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (akun_debit_id) REFERENCES akun(id),
    FOREIGN KEY (akun_kredit_id) REFERENCES akun(id)
) ENGINE=InnoDB;

-- ============================================
-- TABEL TRANSAKSI SIMPANAN
-- ============================================

CREATE TABLE simpanan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    no_transaksi VARCHAR(30) NOT NULL UNIQUE,
    anggota_id INT NOT NULL,
    jenis_simpanan_id INT NOT NULL,
    kode_transaksi_id INT NOT NULL,
    tgl_transaksi DATE NOT NULL,
    jumlah DECIMAL(15,2) NOT NULL,
    saldo_sebelum DECIMAL(15,2) DEFAULT 0.00,
    saldo_sesudah DECIMAL(15,2) DEFAULT 0.00,
    keterangan TEXT,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (anggota_id) REFERENCES anggota(id),
    FOREIGN KEY (jenis_simpanan_id) REFERENCES jenis_simpanan(id),
    FOREIGN KEY (kode_transaksi_id) REFERENCES kode_transaksi_simpanan(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================
-- TABEL MASTER PINJAMAN
-- ============================================

CREATE TABLE jenis_pinjaman (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode VARCHAR(10) NOT NULL UNIQUE,
    nama VARCHAR(50) NOT NULL,
    bunga_persen DECIMAL(5,2) DEFAULT 0.00,
    max_tenor INT DEFAULT 12 COMMENT 'Maksimal tenor dalam bulan',
    max_jumlah DECIMAL(15,2) DEFAULT 0.00,
    keterangan VARCHAR(255),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- TABEL TRANSAKSI PINJAMAN
-- ============================================

CREATE TABLE pinjaman (
    id INT AUTO_INCREMENT PRIMARY KEY,
    no_pinjaman VARCHAR(30) NOT NULL UNIQUE,
    anggota_id INT NOT NULL,
    jenis_pinjaman_id INT NOT NULL,
    tgl_pengajuan DATE NOT NULL,
    tgl_disetujui DATE DEFAULT NULL,
    tgl_pencairan DATE DEFAULT NULL,
    jumlah DECIMAL(15,2) NOT NULL,
    tenor INT NOT NULL COMMENT 'Tenor dalam bulan',
    bunga_persen DECIMAL(5,2) NOT NULL,
    total_bunga DECIMAL(15,2) DEFAULT 0.00,
    total_bayar DECIMAL(15,2) DEFAULT 0.00,
    sisa_pinjaman DECIMAL(15,2) DEFAULT 0.00,
    status ENUM('pending', 'disetujui', 'cair', 'lunas', 'ditolak') DEFAULT 'pending',
    approved_by INT DEFAULT NULL,
    keterangan TEXT,
    agunan TEXT DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (anggota_id) REFERENCES anggota(id),
    FOREIGN KEY (jenis_pinjaman_id) REFERENCES jenis_pinjaman(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE angsuran (
    id INT AUTO_INCREMENT PRIMARY KEY,
    no_transaksi VARCHAR(30) NOT NULL UNIQUE,
    pinjaman_id INT NOT NULL,
    angsuran_ke INT NOT NULL,
    tgl_jatuh_tempo DATE NOT NULL,
    tgl_bayar DATE DEFAULT NULL,
    pokok DECIMAL(15,2) NOT NULL,
    bunga DECIMAL(15,2) NOT NULL,
    denda DECIMAL(15,2) DEFAULT 0.00,
    total DECIMAL(15,2) NOT NULL,
    status ENUM('belum','lunas','terlambat') DEFAULT 'belum',
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pinjaman_id) REFERENCES pinjaman(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================
-- TABEL KEUANGAN
-- ============================================

CREATE TABLE akun (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kode VARCHAR(10) NOT NULL UNIQUE,
    nama VARCHAR(100) NOT NULL,
    tipe ENUM('aset','kewajiban','modal','pendapatan','beban') NOT NULL,
    parent_id INT DEFAULT NULL,
    level INT DEFAULT 1,
    saldo_normal ENUM('D','K') NOT NULL,
    kelompok VARCHAR(50) DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES akun(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE jurnal (
    id INT AUTO_INCREMENT PRIMARY KEY,
    no_bukti VARCHAR(30) NOT NULL UNIQUE,
    tgl_transaksi DATE NOT NULL,
    keterangan TEXT,
    ref_tipe VARCHAR(30) DEFAULT NULL COMMENT 'simpanan/pinjaman/angsuran/manual',
    ref_id INT DEFAULT NULL,
    total_debit DECIMAL(15,2) DEFAULT 0.00,
    total_kredit DECIMAL(15,2) DEFAULT 0.00,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE jurnal_detail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jurnal_id INT NOT NULL,
    akun_id INT NOT NULL,
    debit DECIMAL(15,2) DEFAULT 0.00,
    kredit DECIMAL(15,2) DEFAULT 0.00,
    keterangan VARCHAR(255),
    FOREIGN KEY (jurnal_id) REFERENCES jurnal(id) ON DELETE CASCADE,
    FOREIGN KEY (akun_id) REFERENCES akun(id)
) ENGINE=InnoDB;

-- ============================================
-- DATA DEFAULT
-- ============================================

-- Roles
INSERT INTO roles (id, nama, keterangan) VALUES
(1, 'Admin', 'Administrator sistem dengan akses penuh'),
(2, 'Petugas', 'Petugas koperasi untuk transaksi'),
(3, 'Anggota', 'Anggota koperasi - akses portal');

-- Permissions
INSERT INTO permissions (kode, nama, modul) VALUES
('dashboard.view', 'Lihat Dashboard', 'dashboard'),
('anggota.view', 'Lihat Data Anggota', 'anggota'),
('anggota.create', 'Tambah Anggota', 'anggota'),
('anggota.edit', 'Edit Anggota', 'anggota'),
('anggota.delete', 'Hapus Anggota', 'anggota'),
('simpanan.view', 'Lihat Simpanan', 'simpanan'),
('simpanan.create', 'Transaksi Simpanan', 'simpanan'),
('simpanan.setting', 'Setting Simpanan', 'simpanan'),
('pinjaman.view', 'Lihat Pinjaman', 'pinjaman'),
('pinjaman.create', 'Buat Pinjaman', 'pinjaman'),
('pinjaman.approve', 'Approve Pinjaman', 'pinjaman'),
('pinjaman.setting', 'Setting Pinjaman', 'pinjaman'),
('angsuran.view', 'Lihat Angsuran', 'angsuran'),
('angsuran.create', 'Bayar Angsuran', 'angsuran'),
('keuangan.jurnal', 'Jurnal Umum', 'keuangan'),
('keuangan.buku_besar', 'Buku Besar', 'keuangan'),
('keuangan.neraca', 'Laporan Neraca', 'keuangan'),
('keuangan.laba_rugi', 'Laporan Laba Rugi', 'keuangan'),
('keuangan.akun', 'Setting Akun', 'keuangan'),
('user.view', 'Lihat Users', 'user'),
('user.create', 'Tambah User', 'user'),
('user.edit', 'Edit User', 'user'),
('user.delete', 'Hapus User', 'user'),
('role.view', 'Lihat Roles', 'role'),
('role.manage', 'Kelola Roles', 'role'),
('portal.view', 'Akses Portal', 'portal');

-- Role Permissions: Admin = semua
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Role Permissions: Petugas
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE kode IN (
    'dashboard.view','anggota.view','anggota.create','anggota.edit',
    'simpanan.view','simpanan.create','pinjaman.view','pinjaman.create',
    'angsuran.view','angsuran.create','keuangan.jurnal','keuangan.buku_besar'
);

-- Role Permissions: Anggota
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE kode = 'portal.view';

-- Menus
INSERT INTO menus (id, parent_id, nama, icon, url, urutan, permission_id) VALUES
(1,  NULL, 'Dashboard',      'ri-dashboard-line',   '#/dashboard',    1,  (SELECT id FROM permissions WHERE kode='dashboard.view')),
(2,  NULL, 'Master Data',    'ri-database-2-line',  NULL,             2,  NULL),
(3,  2,    'Data Anggota',   'ri-group-line',       '#/anggota',      1,  (SELECT id FROM permissions WHERE kode='anggota.view')),
(4,  2,    'Jenis Simpanan', 'ri-wallet-3-line',    '#/jenis-simpanan', 2, (SELECT id FROM permissions WHERE kode='simpanan.setting')),
(5,  2,    'Kode Transaksi', 'ri-exchange-line',    '#/kode-transaksi', 3, (SELECT id FROM permissions WHERE kode='simpanan.setting')),
(6,  2,    'Jenis Pinjaman', 'ri-hand-coin-line',   '#/jenis-pinjaman', 4, (SELECT id FROM permissions WHERE kode='pinjaman.setting')),
(7,  NULL, 'Simpanan',       'ri-wallet-line',      NULL,             3,  NULL),
(8,  7,    'Transaksi Simpanan', 'ri-exchange-funds-line', '#/simpanan', 1, (SELECT id FROM permissions WHERE kode='simpanan.create')),
(9,  7,    'Mutasi Simpanan','ri-file-list-3-line', '#/mutasi-simpanan', 2, (SELECT id FROM permissions WHERE kode='simpanan.view')),
(10, NULL, 'Pinjaman',       'ri-hand-coin-line',   NULL,             4,  NULL),
(11, 10,   'Daftar Pinjaman','ri-file-text-line',   '#/pinjaman',     1,  (SELECT id FROM permissions WHERE kode='pinjaman.view')),
(12, 10,   'Pembayaran Angsuran', 'ri-money-dollar-circle-line', '#/angsuran', 2, (SELECT id FROM permissions WHERE kode='angsuran.create')),
(13, NULL, 'Keuangan',       'ri-line-chart-line',  NULL,             5,  NULL),
(14, 13,   'Jurnal Umum',    'ri-book-open-line',   '#/jurnal',       1,  (SELECT id FROM permissions WHERE kode='keuangan.jurnal')),
(15, 13,   'Buku Besar',     'ri-book-2-line',      '#/buku-besar',   2,  (SELECT id FROM permissions WHERE kode='keuangan.buku_besar')),
(16, 13,   'Neraca',         'ri-scales-3-line',    '#/neraca',       3,  (SELECT id FROM permissions WHERE kode='keuangan.neraca')),
(17, 13,   'Laba Rugi',      'ri-funds-line',       '#/laba-rugi',    4,  (SELECT id FROM permissions WHERE kode='keuangan.laba_rugi')),
(18, 13,   'Chart of Account','ri-list-settings-line','#/akun',       5,  (SELECT id FROM permissions WHERE kode='keuangan.akun')),
(19, NULL, 'Pengaturan',     'ri-settings-3-line',  NULL,             6,  NULL),
(20, 19,   'Manajemen User', 'ri-user-settings-line','#/users',      1,  (SELECT id FROM permissions WHERE kode='user.view')),
(21, 19,   'Manajemen Role', 'ri-shield-user-line', '#/roles',       2,  (SELECT id FROM permissions WHERE kode='role.view'));

-- Kode Transaksi Simpanan
INSERT INTO kode_transaksi_simpanan (kode, nama, dk, deskripsi) VALUES
('STR', 'Setoran',         'D', 'Setoran simpanan anggota - menambah saldo'),
('TRK', 'Penarikan',       'K', 'Penarikan simpanan anggota - mengurangi saldo'),
('BNG', 'Bunga',           'D', 'Bunga simpanan - menambah saldo'),
('PJK', 'Pajak Bunga',     'K', 'Pajak atas bunga simpanan - mengurangi saldo'),
('ADM', 'Biaya Admin',     'K', 'Biaya administrasi - mengurangi saldo'),
('TRF', 'Transfer Masuk',  'D', 'Transfer masuk dari simpanan lain - menambah saldo'),
('TRO', 'Transfer Keluar', 'K', 'Transfer keluar ke simpanan lain - mengurangi saldo'),
('KRD', 'Koreksi Debit',   'D', 'Koreksi penambahan saldo'),
('KRK', 'Koreksi Kredit',  'K', 'Koreksi pengurangan saldo');

-- Jenis Simpanan
INSERT INTO jenis_simpanan (kode, nama, bunga_persen, is_wajib, keterangan) VALUES
('SP', 'Simpanan Pokok',     0.00, 1, 'Simpanan pokok dibayar sekali saat mendaftar'),
('SW', 'Simpanan Wajib',     0.00, 1, 'Simpanan wajib dibayar setiap bulan'),
('SS', 'Simpanan Sukarela',  2.50, 0, 'Simpanan sukarela dengan bunga 2.5% per tahun');

-- Jenis Pinjaman
INSERT INTO jenis_pinjaman (kode, nama, bunga_persen, max_tenor, max_jumlah, keterangan) VALUES
('PR', 'Pinjaman Reguler',     1.50, 24, 50000000.00, 'Pinjaman reguler bunga 1.5% per bulan flat'),
('PD', 'Pinjaman Darurat',     2.00, 12, 10000000.00, 'Pinjaman darurat bunga 2% per bulan flat'),
('PK', 'Pinjaman Konsumtif',   1.75, 36, 100000000.00, 'Pinjaman konsumtif bunga 1.75% per bulan flat');

-- Chart of Accounts
INSERT INTO akun (kode, nama, tipe, saldo_normal, level, kelompok) VALUES
('1000', 'Kas',                        'aset',       'D', 1, 'Aktiva Lancar'),
('1100', 'Bank',                       'aset',       'D', 1, 'Aktiva Lancar'),
('1200', 'Piutang Pinjaman',           'aset',       'D', 1, 'Aktiva Lancar'),
('1300', 'Pendapatan Bunga YMH Terima','aset',       'D', 1, 'Aktiva Lancar'),
('2000', 'Simpanan Anggota',           'kewajiban',  'K', 1, 'Jangka Pendek'),
('2100', 'Hutang Bunga Simpanan',      'kewajiban',  'K', 1, 'Jangka Pendek'),
('2200', 'Hutang Pajak',               'kewajiban',  'K', 1, 'Jangka Pendek'),
('3000', 'Modal Koperasi',             'modal',      'K', 1, 'Modal'),
('3100', 'SHU Tahun Berjalan',         'modal',      'K', 1, 'Modal'),
('4000', 'Pendapatan Bunga Pinjaman',  'pendapatan', 'K', 1, 'Laba/Rugi'),
('4100', 'Pendapatan Administrasi',    'pendapatan', 'K', 1, 'Laba/Rugi'),
('4200', 'Pendapatan Denda',           'pendapatan', 'K', 1, 'Laba/Rugi'),
('4300', 'Pendapatan Lain-lain',       'pendapatan', 'K', 1, 'Laba/Rugi'),
('5000', 'Beban Bunga Simpanan',       'beban',      'D', 1, 'Laba/Rugi'),
('5100', 'Beban Administrasi',         'beban',      'D', 1, 'Laba/Rugi'),
('5200', 'Beban Operasional',          'beban',      'D', 1, 'Laba/Rugi'),
('5300', 'Beban Lain-lain',            'beban',      'D', 1, 'Laba/Rugi');

-- Default Admin User (password: admin123)
INSERT INTO anggota (no_anggota, nama, nik, alamat, telepon, tgl_daftar, status) VALUES
('AGT-0001', 'Administrator', '0000000000000001', 'Kantor Koperasi', '08123456789', CURDATE(), 'aktif');

INSERT INTO users (username, password, nama_lengkap, email, role_id, anggota_id) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'admin@koperasi.com', 1, 1);

-- Sample anggota
INSERT INTO anggota (no_anggota, nama, nik, alamat, telepon, email, tgl_daftar, status) VALUES
('AGT-0002', 'Budi Santoso',   '3201010101010001', 'Jl. Merdeka No. 10', '081234567890', 'budi@email.com', CURDATE(), 'aktif'),
('AGT-0003', 'Siti Aminah',    '3201010101010002', 'Jl. Pahlawan No. 5', '081234567891', 'siti@email.com', CURDATE(), 'aktif'),
('AGT-0004', 'Ahmad Hidayat',  '3201010101010003', 'Jl. Sudirman No. 20','081234567892', 'ahmad@email.com', CURDATE(), 'aktif');

-- User accounts for sample anggota
INSERT INTO users (username, password, nama_lengkap, email, role_id, anggota_id) VALUES
('budi',  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Budi Santoso',  'budi@email.com',  3, 2),
('siti',  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Siti Aminah',   'siti@email.com',  3, 3),
('ahmad', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Ahmad Hidayat', 'ahmad@email.com', 3, 4);
