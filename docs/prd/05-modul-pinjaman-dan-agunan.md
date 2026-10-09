# PRD - 05: Modul Pinjaman, Multi-Refinancing, dan Manajemen Agunan

## 1. Ikhtisar Modul
Modul Pinjaman mengelola seluruh siklus hidup pembiayaan kredit anggota (*Loan Origination & Servicing*), mulai dari pengajuan kredit, analisis kelayakan, penilaian agunan, persetujuan bertingkat, perhitungan bunga flat, pemotongan biaya pencairan (provisi/administrasi), skema pembiayaan ulang (*Multi-Refinancing / Top-up*), hingga pencetakan akad kredit resmi ber-QR Code legal (*Digital Signature E-Contract*).

---

## 2. Siklus Hidup Pinjaman (Loan Lifecycle)

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Pengajuan   │ ──> │  Review &    │ ──> │ Persetujuan  │ ──> │  Pencairan   │ ──> │  Angsuran &  │
│  (Pending)   │     │  Taksasi     │     │ (Disetujui)  │     │  Dana (Cair) │     │  Pelunasan   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                                         │
       ▼                                         ▼
┌──────────────┐                          ┌──────────────┐
│   Ditolak    │                          │ Reversal     │
│   (Ditolak)  │                          │ Pencairan    │
└──────────────┘                          └──────────────┘
```

1. **Pengajuan (`pending`)**:
   - Diajukan oleh kasir/petugas atas nama anggota atau diajukan mandiri oleh anggota melalui Portal PWA Mobile.
   - Mengisi plafon pengajuan, tenor, jenis produk pinjaman, keperluan kredit, dan data agunan jaminan.
2. **Review & Taksasi Agunan**: Petugas memeriksa kapasitas bayar anggota (*repayment capacity*), riwayat kolektibilitas sebelumnya, dan memverifikasi keabsahan fisik dokumen agunan di brankas.
3. **Persetujuan (`disetujui`)**:
   - Pejabat berwenang (Komite Kredit / Ketua Koperasi) menyetujui plafon dan tenor.
   - Menghitung jadwal angsuran amortisasi dan menetapkan biaya-biaya pencairan.
4. **Pencairan Dana (`cair`)**:
   - Kasir mencairkan dana secara tunai atau transfer bank.
   - Memotong langsung biaya provisi, administrasi, premi asuransi, materai, serta potongan pelunasan pinjaman lama (jika merupakan pinjaman Top-up/Refinancing).
   - Membentuk jurnal akuntansi pencairan otomatis secara instan.
5. **Angsuran Berjalan s/d Lunas (`lunas`)**: Anggota membayar cicilan bulanan hingga sisa pinjaman mencapai Rp 0,00. Saat lunas, status agunan dibuka untuk dapat diambil kembali oleh anggota.

---

## 3. Formula Perhitungan Bunga & Pokok (Flat Interest System)

Sistem menerapkan perhitungan suku bunga tetap (*flat rate*) per bulan:

$$\text{Bunga per Bulan} = \text{Plafon Pokok} \times \frac{\text{Bunga Persen}}{100}$$

$$\text{Total Bunga Selama Tenor} = \text{Bunga per Bulan} \times \text{Tenor (Bulan)}$$

$$\text{Total Tagihan Pinjaman} = \text{Plafon Pokok} + \text{Total Bunga}$$

$$\text{Angsuran Pokok per Bulan} = \frac{\text{Plafon Pokok}}{\text{Tenor}}$$

$$\text{Total Angsuran per Bulan} = \text{Angsuran Pokok} + \text{Bunga per Bulan}$$

### Aturan Baku Integritas Finansial (Audit Standard):
> **Inisialisasi Sisa Pinjaman (`sisa_pinjaman`)**: Nilai saldo awal `sisa_pinjaman` saat pinjaman dicairkan **wajib diisi sebesar nominal pokok murni (`jumlah`)**, bukan nilai total bayar dengan bunga (`total_bayar`). Hal ini menjamin keselarasan mutlak 100% antara saldo modul pinjaman terhadap saldo akun Buku Besar (GL) Piutang di Neraca.

---

## 4. Skema Multi-Refinancing (Top-up Pinjaman)

Fitur canggih untuk membiayai kembali (melunasi) **lebih dari satu pinjaman lama yang masih berjalan** dalam satu pengajuan pinjaman baru yang lebih besar:

### 4.1 Logika Bisnis & Input Multi-Refinancing
1. Saat petugas memproses persetujuan pinjaman baru, sistem menampilkan daftar seluruh pinjaman aktif anggota yang bersangkutan.
2. Petugas dapat memilih satu atau beberapa pinjaman lama sekaligus untuk dilunasi via checklist.
3. **Kustomisasi Bunga & Denda Berjalan**: Untuk setiap pinjaman lama yang dilunasi, sistem menghitung bunga berjalan dan denda keterlambatan hingga hari ini, serta mengizinkan komite kredit memberikan diskon/pembebasan bunga belum jatuh tempo.
4. **Kalkulator Kas Bersih Real-Time (Live Net Payout Calculation)**:
   Antarmuka modal menghitung secara dinamis saat petugas mengetik angka:

$$\text{Kas Bersih Diterima} = \text{Plafon Pinjaman Baru} - \sum \text{Sisa Pokok Lama} - \sum \text{Bunga Berjalan Lama} - \sum \text{Denda Lama} - \sum \text{Biaya Pencairan Baru}$$

### 4.2 Otomatisasi Pembukuan & Reversal Top-up
- **Saat Pencairan Top-up**:
  - Seluruh pinjaman lama yang dipilih otomatis diubah statusnya menjadi `lunas`.
  - Seluruh jadwal angsuran pinjaman lama yang belum dibayar ditandai `lunas` dengan metode pembayaran `'topup'`.
  - Jurnal pencairan membagi pengeluaran kredit: pelunasan piutang lama dikreditkan ke pos piutang terkait, bunga/denda lama dikreditkan ke pos pendapatan jasa/denda, biaya baru dikreditkan ke pos provisi, dan sisanya didebit/kreditkan ke kas/bank fisik.
- **Saat Reversal Pencairan (Pembatalan)**:
  - Sistem memulihkan status seluruh pinjaman lama kembali ke `'cair'`.
  - Saldo `sisa_pinjaman` pinjaman lama dipulihkan ke posisi semula sebelum pelunasan top-up.
  - Seluruh angsuran lama yang tadinya dilunasi top-up dikembalikan statusnya menjadi `'belum'`.
  - Sistem otomatis mengirimkan Web Push Notifikasi bertajuk **"Koreksi/Reversal Pinjaman 🔄"** ke perangkat anggota, menginformasikan bahwa pencairan telah dibatalkan dan status pinjaman disesuaikan kembali.
- **Notifikasi Pencairan Kredit (`WebPushHelper`)**:
  - Saat pencairan dieksekusi, anggota secara otomatis menerima notifikasi Web Push **"Kredit Dicairkan! 🎉"** berisi nomor akad dan nominal pinjaman yang diterima.

---

## 5. Komponen Biaya Pencairan Pinjaman

Dipotong langsung dari plafon pinjaman pada saat pencairan:
- **Biaya Provisi**: Berdasarkan jenis pinjaman dan dipetakan ke akun pendapatan provisi spesifik:
  - `PB1` (Pinjaman Berjangka 1) $\rightarrow$ Akun `402` (Pendapatan Provisi Berjangka 1)
  - `PB2` (Pinjaman Berjangka 2) $\rightarrow$ Akun `403` (Pendapatan Provisi Berjangka 2)
  - `PINS` (Pinjaman Insidental) $\rightarrow$ Akun `404` (Pendapatan Provisi Insidental)
  - `PBRG` (Pinjaman Barang) $\rightarrow$ Akun `405` (Pendapatan Provisi Barang)
- **Biaya Administrasi**: Dipetakan ke akun Pendapatan Administrasi (`4100` / `409`).
- **Biaya Asuransi Kredit**: Dialokasikan untuk perlindungan jiwa kreditur.
- **Potongan Simpanan Wajib Pencairan**: Jika disepakati anggota menyetor simpanan wajib di muka, sistem secara akurat mendebet kas dan mengkreditkan setoran ke rekening Simpanan Wajib (`SW`) anggota.

---

## 6. Manajemen Agunan / Jaminan Kredit (`agunan`)

### 6.1 Kategori Agunan yang Didukung
1. **BPKB Kendaraan Bermotor**: Nomor BPKB, Nomor Rangka, Nomor Mesin, Nomor Polisi, Merk, Tipe, Tahun Pembuatan, Nama di BPKB.
2. **Sertifikat Tanah & Bangunan**: Jenis (SHM / SHGB / Girik), Nomor Sertifikat, Luas Tanah ($m^2$), Luas Bangunan ($m^2$), Lokasi / Alamat Objek, Nama Pemegang Hak.
3. **Emas / Logam Mulia**: Berat (gram), Kadar Karat, Nomor Sertifikat Antam/UBS, Nilai Taksasi Pasar.
4. **Simpanan / Deposito Koperasi**: No. Rekening Simpanan yang diblokir sebagai jaminan kas (*cash collateral*).
5. **Lain-lain / Surat Berharga**: Ijazah, SK Pegawai, Akta Jual Beli.

### 6.2 Siklus Status Agunan
- `tersimpan`: Fisik dokumen agunan berada di dalam lemari besi / brankas khasanah koperasi.
- `dipinjam`: Dokumen agunan dipinjam sementara oleh anggota (misal: perpanjangan STNK/pajak 5 tahunan) dengan surat tanda terima peminjaman resmi.
- `dirilis`: Dokumen agunan telah diserahkan kembali secara permanen kepada anggota setelah pinjaman terbukti lunas 100%.

---

## 7. Dokumen Akad Kredit SPK & Tanda Tangan Digital QR Code

Sistem dilengkapi generator **Surat Perjanjian Kredit (SPK)** berstandar hukum perdata:
- **Format Cetak PDF**: Format A4 formal lengkap dengan kop resmi koperasi, pasal hak dan kewajiban, ketentuan sanksi denda keterlambatan, klausul eksekusi agunan jaminan, dan jadwal angsuran terlampir.
- **Digital Signature QR Code**: Setiap dokumen SPK memuat kode QR unik pada blok tanda tangan. Saat dipindai (*scan*), kode QR mengarahkan ke halaman verifikasi publik yang memvalidasi bahwa akad kredit tersebut sah terdaftar di database koperasi, mencegah pemalsuan dokumen fisik.

---

## 8. Spesifikasi Endpoint API Pinjaman & Agunan

| Method | Endpoint | Fungsi | Hak Akses |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/pinjaman` | Daftar pinjaman dengan filter status, anggota, tanggal | `pinjaman.view` |
| `GET` | `/api/pinjaman/{id}` | Detail pinjaman, jadwal angsuran, biaya, agunan | `pinjaman.view` |
| `POST` | `/api/pinjaman` | Input pengajuan pinjaman baru | `pinjaman.create` |
| `POST` | `/api/pinjaman/approve` | Menyetujui pinjaman & kalkulasi multi-refinancing | `pinjaman.approve` |
| `POST` | `/api/pinjaman/cairkan` | Eksekusi pencairan dana pinjaman & posting jurnal | `pinjaman.approve` |
| `POST` | `/api/pinjaman/reverse` | Reversal pembatalan pencairan pinjaman | `pinjaman.approve` |
| `GET` | `/api/agunan` | Daftar seluruh agunan & status penyimpanan | `agunan.view` |
| `PUT` | `/api/agunan/{id}` | Perbarui status penyimpanan agunan (pinjam/rilis) | `agunan.view` |
| `GET` | `/api/pinjaman/spk/{id}` | Mengambil data cetak akad kredit SPK ber-QR Code | `pinjaman.view` |
