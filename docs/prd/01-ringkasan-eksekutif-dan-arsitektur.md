# PRD - 01: Ringkasan Eksekutif dan Arsitektur Sistem

## 1. Ringkasan Eksekutif (Executive Summary)

### 1.1 Visi Produk
Mewujudkan platform tata kelola Koperasi Simpan Pinjam modern yang transparan, akuntabel, patuh regulasi perundang-undangan Indonesia (Permenkop UKM & SAK EP), serta memberikan kemudahan layanan finansial digital dua arah:
1. **Backoffice Administrasi Koperasi**: Menyediakan sistem terintegrasi bagi Pengurus, Manajer, Kasir/Teller, dan Bagian Pembukuan untuk mengelola keanggotaan, operasional simpan-pinjam, pelaporan keuangan berstandar akuntansi publik, dan evaluasi tingkat kesehatan koperasi secara real-time.
2. **Portal Anggota Mandiri (PWA)**: Menyediakan aplikasi web progresif ringan bagi anggota koperasi untuk memantau tabungan, mengecek tagihan angsuran terdekat, melakukan pembayaran angsuran mandiri melalui saldo Simpanan Sukarela, mengajukan pinjaman online, dan mengunduh bukti transaksi secara transparan dari perangkat smartphone.

---

## 2. Arsitektur Sistem & Technology Stack

Sistem dirancang dengan arsitektur **Lightweight Modular Monolith** yang memisahkan antara Presentation Layer (SPA & PWA), Service/API Routing Layer, Data Persistence Layer, dan Caching Layer.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                              │
│                                                                        │
│   ┌─────────────────────────────┐    ┌─────────────────────────────┐   │
│   │    Backoffice Web App       │    │     Portal Anggota (PWA)    │   │
│   │  (index.html + app.js)      │    │  (portal/index.html + sw)   │   │
│   │  - SPA Hash Routing         │    │  - Mobile-First Responsive  │   │
│   │  - jsPDF Engine + Thermal   │    │  - Offline Cache Capability │   │
│   │  - Chart.js Dashboard       │    │  - Push/Live Notification   │   │
│   └──────────────┬──────────────┘    └──────────────┬──────────────┘   │
└──────────────────┼──────────────────────────────────┼──────────────────┘
                   │ HTTP/JSON (RESTful API)          │
                   ▼                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND API LAYER (PHP)                         │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ api/index.php (Front Controller & Centralized Router)          │   │
│   │ - Session Manager (Redis Session / Cookie Hardening)           │   │
│   │ - Middleware: auth.php, rbac.php, csrf.php                     │   │
│   │ - Helpers: finance_helpers.php, Audit Logging, Numbering       │   │
│   └──────────────────────────────┬─────────────────────────────────┘   │
│                                  │                                     │
│   ┌──────────────────────────────▼─────────────────────────────────┐   │
│   │ Controllers (30+ Domain Controllers)                           │   │
│   │ Anggota, Simpanan, Pinjaman, Angsuran, Keuangan, Kesehatan,    │   │
│   │ PerubahanEkuitas, Kemenkop, RAT, Portal, Audit, Backup, dll.   │   │
│   └──────────────────────────────┬─────────────────────────────────┘   │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌────────────────────────────────┐       ┌────────────────────────────────┐
│      PERSISTENCE LAYER         │       │        CACHING LAYER           │
│                                │       │                                │
│   MySQL / MariaDB (InnoDB)     │       │   Redis In-Memory Store        │
│   - UTF8mb4 Unicode            │       │   - Session Store (phpredis)   │
│   - Relational Foreign Keys    │       │   - Query & Report Caching     │
│   - ACID Transactions          │       │   - Invalidation by Domain     │
└────────────────────────────────┘       └────────────────────────────────┘
```

### 2.1 Spesifikasi Technology Stack

| Komponen | Teknologi Terpilih | Justifikasi & Karakteristik |
| :--- | :--- | :--- |
| **Backend Core** | PHP Native 7.4 / 8.x | Arsitektur ringan, cepat, tanpa overhead framework berat, mudah dideploy pada hosting/cPanel/VPS standar (Laragon / LAMP / LEMP). |
| **Database** | MySQL 5.7+ / 8.0 / MariaDB 10.3+ | Engine InnoDB dengan integritas referensial foreign key dan transaksi multi-tabel (`BEGIN`, `COMMIT`, `ROLLBACK`). |
| **In-Memory Cache** | Redis 5.0+ (`phpredis` / socket) | Menyimpan sesi pengguna terenkripsi, caching laporan berat (Neraca, GL, Kesehatan, Ekuitas), invalidasi cerdas. |
| **Frontend Backoffice** | Vanilla JavaScript (ES6+), HTML5 | Single Page Application (SPA) berbasis hash routing (`#/`), rendering komponen modular tanpa bundle build step. |
| **Frontend Portal** | PWA (Progressive Web App) | Service Worker caching (`v77`), `manifest.json`, dapat di-install di layar utama HP Android/iOS layaknya aplikasi native. |
| **Ikonografi & Desain** | Remix Icon (`ri-*`), CSS Variables | Sistem tema dinamis (8 pilihan warna: Indigo, Violet, Biru, Cyan, Hijau, Oranye, Merah, Abu-abu) & Dark/Light mode. |
| **Visualisasi Data** | Chart.js | Visualisasi portofolio simpanan/pinjaman, grafik MoM laba rugi, dan rasio likuiditas. |
| **Laporan Cetak** | jsPDF + jsPDF-AutoTable | Mesin generasi dokumen PDF otomatis di browser dengan kop resmi, dynamic page break, auto-width, dan proteksi text overlap. |
| **Cetak Kasir** | Raw HTML POS Thermal Print | Format cetak struk kasir thermal 76mm/80mm untuk printer kasir bluetooth/USB. |

---

## 3. Topologi Lingkungan & Multi-Platform

Sistem terdiri dari dua titik masuk antarmuka:
1. **Sistem Pengurus & Kasir (Backoffice)**
   - Akses URL: `http://domain-koperasi/` atau `http://domain-koperasi/index.html`
   - Target Pengguna: Administrator Sistem, Petugas Kasir/Teller, Account Officer, Bagian Keuangan, Pengurus Koperasi.
   - Hak Akses: Diatur ketat melalui modul RBAC (Role-Based Access Control) berbasis izin granular.
2. **Portal Anggota Mandiri (PWA)**
   - Akses URL: `http://domain-koperasi/portal/`
   - Target Pengguna: Seluruh anggota koperasi yang terdaftar aktif.
   - Fitur Spesifik: Desain ramah sentuhan layar sentuh ponsel pintar (*mobile touch ergonomis*), biometrik/auto login, tombol autodebet tagihan instan.

---

## 4. Skema Database Inti (Entity Relationship Summary)

Sistem beroperasi di atas skema relasional yang saling mengunci secara integritas referensial:
- **`anggota`**: Menyimpan identitas tunggal anggota (No. Anggota unik, NIK 16 digit, nama, kontak, foto, status).
- **`users`**: Akun login pengurus dan anggota, berelasi ke `roles` dan secara opsional ke `anggota.id`.
- **`roles` & `permissions` & `role_permissions`**: Mengatur hak akses level modul dan aksi.
- **`jenis_simpanan` & `rekening_simpanan` & `simpanan`**: Struktur tabungan berjangka/rutin anggota beserta nomor rekening unik dan riwayat mutasi setoran/penarikan.
- **`jenis_pinjaman` & `pinjaman` & `angsuran`**: Pengelolaan akad pembiayaan, suku bunga flat, tenor, jadwal cicilan, dan denda.
- **`pengajuan_angsuran`**: Antrean verifikasi pembayaran cicilan mandiri anggota dari saldo Simpanan Sukarela.
- **`akun` & `jurnal` & `jurnal_detail`**: Inti buku besar akuntansi berpasangan (*double-entry bookkeeping*). Seluruh transaksi simpanan, pencairan pinjaman, dan angsuran terhubung ke jurnal melalui `ref_tipe` dan `ref_id`.
- **`audit_logs` & `portal_logs`**: Rekaman jejak audit perubahan data finansial dan log akses portal anggota real-time.

---

## 5. Standar Kualitas Non-Fungsional (Non-Functional Requirements)

1. **Integritas Finansial (Zero Discrepancy Standard)**:
   - Tidak boleh ada transaksi simpanan atau pinjaman yang tidak memiliki jurnal penyeimbang di buku besar.
   - Tidak ada saldo rekening simpanan bernilai negatif.
2. **Performa & Latensi**:
   - Respon API transaksi standar `< 150 ms`.
   - Laporan analitik neraca multi-tahun dengan Redis Cache `< 300 ms`.
3. **Keamanan Sesi & Transportasi**:
   - Enkripsi password menggunakan `password_hash()` algoritma Bcrypt standar industri.
   - Proteksi sesi: `HttpOnly`, `SameSite=Lax`, dan `Secure` flag saat berjalan di protokol HTTPS.
   - Proteksi CSRF (`X-CSRF-Token`) pada seluruh method mutasi data (`POST`, `PUT`, `DELETE`).
4. **Keandalan & Audit Trail**:
   - Seluruh mutasi koreksi data mencatat nilai sebelum (*old data*) dan sesudah (*new data*) dalam format JSON di `audit_logs`.
   - Reversal transaksi bersifat non-destruktif (contra-entry, tidak menghapus baris asli).
