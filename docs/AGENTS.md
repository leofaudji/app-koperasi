# Aturan Pengembangan & Pemeliharaan Dokumen (AGENTS.md)

Dokumen ini menjadi pedoman operasional wajib bagi seluruh pengembang (*developer*) dan agen kecerdasan buatan (*AI agents*) yang bekerja pada repositori **Aplikasi Koperasi Simpan Pinjam**.

---

## 📌 ATURAN UTAMA: SINKRONISASI PRD WAJIB

Setiap kali Anda melakukan:
1. **Penambahan Fitur Baru (Feature Addition)**:
   - Tambahkan spesifikasi kebutuhan fungsional, use case, alur bisnis, endpoint API, dan skema database ke file PRD modul terkait di `docs/prd/`.
   - Update `CHANGELOG.md` pada rilis versi yang relevan.
2. **Perubahan/Modifikasi Fitur yang Ada (Feature Modification/Refactoring)**:
   - Perbarui deskripsi alur kerja, logika validasi, tabel antarmuka, dan parameter API pada file PRD terkait di `docs/prd/`.
   - Dokumentasikan alasan perubahan dan dampak kompatibilitasnya di `CHANGELOG.md`.
3. **Pengurangan/Penghapusan Fitur (Feature Deprecation/Removal)**:
   - Tandai atau sesuaikan dokumen PRD modul terkait di `docs/prd/` untuk mencerminkan bahwa fitur tersebut telah dinonaktifkan atau digantikan.
   - Cantumkan catatan migrasi atau deprecation notice pada `CHANGELOG.md`.

> **PERINGATAN**: Tidak diperbolehkan menyelesaikan tugas penambahan atau pengubahan kode fitur tanpa memperbarui dokumen PRD yang bersangkutan di folder `docs/prd/`.

---

## 🗂️ Peta Dokumen PRD (`docs/prd/`)

Dokumen PRD telah dikelompokkan berdasarkan area fungsional:

| File | Modul / Fungsionalitas |
| :--- | :--- |
| [`docs/README.md`](file:///d:/laragon/www/app-koperasi/docs/README.md) | Panduan Induk Dokumentasi & SOP Pemeliharaan Dokumen |
| [`docs/AGENTS.md`](file:///d:/laragon/www/app-koperasi/docs/AGENTS.md) | Pedoman Operasional AI Agents & SOP Sinkronisasi Fitur |
| [`docs/prd/00-daftar-isi-dan-konvensi.md`](file:///d:/laragon/www/app-koperasi/docs/prd/00-daftar-isi-dan-konvensi.md) | Indeks, Matriks Fungsional, Konvensi Nomenklatur, Versioning |
| [`docs/prd/01-ringkasan-eksekutif-dan-arsitektur.md`](file:///d:/laragon/www/app-koperasi/docs/prd/01-ringkasan-eksekutif-dan-arsitektur.md) | Visi Produk, Arsitektur Sistem, Tech Stack, Multi-Platform, DB Schema |
| [`docs/prd/02-autentikasi-dan-manajemen-akses-rbac.md`](file:///d:/laragon/www/app-koperasi/docs/prd/02-autentikasi-dan-manajemen-akses-rbac.md) | Autentikasi, Keamanan Sesi, Roles, Permissions, Menu Dinamis |
| [`docs/prd/03-master-data-dan-keanggotaan.md`](file:///d:/laragon/www/app-koperasi/docs/prd/03-master-data-dan-keanggotaan.md) | Data Anggota, Master Simpanan, Pinjaman, Biaya Pinjaman, COA |
| [`docs/prd/04-modul-simpanan.md`](file:///d:/laragon/www/app-koperasi/docs/prd/04-modul-simpanan.md) | Simpanan Pokok, Wajib, Sukarela, Partisipatif, Mutasi, Monitoring SW |
| [`docs/prd/05-modul-pinjaman-dan-agunan.md`](file:///d:/laragon/www/app-koperasi/docs/prd/05-modul-pinjaman-dan-agunan.md) | Siklus Pinjaman, Flat Bunga, Multi-Refinancing (Top-up), Manajemen Agunan |
| [`docs/prd/06-modul-angsuran-dan-reversal.md`](file:///d:/laragon/www/app-koperasi/docs/prd/06-modul-angsuran-dan-reversal.md) | Angsuran, Overbooking Simpanan Sukarela, POS Printer, Reversal, Koreksi |
| [`docs/prd/07-modul-akuntansi-dan-keuangan.md`](file:///d:/laragon/www/app-koperasi/docs/prd/07-modul-akuntansi-dan-keuangan.md) | Kas Masuk/Keluar, Jurnal, GL, Neraca, Laba Rugi, Arus Kas, Ekuitas SAK EP, Audit |
| [`docs/prd/08-modul-laporan-dan-analitik.md`](file:///d:/laragon/www/app-koperasi/docs/prd/08-modul-laporan-dan-analitik.md) | Laporan Saldo, Baki Debet, NPL / Kolektibilitas, Export PDF Landscape & CSV |
| [`docs/prd/09-modul-rat-dan-shu.md`](file:///d:/laragon/www/app-koperasi/docs/prd/09-modul-rat-dan-shu.md) | Manajemen RAT, Pembagian SHU (Jasa Modal & Usaha), Doorprize, Tutup Buku |
| [`docs/prd/10-portal-anggota-pwa.md`](file:///d:/laragon/www/app-koperasi/docs/prd/10-portal-anggota-pwa.md) | PWA Member Portal, Tagihan Terdekat, Autodebet Mandiri, Lonceng Notifikasi |
| [`docs/prd/11-kepatuhan-regulasi-dan-kesehatan-koperasi.md`](file:///d:/laragon/www/app-koperasi/docs/prd/11-kepatuhan-regulasi-dan-kesehatan-koperasi.md) | Penilaian Kesehatan KKPKK (4 Pilar), Rasio Prudensial Kemenkop UKM KUK 1-4 |
| [`docs/prd/12-keamanan-infrastruktur-dan-pemeliharaan.md`](file:///d:/laragon/www/app-koperasi/docs/prd/12-keamanan-infrastruktur-dan-pemeliharaan.md) | Redis Cache, Database Backup/Restore, Audit Logs, Script CLI Maintenance |

---

## 🛠️ Standar Kode & Arsitektur
1. **Backend**: PHP Native modular (Controller-based routing di `api/index.php`), PDO prepared statement, transaksi ACID untuk multi-tabel (`beginTransaction`, `commit`, `rollBack`).
2. **Frontend Admin**: Vanilla JavaScript SPA berbasis hash routing (`#/nama-halaman`), Remix Icon, Chart.js, jsPDF.
3. **Frontend Anggota**: PWA berbasis mobile-first, manifest, Service Worker offline caching.
4. **Keuangan & Akuntansi**: Harus berimbang (*double-entry bookkeeping*), dilarang membuat transaksi simpanan/pinjaman tanpa jurnal GL terkait, hormati kunci periode akuntansi (*Period Locking*).
5. **Performa**: Manfaatkan `RedisManager` untuk caching laporan analitik dan invalidasi cache secara tepat saat mutasi data (`clearCache(['finance', 'member' => $id, ...])`).
