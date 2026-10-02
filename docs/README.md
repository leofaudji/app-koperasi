# Dokumentasi Product Requirement Document (PRD)
## Aplikasi Koperasi Simpan Pinjam Terintegrasi (KSP Core & Portal PWA)

Selamat datang di repositori dokumentasi resmi sistem Aplikasi Koperasi Simpan Pinjam. Folder ini berisi **Product Requirement Document (PRD)** terperinci yang memetakan seluruh modul fungsional, spesifikasi teknis, aturan bisnis (*business rules*), serta integrasi akuntansi dan regulasi perundang-undangan koperasi di Indonesia.

---

## 🧭 Struktur Berkas PRD Berdasarkan Fungsional

Dokumentasi ini sengaja dipecah ke dalam berkas-berkas modular di subfolder `prd/` agar mudah dipelihara dan tidak menjadi berkas tunggal yang berat:

```text
docs/
├── README.md                                    # Panduan Induk & SOP Pemeliharaan PRD
├── AGENTS.md                                    # Pedoman Operasional AI Agents & Aturan Sinkronisasi
└── prd/
    ├── 00-daftar-isi-dan-konvensi.md            # Indeks Lengkap, Matriks Fitur, dan Standar Nomenklatur
    ├── 01-ringkasan-eksekutif-dan-arsitektur.md # Visi Produk, Arsitektur Sistem, Tech Stack, & Multi-Platform
    ├── 02-autentikasi-dan-manajemen-akses-rbac.md# Autentikasi, Keamanan Sesi, RBAC, & Audit Trail
    ├── 03-master-data-dan-keanggotaan.md        # Master Anggota, Master Produk, Biaya, COA
    ├── 04-modul-simpanan.md                     # Simpanan Pokok, Wajib, Sukarela, Partisipatif & Bunga
    ├── 05-modul-pinjaman-dan-agunan.md          # Pinjaman, Suku Bunga Flat, Multi-Refinancing & Agunan
    ├── 06-modul-angsuran-dan-reversal.md        # Angsuran, Overbooking SS, Struk Thermal POS, Reversal & Koreksi
    ├── 07-modul-akuntansi-dan-keuangan.md       # Jurnal Umum, GL, Neraca SAK EP, Laba Rugi, Arus Kas, Ekuitas
    ├── 08-modul-laporan-dan-analitik.md         # Laporan Operasional, Baki Debet, NPL / Kolektibilitas, Ekspor PDF/CSV
    ├── 09-modul-rat-dan-shu.md                  # Manajemen RAT, Doorprize, Distribusi SHU, Tutup Buku Akhir Tahun
    ├── 10-portal-anggota-pwa.md                 # Portal PWA Mobile, Tagihan Terdekat, Autodebet Mandiri, Notifikasi
    ├── 11-kepatuhan-regulasi-dan-kesehatan-koperasi.md # KKPKK Permenkop UKM 2/2024, 4 Pilar, 7 Rasio Prudensial KUK 1-4
    └── 12-keamanan-infrastruktur-dan-pemeliharaan.md # Redis Caching, Backup/Restore SQL, Skrip Pemeliharaan CLI
```

---

## 📋 Standard Operating Procedure (SOP) Pemeliharaan PRD

Guna menjaga integritas dan relevansi dokumentasi terhadap implementasi kode terkini, seluruh kontributor, pengembang, dan asisten AI diwajibkan mematuhi aturan berikut:

### 1. Kapan PRD Wajib Diperbarui?
- **Setiap Penambahan Fitur**: Jika ada menu baru, opsi transaksi baru, tombol aksi, atau parameter API baru.
- **Setiap Perubahan Fitur (Refactor/Enhancement)**: Jika ada penyesuaian alur kerja (*flow*), formula perhitungan finansial, aturan validasi, penambahan kolom tabel, atau perubahan tampilan antarmuka.
- **Setiap Pengurangan Fitur (Deprecation)**: Jika ada fitur yang dihapus, digabungkan, atau diganti dengan modul yang lebih modern.
- **Setiap Regulasi Baru**: Penyesuaian standar akuntansi (misalnya PSAK/SAK EP) atau regulasi Kementerian Koperasi & UKM.

### 2. Prosedur Pembaruan Dokumen
1. Buka berkas modul terkait di `docs/prd/XX-nama-modul.md`.
2. Perbarui sub-bagian yang relevan (misalnya: *Spesifikasi Kebutuhan Fungsional*, *Alur Kerja Transaksi*, *Struktur Database & API*, atau *Aturan Bisnis*).
3. Cantumkan nomor versi aplikasi yang memperkenalkan perubahan tersebut (sesuai `CHANGELOG.md`).
4. Jika melibatkan dependensi antar-modul (misal: modul Angsuran berpengaruh ke Jurnal Akuntansi dan Rekening Simpanan), perbarui juga kedua dokumen terkait.
5. Catat rangkuman pembaruan fitur ke dalam berkas `CHANGELOG.md`.

---

## 🔗 Referensi Cepat Modul

- **Arsitektur Teknis**: Lihat [`01-ringkasan-eksekutif-dan-arsitektur.md`](file:///d:/laragon/www/app-koperasi/docs/prd/01-ringkasan-eksekutif-dan-arsitektur.md)
- **Modul Transaksi Inti**: Lihat [`04-modul-simpanan.md`](file:///d:/laragon/www/app-koperasi/docs/prd/04-modul-simpanan.md), [`05-modul-pinjaman-dan-agunan.md`](file:///d:/laragon/www/app-koperasi/docs/prd/05-modul-pinjaman-dan-agunan.md), dan [`06-modul-angsuran-dan-reversal.md`](file:///d:/laragon/www/app-koperasi/docs/prd/06-modul-angsuran-dan-reversal.md)
- **Akuntansi & Standar SAK EP**: Lihat [`07-modul-akuntansi-dan-keuangan.md`](file:///d:/laragon/www/app-koperasi/docs/prd/07-modul-akuntansi-dan-keuangan.md)
- **Portal Anggota (PWA)**: Lihat [`10-portal-anggota-pwa.md`](file:///d:/laragon/www/app-koperasi/docs/prd/10-portal-anggota-pwa.md)
- **Regulasi Kemenkop UKM**: Lihat [`11-kepatuhan-regulasi-dan-kesehatan-koperasi.md`](file:///d:/laragon/www/app-koperasi/docs/prd/11-kepatuhan-regulasi-dan-kesehatan-koperasi.md)
