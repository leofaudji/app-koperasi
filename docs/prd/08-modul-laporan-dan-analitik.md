# PRD - 08: Modul Laporan Operasional, Portofolio Kredit, dan Ekspor

## 1. Ikhtisar Modul
Modul Laporan dan Analitik berfungsi menyajikan visibilitas menyeluruh atas operasional harian, manajemen portofolio kredit, tingkat risiko pembiayaan (*Non-Performing Loan / NPL*), serta kepatuhan pencadangan piutang. Modul ini dilengkapi dengan mesin pelaporan berstandar eksekutif yang mendukung pencetakan dokumen resmi PDF landscape ber-kop surat dan ekspor data CSV ber-encoding UTF-8 BOM.

---

## 2. Rangkaian Laporan Operasional Simpanan

| Laporan | Rute Menu | Fitur Utama & Format Penyajian |
| :--- | :--- | :--- |
| **Laporan Saldo Simpanan** | `#/laporan-simpanan` | • **Summary Cards**: Kartu analitik total saldo per jenis produk di bagian atas.<br>• **Interaktif**: Klik kartu produk langsung memfilter tabel.<br>• **Kolom Ringkas**: Penggabungan No. Anggota dan Nama dengan font mono.<br>• **Sorting Dinamis**: Klik header kolom untuk mengurutkan (A-Z, nominal terbesar). |
| **Laporan Mutasi Simpanan** | `#/laporan-mutasi-simpanan` | • Filter rentang tanggal fleksibel (*Dari Tanggal s/d Sampai Tanggal*).<br>• Filter metode pembayaran (`Tunai` / `Transfer Bank`).<br>• Rincian nomor referensi dan saldo sebelum/sesudah. |
| **Buku Simpanan (Passbook)**| `#/buku-simpanan` | • Format tata letak buku tabungan fisik formal.<br>• Menampilkan riwayat transaksi per rekening lengkap dengan tanda tangan petugas. |
| **Monitoring Simpanan Wajib** | `#/monitoring-simpanan-wajib` | • Matriks 12 bulan status pelunasan iuran rutin anggota.<br>• Kalkulator tunggakan kumulatif dan tombol bayar cepat (*shortcut*). |

---

## 3. Rangkaian Laporan Portofolio Pinjaman & Risiko Kredit

### 3.1 Laporan Saldo Pinjaman (`#/laporan-pinjaman`)
- Menyajikan seluruh portofolio pinjaman anggota yang berstatus aktif/cair.
- Dilengkapi kartu KPI di bagian atas: Total Plafon Disalurkan, Total Sisa Pinjaman Pokok, Total Pendapatan Bunga Diterima, dan Rata-rata Tenor Berjalan.
- Kolom Rincian Pembayaran memadatkan info angsuran pokok dan bunga agar hemat ruang horizontal.

### 3.2 Laporan Baki Debet (`#/laporan-baki-debet`)
- Menyajikan posisi outstanding piutang riil per tanggal cut-off.
- Dikelompokkan per kategori produk kredit (Berjangka 1, Berjangka 2, Insidental, Barang, dll.).
- Menjadi data rujukan audit rekonsiliasi terhadap pos Aktiva Piutang di Neraca.

### 3.3 Laporan Kolektibilitas & NPL (`#/laporan-kolektibilitas`)
Mengimplementasikan standar klasifikasi kualitas aktiva produktif sesuai Peraturan Menteri Koperasi dan UKM serta Otoritas Jasa Keuangan (OJK):

| Golongan Kolektibilitas | Kriteria Hari Menunggak (DPD) | Bobot PPAP | Status Visual |
| :---: | :---: | :---: | :---: |
| **Kolektibilitas 1 (Lancar)** | Tepat waktu s/d 30 Hari | 0.5% | 🟢 Hijau |
| **Kolektibilitas 2 (Dalam Perhatian Khusus)** | 31 s/d 90 Hari | 5.0% | 🔵 Biru |
| **Kolektibilitas 3 (Kurang Lancar)** | 91 s/d 120 Hari | 15.0% | 🟡 Kuning |
| **Kolektibilitas 4 (Diragukan)** | 121 s/d 180 Hari | 50.0% | 🟠 Oranye |
| **Kolektibilitas 5 (Macet)** | > 180 Hari | 100.0% | 🔴 Merah |

- **Kalkulasi Rasio NPL (Non-Performing Loan)**:
  $$\text{Rasio NPL (\%)} = \frac{\sum \text{Baki Debet Kol 3, 4, dan 5}}{\text{Total Seluruh Baki Debet Pinjaman}} \times 100\%$$
- **Penyisihan Penghapusan Aktiva Produktif (PPAP)**: Menghitung cadangan risiko kerugian kredit yang wajib dibentuk koperasi untuk menutup potensi gagal bayar.

### 3.4 Laporan Jasa Pinjaman Anggota (`#/laporan-jasa-anggota`)
- Menghitung akumulasi pembayaran bunga/jasa pinjaman yang telah disetorkan oleh setiap anggota selama tahun buku berjalan.
- Data ini menjadi basis perhitungan alokasi **Sisa Hasil Usaha (SHU) Bagian Jasa Usaha / Pinjaman** pada akhir tahun buku.

### 3.5 Laporan Agunan (`#/laporan-agunan`)
- Rekapitulasi fisik dokumen jaminan kredit anggota (BPKB, SHM/SHGB, Emas, dll.).
- Status monitoring: Berada di Brankas Khasanah Koperasi, Dipinjam Sementara, atau Telah Dirilis/Dikembalikan ke Anggota.

---

## 4. Standar Mesin Ekspor Dokumen Resmi

### 4.1 Mesin Ekspor Microsoft Excel / CSV
- Seluruh tabel laporan dilengkapi tombol **"Ekspor CSV"**.
- **Standar UTF-8 BOM (`\uFEFF`)**: File CSV diawali dengan *Byte Order Mark* UTF-8 sehingga saat dibuka di Microsoft Excel versi Windows, format karakter khusus (simbol mata uang, tanda petik, nama berkarakter lokal) tidak mengalami distorsi atau karakter sampah (*garbled characters*).

### 4.2 Mesin Cetak PDF Landscape (Global PDF Engine)
Dibangun menggunakan pustaka `jsPDF` dan `jsPDF-AutoTable` dengan standar desain penerbitan eksekutif:
1. **Banner Header Dinamis (Gradient Accent)**: Memuat logo resmi koperasi, nama koperasi, nomor badan hukum, alamat kantor, judul laporan, dan rentang periode filter.
2. **Auto-Width & Proportional Sizing**: Menghitung lebar kolom secara proporsional otomatis berbasis tipe data (mono-width untuk kode/nomor, lebar untuk deskripsi, sedang untuk nilai Rupiah), mencegah teks terpotong (*no text truncation*).
3. **Dynamic Status Badging**: Mengubah teks status (LANCAR, MACET, REVERSED, LUNAS, PENDING) menjadi badge berwarna kontras tinggi yang selaras dengan tema aktif.
4. **Combined Information Column**: Menggabungkan field terkait (misal: "No. Anggota & Nama" atau "Akun & Kode GL") menjadi satu kolom vertikal ringkas untuk memaksimalkan ruang nominal angka.
5. **Proteksi Multi-Halaman (Page-Break)**: Menerapkan margin pengaman vertikal `top: 48` pada halaman 2 dan seterusnya agar judul tabel tidak tertimpa header dokumen.
6. **Footer Dinamis**: Menyajikan waktu cetak (*generated timestamp*), nama operator pencetak, dan nomor halaman otomatis (*Page X of Y*).

---

## 5. Spesifikasi Endpoint API Laporan & Analitik

| Method | Endpoint | Fungsi | Hak Akses |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/simpanan` (dengan filter agregasi) | Laporan saldo & mutasi simpanan | `laporan.simpanan_saldo` |
| `GET` | `/api/pinjaman` (dengan filter baki debet) | Laporan saldo kredit & baki debet | `laporan.pinjaman_saldo` |
| `GET` | `/api/laporan-kolektibilitas` | Laporan kolektibilitas NPL & estimasi PPAP | `laporan.pinjaman_baki_debet` |
| `GET` | `/api/pinjaman/jasa-anggota` | Rekapitulasi kontribusi jasa bunga per anggota | `laporan.pinjaman_saldo` |
| `GET` | `/api/angsuran` (dengan filter mutasi) | Laporan mutasi pembayaran cicilan kredit | `laporan.pinjaman_saldo` |
| `GET` | `/api/agunan` (dengan status filter) | Laporan inventaris agunan jaminan | `pinjaman.view` |
