# PRD - 03: Master Data dan Keanggotaan

## 1. Ikhtisar Modul
Modul Master Data dan Keanggotaan merupakan fondasi operasional koperasi. Modul ini bertanggung jawab atas siklus hidup keanggotaan koperasi (*Member Lifecycle Management*), manajemen produk simpanan, produk pinjaman, komponen biaya pinjaman, kode transaksi mutasi, serta struktur bagan akun standar (*Chart of Accounts / COA*).

---

## 2. Manajemen Data Anggota

### 2.1 Pendaftaran & Identitas Anggota
Sistem mencatat identitas anggota secara terverifikasi untuk kepatuhan regulasi KYC (*Know Your Customer*) dan pelaporan ke Kementerian Koperasi & UKM:
- **No. Anggota**: Dihasilkan otomatis dengan format berurutan `AGT-XXXX` (contoh: `AGT-0001`, `AGT-0002`). Unik dan tidak dapat diduplikasi.
- **Nomor Induk Kependudukan (NIK)**: Wajib 16 digit numerik sesuai KTP elektronik.
- **Nama Lengkap**: Mendukung nama berkarakter khusus (termasuk tanda petik satu `'` seperti *D'Angelo*, *Ma'ruf*, *Jum'at*). Sistem secara otomatis meng-escape karakter pada komponen JavaScript dropdown, autocomplete, dan rendering HTML.
- **Tempat & Tanggal Lahir**: Validasi usia minimum dan kriteria keanggotaan.
- **Jenis Kelamin**: L (Laki-laki) atau P (Perempuan).
- **Alamat Domisili, No. Telepon/WhatsApp, dan Email**: Untuk pengiriman notifikasi penagihan dan informasi koperasi.
- **Pekerjaan & Unit Kerja**: Informasi verifikasi kelayakan kredit/pinjaman.
- **Foto Profil / KTP**: Diunggah ke folder `uploads/` dengan batas ukuran maksimum 2MB.
- **Tanggal Daftar & Status Keanggotaan**:
  - `aktif`: Anggota aktif berhak bertransaksi dan memiliki hak suara dalam RAT.
  - `nonaktif`: Anggota yang ditangguhkan sementara (misal: mutasi atau cuti panjang).
  - `keluar`: Anggota yang telah mengundurkan diri (seluruh simpanan pokok dan wajib dikembalikan dan rekening ditutup).

### 2.2 Fintech Detail Interface (Antarmuka Finansial Anggota)
Halaman detail anggota (`#/anggota?id=X`) menyajikan tampilan komprehensif berbasis tab interaktif:
1. **Pita Ringkasan (Executive Summary)**:
   - Saldo Total Simpanan (akumulasi seluruh rekening).
   - Total Kewajiban / Sisa Pokok Pinjaman yang sedang berjalan.
   - Status Kepatuhan Simpanan Wajib (lunas / jumlah bulan tertunggak).
   - Indikator Progress Bar pelunasan pinjaman aktif.
2. **Tab Simpanan**: Menampilkan kartu rekening per produk (Pokok, Wajib, Sukarela, Partisipatif). Dilengkapi tombol pintas mutasi instan untuk melihat riwayat tabungan via modal tanpa meninggalkan halaman.
3. **Tab Pinjaman**: Riwayat seluruh pinjaman (aktif, lunas, ditolak), detail plafon, tenor, tanggal pencairan, dan kartu angsuran interaktif.
4. **Tab Profil**: Informasi demografis, kontak, data pekerjaan, dan dokumen identitas.
5. **Tab Log Aktivitas**: Jejak rekam waktu login anggota, perubahan data, dan riwayat transaksi.

---

## 3. Master Produk Simpanan (`jenis_simpanan`)

Koperasi mengelola berbagai produk tabungan dengan karakteristik finansial masing-masing:

| Kode | Nama Produk | Sifat | Bunga / Jasa p.a. | Akun GL Terkait | Deskripsi Fungsional |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **SP** | Simpanan Pokok | Wajib (1x) | 0.00% | `212` (Simpanan Pokok) | Dibayar sekali saat mendaftar menjadi anggota. Tidak dapat ditarik selama masih menjadi anggota aktif. Bagian dari Ekuitas Modal Sendiri. |
| **SW** | Simpanan Wajib | Wajib (Rutin) | 0.00% | `213` (Simpanan Wajib) | Disetorkan setiap bulan dengan nominal tetap. Menjadi bagian dari modal sendiri koperasi dan dasar pembagian SHU Jasa Modal. |
| **SS** | Simpanan Sukarela | Fleksibel | 2.50% | `206` (Simpanan Sukarela) | Tabungan harian yang dapat disetor dan ditarik sewaktu-waktu. Dapat digunakan untuk overbooking/autodebet pembayaran angsuran mandiri. |
| **SPAR** | Simpanan Partisipatif | Investasi | Variatif | `214` (Simpanan Partisipatif)| Penyertaan modal sukarela jangka menengah/panjang anggota dengan imbal jasa partisipatif. |

---

## 4. Master Produk Pinjaman (`jenis_pinjaman`)

Mengatur skema pembiayaan yang disalurkan kepada anggota:
- **Kode Produk**: `PR` (Pinjaman Reguler), `PD` (Pinjaman Darurat), `PK` (Pinjaman Konsumtif), `PB1` (Pinjaman Berjangka 1), `PB2` (Pinjaman Berjangka 2), `PINS` (Pinjaman Insidental), `PBRG` (Pinjaman Barang).
- **Suku Bunga**: Dihitung secara flat per bulan (contoh: 1.50% - 2.00% per bulan).
- **Maksimum Tenor**: Jangka waktu maksimal dalam satuan bulan (misal: 12, 24, atau 36 bulan).
- **Maksimum Plafon**: Batas atas nominal pengajuan kredit per produk.
- **Akun Piutang GL (`akun_id`)**: Akun neraca aktiva lancar yang mencatat saldo piutang (misal: `104` Piutang Berjangka 1, `105` Piutang Berjangka 2, `106` Piutang Insidental, dll.).

---

## 5. Master Biaya Pinjaman (`jenis_biaya_pinjaman`)

Biaya-biaya yang dikenakan kepada peminjam pada saat akad pencairan pinjaman:
- **Biaya Provisi**: Persentase dari plafon pinjaman (contoh: 1% atau 1.5%), dipetakan ke akun Pendapatan Provisi spesifik (`402`, `403`, `404`, `405`).
- **Biaya Administrasi**: Nominal tetap atau persentase, dialokasikan ke akun Pendapatan Administrasi (`4100` / `409`).
- **Biaya Asuransi Pinjaman**: Premi perlindungan jiwa/kredit peminjam.
- **Biaya Materai & Legalitas**: Biaya dokumen perjanjian kredit.
- **Sifat Pemotongan**: Otomatis memotong kas bersih yang diterima anggota saat pencairan (*net cash payout deduction*).

---

## 6. Master Kode Transaksi Simpanan (`kode_transaksi_simpanan`)

Setiap mutasi simpanan diklasifikasikan menggunakan kode transaksi yang memicu jurnal akuntansi otomatis:

| Kode | Nama Transaksi | Mutasi (D/K) | Akun Debet Default | Akun Kredit Default | Keterangan |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **STR** | Setoran | D (Tambah) | Kas / Bank (`100`/`110`) | Akun Simpanan (`2XX`) | Anggota menyetor uang tunai/transfer |
| **TRK** | Penarikan | K (Kurang) | Akun Simpanan (`2XX`) | Kas / Bank (`100`/`110`) | Anggota menarik saldo tabungan |
| **BNG** | Bunga Simpanan | D (Tambah) | Beban Bunga (`5000`) | Akun Simpanan (`2XX`) | Penambahan bunga bulanan |
| **PJK** | Pajak Bunga | K (Kurang) | Akun Simpanan (`2XX`) | Hutang Pajak (`2200`) | Pemotongan PPh pasal 4 ayat 2 |
| **ADM** | Biaya Admin | K (Kurang) | Akun Simpanan (`2XX`) | Pendapatan Adm (`4100`) | Pemotongan biaya kelola rekening |
| **TRF** | Transfer Masuk | D (Tambah) | Akun Simpanan Asal | Akun Simpanan Tujuan | Pemindahan saldo antar-rekening |
| **TRO** | Transfer Keluar | K (Kurang) | Akun Simpanan Asal | Akun Simpanan Tujuan | Pengurangan pada rekening sumber |
| **KRD** | Koreksi Debit | D (Tambah) | Akun Penyesuaian | Akun Simpanan | Penambahan akibat koreksi salah input |
| **KRK** | Koreksi Kredit | K (Kurang) | Akun Simpanan | Akun Penyesuaian | Pengurangan akibat koreksi salah input |

---

## 7. Master Bagan Akun (Chart of Accounts / COA)

Mengikuti Standar Akuntansi Keuangan Entitas Privat (SAK EP) dan pedoman akuntansi koperasi:
- **Tipe Akun Utama**:
  1. `aset` (Aktiva Lancar, Piutang Pinjaman, Aktiva Tetap) — Saldo Normal: **Debit (D)**.
  2. `kewajiban` (Hutang Lancar, Simpanan Sukarela Anggota, Hutang Pajak) — Saldo Normal: **Kredit (K)**.
  3. `modal` (Simpanan Pokok, Simpanan Wajib, Cadangan, SHU) — Saldo Normal: **Kredit (K)**.
  4. `pendapatan` (Pendapatan Jasa Bunga, Provisi, Denda, Administrasi) — Saldo Normal: **Kredit (K)**.
  5. `beban` (Beban Bunga, Beban Operasional, Beban Penyusutan) — Saldo Normal: **Debit (D)**.
- **Struktur Hierarki**: Mendukung kode akun hingga level 3 dengan relasi `parent_id`.
- **Integritas Penghapusan**: Akun COA yang telah memiliki detail transaksi di `jurnal_detail` dilarang dihapus, hanya dapat dinonaktifkan (`is_active = 0`).

---

## 8. Spesifikasi Endpoint API Master Data

| Method | Endpoint | Fungsi | Hak Akses |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/anggota` | Mengambil daftar anggota (dengan pencarian & pagination) | `anggota.view` |
| `GET` | `/api/anggota/{id}` | Detail profil anggota & ringkasan saldo | `anggota.view` |
| `POST` | `/api/anggota` | Pendaftaran anggota baru | `anggota.create` |
| `PUT` | `/api/anggota/{id}` | Perbarui identitas & status anggota | `anggota.edit` |
| `GET` | `/api/jenis-simpanan` | Daftar produk simpanan aktif | `simpanan.view` |
| `POST`/`PUT` | `/api/jenis-simpanan` | Tambah/ubah produk simpanan | `simpanan.setting` |
| `GET` | `/api/jenis-pinjaman` | Daftar produk pinjaman aktif | `pinjaman.view` |
| `POST`/`PUT` | `/api/jenis-pinjaman` | Tambah/ubah produk pinjaman | `pinjaman.setting` |
| `GET` | `/api/biaya-pinjaman` | Daftar komponen biaya pencairan pinjaman | `pinjaman.setting` |
| `POST`/`PUT` | `/api/biaya-pinjaman` | Konfigurasi tarif & akun GL biaya | `pinjaman.setting` |
| `GET` | `/api/kode-transaksi` | Daftar kode transaksi mutasi simpanan | `simpanan.setting` |
| `GET` | `/api/keuangan/akun` | Daftar Chart of Accounts (COA) | `keuangan.akun` |
| `POST`/`PUT` | `/api/keuangan/akun` | Tambah/ubah akun COA | `keuangan.akun` |
