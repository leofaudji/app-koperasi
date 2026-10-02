# PRD - 07: Modul Akuntansi, Laporan Keuangan SAK EP, dan Audit Saldo

## 1. Ikhtisar Modul
Modul Akuntansi dan Keuangan adalah jantung tata kelola pembukuan koperasi yang mengimplementasikan standar **Double-Entry Bookkeeping** berpasangan penuh sesuai **Standar Akuntansi Keuangan Entitas Privat (SAK EP)** dan regulasi Kementerian Koperasi & UKM. Modul ini menyajikan pelaporan keuangan menyeluruh, mekanisme penguncian buku (*Period Locking*), serta mesin rekonsiliasi audit saldo modular vs buku besar (*Zero Discrepancy Reconciliation Engine*).

---

## 2. Prinsip Dasar Akuntansi Koperasi

1. **Persamaan Dasar Akuntansi**:
   $$\text{Aset (Aktiva)} = \text{Kewajiban (Liabilitas)} + \text{Ekuitas (Modal Sendiri)}$$
2. **Keseimbangan Jurnal Mutlak**: Setiap transaksi pembukuan di tabel `jurnal` wajib memiliki $\sum \text{Debit} = \sum \text{Kredit}$. Selisih $\ne 0,00$ akan ditolak oleh basis data.
3. **Traceability Link (Keterlacakan Transaksi)**:
   - Jurnal yang dibentuk otomatis oleh transaksi operasional menyimpan relasi `ref_tipe` (`'simpanan'`, `'pinjaman'`, `'angsuran'`, `'akhir_tahun'`, `'reversal'`) dan `ref_id`.
   - Antarmuka menyediakan tombol pintas **"Buka Transaksi"** pada detail jurnal untuk melompat langsung ke data transaksi sumber aslinya.

---

## 3. Fitur Transaksi Kas Masuk & Kas Keluar (`#/kas-transaksi`)

Didesain untuk operasional kasir harian dengan antarmuka **Collapsible Card Layout** modern:
- **Kas Masuk (`KM...`)**: Mencatat penerimaan kas di luar operasional simpan-pinjam (misal: penerimaan pendapatan sewa, pengembalian panjar kas kecil, setoran modal penyertaan pihak ketiga).
- **Kas Keluar (`KK...`)**: Mencatat pengeluaran operasional (misal: pembayaran listrik/air/internet, biaya ATK, honor pengurus, beban pemeliharaan kantor).
- **Kartu Lipat (Collapsible)**: Baris transaksi dapat diperluas untuk menginspeksi rincian entri debit dan kredit akun COA yang terposting secara instan.
- **Ekspor & Reversal**: Dilengkapi tombol ekspor PDF landscape, file CSV, serta tombol pembatalan (*reversal*) instan.

---

## 4. Pelaporan Keuangan Standar SAK EP

### 4.1 Laporan Neraca (Balance Sheet)
Menyajikan posisi keuangan koperasi per tanggal tertentu:
- **Aset Lancar**: Kas, Bank, Piutang Pinjaman Anggota, Pendapatan YMH Diterima.
- **Aset Tidak Lancar**: Aktiva Tetap (Tanah, Gedung, Inventaris Kantor) dikurangi Akumulasi Penyusutan.
- **Kewajiban Jangka Pendek**: Simpanan Sukarela Anggota, Hutang Pajak, Hutang Biaya.
- **Ekuitas / Modal Sendiri**: Simpanan Pokok (212), Simpanan Wajib (213), Simpanan Partisipatif (214), Dana Cadangan (215), Ekuitas Awal (3999), dan Sisa Hasil Usaha (SHU) Tahun Berjalan.
- **Validasi Keseimbangan**: Sistem otomatis menampilkan badge status **SEIMBANG** hijau jika total aset sama persis dengan total kewajiban + ekuitas (selisih Rp 0,00).

### 4.2 Laporan Laba Rugi (Income Statement)
Menyajikan performa operasional koperasi selama periode tahun buku berjalan:
- **Pendapatan Usaha**: Pendapatan Jasa Bunga Pinjaman (400, 401, 406, 410), Pendapatan Provisi (402, 403, 404, 405), Pendapatan Denda (409), dan Pendapatan Administrasi.
- **Beban Usaha**: Beban Jasa/Bunga Simpanan Sukarela, Beban Operasional Kantor, Beban RAT, Beban Penyusutan.
- **SHU Sebelum Pajak & SHU Setelah Pajak**: Hasil bersih usaha yang akan dialokasikan pada Rapat Anggota Tahunan.

### 4.3 Laporan Pertumbuhan Laba Rugi (MoM & YoY)
Menu analitik visual (`#/pertumbuhan-labarugi`) untuk mengevaluasi tren profitabilitas:
- **Mode MoM (Month-over-Month)**: Menampilkan data 12 bulan (Januari - Desember) dalam 1 tahun buku dengan grafik komparasi pendapatan, beban, dan SHU bersih, dilengkapi persentase kenaikan/penurunan.
- **Smart Future-Month Handling**: Secara cerdas mencegah nilai 0 pada bulan mendatang agar tidak mendistorsi grafik atau rata-rata bulanan.
- **Mode YoY (Year-over-Year)**: Analisis tren multi-tahun untuk melihat pertumbuhan tahunan koperasi.

### 4.4 Laporan Arus Kas 3 Pilar (Cash Flow Statement)
Menyajikan arus masuk dan keluar kas riil berdasarkan klasifikasi SAK EP:
1. **Arus Kas dari Aktivitas Operasi**: Penerimaan bunga pinjaman, penerimaan angsuran pokok, pembayaran beban operasional, dan mutasi simpanan sukarela.
2. **Arus Kas dari Aktivitas Investasi**: Perolehan atau pelepasan aktiva tetap/peralatan koperasi.
3. **Arus Kas dari Aktivitas Pendanaan**: Penerimaan setoran simpanan pokok/wajib baru, pembagian dividen/SHU tunai ke anggota.
- **Rekonsiliasi Kas Akhir**: Saldo kas akhir periode pada laporan arus kas diverifikasi 100% cocok terhadap saldo kas dan setara kas di Neraca.

### 4.5 Laporan Perubahan Ekuitas Multi-Tab (Standar RAT Resmi)
Menu mutasi permodalan (`#/perubahan-ekuitas`) dengan 3 sudut pandang laporan terintegrasi:
- **Tab 1: Aliran Vertikal (Waterfall Bridge)**:
  $$\text{Saldo Awal Modal per 1 Jan} \xrightarrow{+} \text{Penambahan Modal} \xrightarrow{-} \text{Pengurangan Modal} = \text{Saldo Akhir Modal per 31 Des}$$
- **Tab 2: Komparatif Tahunan (YoY)**: Perbandingan posisi modal antara *Tahun Berjalan vs Tahun Sebelumnya* lengkap dengan pertumbuhan nominal ($\pm\text{Rp}$), persentase ($\pm\%$), dan indikator tren (*Naik ↗*, *Turun ↘*, *Stabil ➔*).
- **Tab 3: Matriks SAK EP (8 Kolom Formal)**:
  Tabel matriks mutasi horizontal formal untuk lampiran resmi buku pertanggungjawaban RAT:
  1. *Simpanan Pokok (Akun 212)*
  2. *Simpanan Wajib (Akun 213)*
  3. *Simpanan Partisipatif (Akun 214)*
  4. *Dana Cadangan (Akun 215, 204, 208)*
  5. *Ekuitas Awal / Laba Ditahan (Akun 3999)*
  6. *SHU Tahun Berjalan*
  7. *Total Ekuitas Koperasi*
  8. *Status Rekonsiliasi Neraca (`is_balanced: true`)*

---

## 5. Fitur Kunci Periode Akuntansi (Period Locking / Tutup Buku)

Untuk mencegah kecurangan atau salah edit data masa lalu:
- Tanggal batas kunci disetel pada pengaturan sistem (`app_settings.accounting_locked_until`).
- Helper `checkAccountingPeriodLock($db, $tanggal, $context)` dipanggil secara ketat sebelum eksekusi pada controller Simpanan, Pinjaman, Angsuran, dan Jurnal.
- Setiap upaya membuat transaksi baru, mengedit transaksi, atau mereversal transaksi pada tanggal $\le \text{Tanggal Kunci}$ akan diblokir dengan pesan:
  > *"Periode akuntansi s/d tanggal DD/MM/YYYY telah dikunci (tutup buku). Transaksi pada tanggal DD/MM/YYYY tidak dapat diproses atau diubah."*

---

## 6. Audit Saldo & Rekonsiliasi Modul vs GL (Zero Discrepancy Engine)

Menu **Audit Saldo** (`#/audit`) menyajikan inspeksi kesehatan data real-time:
1. **Rekonsiliasi Simpanan**: Membandingkan total saldo mutasi simpanan per jenis produk terhadap saldo akun Buku Besar (GL) terkait.
2. **Rekonsiliasi Pinjaman**: Membandingkan akumulasi `sisa_pinjaman` pinjaman aktif terhadap saldo akun Piutang di Buku Besar.
3. **Deteksi Data Yatim (Orphan Detection)**:
   - Transaksi simpanan tanpa jurnal pembukuan.
   - Pinjaman cair tanpa jurnal pencairan.
   - Pembayaran angsuran tanpa jurnal penerimaan.
   - Jurnal yang merujuk ke nomor transaksi yang telah dihapus.
4. **Deteksi Anomali Operasional**:
   - Transaksi backdated (>30 hari).
   - Saldo rekening simpanan bernilai negatif ($< 0$).
   - Transaksi bertanggal masa depan (*future date*).
5. **Skor Kesehatan Pembukuan (Health Score)**:
   - Nilai skor 0 - 100 dengan indikator visual: 🟢 Sehat (90-100), 🔵 Cukup (70-89), 🟡 Peringatan (40-69), 🔴 Kritis (<40).
   - Dilengkapi tombol perbaikan mandiri (*Fix Orphan*) yang secara cerdas membentuk jurnal penyeimbang otomatis.

---

## 7. Spesifikasi Endpoint API Keuangan & Audit

| Method | Endpoint | Fungsi | Hak Akses |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/keuangan/jurnal` | Mengambil daftar jurnal umum dengan filter & pagination | `keuangan.jurnal` |
| `POST` | `/api/keuangan/jurnal` | Input jurnal umum manual (double-entry) | `keuangan.jurnal` |
| `PUT` | `/api/keuangan/jurnal/{id}` | Koreksi entri jurnal umum manual | `keuangan.jurnal` |
| `GET` | `/api/keuangan/buku-besar` | Mengambil mutasi akun buku besar (GL) per periode | `keuangan.buku_besar` |
| `GET` | `/api/keuangan/neraca` | Laporan Neraca posisi keuangan SAK EP | `keuangan.neraca` |
| `GET` | `/api/keuangan/laba-rugi` | Laporan Laba Rugi pendapatan & beban | `keuangan.laba_rugi` |
| `GET` | `/api/keuangan/arus-kas` | Laporan Arus Kas 3 pilar SAK EP | `keuangan.neraca` |
| `GET` | `/api/perubahan-ekuitas` | Laporan Perubahan Ekuitas Multi-Tab | `keuangan.neraca` |
| `GET` | `/api/audit/reconcile` | Data rekonsiliasi saldo modul vs GL | `keuangan.neraca` |
| `GET` | `/api/audit/orphans` | Daftar transaksi yatim tanpa jurnal | `audit.view` |
| `GET` | `/api/audit/health` | Skor kesehatan audit pembukuan & breakdown penalti | `audit.view` |
| `POST` | `/api/audit/fix-orphan` | Perbaikan otomatis transaksi yatim | `audit.view` |
