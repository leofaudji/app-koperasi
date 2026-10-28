# PRD - 06: Modul Pembayaran Angsuran, Overbooking Sukarela, dan Reversal

## 1. Ikhtisar Modul
Modul Angsuran mengatur proses penagihan cicilan pembiayaan kredit anggota, kalkulasi denda keterlambatan harian, dukungan multi-metode pembayaran (termasuk pemindahbukuan internal / autodebet dari Simpanan Sukarela), fasilitas pelunasan dipercepat (*early settlement*), pencetakan struk thermal kasir, serta sistem pembatalan transaksi (*reversal*) non-destruktif berstandar audit.

---

## 2. Struktur Data Jadwal Angsuran (`angsuran`)

Setiap akad pinjaman yang dicairkan secara otomatis membentuk tabel amortisasi jadwal angsuran:
- **`angsuran_ke`**: Nomor urut cicilan dari 1 hingga $N$ (sesuai tenor bulan).
- **`tgl_jatuh_tempo`**: Tanggal batas akhir pembayaran setiap bulan.
- **`pokok`**: Komponen pengurang pokok pinjaman (mengurangi `pinjaman.sisa_pinjaman`).
- **`bunga`**: Komponen imbal jasa bunga koperasi (diakui sebagai Pendapatan Jasa).
- **`denda`**: Nominal sanksi denda keterlambatan (jika dibayar melampaui jatuh tempo).
- **`total`**: Nilai total kewajiban bayar ($\text{Pokok} + \text{Bunga} + \text{Denda}$).
- **`tgl_bayar`**: Tanggal transaksi pembayaran riil dilakukan oleh anggota.
- **`status`**:
  - `belum`: Cicilan belum dibayar.
  - `lunas`: Cicilan telah dibayar tepat waktu atau lunas dipercepat.
  - `terlambat`: Cicilan telah dibayar setelah melewati tanggal jatuh tempo.
- **`metode_pembayaran`**: `'tunai'`, `'transfer'`, `'sukarela'`, atau `'topup'`.

---

## 3. Kalkulasi Denda Keterlambatan Otomatis

Sistem secara dinamis menghitung denda keterlambatan harian bagi angsuran yang belum dibayar dan telah melampaui tanggal jatuh tempo:

$$\text{Hari Terlambat} = \max\left(0, \left\lfloor \frac{\text{Tanggal Hari Ini} - \text{Tanggal Jatuh Tempo}}{86.400} \right\rfloor \right)$$

$$\text{Denda Terhitung} = \text{Hari Terlambat} \times \text{Tarif Denda per Hari (misal Rp 5.000)}$$

$$\text{Total Tagihan Kasir} = \text{Angsuran Pokok} + \text{Bunga} + \text{Denda Terhitung}$$

Petugas kasir memiliki wewenang diskresioner (sesuai hak akses) untuk menyesuaikan atau membebaskan nominal denda pada saat pelunasan dengan persetujuan pengurus.

---

## 4. Metode Pembayaran Angsuran

### 4.1 Pembayaran Tunai & Transfer Bank
- **Tunai**: Anggota menyetor uang tunai di meja kasir/teller. Kas fisik bertambah pada akun kas kasir (`100`/`1000`).
- **Transfer Bank**: Anggota mentransfer ke rekening giro/bank koperasi. Petugas memilih akun bank penampung (`110`/`1100`) dan menginput nomor referensi transfer.

### 4.2 Pemindahbukuan Internal via Simpanan Sukarela (Overbooking)
Inovasi transaksi *cashless* di mana cicilan pinjaman dibayar langsung memotong saldo tabungan Simpanan Sukarela anggota yang bersangkutan:
1. **Validasi Kecukupan Saldo Real-Time**:
   - Form pembayaran angsuran menampilkan saldo Simpanan Sukarela anggota saat ini.
   - Sistem memvalidasi apakah $\text{Saldo Sukarela} \ge \text{Total Tagihan Angsuran}$.
   - Jika saldo tidak mencukupi, sistem menampilkan indikator selisih defisit dan tombol simpan otomatis terkunci.
2. **Eksekusi Pemindahbukuan (Zero Cash Impact)**:
   - Saldo rekening simpanan sukarela anggota di tabel `rekening_simpanan` langsung terpotong.
   - Tercatat mutasi penarikan di tabel `simpanan` dengan nomor referensi transaksi angsuran `[AG:...]`.
   - **Jurnal Pemindahbukuan Otomatis**:
     - *Debit*: Akun Simpanan Sukarela (`206`) sebesar Total Tagihan.
     - *Kredit*: Akun Piutang Pinjaman (`104`/`105`/`1200`) sebesar Angsuran Pokok.
     - *Kredit*: Akun Pendapatan Jasa Bunga (`400`..`406`) sebesar Bunga.
     - *Kredit*: Akun Pendapatan Denda (`409`/`4200`) sebesar Denda (jika ada).
   - Transaksi ini tidak menyentuh saldo fisik kas/bank koperasi (*Zero Cash Outflow*).

---

## 5. Fitur Pelunasan Dipercepat (Early Settlement)

Anggota berhak melunasi seluruh sisa pinjaman sebelum jangka waktu tenor berakhir:
1. Melalui tombol **"Pelunasan Dipercepat"** pada menu pembayaran angsuran.
2. Sistem mengeksekusi kalkulasi pelunasan via API `/api/angsuran/kalkulasi-lunas`:
   - **Sisa Pokok**: Seluruh sisa plafon pokok pinjaman (`sisa_pinjaman`) wajib dilunasi penuh.
   - **Bunga & Denda Berjalan**: Angsuran yang telah jatuh tempo wajib dibayar bunganya beserta akumulasi dendanya.
   - **Pembebasan Bunga Masa Depan (Diskon Pelunasan)**: Seluruh bunga dari jadwal angsuran yang **belum jatuh tempo** otomatis dihapuskan / dibebaskan sebagai apresiasi bagi anggota yang melunasi lebih awal.
3. Eksekusi pelunasan mengubah status seluruh sisa jadwal angsuran menjadi `lunas` dan status pinjaman ditutup menjadi `lunas`.

---

## 6. Cetak Struk Kasir Thermal POS (76mm / 80mm)

Sistem mengoptimalkan layanan meja kasir dengan integrasi cetak cepat struk kasir thermal:
- **Ukuran Kertas**: Standar POS printer lebar 76mm dan 80mm.
- **Komponen Struk**:
  - Logo koperasi dan nama koperasi resmi.
  - Nomor Kuitansi Transaksi (`AG...`) dan tanggal/jam cetak.
  - Nama Anggota, Nomor Anggota, dan Nomor Akad Pinjaman.
  - Rincian Pembayaran: Angsuran Pokok, Bunga Jasa, Denda Keterlambatan, dan Total Bayar.
  - Informasi Metode Pembayaran (TUNAI / TRANSFER / SIMPANAN SUKARELA).
  - Sisa Saldo Pokok Pinjaman setelah pembayaran.
  - Kolom tanda tangan ganda berdampingan: *Kasir/Teller* dan *Penyetor/Anggota*.

---

## 7. Sistem Reversal Transaksi Non-Destruktif

Jika kasir keliru memproses pembayaran angsuran:
1. Tombol **"Reversal"** pada menu riwayat angsuran memicu pembatalan yang aman bagi audit (*audit-compliant*).
2. **Restorasi Status & Saldo Pinjaman**:
   - Status angsuran dikembalikan menjadi `'belum'`.
   - `tgl_bayar` dikosongkan (`NULL`) dan nilai denda direset ke 0.
   - Pokok angsuran yang tadinya terpotong ditambahkan kembali ke `pinjaman.sisa_pinjaman`.
   - Status pinjaman dipastikan kembali `'cair'`.
3. **Pengembalian Dana Simpanan Sukarela (Refund Auto-Recovery)**:
   - Jika pembayaran angsuran tersebut menggunakan metode `'sukarela'`, sistem secara otomatis mengembalikan nominal dana ke saldo `rekening_simpanan` anggota.
   - Mencatat mutasi pengembalian simpanan dengan kode transaksi `REV...`.
4. **Pembalikan Jurnal Akuntansi**:
   - Membentuk jurnal kontra berpasangan (`ref_tipe = 'reversal'`) untuk membatalkan jurnal angsuran semula tanpa menghapus catatan historis.
5. **Notifikasi Web Push Real-Time Anggota (`WebPushHelper`)**:
   - Sistem secara otomatis mengirimkan Web Push Notification bertajuk **"Koreksi/Reversal Angsuran 🔄"** langsung ke smartphone/browser anggota terkait.
   - Pesan memuat transparansi penuh: nomor angsuran yang dibatalkan, penyesuaian kembali sisa tagihan pinjaman (`sisa_pinjaman`), serta konfirmasi pengembalian dana tabungan jika sebelumnya dibayar melalui Simpanan Sukarela.
   - Status pengiriman dicatat dalam `push_logs` dengan tipe `'reversal'`.

---

## 8. Koreksi Transaksi & Audit Trail (Side-by-Side Diff)

- Petugas berwenang dapat mengoreksi data transaksi angsuran (misal: ralat tanggal bayar atau penyesuaian denda).
- Transaksi yang telah dikoreksi ditandai badge kuning **DIEDIT**.
- Mengklik badge membuka modal **Timeline Audit Log** yang menyajikan perbandingan visual perubahan nilai *field* lama vs baru secara presisi.

---

## 9. Widget Kalender Jatuh Tempo Finansial & Proyeksi Arus Kas (Due-Dates Tracker)

Untuk meningkatkan efektivitas penagihan, manajemen likuiditas kas masuk, dan mitigasi risiko pembiayaan sejak dini:

### 9.1 Visualisasi Grid Kalender Bulanan (Monthly Calendar Grid)
- **Navigasi Waktu Fleksibel**: Pengguna dapat berpindah antar bulan (*Previous*, *Next*, dan *Today*) untuk memantau beban jatuh tempo angsuran historis maupun proyeksi bulan mendatang.
- **Indikator Status & Beban Harian**:
  - Setiap sel tanggal pada grid kalender menampilkan jumlah debitur yang jatuh tempo dan akumulasi total nominal kewajiban ($\sum \text{Pokok} + \sum \text{Bunga}$).
  - **Pewarnaan Dinamis Berbasis Risiko**:
    - 🔴 **Overdue (Terlambat)**: Badge merah dengan animasi denyut (*pulsing red beacon*) untuk tagihan yang telah melampaui tanggal jatuh tempo namun belum terbayar.
    - 🔵 **Due Today (Hari Ini)**: Badge biru indigo tegas dengan border kontras untuk tagihan yang jatuh tempo tepat pada hari ini.
    - ⚪ **Upcoming (Mendatang)**: Badge slate/netral untuk tagihan yang akan datang dalam bulan berjalan.
- **Interaksi Klik Sel**: Mengklik tanggal tertentu pada kalender langsung memfokuskan daftar rincian debitur yang jatuh tempo pada tanggal tersebut.

### 9.2 Proyeksi Arus Kas Masuk Harian (Projected Cash Inflow)
- Widget menyajikan metrik proyeksi likuiditas kas masuk (*Projected Inflow*) harian dan bulanan.
- Bendahara dan manajer kas dapat memproyeksikan kecukupan kas operasional harian berdasarkan jadwal komitmen pelunasan cicilan oleh anggota.

### 9.3 Tampilan Ganda (Dual-View: Kalender & Daftar Prioritas)
- **Mode Kalender**: Tampilan spasial sebulan penuh untuk melihat distribusi kepadatan tanggal jatuh tempo anggota.
- **Mode Daftar Prioritas (Priority List View)**: Tampilan daftar linear yang dipilah secara tegas menjadi:
  1. *Kategori Darurat*: Tagihan Menunggak (*Overdue*) dengan kalkulasi hari keterlambatan.
  2. *Kategori Hari Ini*: Tagihan yang wajib ditagih/diterima kasir hari ini (*Due Today*).
  3. *Kategori 7 Hari Mendatang*: Tagihan yang mendekati tanggal jatuh tempo (*Approaching Due*).

### 9.4 Generator Pengingat WhatsApp Resmi 1-Klik (1-Click WhatsApp Reminder)
- Setiap baris tagihan dilengkapi tombol aksi cepat pengingat WhatsApp (`wa.me`).
- Menghasilkan draf pesan konfirmasi resmi terpersonalisasi secara otomatis:
  ```text
  Yth. Bpk/Ibu [Nama Anggota] ([No. Anggota]),
  Mengingatkan tagihan angsuran pinjaman Koperasi Anda:
  - No. Pinjaman : [No. Pinjaman]
  - Angsuran Ke  : [X] dari [N]
  - Jatuh Tempo  : [Tgl Jatuh Tempo]
  - Tagihan Pokok: Rp [Nominal Pokok]
  - Bunga Jasa   : Rp [Nominal Bunga]
  - Denda        : Rp [Nominal Denda]
  - Total Bayar  : Rp [Total Tagihan]
  
  Pembayaran dapat dilakukan di meja kasir koperasi atau transfer ke rekening resmi koperasi.
  Terima kasih atas kerja samanya.
  ```
- Nomor telepon anggota dinormalisasi otomatis ke format internasional standar Indonesia (`628...`).

---

## 10. Spesifikasi Endpoint API Angsuran & Kalender Jatuh Tempo

| Method | Endpoint | Fungsi | Hak Akses |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/angsuran` | Mengambil riwayat transaksi angsuran dengan filter lengkap | `angsuran.view` |
| `GET` | `/api/angsuran/next` | Mengambil data angsuran berikutnya yang harus dibayar | `angsuran.create` |
| `GET` | `/api/angsuran/kalkulasi-lunas` | Menghitung nominal pelunasan dipercepat (diskon bunga) | `angsuran.create` |
| `POST` | `/api/angsuran` | Memproses pembayaran angsuran kasir (Tunai/Bank/Sukarela) | `angsuran.create` |
| `POST` | `/api/angsuran/reverse` | Reversal pembatalan transaksi pembayaran angsuran | `angsuran.create` |
| `PUT` | `/api/angsuran/{id}` | Koreksi data transaksi angsuran & catat audit log | `angsuran.create` |
| `GET` | `/api/angsuran/kartu/{id}` | Mengambil data lengkap kartu angsuran per pinjaman | `pinjaman.view` |
| `GET` | `/api/dashboard/due-calendar` | Mengambil kalender jatuh tempo bulanan, proyeksi kas, & prioritas tagihan (`?month=YYYY-MM`) | `pinjaman.view` / `angsuran.view` |

