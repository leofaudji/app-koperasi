# CHANGELOG

Semua perubahan penting pada proyek Aplikasi Koperasi Simpan Pinjam akan didokumentasikan di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/), dan proyek ini menggunakan [Semantic Versioning](https://semver.org/lang/id/).

---

## [v2.1.4] - 2026-07-07

### 🎨 Desain & UI
- **Grup Dropdown Aksi Tabel:** Mengganti deretan tombol aksi (Struk, Koreksi, Reversal) pada tabel Transaksi Simpanan dan Pembayaran Angsuran dengan satu tombol dropdown **"Aksi"** yang ringkas dan elegan, menghemat ruang horizontal tabel dan membuat tampilan jauh lebih rapi.

## [v2.1.3] - 2026-07-07

### ✨ Ditambahkan
- **Cetak Struk Thermal POS (POS Printer Receipt Layout):** Tombol "Struk" baru pada daftar Transaksi Simpanan dan Pembayaran Angsuran untuk memicu cetak bukti bayar thermal POS (lebar 76mm/80mm) yang rapi, lengkap dengan detail baris, nama kasir, dan kolom tanda tangan ganda (kasir & anggota).

## [v2.1.2] - 2026-07-07

### ✨ Ditambahkan
- **Pintasan Sumber Transaksi (Traceability Link):** Tombol "Buka Transaksi" pada detail jurnal otomatis (Simpanan, Angsuran, Pinjaman) untuk langsung beralih dan memfilter transaksi asli di halaman masing-masing.
- **Indikator & Histori Koreksi (Audit Trail):** Label badge **"DIEDIT"** berwarna kuning jika transaksi telah dikoreksi. Mengklik badge akan memunculkan timeline modal riwayat perubahan, lengkap dengan perbandingan field lama vs baru (*side-by-side JSON diff* dan format Rupiah otomatis).

## [v2.1.1] - 2026-07-07

### ✨ Ditambahkan
- **Fitur Koreksi Jurnal Manual:** Pengguna dapat mengoreksi data tanggal, keterangan, dan akun debit/kredit pada entri Jurnal Umum manual.
- **Koreksi Transaksi Angsuran:** Dukungan koreksi/edit nominal pokok, bunga, denda, tanggal, dan kas masuk pada transaksi Angsuran.

### 🎨 Desain & UI
- **Penyederhanaan Tabel Angsuran:** Kolom Pokok, Bunga, dan Total digabungkan menjadi kolom "Rincian Pembayaran" yang dinamis dan hemat ruang.
- **Penyederhanaan Jurnal Umum:** Menggabungkan kolom Faktur (No. Bukti) dan Tanggal Transaksi menjadi satu kolom info vertikal yang ringkas.
- **Status Metode Pembayaran:** Menambahkan informasi metode bayar (Tunai/Transfer) langsung di bawah badge status pada tabel Angsuran.

## [v2.1.0] - 2026-07-07

### ✨ Ditambahkan
- **Metode Pembayaran Multi-Akun:** Dukungan metode pembayaran `Transfer Bank` dengan pilihan akun kas/bank tujuan pada modul Simpanan, Angsuran, Pinjaman, dan Jurnal.
- **Kustomisasi Tanggal Transaksi:** Pengisian tanggal transaksi kustom pada modul Angsuran dan Jurnal untuk pencatatan historis yang akurat.
- **Filter Metode Pembayaran:** Penyaringan data transaksi berdasarkan metode pembayaran (`Tunai`/`Transfer`) pada tabel Simpanan, Laporan Mutasi Simpanan, Angsuran, dan Laporan Mutasi Angsuran.

### 🔧 Perbaikan
- **Pengecualian Data Migrasi di Audit Koperasi:** Transaksi berlabel "Import", "Migrasi", dan "Saldo Awal" kini dikecualikan dari deteksi data yatim (orphan) dan backdated untuk mencegah kesalahan penilaian kesehatan koperasi.
- **Optimasi Penalti Backdated:** Sistem penilaian kesehatan hanya mengenakan penalti untuk transaksi backdated yang melebihi 30 hari (bukan lagi 3 hari), sehingga input transaksi bulanan biasa tidak mengurangi skor.
- **Perbaikan Query SQL Audit:** Pengelompokan (GROUP BY) pada query rekonsiliasi GL pinjaman untuk memastikan kompatibilitas database yang lebih baik.
- **Pembersihan Cache Otomatis:** Sinkronisasi pembersihan cache modul keuangan, audit, dan simpanan pada setiap transaksi simpanan dan pinjaman.

## [v2.0.5] - 2026-06-24

### ✨ Ditambahkan
- **Shortcut Transaksi Wajib:** Tombol langsung dari halaman Monitoring Simpanan Wajib membuka modal transaksi dengan `jenis_simpanan=SW`.
- **Tampilan Tabel Simpanan Ringkas:** Penyederhanaan tabel `Simpanan` dengan kolom bergabung dan baris lebih kompak agar data dapat dibaca lebih efisien.

### 🔧 Perbaikan
- **Perbaikan No. Rekening:** Backend list simpanan sekarang mengikutkan `no_rekening` sehingga data rekening dapat ditampilkan di tabel transaksi.
- **Filter Rekening Simpanan SW:** Pencarian rekening pada modal simpanan menggunakan `jenis_simpanan=SW` untuk shortcut setoran wajib.
- **Monitoring Simpanan Wajib Stabil:** API `simpanan/monitoring-wajib` sekarang menyediakan `sp_lunas` dan `sw_months` serta mencegah deteksi `undefined` pada bulan yang belum punya data.
- **Logika Kepatuhan SW:** Penyederhanaan dan perbaikan logika deteksi tunggakan SW/SP agar anggota yang telah setor teridentifikasi dengan benar.

## [v2.0.4] - 2026-05-20

### ✨ Ditambahkan
- **Premium PDF Engine Upgrade (Global Helper):** Integrasi header bergradien modern kustom, visual accent bar pada subjudul, serta footer dinamis dengan nomor halaman (`Page X of Y`) pada semua modul laporan.
- **Auto-Width & Proportional Column Sizing:** Menghitung lebar kolom secara proporsional dan otomatis berbasis tipe data (mono-width untuk nomor, lebar luas untuk deskripsi, sedang untuk finansial), mencegah pemotongan data teks penting.
- **Dynamic Status Badging in PDF Tables:** Penataan otomatis teks status (LANCAR, MACET, PENDING, AKTIF, dll.) menjadi badge berwarna dengan kontras tinggi yang menyesuaikan dengan tema aktif sistem pada dokumen PDF.
- **Visual Category Badging (Reconciliation PDF):** Menambahkan aksen warna latar belakang Indigo (Simpanan) dan Purple (Pinjaman) yang elegan untuk membedakan kategori transaksi pada laporan audit secara cepat.
- **Combined Account & GL Column (Reconciliation PDF):** Menggabungkan kolom "Nama Rekening Akun" dan "Kode Akun" menjadi satu kolom ringkas "Rekening & Akun GL" dengan pemisah baris (`\n`), menghemat ruang horizontal dan memastikan nilai nominal Rupiah memiliki ruang maksimal.

### 🔧 Perbaikan
- **Penyuntingan Karakter Garbled jsPDF:** Mengganti simbol checkmark Unicode (`✔`) dengan teks ASCII standar (`[OK]`), memperbaiki isu di mana PDF viewer standar merender checkmark sebagai karakter sampah `&&&&`.
- **Dynamic Header & Title Alignment:** Menyeimbangkan tinggi area gradien `drawPDFHeader` dan menurunkan koordinat vertikal judul laporan ke `y = 38.5` serta sub-header ke `y = 44` untuk mengeliminasi tabrakan visual.
- **Proteksi Page-Break Multi-Halaman:** Menerapkan batas margin pengaman `top: 48` pada seluruh rendering autoTable kustom (`audit.js`, `kesehatan-koperasi.js`, `buku-simpanan.js`, `kartu-angsuran.js`, `pengundian-rat.js`) agar judul tabel tidak tertimpa banner dinamis pada halaman 2+.
- **Reconciliation Data Mapping:** Memperbaiki mapping data sehingga temuan selisih nominal transaksi dan data yatim (orphan) dapat dibaca dengan nilai riil yang akurat.
- **Branding & Splash Screen Polish:** Poles visual logo, background glow, grayscale footer partner, serta perbaikan typo teks bahasa Inggris ke bahasa Indonesia ("and" -> "dan") pada `index.html` untuk meningkatkan estetika antarmuka login.

## [v2.0.2] - 2026-05-13

### Fixed
- **Date Handling**: Fixed UTC date shifts in App.todayISO and resolved default filter value discrepancies in Mutasi Simpanan.
- **Activity History**: Integrated live activity logs into Member Detail page.

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
