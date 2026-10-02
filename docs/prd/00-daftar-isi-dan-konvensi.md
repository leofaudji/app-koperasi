# PRD - 00: Daftar Isi, Matriks Fungsional, dan Konvensi Sistem

## 1. Identifikasi Dokumen
- **Nama Produk**: Aplikasi Koperasi Simpan Pinjam Terintegrasi (KSP Core & Portal PWA)
- **Kode Repositori**: `app-koperasi`
- **Versi Produk Saat Ini**: `v2.6.0`
- **Klasifikasi Dokumen**: Product Requirement Document (PRD) Modular
- **Target Pembaca**: Product Owner, Pengurus Koperasi, Software Engineer, Quality Assurance, Database Administrator, AI Coding Agents.

---

## 2. Peta Berkas PRD Modular

| Bab | Berkas PRD | Lingkup Fungsional | Pemilik Modul |
| :---: | :--- | :--- | :---: |
| **00** | [`00-daftar-isi-dan-konvensi.md`](file:///d:/laragon/www/app-koperasi/docs/prd/00-daftar-isi-dan-konvensi.md) | Daftar isi, matriks penomoran, standar kode, & konvensi | Lead Architect |
| **01** | [`01-ringkasan-eksekutif-dan-arsitektur.md`](file:///d:/laragon/www/app-koperasi/docs/prd/01-ringkasan-eksekutif-dan-arsitektur.md) | Visi produk, target pengguna, arsitektur sistem, tech stack & multi-platform | Lead Architect |
| **02** | [`02-autentikasi-dan-manajemen-akses-rbac.md`](file:///d:/laragon/www/app-koperasi/docs/prd/02-autentikasi-dan-manajemen-akses-rbac.md) | Login, sesi HTTPS, CSRF, RBAC dinamis (Role & Permissions), Audit Trail | Security Lead |
| **03** | [`03-master-data-dan-keanggotaan.md`](file:///d:/laragon/www/app-koperasi/docs/prd/03-master-data-dan-keanggotaan.md) | Profil anggota, verifikasi NIK/KTP, produk simpanan/pinjaman, COA | Core Dev |
| **04** | [`04-modul-simpanan.md`](file:///d:/laragon/www/app-koperasi/docs/prd/04-modul-simpanan.md) | Simpanan Pokok, Wajib, Sukarela, Partisipatif, Mutasi, Monitoring Tunggakan SW | Financial Dev |
| **05** | [`05-modul-pinjaman-dan-agunan.md`](file:///d:/laragon/www/app-koperasi/docs/prd/05-modul-pinjaman-dan-agunan.md) | Pinjaman flat, review, approval, multi-refinancing (top-up), agunan, SPK QR | Credit Dev |
| **06** | [`06-modul-angsuran-dan-reversal.md`](file:///d:/laragon/www/app-koperasi/docs/prd/06-modul-angsuran-dan-reversal.md) | Angsuran kasir/overbooking SS, pelunasan dipercepat, thermal POS, reversal non-destruktif | Billing Dev |
| **07** | [`07-modul-akuntansi-dan-keuangan.md`](file:///d:/laragon/www/app-koperasi/docs/prd/07-modul-akuntansi-dan-keuangan.md) | Double-entry GL, Kas Masuk/Keluar, Neraca SAK EP, Laba Rugi, Arus Kas, Ekuitas, Kunci Buku | Accounting Lead |
| **08** | [`08-modul-laporan-dan-analitik.md`](file:///d:/laragon/www/app-koperasi/docs/prd/08-modul-laporan-dan-analitik.md) | Laporan saldo, baki debet, kolektibilitas/NPL, mutasi, ekspor PDF Landscape & CSV UTF-8 | Reporting Dev |
| **09** | [`09-modul-rat-dan-shu.md`](file:///d:/laragon/www/app-koperasi/docs/prd/09-modul-rat-dan-shu.md) | RAT kuorum, Doorprize wheel, distribusi SHU otomatis, tutup buku tahunan | Governance Dev |
| **10** | [`10-portal-anggota-pwa.md`](file:///d:/laragon/www/app-koperasi/docs/prd/10-portal-anggota-pwa.md) | PWA Member Portal, Service Worker offline, Billing card, Autodebet SS & Notifikasi Lonceng | Mobile/PWA Dev |
| **11** | [`11-kepatuhan-regulasi-dan-kesehatan-koperasi.md`](file:///d:/laragon/www/app-koperasi/docs/prd/11-kepatuhan-regulasi-dan-kesehatan-koperasi.md) | Kertas Kerja Pemeriksaan Kesehatan Koperasi (KKPKK 4 Pilar), 7 Rasio KUK 1-4 | Compliance Lead |
| **12** | [`12-keamanan-infrastruktur-dan-pemeliharaan.md`](file:///d:/laragon/www/app-koperasi/docs/prd/12-keamanan-infrastruktur-dan-pemeliharaan.md) | Redis caching, Backup/Restore .sql, CLI scripts, Database integrity repair | DevOps Lead |

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
| **Kas** | Kas Masuk / Keluar | `KM[YYYY][MM][XXXX]` / `KK[YYYY][MM][XXXX]` | `^K[MK]\d{8}$` | `KM2026080015` |
| **RAT** | Sesi RAT | `RAT-[TAHUN]` | `^RAT-\d{4}$` | `RAT-2026` |

---

## 4. Standar Nilai Mata Uang & Pembulatan

1. **Mata Uang Basis**: Rupiah Indonesia (IDR).
2. **Format Database**: `DECIMAL(15,2)` pada seluruh tabel transaksi dan saldo buku besar.
3. **Format Tampilan Antarmuka**: `Rp ##.###.###` (menggunakan pemisah ribuan titik dan tanpa pecahan sen desimal kecuali dalam dokumen akuntansi audit).
4. **Metode Pembulatan**: *Half Up* (pembulatan matematis standar ke bilangan bulat Rupiah terdekat pada perhitungan bunga, administrasi, dan denda).
5. **Format Cetak PDF & Excel**: UTF-8 BOM (`\uFEFF`) untuk CSV guna mencegah *garbled character* di Microsoft Excel.
