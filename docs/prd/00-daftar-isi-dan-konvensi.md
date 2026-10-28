# PRD - 00: Daftar Isi, Matriks Fungsional, dan Konvensi Sistem

## 1. Identifikasi Dokumen
- **Nama Produk**: Aplikasi Koperasi Simpan Pinjam Terintegrasi (KSP Core & Portal PWA)
- **Kode Repositori**: `app-koperasi`
- **Versi Produk Saat Ini**: `v2.9.8`
- **Klasifikasi Dokumen**: Product Requirement Document (PRD) Modular
- **Target Pembaca**: Product Owner, Pengurus Koperasi, Software Engineer, Quality Assurance, Database Administrator, AI Coding Agents.

---

## 2. Peta Berkas PRD Modular

| Bab | Berkas PRD | Lingkup Fungsional | Pemilik Modul |
| :---: | :--- | :--- | :--- |
| **00** | [`00-daftar-isi-dan-konvensi.md`](file:///d:/laragon/www/app-koperasi/docs/prd/00-daftar-isi-dan-konvensi.md) | Daftar isi, matriks penomoran, standar kode, konvensi, & log sinkronisasi rilis | Lead Architect |
| **01** | [`01-ringkasan-eksekutif-dan-arsitektur.md`](file:///d:/laragon/www/app-koperasi/docs/prd/01-ringkasan-eksekutif-dan-arsitektur.md) | Visi produk, arsitektur High-Performance Admin Engine, prefetch hover, in-memory caching, non-blocking concurrency, & tech stack | Lead Architect |
| **02** | [`02-autentikasi-dan-manajemen-akses-rbac.md`](file:///d:/laragon/www/app-koperasi/docs/prd/02-autentikasi-dan-manajemen-akses-rbac.md) | Login, sesi HTTPS, CSRF, RBAC dinamis, relaksasi izin baca COA operasional, standar interaksi modal non-blocking, & Audit Trail | Security Lead |
| **03** | [`03-master-data-dan-keanggotaan.md`](file:///d:/laragon/www/app-koperasi/docs/prd/03-master-data-dan-keanggotaan.md) | Profil anggota, verifikasi NIK/KTP, produk simpanan/pinjaman, COA | Core Dev |
| **04** | [`04-modul-simpanan.md`](file:///d:/laragon/www/app-koperasi/docs/prd/04-modul-simpanan.md) | Simpanan Pokok, Wajib, Sukarela, Partisipatif, Mutasi, Monitoring Tunggakan SW, Push Reversal | Financial Dev |
| **05** | [`05-modul-pinjaman-dan-agunan.md`](file:///d:/laragon/www/app-koperasi/docs/prd/05-modul-pinjaman-dan-agunan.md) | Pinjaman flat, review, approval, multi-refinancing (top-up), agunan, SPK QR, Push Pencairan & Reversal | Credit Dev |
| **06** | [`06-modul-angsuran-dan-reversal.md`](file:///d:/laragon/www/app-koperasi/docs/prd/06-modul-angsuran-dan-reversal.md) | Angsuran kasir/overbooking SS, pelunasan dipercepat, thermal POS, reversal non-destruktif, Kalender Jatuh Tempo & Reminder WA | Billing Dev |
| **07** | [`07-modul-akuntansi-dan-keuangan.md`](file:///d:/laragon/www/app-koperasi/docs/prd/07-modul-akuntansi-dan-keuangan.md) | Double-entry GL, Kas Masuk/Keluar/Mutasi, Voucher BKM/BKK/BMK, Neraca SAK EP, Sticky Summary Bar, Laba Rugi, Ekuitas | Accounting Lead |
| **08** | [`08-modul-laporan-dan-analitik.md`](file:///d:/laragon/www/app-koperasi/docs/prd/08-modul-laporan-dan-analitik.md) | Laporan saldo, baki debet, kolektibilitas/NPL, mutasi, Quick Date Chips, Table Density, Sticky Summary Bar, PDF & CSV | Reporting Dev |
| **09** | [`09-modul-rat-dan-shu.md`](file:///d:/laragon/www/app-koperasi/docs/prd/09-modul-rat-dan-shu.md) | RAT kuorum, Doorprize wheel, distribusi SHU otomatis, tutup buku tahunan | Governance Dev |
| **10** | [`10-portal-anggota-pwa.md`](file:///d:/laragon/www/app-koperasi/docs/prd/10-portal-anggota-pwa.md) | PWA Member Portal, Web Push Notification RFC 8291/8292, Billing card, Autodebet SS, Toko, & Admin Push (`#/web-push`) | Mobile/PWA Dev |
| **11** | [`11-kepatuhan-regulasi-dan-kesehatan-koperasi.md`](file:///d:/laragon/www/app-koperasi/docs/prd/11-kepatuhan-regulasi-dan-kesehatan-koperasi.md) | Kertas Kerja Pemeriksaan Kesehatan Koperasi (KKPKK 4 Pilar), 7 Rasio KUK 1-4, Shared Engine Helper | Compliance Lead |
| **12** | [`12-keamanan-infrastruktur-dan-pemeliharaan.md`](file:///d:/laragon/www/app-koperasi/docs/prd/12-keamanan-infrastruktur-dan-pemeliharaan.md) | Redis caching, HTTP Gzip/Expires, Skrip Migrasi Indeks Produksi MySQL, Backup/Restore .sql, CLI scripts, Database integrity repair | DevOps Lead |

---

## 3. Matriks Konvensi Penomoran Transaksi & Rekening

Seluruh dokumen transaksi dan rekening dalam sistem menggunakan format nomor terstandarisasi yang dibangkitkan otomatis (*auto-generated*):

| Modul | Entitas | Format Penomoran | Pola Regular Expression | Contoh Riil |
| :--- | :--- | :--- | :--- | :--- |
| **Anggota** | No. Buku Anggota | `AGT-XXXX` (Sequential) | `^AGT-\d{4,}$` | `AGT-0001` |
| **Simpanan** | Rekening Simpanan | `[KODE_PRODUK]-[TAHUN][ID_ANGGOTA_5DIGIT]` | `^[A-Z]{2}-\d{4}\d{5}$` | `SS-202600004` |
| **Simpanan** | Transaksi Simpanan | `TRX[YYYY][MM][XXXX]` | `^TRX\d{8}$` | `TRX2026090012` |
| **Simpanan** | Reversal Simpanan | `REV[YYYY][MM][XXXX]` | `^REV\d{8}$` | `REV2026090003` |
| **Pinjaman** | No. Akad Pinjaman | `PJ[YYYY][MM][XXXX]` | `^PJ\d{8}$` | `PJ2026080005` |
| **Angsuran** | No. Kuitansi Angsuran | `AG[YYYY][MM][XXXX]` | `^AG\d{8}$` | `AG2026090042` |
| **Pengajuan** | Pengajuan Bayar SS | `PA[YYYY][MM][XXXX]` | `^PA\d{8}$` | `PA2026090001` |
| **Keuangan** | No. Bukti Jurnal | `JRN[YYYY][MM][XXXX]` | `^JRN\d{8}$` | `JRN2026090124` |
| **Kas** | Kas Masuk / Keluar / Mutasi | `KM[YYYY][MM][XXXX]` / `KK[YYYY][MM][XXXX]` / `BMK[YYYY][MM][XXXX]` | `^(KM\|KK\|BMK)\d{8}$` | `KM2026080015`, `BMK2026100001` |
| **Aspirasi** | Tiket Pengaduan / Aspirasi | `ASP-[YYMMDD]-[XXX]` | `^ASP-\d{6}-\d{3}$` | `ASP-261004-789` |
| **Toko** | No. Pesanan Retail | `ORD-[YYMMDD]-[XXX]` | `^ORD-\d{6}-\d{3}$` | `ORD-261004-321` |
| **RAT** | Sesi RAT | `RAT-[TAHUN]` | `^RAT-\d{4}$` | `RAT-2026` |

---

## 4. Standar Nilai Mata Uang & Pembulatan

1. **Mata Uang Basis**: Rupiah Indonesia (IDR).
2. **Format Database**: `DECIMAL(15,2)` pada seluruh tabel transaksi dan saldo buku besar.
3. **Format Tampilan Antarmuka**: `Rp ##.###.###` (menggunakan pemisah ribuan titik dan tanpa pecahan sen desimal kecuali dalam dokumen akuntansi audit).
4. **Metode Pembulatan**: *Half Up* (pembulatan matematis standar ke bilangan bulat Rupiah terdekat pada perhitungan bunga, administrasi, dan denda).
5. **Format Cetak PDF & Excel**: UTF-8 BOM (`\uFEFF`) untuk CSV guna mencegah *garbled character* di Microsoft Excel.
6. **Live Indonesian Words (Terbilang)**: Setiap input transaksi kas (Masuk, Keluar, Mutasi) mengonversi nominal angka ke dalam ejaan teks terbilang resmi Bahasa Indonesia secara real-time.

---

## 5. Ringkasan Sinkronisasi Rilis PRD (v2.8.0 s/d v2.9.8)

Dokumentasi PRD ini mencakup evolusi fungsional dan teknis sistem terkini:
- **v2.8.1 - Akselerasi Kecepatan Admin & Instant Modal UX**: Cache in-memory klien (`App.cachedApi`), modal skeleton loading instan, paralelisasi request (`Promise.all`), dan indeks database MySQL performa tinggi.
- **v2.8.2 - Skrip Migrasi Indeks Produksi**: Penyediaan `db_migration_production_indexes.php` dan `production_indexes.sql` yang idempoten dan aman dieksekusi di server produksi.
- **v2.8.3 - Interaksi Tombol Cepat & Haptic Ripple**: Efek visual gelombang sentuhan (*tactile button ripple*), penekanan tombol responsif, dan proteksi klik ganda (*double-click protection*) dengan auto-spinner loading.
- **v2.8.4 - Non-Blocking Modals & Relaksasi Izin COA**: Penanganan modal global terpadu dengan proteksi `try...catch`, penutupan via tombol `Esc`, serta relaksasi izin baca COA `GET keuangan/akun` bagi staf operasional.
- **v2.8.5 - Desain Baru Kas Masuk, Kas Keluar & Mutasi Kas**: Dashboard 4 KPI Finansial, tab navigasi berpenghitung real-time, visualisasi alur dana directional, fitur Mutasi Kas Antar Rekening (`BMK...`), simulasi posting debit-kredit, dan pencetakan voucher resmi BKM/BKK/BMK dengan 4 tanda tangan otoritas.
- **v2.8.6 - Perbaikan Visual Header Kas & Tata Letak Filter**: Desain header Navy Indigo Gelap Premium, perbaikan filter rentang tanggal responsif anti-tembus/anti-overflow.
- **v2.8.7 - High-Performance Admin Engine**: Prefetching modul instan 0ms saat hover tautan sidebar, in-flight promise pooling, pelepasan kunci sesi PHP (`session_write_close`) untuk unblocking concurrency request paralel, kompresi Gzip dan browser asset caching `.htaccess`, serta smart background polling guard.
- **v2.8.8 - Akselerasi Aset & Live Search Auto-Debounce**: Pemuatan awal via CDN Preconnect & DNS-Prefetch, penundaan pemuatan pustaka besar (*deferred heavy scripts* jsPDF & QRCode), pencarian tabel global terpadu otomatis (debounce 350ms) dengan pemeliharaan posisi kursor (*cursor preservation*).
- **v2.9.3 - Micro Sparklines Charting & Visual Telemetry**: Implementasi kurva sparkline SVG murni dengan Bézier curve smoothing dan ambient pulsing beacon pada seluruh kartu metrik KPI (Dashboard & Transaksi Kas) tanpa menambah bobot library eksternal.
- **v2.9.5 - Quick Date Chips Presets & Dual-Density Table Modes**: Penyediaan preset tombol tanggal instan (*Hari Ini*, *7 Hari*, *Bulan Ini*, *Bulan Lalu*, *Tahun Ini*, *Semua*) dengan dynamic active state tracking di 12+ halaman pelaporan dan transaksi; serta fitur Table Density Mode (Comfortable vs Compact) dengan toggle global di navbar dan switcher lokal di seluruh 51 tabel sistem.
- **v2.9.7 - Sticky Floating Table Summary Bar & Financial Due-Dates Calendar**: Pengait cerdas baris ringkasan tabel panjang melayang (*auto-docking summary bar*) dengan kontrol minimize dan scroll-back pada Buku Besar, Arus Kas, Baki Debet, dan Mutasi; serta Widget Kalender Jatuh Tempo Finansial terpadu (`/api/dashboard/due-calendar`) dengan visualisasi kalender bulanan, proyeksi arus kas masuk, kartu prioritas harian, dan generator pengingat WhatsApp resmi 1-klik.
- **v2.9.8 - Tipografi Finansial Monospace Tabular & Efek Stempel Karet Fisik**: Integrasi tipografi presisi tinggi JetBrains Mono dengan tabular numbers (`tnum` & `zero`) pada tabel buku besar/voucher kas; serta komponen efek stempel karet fisik (*Physical Rubber Stamp*) otentik (LUNAS, TERVERIFIKASI, LUNAS DIPERCEPAT, DIBATALKAN) dengan animasi bantingan stempel natural pada modal dan dokumen cetak resmi.
