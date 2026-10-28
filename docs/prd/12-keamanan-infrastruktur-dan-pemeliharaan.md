# PRD - 12: Keamanan Infrastruktur, Redis Caching, dan Pemeliharaan Sistem

## 1. Ikhtisar Modul
Modul Keamanan Infrastruktur dan Pemeliharaan Sistem mengatur keandalan arsitektur teknis (*High Availability & Reliability*), strategi percepatan respon aplikasi melalui in-memory caching Redis, mekanisme pencadangan dan pemulihan basis data (*Disaster Recovery*), skrip perbaikan integritas data otomatis berbasis CLI, serta prosedur operasional standar (SOP) deployment rilis baru.

---

## 2. Arsitektur Redis Caching & Invalidasi Terpusat

### 2.1 Manajemen Koneksi (`RedisManager`)
- Dikelola melalui kelas singleton `api/config/redis.php`.
- **Graceful Fallback**: Jika ekstensi PHP Redis tidak terpasang di server, sistem tetap berfungsi normal dengan langsung mengeksekusi query database langsung (*bypass cache without exception*).
- Mendukung koneksi TCP (`127.0.0.1:6379`) maupun Unix Domain Socket.
- Menggunakan prefix global (`koperasi_`) untuk mencegah benturan kunci antar aplikasi pada satu server Redis yang sama.

### 2.2 Domain Cache & Waktu Kedaluwarsa (TTL)

| Domain Cache | Pola Kunci Cache | Default TTL | Konten yang Disimpan |
| :--- | :--- | :---: | :--- |
| **Keuangan** | `rep_neraca_*`, `rep_labarugi_*`, `rep_ekuitas_*` | 1 Jam (3600s) | Agregasi laporan neraca, laba rugi, dan perubahan modal |
| **Kesehatan** | `rep_tks_{tahun}` | 1 Jam (3600s) | Hasil kalkulasi 4 pilar KKPKK & rasio prudensial |
| **Audit** | `rep_audit_reconcile`, `rep_audit_health` | 30 Menit (1800s) | Rekonsiliasi GL vs Modul dan health score |
| **Portofolio**| `rep_npl`, `rep_pinjaman_*`, `rep_simpanan_*` | 1 Jam (3600s) | Rekapitulasi saldo kredit dan kolektibilitas |
| **Portal User**| `portal_saldo_{id}`, `portal_loan_{id}` | 15 Menit (900s) | Snapshot saldo rekening & tagihan anggota aktif |
| **RBAC** | `rbac_menu_{role_id}`, `rbac_perms_{role_id}` | 24 Jam (86400s) | Matriks hak akses menu per peran pengguna |
| **Pengaturan**| `app_settings_flat` | 24 Jam (86400s) | Identitas koperasi, logo, dan tema sistem |

### 2.3 Mekanisme Invalidasi Terpusat (`clearCache`)
Setiap kali terjadi mutasi data (tambah, ubah, hapus, reversal), backend wajib memanggil helper `clearCache()` dengan parameter domain terkait:
```php
// Contoh pada SimpananController saat setoran baru:
clearCache(['saving', 'finance', 'audit', 'member' => $anggotaId]);

// Contoh pada PinjamanController saat pencairan pinjaman baru:
clearCache(['loan', 'finance', 'audit', 'member' => $anggotaId]);
```
Mekanisme ini menjamin bahwa pengguna selalu melihat data paling mutakhir (*consistent state*) tanpa mengorbankan kecepatan pembacaan laporan berat.

---

## 3. Sistem Backup & Restore Database (`#/pengaturan`)

Untuk menjamin keberlangsungan operasional dari ancaman kerusakan hardware atau ransomware:
1. **Ekspor Database (.sql)**:
   - Pengurus dapat mengunduh dump database lengkap (struktur tabel, view, dan seluruh data transaksi) dalam format `.sql` langsung dari browser.
   - Header dump menyertakan metadata waktu pembuatan dan versi rilis aplikasi.
2. **Impor / Restore Database**:
   - Fasilitas upload file `.sql` untuk memulihkan sistem saat bencana.
   - Dilengkapi proteksi transaksi: Jika terjadi kegagalan sintaks SQL saat restore, sistem membatalkan proses untuk mencegah kondisi database parsial/korup.

---

## 4. Skrip Pemeliharaan Integritas Data Mandiri (CLI Tools)

Tersedia skrip utilitas berbasis Command Line Interface (CLI) di root direktori untuk inspeksi dan perbaikan berkala oleh Database Administrator / Tim DevOps:

### 4.1 `repair_audit_discrepancies.php`
- **Tujuan**: Memperbaiki anomali selisih saldo antara Buku Besar (GL) terhadap transaksi modular simpanan atau pinjaman.
- **Fitur Keamanan**:
  - Mendukung opsi `--dry-run` untuk melihat simulasi perbaikan tanpa mengubah data asli.
  - Membungkus seluruh eksekusi perbaikan dalam blok transaksi ACID (`$db->beginTransaction()`).
  - Memulihkan transaksi yatim (*orphan transactions*) dan membentuk jurnal kontra berpasangan.

### 4.2 `repair_bakidebet_saldo_real.php`
- **Tujuan**: Menyelaraskan sisa pokok pinjaman (`pinjaman.sisa_pinjaman`) terhadap akumulasi historis kartu angsuran yang telah terbayar.
- **Penanganan**: Menghilangkan selisih pembulatan sen pada sistem akuntansi pinjaman lama.

### 4.3 `fix_provisi_journal.php`
- **Tujuan**: Menstandarisasi pemetaan akun pendapatan provisi pinjaman lama ke bagan akun spesifik produk (`402`, `403`, `404`, `405`).

### 4.4 `fix_historical_data.php`
- **Tujuan**: Menyeimbangkan data pembukuan historis hasil impor / migrasi dari aplikasi lama yang belum memiliki jurnal saldo awal seimbang.

### 4.5 `db_migration_production_indexes.php` & `production_indexes.sql`
- **Tujuan**: Menambahkan indeks performa tinggi pada kolom-kolom query kritis di database produksi untuk mempercepat pemfilteran, sorting, dan pagination data transaksi besar.
- **Tabel & Indeks Sasaran**:
  - `pinjaman`: `idx_pinjaman_status` (`status`), `idx_pinjaman_tgl_cair` (`tgl_pencairan`).
  - `angsuran`: `idx_angsuran_status` (`status`), `idx_angsuran_tgl_bayar` (`tgl_bayar`), `idx_angsuran_tgl_jatuh_tempo` (`tgl_jatuh_tempo`).
  - `simpanan`: `idx_simpanan_tgl_trx` (`tgl_transaksi`).
  - `anggota`: `idx_anggota_nama` (`nama`), `idx_anggota_status` (`status`).
- **Karakteristik Keamanan**:
  - Bersifat idempoten; memeriksa `SHOW INDEX FROM table` sebelum menambahkan indeks baru, sehingga aman dijalankan berulang kali via CLI (`php db_migration_production_indexes.php`) maupun browser.
  - Menyertakan berkas kueri SQL mentah `production_indexes.sql` untuk dieksekusi secara langsung melalui antarmuka phpMyAdmin, DBeaver, atau HeidiSQL.

---

## 5. Konfigurasi Kompresi Web Server & Caching Aset Browser (`.htaccess`)

Untuk mencapai skor performa tinggi (*Core Web Vitals*) dan memangkas waktu pemuatan dashboard:

1. **Kompresi Jaringan `mod_deflate` (Gzip)**:
   - Mengompresi seluruh muatan teks dan skrip dinamis sebelum dikirimkan ke browser:
     - `text/html`, `text/css`, `text/plain`, `text/xml`
     - `application/javascript`, `application/x-javascript`
     - `application/json`, `application/xml`
     - `image/svg+xml`, `font/woff`, `font/woff2`
   - Menghasilkan pengurangan ukuran muatan payload jaringan sebesar 70% – 80%.
2. **Header Masa Berlaku Aset `mod_expires` (Browser Cache)**:
   - Menginstruksikan browser untuk menyimpan aset statis (gambar, logo koperasi, favicon, font) dalam cache lokal selama 1 bulan hingga 1 tahun.
3. **Pelepasan Sesi PHP Bersamaan (Non-Blocking Concurrency)**:
   - Endpoint `GET` read-only melepaskan kunci berkas sesi melalui `session_write_close()` sebelum controller mengeksekusi kueri, mengeliminasi fenomena *request serialization blocking* pada lalu lintas pengguna multi-tab/multi-request simultan.

---

## 6. Prosedur Standar Migrasi Skema Database

Setiap pembaruan skema database (tabel baru atau kolom baru) wajib mengikuti pola file migrasi modular mandiri (contoh: `db_migration_v2.1.6.php`, `db_migration_production_indexes.php`, `db_migration_pengajuan_angsuran.php`):
1. **Prinsip Idempoten**: Skrip migrasi dapat dijalankan berulang kali tanpa merusak struktur atau menghasilkan error (`SHOW COLUMNS`, `IF NOT EXISTS`).
2. **Pengecekan Tipe Data**: Memeriksa apakah kolom sudah ada dan apakah tipe datanya sesuai sebelum mengeksekusi `ALTER TABLE`.
3. **Pemberitahuan Konsol**: Menampilkan output baris status (`[OK]`, `[INFO]`, `[ERROR]`) yang jelas pada terminal CLI.

---

## 7. Prosedur Operasional Standar (SOP) Deployment Rilis Baru

Saat merilis versi baru ke server produksi:
1. **Pencadangan Penuh**: Jalankan backup database `.sql` dan arsipkan file kode program.
2. **Pembaruan Kode**: Lakukan penarikan kode (*git pull*) ke repositori server produksi.
3. **Eksekusi Migrasi Database & Indeks**: Jalankan skrip migrasi versi terkait melalui terminal:
   ```bash
   php db_migration_production_indexes.php
   ```
4. **Pembersihan Cache Redis**:
   ```bash
   php -r "require 'api/config/redis.php'; RedisManager::getInstance()->flush();"
   ```
5. **Pembaruan Service Worker (PWA Portal)**:
   - Naikkan nomor cache pada `portal/sw.js` (misal dari `v77` ke `v78`).
   - Naikkan nomor versi pada `portal/version.json`.
6. **Verifikasi Audit Saldo**:
   - Buka menu **Audit Saldo** (`#/audit`) dan pastikan Skor Kesehatan Audit mencapai **100% (Sehat)** dengan **Selisih Saldo Rp 0,00**.
7. **Sinkronisasi PRD & Dokumentasi**: Pastikan seluruh berkas terkait di folder `docs/prd/` dan berkas `CHANGELOG.md` telah diperbarui sesuai perubahan yang dirilis.
