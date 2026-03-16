# CHANGELOG

Semua perubahan penting pada proyek Aplikasi Koperasi Simpan Pinjam akan didokumentasikan di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/), dan proyek ini menggunakan [Semantic Versioning](https://semver.org/lang/id/).

---

## [v1.5.0] - 2026-03-16

### ✨ Ditambahkan
- Halaman **Changelog** dengan tampilan version control yang interaktif
- File `CHANGELOG.md` sebagai sumber tunggal riwayat versi
- Entri menu **Changelog** di bagian SISTEM pada sidebar
- Fitur filter changelog berdasarkan tipe perubahan (Tambah / Ubah / Hapus / Perbaiki)

### 🔧 Diubah
- Pembersihan file migrasi dan debug yang sudah tidak digunakan dari root dan folder `database/`
- Penambahan `.gitignore` untuk mengecualikan `database.sql` dan folder `uploads/`

---

## [v1.4.0] - 2026-03-13

### ✨ Ditambahkan
- Fitur **upload logo koperasi** pada halaman Pengaturan
- Logo koperasi ditampilkan di header PDF laporan
- Direktori `uploads/` untuk menyimpan fil aset (logo, dll.)

### 🔧 Diubah
- Halaman pengaturan menggunakan tab layout yang lebih terstruktur (Umum, Portal, Tampilan, Tema, Backup)

---

## [v1.3.0] - 2026-03-09

### ✨ Ditambahkan
- Fitur **Backup & Restore Database** di halaman Pengaturan
- Ekspor database dalam format `.sql`
- Impor/restore database dari file `.sql`

---

## [v1.2.0] - 2026-03-09

### ✨ Ditambahkan
- Sistem **Audit Log & Activity Tracking** untuk memantau perubahan transaksi
- Tabel `audit_logs` di database
- Helper `logActivity` pada API core
- Tab "History Perubahan" di halaman Audit Saldo
- Integrasi pencatatan aktivitas pada `SimpananController`, `PinjamanController`, `AngsuranController`

---

## [v1.1.0] - 2026-03-05

### ✨ Ditambahkan
- Modul **RAT (Rapat Anggota Tahunan)** — Manajemen RAT dan Pengundian RAT
- Fitur **eksekusi pembagian SHU** dari modul RAT, termasuk kalkulasi Jasa Modal dan Jasa Anggota
- Tabel `rat_shu_executions` untuk mencegah distribusi SHU ganda
- Tombol "Eksekusi Pembagian SHU" (kondisional) pada topik RAT yang sudah ditutup

---

## [v1.0.0] - 2026-03-01

### ✨ Ditambahkan
- Rilis awal Aplikasi Koperasi Simpan Pinjam
- Manajemen **Anggota** (pendaftaran, edit, nonaktif)
- Modul **Simpanan** — Jenis simpanan, kode transaksi, transaksi, mutasi
- Modul **Pinjaman** — Pengajuan, persetujuan, pencairan, angsuran, agunan
- Modul **Keuangan** — Jurnal umum, buku besar, neraca, laba rugi
- Laporan: Saldo simpanan, buku simpanan, laporan pinjaman, baki debet, kolektibilitas, kartu angsuran
- Modul **Pembagian SHU** dan **Proses Akhir Tahun**
- Sistem **RBAC** (Role-Based Access Control) — Admin, Petugas, Anggota
- **Portal Anggota** (PWA) untuk akses informasi simpan pinjam mandiri
- Sistem **Pengumuman** untuk komunikasi koperasi kepada anggota
- **Laporan Tingkat Kesehatan Koperasi** sesuai standar penilaian
- Sistem pengaturan aplikasi (nama koperasi, alamat, tema warna, logo)
- **Tema warna** yang dapat disesuaikan (Indigo, Violet, Biru, Cyan, Hijau, Oranye, Merah, Abu-abu)
