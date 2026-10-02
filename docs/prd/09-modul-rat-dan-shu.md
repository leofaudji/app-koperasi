# PRD - 09: Modul Rapat Anggota Tahunan (RAT), Pembagian SHU, dan Tutup Buku

## 1. Ikhtisar Modul
Modul RAT dan Akhir Tahun memfasilitasi tata kelola kekuasaan tertinggi koperasi sesuai UU No. 25/1992 tentang Perkoperasian. Modul ini mencakup penyelenggaraan Rapat Anggota Tahunan (RAT), verifikasi kuorum kehadiran, simulasi dan eksekusi pembagian Sisa Hasil Usaha (SHU) berkeadilan (*Jasa Modal & Jasa Usaha*), fitur interaktif pengundian doorprize, hingga proses akuntansi tutup buku akhir tahun (*Year-End Closing*).

---

## 2. Manajemen Rapat Anggota Tahunan (RAT)

### 2.1 Siklus & Tata Kelola RAT (`#/rat`)
1. **Inisiasi Sesi RAT**: Pengurus menetapkan Tahun Buku yang dipertanggungjawabkan, tanggal pelaksanaan, agenda rapat, dan kuorum minimum.
2. **Presensi & Kehadiran Anggota (Kuorum)**:
   - Pencatatan kehadiran anggota secara digital (hadir fisik atau online via Portal Anggota).
   - Indikator Kuorum Real-Time: Menghitung persentase kehadiran terhadap total anggota aktif untuk memastikan keabsahan rapat ($> 50\% + 1$).
3. **Voting & Pengesahan**: Pengesahan Laporan Pertanggungjawaban (LPJ) Pengurus, Laporan Pengawas, Rencana Kerja & Rencana Anggaran Pendapatan dan Belanja Koperasi (RAPBK).
4. **Penerbitan Berita Acara**: Sistem menghasilkan dokumen Berita Acara RAT formal berformat PDF ber-kop surat resmi dengan blok tanda tangan Pengurus dan Notulen.

---

## 3. Modul Pembagian Sisa Hasil Usaha (SHU)

### 3.1 Formula & Prinsip Pembagian SHU Koperasi
SHU adalah pendapatan koperasi yang diperoleh dalam satu tahun buku dikurangi dengan penyusutan dan biaya-biaya operasional, termasuk pajak. SHU dialokasikan berdasarkan persentase AD/ART yang disahkan dalam RAT:

| Alokasi Pos SHU | Persentase Standar | Perlakuan Akuntansi & Distribusi |
| :--- | :---: | :--- |
| **Dana Cadangan** | $30\% - 40\%$ | Diposting menambah modal sendiri koperasi (Akun `215`/`204`). |
| **Jasa Modal (Simpanan)** | $20\% - 30\%$ | Dibagikan kepada anggota sebanding dengan proporsi simpanannya. |
| **Jasa Usaha (Pinjaman)**| $20\% - 25\%$ | Dibagikan kepada anggota sebanding dengan kontribusi pembayaran bunganya. |
| **Dana Pengurus & Pengawas** | $5\% - 10\%$ | Honorarium pertanggungjawaban pengurus dan pengawas. |
| **Dana Karyawan** | $5\%$ | Bonus performa kerja staf dan karyawan koperasi. |
| **Dana Pendidikan Koperasi** | $5\%$ | Anggaran pelatihan perkoperasian bagi anggota dan pengurus. |
| **Dana Sosial & Pembangunan**| $5\%$ | Sumbangan sosial dan pembangunan wilayah kerja koperasi. |

### 3.2 Rumus Perhitungan SHU Hak Anggota
Untuk setiap anggota $i$:

$$\text{SHU Jasa Modal}_i = \frac{\text{Simpanan Pokok}_i + \text{Simpanan Wajib}_i}{\sum (\text{Simpanan Pokok} + \text{Simpanan Wajib})} \times \text{Total Alokasi Jasa Modal}$$

$$\text{SHU Jasa Usaha}_i = \frac{\text{Bunga Pinjaman yang Dibayar}_i}{\sum \text{Bunga Pinjaman yang Dibayar}} \times \text{Total Alokasi Jasa Usaha}$$

$$\text{Total SHU Diterima}_i = \text{SHU Jasa Modal}_i + \text{SHU Jasa Usaha}_i$$

### 3.3 Simulasi Preview & Eksekusi Pembagian SHU
1. **Mode Simulasi (Preview)**: Pengurus dapat melakukan simulasi persentase alokasi pos SHU dan melihat tabel pembagian per anggota sebelum dieksekusi.
2. **Eksekusi Pembagian Terintegrasi**:
   - Bagian SHU anggota secara otomatis **dikreditkan langsung ke rekening Simpanan Sukarela (`SS`) masing-masing anggota** (atau dibayarkan tunai).
   - Terbit mutasi simpanan setoran otomatis berlabel `[SHU:TAHUN]`.
   - Terbit jurnal umum pembagian SHU berpasangan secara otomatis.
3. **Proteksi Anti-Double Execution**:
   - Sistem mencatat entri pada tabel `rat_shu_executions` dengan indeks unik `(tahun, rat_id)`.
   - Tombol eksekusi otomatis dinonaktifkan jika SHU tahun buku tersebut telah diproses sebelumnya.

---

## 4. Pengundian Doorprize RAT (Wheel of Fortune)

Untuk memeriahkan penyelenggaraan RAT, sistem menyediakan modul **Pengundian Doorprize** (`#/pengundian-rat`):
- **Visual Interaktif**: Roda putar grafis (*Wheel of Fortune / Randomizer*) dengan animasi transisi yang memukau.
- **Filter Kelayakan Peserta (Eligibility Rules)**:
  - Anggota wajib berstatus `aktif`.
  - Telah tercatat hadir pada presensi sesi RAT bersangkutan.
  - Tidak memiliki catatan kredit macet (Kolektibilitas 4 atau 5).
  - Anggota yang telah memenangkan hadiah utama dikecualikan dari putaran doorprize berikutnya (*fair distribution*).
- **Log Pemenang & Ekspor Berita Acara**: Riwayat pemenang tersimpan otomatis dan dapat dicetak ke dalam Berita Acara Pemenang Hadiah RAT.

---

## 5. Proses Akhir Tahun (Tutup Buku Tahunan)

Menu **Proses Akhir Tahun** (`#/akhir-tahun`) memfasilitasi penutupan tahun buku akuntansi secara resmi:
1. **Jurnal Penutup Otomatis (Closing Entries)**:
   - Saldo seluruh akun pendapatan didebit hingga bersaldo 0.
   - Saldo seluruh akun beban dikredit hingga bersaldo 0.
   - Selisih bersih dipindahkan ke pos penampung laba/rugi tahun berjalan (`3100` SHU Tahun Berjalan) atau dibagikan ke Dana Cadangan dan SHU Anggota.
   - Jurnal dicatat dengan penanda `ref_tipe = 'akhir_tahun'`.
2. **Penguncian Permanen Periode Buku**:
   - Sistem secara otomatis mengupdate `app_settings.accounting_locked_until` ke tanggal 31 Desember tahun buku yang ditutup.
   - Transaksi baru atau pengeditan data pada tahun tersebut otomatis terkunci permanen.
3. **Pemberian Saldo Awal Tahun Berikutnya**:
   - Seluruh saldo neraca akhir (aset, kewajiban, modal) otomatis dibawa (*carry forward*) menjadi saldo awal 1 Januari tahun buku baru.

---

## 6. Spesifikasi Endpoint API RAT & SHU

| Method | Endpoint | Fungsi | Hak Akses |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/rat` | Mengambil daftar sesi RAT dan status penyelenggaraan | `rat.view` |
| `POST` | `/api/rat` | Membuat sesi RAT baru | `rat.view` |
| `POST` | `/api/rat/presensi` | Mencatat absensi kehadiran anggota pada sesi RAT | `rat.view` |
| `GET` | `/api/shu/preview` | Menghitung simulasi pembagian SHU Jasa Modal & Usaha | `keuangan.laba_rugi` |
| `POST` | `/api/shu/execute` | Eksekusi pembagian SHU ke rekening anggota & jurnal | `keuangan.laba_rugi` |
| `GET` | `/api/rat/doorprize/peserta` | Mengambil daftar anggota eligible untuk undian doorprize | `dashboard.view` |
| `POST` | `/api/akhir-tahun/tutup-buku`| Eksekusi jurnal penutup tahunan & penguncian periode | `keuangan.laba_rugi` |
