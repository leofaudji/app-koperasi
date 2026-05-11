# CHANGELOG

Semua perubahan penting pada proyek Aplikasi Koperasi Simpan Pinjam akan didokumentasikan di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/), dan proyek ini menggunakan [Semantic Versioning](https://semver.org/lang/id/).

---

## [v2.0.1] - 2026-05-10

### ✨ Ditambahkan
- **Branding Dinamis di Login**: Nama koperasi dan logo pada halaman login kini diambil secara dinamis dari pengaturan database tanpa memerlukan login terlebih dahulu.
- **Collapsible Changelog**: Antarmuka riwayat versi kini dapat diciutkan (collapsible) per versi untuk navigasi yang lebih rapi dan fokus pada versi terbaru.
- **Digital Signature & E-Contract**: Implementasi tanda tangan digital berbasis QR Code pada dokumen SPK (Surat Persetujuan Kredit) untuk verifikasi keaslian dokumen secara instan.
- **Dashboard Analytics Update**: Penambahan statistik "Pinjaman Per Jenis" pada dashboard utama untuk memberikan gambaran portofolio pinjaman yang lebih komprehensif, sejajar dengan statistik simpanan.
- **Fintech Detail Interface**: Redesain total halaman detail anggota dengan antarmuka berbasis tab (Ringkasan, Simpanan, Pinjaman, Profil) ala aplikasi Fintech premium. Dilengkapi dengan indikator progress pelunasan pinjaman, kartu statistik modern, dan navigasi yang lebih intuitif.
- **Modal Mutasi Produk**: Kini pengurus dapat melihat riwayat transaksi simpanan atau riwayat angsuran pinjaman secara instan melalui modal pop-up hanya dengan mengklik kartu produk pada halaman detail anggota.
- **Financial Health Scoreboard**: Panel indikator kesehatan finansial yang mencakup Rasio NPL (Kredit Macet), Pertumbuhan Anggota (MoM), dan Volume Transaksi 30 hari terakhir untuk pemantauan performa bisnis yang lebih akurat.
- **Liquidity Gauge Analytics**: Panel pemantauan likuiditas kas secara real-time yang membandingkan aset kas dengan total kewajiban simpanan, lengkap dengan indikator kesehatan keuangan.
- **Quick Action Magic Menu**: Floating action button (FAB) baru untuk akses cepat ke transaksi simpanan, pinjaman, dan pendaftaran anggota dari halaman mana pun.

### 🔧 Diubah
- **Akses Publik Pengaturan**: Membuka akses baca publik terbatas ke endpoint `/api/settings` untuk mendukung fitur branding dinamis dengan tetap menjaga keamanan data sensitif.
- **Hardening Sesi HTTPS**: Optimalisasi parameter cookie sesi (`Secure`, `HttpOnly`, `SameSite=Lax`) untuk meningkatkan stabilitas login di lingkungan server hosting berbasis HTTPS.

## [v1.8.0] - 2026-05-07

### ✨ Ditambahkan
- **Analitik Produk Laporan Pinjaman**: Ringkasan total saldo per jenis produk di bagian atas laporan untuk akses cepat.
- **Filter Produk Interaktif**: Memungkinkan pemfilteran tabel laporan hanya dengan mengklik kartu analitik produk.
- **Peningkatan Laporan Baki Debet**: Pengelompokan data berdasarkan produk dan penambahan kartu analitik total baki debet per kategori.
- **Sinkronisasi Data Agunan**: Sinkronisasi tipe agunan antara modul manajemen dan laporan daftar agunan.
- **Kolom No. Rekening**: Penambahan informasi nomor pinjaman (rekening) pada Laporan Saldo Pinjaman yang bersifat context-aware terhadap filter produk.

### 🔧 Diubah
- **Optimasi SQL Laporan**: Sinkronisasi kriteria filter antara analitik dan tabel untuk memastikan total saldo selalu matching.
- **Perbaikan Bug Cache**: Pembaruan mekanisme cache-busting (v1.8.0) untuk mengatasi error "TypeError" akibat script lama yang tersimpan di browser.

---

## [v1.7.0] - 2026-05-03

### ✨ Ditambahkan
- **Sistem Reversal Transaksi (Non-Destruktif)**: Memungkinkan pembatalan transaksi Jurnal Umum, Simpanan, Angsuran, dan Pencairan Pinjaman tanpa menghapus data asli (audit-compliant).
- Fitur **Pembalikan Jurnal Otomatis** (Contra Entry) dengan penanda `ref_tipe='reversal'`.
- Label visual **REVERSED** pada tabel transaksi untuk memudahkan identifikasi data yang telah dibatalkan.
- Tombol **Reverse** pada daftar dan detail transaksi (tergantung hak akses).
- Integrasi **Redis Caching** terpusat pada modul keuangan dan kesehatan koperasi untuk performa maksimal.

### 🔧 Diubah
- **Optimasi UI Angsuran**: Penggabungan kolom No. Pinjaman, Nama Anggota, dan Urutan Angsuran menjadi satu kolom "Informasi Pinjaman" yang lebih efisien ruang.
- Standarisasi data API: Menghapus format mata uang dari backend agar dashboard grafik dapat merender data numerik dengan benar.

---

## [v1.6.0] - 2026-04-22

### ✨ Ditambahkan
- Fitur **Monitoring Portal** pada dashboard Admin
- **Dashboard Summary Real-time**: Monitoring jumlah login hari ini, user aktif, total aktifitas, dan split platform (Mobile vs Desktop)
- Pelacakan aktifitas anggota secara real-time (Login, Cek Saldo, Mutasi, Pinjaman, dll.)
- Informasi detail aktifitas: Nama Anggota, Jenis Aktifitas, Platform (Mobile/Desktop), Browser, dan IP Address
- Filter pencarian dan paginasi pada log aktifitas portal

---

## [v1.5.4] - 2026-04-22

### ✨ Ditambahkan
- Penggabungan kolom **No. Anggota** dan **Nama Anggota** menjadi satu kolom "Anggota" yang lebih efisien ruang
- Tampilan ID Anggota menggunakan font mono kecil di bawah nama anggota

### 🔧 Diubah
- Optimasi lebar tabel laporan simpanan agar lebih nyaman dilihat pada layar standar

---

## [v1.5.3] - 2026-04-22

### ✨ Ditambahkan
- Fitur **Sorting Kolom** pada Laporan Saldo Simpanan (klik judul kolom untuk mengurutkan)
- **Ringkasan Total di Atas** (Summary Cards) pada Laporan Saldo Simpanan agar total dapat dilihat langsung tanpa scrolling
- Indikator arah pengurutan (ikon panah) pada header tabel

### 🔧 Diubah
- Pembaruan tampilan dashboard portal untuk konsistensi branding

---

## [v1.5.2] - 2026-04-22

### ✨ Ditambahkan
- Dukungan penuh untuk **Simpanan Partisipatif** di Laporan Saldo Simpanan dan Portal Anggota
- Ikon spesifik untuk Simpanan Partisipatif di dashboard portal

### 🔧 Diubah
- Refaktor layout **Laporan Saldo Simpanan** untuk memastikan tombol aksi berada di atas tabel
- Optimasi SQL `laporan-saldo` menggunakan `LEFT JOIN` agar seluruh anggota aktif tampil di laporan

### 🐞 Perbaiki
- Perbaikan layout "berantakan" pada header laporan simpanan
- Penanganan nilai `NaN` pada kalkulasi total laporan jika terdapat data kosong

---

## [v1.5.1] - 2026-03-23
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
