# PRD - 02: Autentikasi, Keamanan Sesi, dan Manajemen Akses (RBAC)

## 1. Ikhtisar & Tujuan Modul
Modul ini mengatur otentikasi identitas, manajemen sesi yang aman, kontrol otorisasi granular berbasis peran (*Role-Based Access Control / RBAC*), perlindungan terhadap serangan web (CSRF, Brute Force, Session Hijacking), dan pencatatan jejak audit (*Audit Trail*) untuk seluruh aktivitas pengurus dan anggota koperasi.

---

## 2. Mekanisme Autentikasi & Keamanan Sesi

### 2.1 Alur Autentikasi Dua Jalur
1. **Autentikasi Backoffice (Pengurus & Kasir)**:
   - Akses via `/index.html` (modal login).
   - Pengguna memasukkan `username` dan `password`.
   - Backend memverifikasi hash Bcrypt di tabel `users`.
   - Pengguna dengan `role_id = 3` (Anggota biasa) dilarang masuk ke Backoffice kecuali memiliki permission administratif.
2. **Autentikasi Portal Anggota (PWA)**:
   - Akses via `/portal/index.html`.
   - Menggunakan kredensial akun anggota (username/no_anggota dan password).
   - Sesi portal mengikat `portal_anggota_id` dan mencatat data perangkat ke `portal_logs`.

### 2.2 Arsitektur Keamanan Sesi
- **Penyimpanan Sesi**: Mendukung native PHP Session dan Redis In-Memory Session via `RedisManager::initSession()`.
- **Masa Berlaku Sesi**: Default 8 Jam (`SESSION_LIFETIME = 28800 detik`).
- **Parameter Cookie Sesi Modern**:
  - `HttpOnly`: Mencegah script berbahaya (XSS) membaca cookie sesi via JavaScript.
  - `SameSite`: Disetel ke `Lax` untuk mencegah serangan Cross-Site Request Forgery (CSRF).
  - `Secure`: Otomatis aktif saat koneksi melalui HTTPS (`$_SERVER['HTTPS'] === 'on'` atau header reverse proxy `HTTP_X_FORWARDED_PROTO === 'https'`).
  - `Path`: `/` (berlaku untuk seluruh endpoint aplikasi).

### 2.3 Proteksi CSRF (Cross-Site Request Forgery)
- Setiap kali sesi login dibuat, backend menghasilkan token acak `csrf_token` di dalam `$_SESSION`.
- Frontend SPA/PWA mengambil token ini melalui endpoint `/api/auth/me` dan mengirimkannya pada header HTTP `X-CSRF-Token`.
- Middleware `api/middleware/csrf.php` memverifikasi token pada setiap request mutasi data (`POST`, `PUT`, `DELETE`). Jika tidak cocok, sistem menolak request dengan status HTTP `403 Forbidden`.

---

## 3. Desain Role-Based Access Control (RBAC)

### 3.1 Role Bawaan Sistem (Default Roles)
1. **Admin (ID: 1)**: Administrator sistem dengan hak akses penuh (*Superuser*) ke seluruh menu, konfigurasi database, COA, dan log audit.
2. **Petugas (ID: 2)**: Operator harian koperasi (Kasir/Teller/Customer Service) dengan hak akses operasional (Anggota, Kas Masuk/Keluar, Transaksi Simpanan, Daftar Pinjaman, Pembayaran Angsuran, Buku Besar).
3. **Anggota (ID: 3)**: Anggota koperasi yang terdaftar, hanya memiliki akses `portal.view` untuk membuka Portal Anggota PWA.

### 3.2 Matriks Kode Izin (Permission Matrix)

| Modul | Kode Permission | Nama Izin | Keterangan Fungsional |
| :--- | :--- | :--- | :--- |
| **Dashboard** | `dashboard.view` | Lihat Dashboard | Mengakses ringkasan statistik & KPI |
| **Anggota** | `anggota.view` | Lihat Data Anggota | Melihat tabel direktori anggota |
| | `anggota.create` | Tambah Anggota | Mendaftarkan anggota baru |
| | `anggota.edit` | Edit Anggota | Memperbarui data profil & kontak anggota |
| | `anggota.delete` | Hapus Anggota | Menghapus data anggota (soft/hard) |
| **Simpanan** | `simpanan.view` | Lihat Simpanan | Melihat rekening & mutasi tabungan |
| | `simpanan.create` | Transaksi Simpanan | Menginput setoran & penarikan simpanan |
| | `simpanan.setting` | Setting Simpanan | Mengatur jenis simpanan & kode transaksi |
| **Pinjaman** | `pinjaman.view` | Lihat Pinjaman | Memantau daftar pengajuan & akad kredit |
| | `pinjaman.create` | Buat Pinjaman | Menginput pengajuan pinjaman baru |
| | `pinjaman.approve` | Approve Pinjaman | Menyetujui & mencairkan dana pinjaman |
| | `pinjaman.setting` | Setting Pinjaman | Mengatur produk pinjaman & biaya provisi |
| **Angsuran** | `angsuran.view` | Lihat Angsuran | Memeriksa riwayat tagihan & pembayaran |
| | `angsuran.create` | Bayar Angsuran | Memproses pembayaran angsuran kasir/SS |
| **Keuangan** | `keuangan.jurnal` | Jurnal Umum | Mengelola jurnal umum & kas masuk/keluar |
| | `keuangan.buku_besar` | Buku Besar | Melihat detail mutasi per akun COA |
| | `keuangan.neraca` | Laporan Neraca | Melihat neraca, arus kas, ekuitas, audit |
| | `keuangan.laba_rugi` | Laporan Laba Rugi | Melihat laba rugi, kesehatan, Kemenkop |
| | `keuangan.akun` | Setting Akun COA | Menambah, mengubah, & menonaktifkan COA |
| **User & Role** | `user.view` | Lihat Users | Melihat daftar pengguna sistem |
| | `user.create` / `edit` / `delete` | Kelola Users | Membuat akun & mengatur password |
| | `role.view` / `role.manage` | Kelola Role | Menentukan hak akses per role |
| **RAT** | `rat.view` | Manajemen RAT | Menyelenggarakan RAT, doorprize, & SHU |
| **Portal** | `portal.view` | Akses Portal PWA | Hak login anggota ke PWA Mobile |
| **Pengumuman** | `pengumuman.view` | Kelola Pengumuman | Menerbitkan pengumuman ke portal anggota |
| **Pengaturan** | `settings.edit` | Pengaturan Aplikasi | Mengubah identitas koperasi, logo, & tema |

### 3.3 Menu Navigasi Dinamis
- Daftar menu diatur dalam berkas `api/config/menus.json`.
- Saat frontend memanggil endpoint `/api/menus`, sistem memfilter menu berdasarkan permission yang dimiliki oleh `role_id` pengguna yang sedang login.
- Item menu yang tidak memiliki permission terkait otomatis disembunyikan dari antarmuka sidebar.

---

## 4. Sistem Audit Trail & Activity Logging

### 4.1 Log Perubahan Data Finansial (`audit_logs`)
Setiap kali terjadi modifikasi data sensitif (misalnya koreksi transaksi simpanan, pengubahan nominal angsuran, update profil pinjaman, atau perubahan role), fungsi helper `logActivity()` otomatis mencatat data ke tabel `audit_logs`:
- `user_id`: ID pengguna yang melakukan perubahan.
- `action`: Jenis aksi (`create`, `update`, `delete`, `reverse`).
- `table_name`: Nama tabel database yang diubah (`simpanan`, `pinjaman`, `angsuran`, `users`, dll.).
- `record_id`: Primary key baris data yang dimodifikasi.
- `old_data`: Snapshot JSON data sebelum diedit.
- `new_data`: Snapshot JSON data setelah diedit.
- `ip_address` & `user_agent`: Alamat IP dan informasi browser pelaku aksi.

### 4.2 Tampilan Audit Trail pada Antarmuka
- Pada tabel transaksi yang telah dikoreksi, sistem menampilkan badge **DIEDIT** berwarna amber.
- Mengklik badge tersebut membuka modal **Audit Trail Timeline**, yang menyajikan perbandingan *side-by-side JSON diff* (nilai sebelum vs nilai sesudah dengan format mata uang otomatis) serta nama petugas yang melakukan perubahan.

---

## 5. Spesifikasi Endpoint API Autentikasi & RBAC

| Method | Endpoint | Fungsi | Hak Akses |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Login pengguna backoffice / anggota | Publik |
| `POST` | `/api/auth/logout` | Menghancurkan sesi aktif & menghapus cookie | Authenticated |
| `GET` | `/api/auth/me` | Mengambil info user aktif, role, & token CSRF | Authenticated |
| `GET` | `/api/menus` | Mengambil struktur menu navigasi sesuai hak akses | Authenticated |
| `GET` | `/api/users` | Mengambil daftar pengguna backoffice | `user.view` |
| `POST` | `/api/users` | Membuat akun pengguna baru | `user.create` |
| `PUT` | `/api/users/{id}` | Memperbarui profil/password user | `user.edit` |
| `DELETE` | `/api/users/{id}` | Menghapus akun pengguna | `user.delete` |
| `GET` | `/api/roles` | Mengambil daftar peran & hak aksesnya | `role.view` |
| `POST` | `/api/roles` | Menambah peran kustom baru | `role.manage` |
| `PUT` | `/api/roles/{id}` | Memperbarui matriks permission suatu peran | `role.manage` |
