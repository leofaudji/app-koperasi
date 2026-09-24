# CHANGELOG

Semua perubahan penting pada proyek Aplikasi Koperasi Simpan Pinjam akan didokumentasikan di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/), dan proyek ini menggunakan [Semantic Versioning](https://semver.org/lang/id/).

---

## [v2.6.0] - 2026-09-21

### 🔔 Verifikasi Pengajuan Pembayaran Angsuran via Simpanan Sukarela
- **Workflow Persetujuan Otomatis (Bendahara & Kasir)**:
  - Anggota dapat mengajukan pembayaran angsuran mandiri melalui saldo Simpanan Sukarela dari Portal Anggota.
  - **Notifikasi Real-time Bendahara**: Icon lonceng di header aplikasi utama menampilkan badge jumlah pengajuan pembayaran pending secara *live*. Dropdown notifikasi menampilkan daftar pengajuan beserta nominal, nama anggota, dan waktu pengajuan.
  - **Modal Verifikasi Informatif & Presisi**:
    - Menampilkan kartu identitas anggota & pinjaman, rincian komponen angsuran (Pokok, Bunga, Denda, Total Tagihan).
    - Menampilkan saldo Simpanan Sukarela saat ini, nominal tagihan, dan proyeksi sisa saldo setelah dipotong.
    - Validasi keamanan: Tombol "Setujui & Proses Pembayaran" otomatis terkunci dengan peringatan jika saldo anggota tidak mencukupi saat proses verifikasi berlangsung.
  - **Otomatisasi Pembukuan & Mutasi**:
    - Persetujuan (ACC) oleh Bendahara secara instan melunasi angsuran, mendebet saldo rekening simpanan sukarela anggota, mencatat mutasi penarikan simpanan, dan membukukan jurnal pemindahbukuan otomatis tanpa menyentuh kas fisik.
    - Opsi "Tolak Pengajuan" dilengkapi kolom alasan penolakan yang langsung terkirim sebagai notifikasi ke portal anggota.

### 💳 Optimalisasi Menu Pembayaran Angsuran (`#/angsuran`)
- **Tabel Transaksi Pembayaran Angsuran**:
  - Menampilkan riwayat transaksi pembayaran angsuran anggota yang dipilih sesuai filter yang aktif.
  - **Filter Periode Terintegrasi**: Ditambahkan filter Tanggal Mulai dan Tanggal Selesai pada tabel riwayat pembayaran angsuran.
  - **Penyempurnaan Tata Letak Filter**: Desain filter responsif yang rapi dengan tombol pencarian, reset filter, dan penataan kolom yang ergonomis.

### 🛡️ Perbaikan Filter & Lookup Nama Anggota Berkarakter Petik Satu (`'`)
- **Penanganan Escape Karakter Khusus**:
  - Mengatasi kendala pemilihan nama anggota yang memiliki tanda petik satu (misal: *D'Angelo*, *Ma'ruf*, *Jum'at*) pada autocomplete / dropdown filter di menu Buku Simpanan, Mutasi Simpanan, Pembayaran Angsuran, Pinjaman, dan form terkait lainnya.
  - Mencegah error JavaScript syntax saat rendering atribut event listener HTML.

### 📱 Portal Anggota v1.7.0 (PWA)
- **Widget Tagihan & Jadwal Angsuran Terdekat (Billing Card)**:
  - Menggantikan tampilan widget estimasi SHU tahunan di beranda dengan kartu interaktif Tagihan Angsuran Terdekat yang belum lunas.
  - Informasi lengkap: Angsuran ke-X dari tenor, jatuh tempo, nominal tagihan, rincian pokok/bunga/denda, dan badge status urgensi (Terlambat, Hari Ini, atau X Hari Lagi).
  - **Tombol Cepat "Bayar via Simpanan Sukarela"**: Anggota dengan saldo mencukupi dapat langsung memproses autodebet tagihan dari halaman beranda.
  - State dinamis: Menampilkan status *Menunggu ACC Bendahara*, kartu apresiasi hijau *"Semua Angsuran Lunas!"*, atau kartu promo *"Bebas Kewajiban Pinjaman"*.
- **Pembaruan Cache Service Worker**:
  - Peningkatan Service Worker ke `v77` (`koperasi-portal-v77`) untuk pembaharuan aset instan di sisi pengguna.

---

## [v2.5.1] - 2026-09-19

### 💰 Metode Pembayaran Angsuran via Simpanan Sukarela
- **Opsi Pembayaran Pemindahbukuan Internal (Overbooking)**:
  - Menambahkan metode pembayaran `Simpanan Sukarela` pada menu **Pembayaran Angsuran** (`#/angsuran`).
  - Menampilkan Saldo Simpanan Sukarela anggota secara *real-time* pada ringkasan pinjaman dan form pembayaran angsuran.
  - Indikator kecukupan saldo interaktif: otomatis memvalidasi apakah saldo Simpanan Sukarela anggota mencukupi total tagihan (Pokok + Bunga + Denda). Jika kurang, tombol simpan otomatis dinonaktifkan dengan peringatan selisih defisit.
- **Integrasi Akuntansi & Buku Tabungan**:
  - **Potong Saldo Rekening Simpanan**: Saldo `rekening_simpanan` anggota otomatis terpotong saat pembayaran diproses.
  - **Mutasi Buku Tabungan**: Mencatat transaksi penarikan di tabel `simpanan` dengan nomor referensi transaksi angsuran (`[AG:...]`).
  - **Jurnal Otomatis Seimbang**: Membentuk pembukuan jurnal pemindahbukuan (Debet: Akun Simpanan Sukarela/206 vs Kredit: Piutang Pinjaman, Pendapatan Bunga, Pendapatan Denda) tanpa mempengaruhi kas fisik koperasi (*zero cash impact*).
- **Dukungan Penuh Reversal (Pembatalan)**:
  - Reversal angsuran yang dibayar via Simpanan Sukarela secara otomatis mengembalikan (*refund*) dana ke saldo Simpanan Sukarela anggota dan mencatat mutasi pengembalian.
- **Pembaruan Laporan & Struk**:
  - Filter metode `Simpanan Sukarela` pada daftar angsuran dan Laporan Mutasi Angsuran.
  - Badge khusus berdesain elegan `💰 Sukarela` pada baris tabel data angsuran.
  - Cetak struk kasir menampilkan metode pembayaran `SIMPANAN SUKARELA`.
- **Database & Audit Integrity**:
  - Migrasi skema database `db_migration_v2.1.7.php` memperbarui tipe kolom `metode_pembayaran` pada tabel `angsuran` dan `simpanan`.
  - Rekonsiliasi audit mengenali transaksi pemotongan angsuran sukarela secara cerdas (*zero false positives* pada Audit Health Score).

---

## [v2.5.0] - 2026-09-16

### 📊 Laporan Perubahan Ekuitas Multi-Tab (Standar SAK EP & RAT)
- **Implementasi Sistem Multi-Tab Terpadu (3 Sudut Pandang Laporan)**:
  - **Tab 1: Aliran Vertikal (Waterfall Bridge)**: Menyajikan alur mutasi modal mengalir bertingkat: *Saldo Awal per 1 Jan* $\rightarrow$ *(+) Penambahan Modal Sendiri* (Setoran Pokok, Wajib, Partisipatif, Cadangan, SHU Positif) $\rightarrow$ *(-) Pengurangan Modal* (Pengembalian Pokok/Wajib Anggota Keluar, Penyesuaian, Defisit) $\rightarrow$ *Saldo Akhir Modal per 31 Des*.
  - **Tab 2: Komparatif Tahunan (Year-over-Year / YoY)**: Perbandingan posisi ekuitas modal antara *Tahun Berjalan vs Tahun Sebelumnya* lengkap dengan pertumbuhan nominal ($\pm\text{Rp}$), pertumbuhan persentase ($\pm\%$), dan status tren (*Naik ↗*, *Turun ↘*, *Stabil ➔*) berstandar audit akuntan publik (KAP).
  - **Tab 3: Matriks SAK EP (8 Kolom Formal)**: Tabel matriks mutasi horizontal formal cross-tabulation untuk lampiran resmi buku pertanggungjawaban RAT.
- **Rekonsiliasi Otomatis 100% Terhadap Neraca (Balance Guarantee)**:
  - Total Modal Akhir hasil perhitungan diverifikasi matematis secara otomatis terhadap total pos Ekuitas pada Laporan Neraca per 31 Desember, dengan verifikasi selisih Rp 0,00 (`is_balanced: true`).
- **Pita Ringkasan Eksekutif (Bento Ribbon) & Visualisasi**:
  - 4 metrik utama (*Modal Awal*, *Penambahan*, *Pengurangan*, *Modal Akhir*), badge status *Rekonsiliasi Neraca*, serta bilah visualisasi distribusi porsi modal akhir.
- **Ekspor Dokumen Resmi RAT**:
  - **Cetak PDF Landscape (A4)** ber-kop surat resmi koperasi, tabel matriks bergaris presisi, catatan pengesahan SAK EP, dan blok 3 tanda tangan legal (*Pengawas*, *Ketua*, dan *Bendahara*).
  - **Ekspor Microsoft Excel**: File CSV ber-encoding UTF-8 BOM (`\uFEFF`) komprehensif mencakup seksi Aliran Vertikal, Komparatif YoY, dan Matriks SAK EP.
- **Penyederhanaan Label Menu**:
  - Didaftarkan pada menu navigasi **LAPORAN $\rightarrow$ Keuangan $\rightarrow$ Perubahan Ekuitas** (`#/perubahan-ekuitas`).

### 🏛️ Harmonisasi Regulasi Penilaian Kesehatan Koperasi (KKPKK Modern)
- **Penyelarasan Rujukan Hukum Kontemporer**:
  - Menyeragamkan rujukan hukum dari regulasi usang Permenkop 20/2008 ke regulasi terbaru: **Permenkop UKM No. 9 Tahun 2020 jo. Permenkop UKM No. 2 Tahun 2024 & Permenkop UKM No. 8 Tahun 2023**.
  - Mengimplementasikan instrumen resmi **Kertas Kerja Pemeriksaan Kesehatan Koperasi (KKPKK)** dengan 4 Pilar Pengawasan Modern:
    1. *Tata Kelola (Bobot 30%)*: Kelembagaan, legalitas NIK, akuntabilitas RAT/Tutup Buku, dan kepatuhan SAK EP (audit saldo 100% balance).
    2. *Profil Risiko (Bobot 15%)*: Evaluasi risiko pembiayaan/NPL ($\le 5\%$), risiko likuiditas (Cash Ratio $\ge 10\%$), dan kecukupan cadangan risiko.
    3. *Kinerja Keuangan (Bobot 40%)*: Rentabilitas aset (ROA), rentabilitas modal sendiri (ROE), efisiensi biaya (BOPO), dan kemandirian operasional.
    4. *Permodalan (Bobot 15%)*: Rasio Kecukupan Modal (*CAR*) terhadap ATMR dan rasio modal sendiri terhadap total aset.
- **Standardisasi Nomenklatur Predikat Resmi Kemenkop UKM**:
  - Klasifikasi predikat: 🟢 **Sehat** $(\ge 80{,}00)$, 🔵 **Cukup Sehat** $(66{,}00 - <80{,}00)$, 🟡 **Dalam Pengawasan** $(51{,}00 - <66{,}00)$, dan 🔴 **Dalam Pengawasan Khusus** $(<51{,}00)$.
- **Penyelarasan Modal Sendiri Koperasi**:
  - Menghitung modal sendiri sesuai perundang-undangan dan SAK EP (mengakomodasi Simpanan Pokok dan Simpanan Wajib anggota sebagai bagian dari modal sendiri/ekuitas).
- **Pembaruan UI & PDF**:
  - Memperbarui antarmuka `kesehatan-koperasi.js`, menghilangkan duplikasi ikon, dan cetak dokumen resmi PDF ber-header KKPKK.

### 🧭 Restrukturisasi & Optimalisasi Menu Navigasi
- **Penyelarasan Alur Kerja Operasional Koperasi (Workflow-Driven)**:
  - **Master Data**: Mengelompokkan pengaturan jenis pinjaman dan biaya pinjaman agar berdampingan, diikuti kode transaksi dan COA (*Chart of Account*).
  - **Transaksi**: Menempatkan *Kas Masuk & Keluar* di urutan teratas untuk kasir/teller harian, disusul modul Simpanan, Pinjaman, dan Jurnal Keuangan back-office.
  - **Laporan Keuangan**: Menyusun urutan logis laporan standar akuntansi: *Neraca* $\rightarrow$ *Laba Rugi* $\rightarrow$ *Pertumbuhan Laba Rugi* $\rightarrow$ *Laporan Arus Kas* $\rightarrow$ *Perubahan Ekuitas* $\rightarrow$ *Buku Besar* $\rightarrow$ *Audit Saldo* $\rightarrow$ *Kepatuhan Kemenkop* $\rightarrow$ *Tingkat Kesehatan*.
  - **Sistem & Tata Kelola**: Memposisikan sub-menu *RAT & Akhir Tahun* di urutan teratas modul Sistem.

### 🛡️ Integritas Data & Audit Saldo (100% Reconciled)
- **Koreksi Rekonsiliasi Modul vs Buku Besar (GL)**:
  - Menghapus transaksi reversal yatim dan memulihkan saldo rekening Simpanan Pokok REO SUHANAFI sehingga Simpanan Pokok seimbang 100% (Selisih Rp 0,00).
  - Mengoreksi akun debet jurnal `TB2026080048` ke akun Kas (`100`) dan menyesuaikan `sisa_pinjaman` pinjaman 1888 ke Rp 1.500.000 sehingga Piutang Insidental seimbang 100% (Selisih Rp 0,00).
  - Menyelaraskan saldo awal pembukaan Piutang Berjangka 1 (`104`) dan pecahan sen Simpanan Sukarela (`206`) serta Partisipatif (`214`) terhadap akun penyeimbang `3999` (Selisih Saldo Awal) dengan pembukuan jurnal tetap 100% *balance*.
  - Mengalihkan referensi jurnal borongan `JRN2026070206` ke jurnal umum (`ref_tipe = 'umum'`) untuk mengeliminasi benturan selisih nominal Rp 660.000.
- **Penguatan Logika Backend (Pencegahan Masa Depan)**:
  - `AuditController.php`: Deteksi cerdas simpanan dari potongan pencairan pinjaman dan pelunasan angsuran via Top-up/Refinancing secara otomatis (*zero false positives*).
  - `PinjamanController.php`: Konsistensi inisialisasi `sisa_pinjaman` berdasarkan pokok pinjaman murni (`jumlah`), serta penandaan metode pembayaran angsuran top-up sebagai `'topup'`.
- **Script Pemulihan Mandiri (`repair_audit_discrepancies.php`)**:
  - Menyediakan script perbaikan otomatis berbasis CLI yang aman (transaksional ACID dan mendukung opsi `--dry-run`).

### 📈 Laporan Pertumbuhan Laba/Rugi (Bulanan & Tahunan)
- **Mode MoM (Month-over-Month)**: Analisis kinerja 12 bulan dalam 1 tahun buku dengan perbandingan pertumbuhan nominal ($\pm\text{Rp}$) dan persentase ($\pm\%$) antar bulan.
- **Mode YoY (Year-over-Year)**: Analisis tren multi-tahun dengan fleksibilitas filter rentang tahun.
- **Smart Future-Month Handling**: Mencegah false negative dropout pada grafik maupun kalkulasi rata-rata untuk bulan yang belum berjalan.
- **Visualisasi & Ekspor**: Diagram batang interaktif (Pendapatan, Beban, SHU), 5 kartu KPI, cetak PDF landscape, dan ekspor CSV UTF-8 BOM.

### 💵 Laporan Arus Kas, Kepatuhan Kemenkop, & Kunci Periode Akuntansi
- **Laporan Arus Kas (SAK EP)**: Laporan arus kas 3 pilar (Operasi, Investasi, Pendanaan) dengan rekonsiliasi kas riil ke neraca/buku besar (100% balance), filter tanggal fleksibel & preset, cetak PDF resmi, dan ekspor Excel (CSV).
- **Dashboard Kepatuhan Kemenkop UKM**: Klasifikasi otomatis Kelompok Usaha Koperasi (KUK 1-4) sesuai Permenkop UKM No. 2/2024, evaluasi 7 rasio prudensial (BMPP, Likuiditas, Solvabilitas, NPL, Kemandirian Modal, ROE, ROA), serta matriks profil Online Data System (ODS).
- **Kunci Periode Akuntansi (Period Locking)**: Fitur tutup buku berkala untuk mengunci pencatatan, pengeditan, atau pembatalan transaksi lampau di modul Jurnal, Pinjaman, Angsuran, dan Simpanan.


## [v2.1.9] - 2026-08-19

### 🐛 Diperbaiki & Dioptimalkan
- **Potongan Simpanan Wajib Pencairan:** Memperbaiki bug query pencarian Simpanan Wajib pada pencairan pinjaman yang salah mendeteksi produk Simpanan Pokok (karena kode dan kriteria `is_wajib = 1` yang tumpang tindih). Sekarang potongan simpanan wajib dijamin masuk ke produk Simpanan Wajib secara tepat.

## [v2.1.8] - 2026-08-19

### 🎨 Desain & UI
- **Redesain Kas Masuk & Keluar:** Memperbarui format tampilan menu Kas Masuk & Keluar dengan tata letak kartu lipat (collapsible layout) modern. Sekarang pengguna dapat memperluas baris transaksi untuk melihat rincian posting jurnal double-entry secara instan.
- **Ekspor PDF & CSV:** Menambahkan tombol ekspor langsung pada menu transaksi kas untuk mendownload riwayat kas masuk/keluar yang sedang difilter.
- **Fitur Pembatalan (Reversal):** Menambahkan tombol aksi reversal instan pada baris kas masuk/keluar untuk mempermudah pembatalan transaksi kas salah input.

## [v2.1.7] - 2026-08-15

### ✨ Ditambahkan
- **Filter Rentang Tanggal Simpanan:** Menambahkan filter **Dari Tanggal s/d Sampai Tanggal** pada daftar transaksi simpanan untuk membatasi pencarian transaksi berdasarkan tanggal tertentu, lengkap dengan integrasi ke fitur ekspor PDF/CSV.

## [v2.1.6] - 2026-08-15

### ✨ Ditambahkan & Dioptimalkan
- **Multi-Refinancing (Refinancing > 1 Pinjaman):** Menambahkan dukungan penuh untuk membiayai kembali (melunasi) lebih dari satu pinjaman lama sekaligus dalam satu pengajuan baru.
- **Kustomisasi Bunga & Denda Refinancing:** Menambahkan masukan Bunga Berjalan dan Denda Berjalan secara individual untuk setiap pinjaman yang dilunasi pada modal persetujuan.
- **Estimasi Kas Bersih (Live Net Payout Calculation):** Menambahkan kalkulator kas bersih (Dana Bersih Diterima) pada modal persetujuan pinjaman yang berinteraksi langsung (live update) saat nominal potongan bunga/denda diubah.
- **Reversal Multi-Refinancing:** Memastikan pembatalan (reversal) pencairan pinjaman top-up mengembalikan status dan saldo seluruh pinjaman lama yang dilunasi sebelumnya ke status aktif semula.

## [v2.1.5] - 2026-08-15

### 🐛 Diperbaiki & Dioptimalkan
- **Filter Tanggal Laporan Keuangan:** Memperbaiki bug kalkulasi saldo akun per tanggal/periode (Neraca, Penilaian Kesehatan, Buku Besar, Tutup Buku) agar data transaksi di luar tanggal filter tidak ikut dijumlahkan oleh query `LEFT JOIN` pada database.
- **Inisialisasi Sisa Pinjaman:** Mengubah setelan `sisa_pinjaman` baru agar diisi sebesar nominal pokok plafon pinjaman (`jumlah`), bukan total bayar (`total_bayar` dengan bunga), untuk mencegah selisih audit modul vs GL di masa depan.
- **Sistem Reversal Top-up:** Menambahkan pemulihan status dan sisa pinjaman lama serta pengembalian status angsuran lamanya kembali ke status belum bayar saat transaksi pencairan pinjaman top-up baru dibatalkan (direversal).
- **Skrip Koreksi Database:** Menyediakan skrip mandiri `fix_historical_data.php` untuk menyeimbangkan data pembukuan historis yang telanjur selisih.

## [v2.1.4] - 2026-07-07

### 🎨 Desain & UI
- **Grup Dropdown Aksi Tabel:** Mengganti deretan tombol aksi (Struk, Koreksi, Reversal) pada tabel Transaksi Simpanan dan Pembayaran Angsuran dengan satu tombol dropdown **"Aksi"** yang ringkas dan elegan, menghemat ruang horizontal tabel dan membuat tampilan jauh lebih rapi.

## [v2.1.3] - 2026-07-07

### ✨ Ditambahkan
- **Cetak Struk Thermal POS (POS Printer Receipt Layout):** Tombol "Struk" baru pada daftar Transaksi Simpanan dan Pembayaran Angsuran untuk memicu cetak bukti bayar thermal POS (lebar 76mm/80mm) yang rapi, lengkap dengan detail baris, nama kasir, dan kolom tanda tangan ganda (kasir & anggota).

## [v2.1.2] - 2026-07-07

### ✨ Ditambahkan
- **Pintasan Sumber Transaksi (Traceability Link):** Tombol "Buka Transaksi" pada detail jurnal otomatis (Simpanan, Angsuran, Pinjaman) untuk langsung beralih dan memfilter transaksi asli di halaman masing-masing.
- **Indikator & Histori Koreksi (Audit Trail):** Label badge **"DIEDIT"** berwarna kuning jika transaksi telah dikoreksi. Mengklik badge akan memunculkan timeline modal riwayat perubahan, lengkap dengan perbandingan field lama vs baru (*side-by-side JSON diff* dan format Rupiah otomatis).

## [v2.1.1] - 2026-07-07

### ✨ Ditambahkan
- **Fitur Koreksi Jurnal Manual:** Pengguna dapat mengoreksi data tanggal, keterangan, dan akun debit/kredit pada entri Jurnal Umum manual.
- **Koreksi Transaksi Angsuran:** Dukungan koreksi/edit nominal pokok, bunga, denda, tanggal, dan kas masuk pada transaksi Angsuran.

### 🎨 Desain & UI
- **Penyederhanaan Tabel Angsuran:** Kolom Pokok, Bunga, dan Total digabungkan menjadi kolom "Rincian Pembayaran" yang dinamis dan hemat ruang.
- **Penyederhanaan Jurnal Umum:** Menggabungkan kolom Faktur (No. Bukti) dan Tanggal Transaksi menjadi satu kolom info vertikal yang ringkas.
- **Status Metode Pembayaran:** Menambahkan informasi metode bayar (Tunai/Transfer) langsung di bawah badge status pada tabel Angsuran.

## [v2.1.0] - 2026-07-07

### ✨ Ditambahkan
- **Metode Pembayaran Multi-Akun:** Dukungan metode pembayaran `Transfer Bank` dengan pilihan akun kas/bank tujuan pada modul Simpanan, Angsuran, Pinjaman, dan Jurnal.
- **Kustomisasi Tanggal Transaksi:** Pengisian tanggal transaksi kustom pada modul Angsuran dan Jurnal untuk pencatatan historis yang akurat.
- **Filter Metode Pembayaran:** Penyaringan data transaksi berdasarkan metode pembayaran (`Tunai`/`Transfer`) pada tabel Simpanan, Laporan Mutasi Simpanan, Angsuran, dan Laporan Mutasi Angsuran.

### 🔧 Perbaikan
- **Pengecualian Data Migrasi di Audit Koperasi:** Transaksi berlabel "Import", "Migrasi", dan "Saldo Awal" kini dikecualikan dari deteksi data yatim (orphan) dan backdated untuk mencegah kesalahan penilaian kesehatan koperasi.
- **Optimasi Penalti Backdated:** Sistem penilaian kesehatan hanya mengenakan penalti untuk transaksi backdated yang melebihi 30 hari (bukan lagi 3 hari), sehingga input transaksi bulanan biasa tidak mengurangi skor.
- **Perbaikan Query SQL Audit:** Pengelompokan (GROUP BY) pada query rekonsiliasi GL pinjaman untuk memastikan kompatibilitas database yang lebih baik.
- **Pembersihan Cache Otomatis:** Sinkronisasi pembersihan cache modul keuangan, audit, dan simpanan pada setiap transaksi simpanan dan pinjaman.

## [v2.0.5] - 2026-06-24

### ✨ Ditambahkan
- **Shortcut Transaksi Wajib:** Tombol langsung dari halaman Monitoring Simpanan Wajib membuka modal transaksi dengan `jenis_simpanan=SW`.
- **Tampilan Tabel Simpanan Ringkas:** Penyederhanaan tabel `Simpanan` dengan kolom bergabung dan baris lebih kompak agar data dapat dibaca lebih efisien.

### 🔧 Perbaikan
- **Perbaikan No. Rekening:** Backend list simpanan sekarang mengikutkan `no_rekening` sehingga data rekening dapat ditampilkan di tabel transaksi.
- **Filter Rekening Simpanan SW:** Pencarian rekening pada modal simpanan menggunakan `jenis_simpanan=SW` untuk shortcut setoran wajib.
- **Monitoring Simpanan Wajib Stabil:** API `simpanan/monitoring-wajib` sekarang menyediakan `sp_lunas` dan `sw_months` serta mencegah deteksi `undefined` pada bulan yang belum punya data.
- **Logika Kepatuhan SW:** Penyederhanaan dan perbaikan logika deteksi tunggakan SW/SP agar anggota yang telah setor teridentifikasi dengan benar.

## [v2.0.4] - 2026-05-20

### ✨ Ditambahkan
- **Premium PDF Engine Upgrade (Global Helper):** Integrasi header bergradien modern kustom, visual accent bar pada subjudul, serta footer dinamis dengan nomor halaman (`Page X of Y`) pada semua modul laporan.
- **Auto-Width & Proportional Column Sizing:** Menghitung lebar kolom secara proporsional dan otomatis berbasis tipe data (mono-width untuk nomor, lebar luas untuk deskripsi, sedang untuk finansial), mencegah pemotongan data teks penting.
- **Dynamic Status Badging in PDF Tables:** Penataan otomatis teks status (LANCAR, MACET, PENDING, AKTIF, dll.) menjadi badge berwarna dengan kontras tinggi yang menyesuaikan dengan tema aktif sistem pada dokumen PDF.
- **Visual Category Badging (Reconciliation PDF):** Menambahkan aksen warna latar belakang Indigo (Simpanan) dan Purple (Pinjaman) yang elegan untuk membedakan kategori transaksi pada laporan audit secara cepat.
- **Combined Account & GL Column (Reconciliation PDF):** Menggabungkan kolom "Nama Rekening Akun" dan "Kode Akun" menjadi satu kolom ringkas "Rekening & Akun GL" dengan pemisah baris (`\n`), menghemat ruang horizontal dan memastikan nilai nominal Rupiah memiliki ruang maksimal.

### 🔧 Perbaikan
- **Penyuntingan Karakter Garbled jsPDF:** Mengganti simbol checkmark Unicode (`✔`) dengan teks ASCII standar (`[OK]`), memperbaiki isu di mana PDF viewer standar merender checkmark sebagai karakter sampah `&&&&`.
- **Dynamic Header & Title Alignment:** Menyeimbangkan tinggi area gradien `drawPDFHeader` dan menurunkan koordinat vertikal judul laporan ke `y = 38.5` serta sub-header ke `y = 44` untuk mengeliminasi tabrakan visual.
- **Proteksi Page-Break Multi-Halaman:** Menerapkan batas margin pengaman `top: 48` pada seluruh rendering autoTable kustom (`audit.js`, `kesehatan-koperasi.js`, `buku-simpanan.js`, `kartu-angsuran.js`, `pengundian-rat.js`) agar judul tabel tidak tertimpa banner dinamis pada halaman 2+.
- **Reconciliation Data Mapping:** Memperbaiki mapping data sehingga temuan selisih nominal transaksi dan data yatim (orphan) dapat dibaca dengan nilai riil yang akurat.
- **Branding & Splash Screen Polish:** Poles visual logo, background glow, grayscale footer partner, serta perbaikan typo teks bahasa Inggris ke bahasa Indonesia ("and" -> "dan") pada `index.html` untuk meningkatkan estetika antarmuka login.

## [v2.0.2] - 2026-05-13

### Fixed
- **Date Handling**: Fixed UTC date shifts in App.todayISO and resolved default filter value discrepancies in Mutasi Simpanan.
- **Activity History**: Integrated live activity logs into Member Detail page.

## [v2.0.1] - 2026-05-10

### ✨ Ditambahkan
- **Branding Dinamis di Login**: Nama koperasi dan logo pada halaman login kini diambil secara dinamis dari pengaturan database tanpa memerlukan login terlebih dahulu.
- **Collapsible Changelog**: Antarmuka riwayat versi kini dapat diciutkan (collapsible) per versi untuk navigasi yang lebih rapi dan fokus pada versi terbaru.
- **Digital Signature & E-Contract**: Implementasi tanda tangan digital berbasis QR Code pada dokumen SPK (Surat Persetujuan Kredit) untuk verifikasi keaslian dokumen secara instan.
- **Dashboard Analytics Update**: Penambahan statistik "Pinjaman Per Jenis" pada dashboard utama untuk memberikan gambaran portofolio pinjaman yang lebih komprehensif, sejajar dengan statistik simpanan.
- **Fintech Detail Interface**: Redesain total halaman detail anggota dengan antarmuka berbasis tab (Ringkasan, Simpanan, Pinjaman, Profil) ala aplikasi Fintech premium. Dilengkapi dengan indikator progress pelunasan pinjaman, kartu statistik modern, dan navigasi yang lebih intuitif.
- **Modal Mutasi Produk**: Kini pengurus dapat melihat riwayat transaksi simpanan atau riwayat angsuran pinjaman secara instan melalui modal pop-up hanya dengan mengklik kartu produk pada halaman detail anggota.
- **Financial Health Scoreboard**: Panel indikator kesehatan finansial yang mencakup Rasio NPL (Kredit Macet), Pertumbuhan Anggota (MoM), dan Volume Transaksi 30 hari terakhir untuk pemantauan performa bisnis yang lebih akurat.
- **Liquidity Gauge Analytics**: Panel pemantauan likuiditas kas secara real-time yang membandingkan aset kas dengan total kewajiban simpanan, lengkap dengan indikator kesehatan keuangan.
- **Quick Action Magic Menu**: Floating action button (FAB) baru untuk akses cepat ke transaksi simpanan, pinjaman, dan pendaftaran anggota dari halaman mana pun.

### 🔧 Diubah
- **Akses Publik Pengaturan**: Membuka akses baca publik terbatas ke endpoint `/api/settings` untuk mendukung fitur branding dinamis dengan tetap menjaga keamanan data sensitif.
- **Hardening Sesi HTTPS**: Optimalisasi parameter cookie sesi (`Secure`, `HttpOnly`, `SameSite=Lax`) untuk meningkatkan stabilitas login di lingkungan server hosting berbasis HTTPS.

## [v1.8.0] - 2026-05-07

### ✨ Ditambahkan
- **Analitik Produk Laporan Pinjaman**: Ringkasan total saldo per jenis produk di bagian atas laporan untuk akses cepat.
- **Filter Produk Interaktif**: Memungkinkan pemfilteran tabel laporan hanya dengan mengklik kartu analitik produk.
- **Peningkatan Laporan Baki Debet**: Pengelompokan data berdasarkan produk dan penambahan kartu analitik total baki debet per kategori.
- **Sinkronisasi Data Agunan**: Sinkronisasi tipe agunan antara modul manajemen dan laporan daftar agunan.
- **Kolom No. Rekening**: Penambahan informasi nomor pinjaman (rekening) pada Laporan Saldo Pinjaman yang bersifat context-aware terhadap filter produk.

### 🔧 Diubah
- **Optimasi SQL Laporan**: Sinkronisasi kriteria filter antara analitik dan tabel untuk memastikan total saldo selalu matching.
- **Perbaikan Bug Cache**: Pembaruan mekanisme cache-busting (v1.8.0) untuk mengatasi error "TypeError" akibat script lama yang tersimpan di browser.

---

## [v1.7.0] - 2026-05-03

### ✨ Ditambahkan
- **Sistem Reversal Transaksi (Non-Destruktif)**: Memungkinkan pembatalan transaksi Jurnal Umum, Simpanan, Angsuran, dan Pencairan Pinjaman tanpa menghapus data asli (audit-compliant).
- Fitur **Pembalikan Jurnal Otomatis** (Contra Entry) dengan penanda `ref_tipe='reversal'`.
- Label visual **REVERSED** pada tabel transaksi untuk memudahkan identifikasi data yang telah dibatalkan.
- Tombol **Reverse** pada daftar dan detail transaksi (tergantung hak akses).
- Integrasi **Redis Caching** terpusat pada modul keuangan dan kesehatan koperasi untuk performa maksimal.

### 🔧 Diubah
- **Optimasi UI Angsuran**: Penggabungan kolom No. Pinjaman, Nama Anggota, dan Urutan Angsuran menjadi satu kolom "Informasi Pinjaman" yang lebih efisien ruang.
- Standarisasi data API: Menghapus format mata uang dari backend agar dashboard grafik dapat merender data numerik dengan benar.

---

## [v1.6.0] - 2026-04-22

### ✨ Ditambahkan
- Fitur **Monitoring Portal** pada dashboard Admin
- **Dashboard Summary Real-time**: Monitoring jumlah login hari ini, user aktif, total aktifitas, dan split platform (Mobile vs Desktop)
- Pelacakan aktifitas anggota secara real-time (Login, Cek Saldo, Mutasi, Pinjaman, dll.)
- Informasi detail aktifitas: Nama Anggota, Jenis Aktifitas, Platform (Mobile/Desktop), Browser, dan IP Address
- Filter pencarian dan paginasi pada log aktifitas portal

---

## [v1.5.4] - 2026-04-22

### ✨ Ditambahkan
- Penggabungan kolom **No. Anggota** dan **Nama Anggota** menjadi satu kolom "Anggota" yang lebih efisien ruang
- Tampilan ID Anggota menggunakan font mono kecil di bawah nama anggota

### 🔧 Diubah
- Optimasi lebar tabel laporan simpanan agar lebih nyaman dilihat pada layar standar

---

## [v1.5.3] - 2026-04-22

### ✨ Ditambahkan
- Fitur **Sorting Kolom** pada Laporan Saldo Simpanan (klik judul kolom untuk mengurutkan)
- **Ringkasan Total di Atas** (Summary Cards) pada Laporan Saldo Simpanan agar total dapat dilihat langsung tanpa scrolling
- Indikator arah pengurutan (ikon panah) pada header tabel

### 🔧 Diubah
- Pembaruan tampilan dashboard portal untuk konsistensi branding

---

## [v1.5.2] - 2026-04-22

### ✨ Ditambahkan
- Dukungan penuh untuk **Simpanan Partisipatif** di Laporan Saldo Simpanan dan Portal Anggota
- Ikon spesifik untuk Simpanan Partisipatif di dashboard portal

### 🔧 Diubah
- Refaktor layout **Laporan Saldo Simpanan** untuk memastikan tombol aksi berada di atas tabel
- Optimasi SQL `laporan-saldo` menggunakan `LEFT JOIN` agar seluruh anggota aktif tampil di laporan

### 🐞 Perbaiki
- Perbaikan layout "berantakan" pada header laporan simpanan
- Penanganan nilai `NaN` pada kalkulasi total laporan jika terdapat data kosong

---

## [v1.5.1] - 2026-03-23
- Pembersihan file migrasi dan debug yang sudah tidak digunakan dari root dan folder `database/`
- Penambahan `.gitignore` untuk mengecualikan `database.sql` dan folder `uploads/`

---

## [v1.4.0] - 2026-03-13

### ✨ Ditambahkan
- Fitur **upload logo koperasi** pada halaman Pengaturan
- Logo koperasi ditampilkan di header PDF laporan
- Direktori `uploads/` untuk menyimpan fil aset (logo, dll.)

### 🔧 Diubah
- Halaman pengaturan menggunakan tab layout yang lebih terstruktur (Umum, Portal, Tampilan, Tema, Backup)

---

## [v1.3.0] - 2026-03-09

### ✨ Ditambahkan
- Fitur **Backup & Restore Database** di halaman Pengaturan
- Ekspor database dalam format `.sql`
- Impor/restore database dari file `.sql`

---

## [v1.2.0] - 2026-03-09

### ✨ Ditambahkan
- Sistem **Audit Log & Activity Tracking** untuk memantau perubahan transaksi
- Tabel `audit_logs` di database
- Helper `logActivity` pada API core
- Tab "History Perubahan" di halaman Audit Saldo
- Integrasi pencatatan aktivitas pada `SimpananController`, `PinjamanController`, `AngsuranController`

---

## [v1.1.0] - 2026-03-05

### ✨ Ditambahkan
- Modul **RAT (Rapat Anggota Tahunan)** — Manajemen RAT dan Pengundian RAT
- Fitur **eksekusi pembagian SHU** dari modul RAT, termasuk kalkulasi Jasa Modal dan Jasa Anggota
- Tabel `rat_shu_executions` untuk mencegah distribusi SHU ganda
- Tombol "Eksekusi Pembagian SHU" (kondisional) pada topik RAT yang sudah ditutup

---

## [v1.0.0] - 2026-03-01

### ✨ Ditambahkan
- Rilis awal Aplikasi Koperasi Simpan Pinjam
- Manajemen **Anggota** (pendaftaran, edit, nonaktif)
- Modul **Simpanan** — Jenis simpanan, kode transaksi, transaksi, mutasi
- Modul **Pinjaman** — Pengajuan, persetujuan, pencairan, angsuran, agunan
- Modul **Keuangan** — Jurnal umum, buku besar, neraca, laba rugi
- Laporan: Saldo simpanan, buku simpanan, laporan pinjaman, baki debet, kolektibilitas, kartu angsuran
- Modul **Pembagian SHU** dan **Proses Akhir Tahun**
- Sistem **RBAC** (Role-Based Access Control) — Admin, Petugas, Anggota
- **Portal Anggota** (PWA) untuk akses informasi simpan pinjam mandiri
- Sistem **Pengumuman** untuk komunikasi koperasi kepada anggota
- **Laporan Tingkat Kesehatan Koperasi** sesuai standar penilaian
- Sistem pengaturan aplikasi (nama koperasi, alamat, tema warna, logo)
- **Tema warna** yang dapat disesuaikan (Indigo, Violet, Biru, Cyan, Hijau, Oranye, Merah, Abu-abu)
