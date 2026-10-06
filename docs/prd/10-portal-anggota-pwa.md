# PRD - 10: Portal Anggota Digital (PWA), Tagihan Terdekat, dan Monitoring Log

## 1. Ikhtisar Modul
Portal Anggota Digital adalah aplikasi berbasis **Progressive Web App (PWA)** mobile-first yang memberikan akses perbankan mandiri (*self-service banking*) bagi anggota koperasi. Melalui portal ini, anggota dapat memantau saldo tabungan, memeriksa jadwal tagihan terdekat, melakukan pembayaran angsuran mandiri melalui saldo Simpanan Sukarela, mengajukan pinjaman online, dan mengunduh bukti transaksi secara transparan 24/7 dari perangkat smartphone.

---

## 2. Arsitektur Progressive Web App (PWA)

- **Direktori Sumber**: Terisolasi pada folder `/portal/` (`index.html`, `views/`, `assets/`, `manifest.json`, `sw.js`).
- **Web App Manifest (`manifest.json`)**: Mengatur nama aplikasi, ikon beresolusi tinggi (maskable icon), warna tema bar status, orientasi potret default, dan mode tampilan `standalone` (tampil tanpa bilah browser layaknya aplikasi Android/iOS native).
- **Service Worker (`sw.js` v77)**:
  - Cache shell aset statis (CSS, font, ikon, script) untuk kecepatan muat instan (< 1 detik).
  - Mekanisme update aset otomatis dengan pengingat banner pembaharuan saat versi service worker diperbarui (`koperasi-portal-v77`).
  - Ketahanan jaringan: Tetap dapat membuka antarmuka saat koneksi internet offline/lemah.

---

## 3. Fitur Beranda & Widget Tagihan Terdekat (Billing Card)

### 3.1 Kartu Profil & Ringkasan Tabungan
- Menampilkan nama anggota, nomor keanggotaan unik, dan status aktif.
- Menampilkan kartu saldo per produk simpanan (Simpanan Pokok, Simpanan Wajib, Simpanan Sukarela, dan Simpanan Partisipatif) dengan ikon yang ergonomis.

### 3.2 Widget Tagihan & Jadwal Angsuran Terdekat (Billing Card)
Widget pintar di halaman beranda yang secara otomatis mendeteksi kewajiban cicilan pinjaman anggota yang belum lunas:
- **Informasi Kartu**:
  - Nomor pinjaman aktif dan nomor urut cicilan (*Angsuran ke-X dari Y bulan*).
  - Tanggal jatuh tempo angsuran terdekat.
  - Total tagihan bulan ini beserta rincian: Pokok, Jasa Bunga, dan Denda keterlambatan.
- **Badge Status Urgensi**:
  - 🔴 **Terlambat**: Telah melewati jatuh tempo, menampilkan akumulasi hari keterlambatan dan denda berjalan.
  - 🟡 **Jatuh Tempo Hari Ini**: Harus diselesaikan sebelum pergantian hari.
  - 🔵 **X Hari Lagi**: Peringatan waktu pembayaran normal.
- **Tombol Pintas Autodebet ("Bayar via Simpanan Sukarela")**:
  - Jika saldo Simpanan Sukarela anggota $\ge \text{Total Tagihan}$, tombol aktif berwarna hijau.
  - Anggota dapat langsung mengeksekusi pengajuan autodebet dari halaman depan tanpa antre di kantor kasir.
- **State Dinamis Alternatif**:
  - *State Menunggu ACC*: Menampilkan badge oranye *"Pengajuan Pembayaran Sedang Diverifikasi Bendahara"*.
  - *State Bebas Kewajiban*: Kartu hijau elegan *"Semua Angsuran Telah Lunas!"* atau *"Anda Tidak Memiliki Pinjaman Aktif"*.

---

## 4. Workflow Pembayaran Angsuran Mandiri via Simpanan Sukarela

```text
┌──────────────────────────┐       ┌──────────────────────────────┐
│  Anggota Tekan           │ ────> │  Data Masuk ke Tabel         │
│  "Bayar via Sukarela"    │       │  pengajuan_angsuran (Pending)│
└──────────────────────────┘       └──────────────┬───────────────┘
                                                  │
                                                  ▼
┌──────────────────────────┐       ┌──────────────────────────────┐
│  Modal Verifikasi        │ <──── │  Lonceng Notifikasi Realtime │
│  Informatif Bendahara    │       │  di Header Admin/Kasir       │
└────────────┬─────────────┘       └──────────────────────────────┘
             │
             ├──────────────────────────────────────┐
             ▼ (Setujui / ACC)                      ▼ (Tolak Pengajuan)
┌──────────────────────────────────────┐   ┌──────────────────────────────┐
│ • Angsuran Ditandai Lunas            │   │ • Status Berubah 'ditolak'   │
│ • Rekening Simpanan Sukarela Dipotong│   │ • Alasan Penolakan Dikirim   │
│ • Mutasi Simpanan [AG:...] Tercatat  │   │   ke Portal Anggota          │
│ • Jurnal Pemindahbukuan Otomatis     │   └──────────────────────────────┘
└──────────────────────────────────────┘
```

### 4.1 Lonceng Notifikasi Real-Time di Header Backoffice
- Icon lonceng pada header aplikasi backoffice menampilkan badge jumlah pengajuan pembayaran pending secara *live*.
- Mengklik lonceng memunculkan dropdown notifikasi berisi daftar nama anggota, nominal tagihan, dan waktu pengajuan.

### 4.2 Modal Verifikasi Presisi Bendahara
1. Menampilkan profil lengkap anggota, nomor rekening simpanan sukarela, dan detail pinjaman.
2. Membandingkan **Saldo Simpanan Sukarela saat ini** terhadap **Total Tagihan**.
3. Menghitung **Proyeksi Sisa Saldo** tabungan setelah transaksi diproses.
4. **Validasi Kunci Keamanan**: Tombol *"Setujui & Proses Pembayaran"* otomatis terkunci dan menampilkan peringatan jika saldo anggota ternyata berkurang / tidak mencukupi saat bendahara membuka modal.
5. **Aksi Penolakan Informatif**: Jika bendahara menolak, tersedia kolom input alasan penolakan yang langsung tersinkronisasi ke portal anggota.

---

## 5. Fitur Pengajuan Pinjaman Online Mandiri

Anggota dapat mengajukan kredit tanpa harus datang ke kantor koperasi:
1. Memilih produk pinjaman yang tersedia dan mengisi plafon yang dibutuhkan.
2. Memilih tenor bulan pinjaman dengan simulasi perkiraan angsuran per bulan secara instan.
3. Mengunggah foto dokumen agunan jaminan (BPKB / Sertifikat / Emas) dan mengisi surat pernyataan keperluan pinjaman.
4. Memantau status pengajuan secara bertingkat: `Menunggu Review` $\rightarrow$ `Disetujui` $\rightarrow$ `Dana Dicairkan` / `Ditolak`.

---

## 6. Riwayat Transaksi & E-Statement Anggota

- **Mutasi Simpanan**: Melihat seluruh histori setoran, penarikan, bunga, dan autodebet angsuran.
- **Kartu Pinjaman Digital**: Memantau progress tenor pinjaman (misal: angsuran ke-5 dari 12), sisa pokok pinjaman, dan tanggal jatuh tempo berikutnya.
- **E-Receipt**: Unduh bukti transaksi resmi dalam format digital untuk arsip pribadi anggota.

---

## 7. Dashboard Transparansi & Kesehatan Koperasi (KKPKK Kemenkop UKM)

Fitur transparansi publik yang memberikan visibilitas penuh kepada anggota mengenai kondisi kesehatan finansial dan tata kelola koperasi sesuai mandat Permenkop UKM No. 2 Tahun 2024:
- **Banner Transparansi Interaktif pada Beranda**:
  - Menampilkan badge predikat resmi Kemenkop UKM: 🟢 **SEHAT** (Skor 80-100), 🔵 **CUKUP SEHAT** (Skor 66-<80), 🟡 **DALAM PENGAWASAN** (Skor 51-<66), atau 🔴 **PENGAWASAN KHUSUS** (Skor <51).
  - Tampilan dinamis dengan gradien warna, icon proteksi, dan skor total.
  - Saat banner diklik, membuka lembar modal transparansi lengkap.
- **Rincian Evaluasi 4 Pilar KKPKK**:
  1. **Tata Kelola (Bobot 30%)**: Kepatuhan kelembagaan, legalitas NIK Koperasi, dan ketertiban penyelenggaraan RAT tahunan.
  2. **Profil Risiko (Bobot 15%)**: Manajemen risiko pembiayaan, rasio NPL (< 5%), dan kesiapan likuiditas kas.
  3. **Kinerja Keuangan (Bobot 40%)**: Rentabilitas aset (ROA), rentabilitas ekuitas (ROE), dan efisiensi operasional (BOPO < 90%).
  4. **Permodalan (Bobot 15%)**: Rasio kecukupan modal sendiri (Pokok, Wajib, Partisipatif, Cadangan) terhadap total aset koperasi.
- **Indikator Keterbukaan Publik**:
  - Total Anggota Aktif, Total Aset Koperasi, Modal Sendiri, Total Portofolio Simpanan & Pinjaman, Rasio NPL, Nomor Badan Hukum AHU, dan NIK Koperasi resmi.
- **Sinkronisasi Engine Terpadu**:
  - Menggunakan helper perhitungan terpusat `kesehatan_helper.php` sehingga nilai skor dan predikat antara Portal Anggota dan dashboard Administrator Backoffice selalu 100% identik secara real-time.

---

## 8. Pusat Bantuan, FAQ, dan Aspirasi / Pengaduan ke Dewan Pengawas

Saluran komunikasi dua arah dan pengawasan independen untuk menjaga integritas tata kelola koperasi:
- **Pusat Bantuan & Saluran Komunikasi Cepat**:
  - Tombol pintas chat WhatsApp langsung ke Customer Service/Kasir Koperasi dan nomor khusus Badan Pengawas Koperasi.
  - Jam operasional kantor kas dan alamat kantor pusat.
- **Accordion FAQ Interaktif**:
  - Tanya-jawab umum seputar cara pengajuan pinjaman online, tata cara autodebet sukarela, jadwal pencairan SHU tahunan, ketentuan penarikan tabungan, dan fungsi dewan pengawas.
- **Formulir Pengaduan / Aspirasi Anggota ke Dewan Pengawas**:
  - Kategori aspirasi: `pelayanan` (Layanan Staf/Kasir), `keuangan` (Klarifikasi Saldo/Transaksi), `pengawas` (Pelanggaran/Etika), dan `usulan` (Ide Pengembangan Usaha).
  - **Opsi Proteksi Anonimitas (*Whistleblower Protection*)**: Anggota dapat memilih opsi *"Kirim sebagai Anonim"* (`is_anonim = 1`) sehingga identitas nama dan nomor anggota dirahasiakan dari pihak pengurus.
  - **Penomoran Tiket Otomatis**: Format tiket unik `ASP-[YYMMDD]-[RAND]` (contoh: `ASP-261004-789`) yang langsung diterbitkan saat formulir disubmit.
  - **Riwayat & Pelacakan Tiket Real-Time**: Anggota dapat melacak progres tiket: `terkirim` (badge biru) $\rightarrow$ `ditinjau` (badge oranye) $\rightarrow$ `dijawab` (badge hijau), beserta teks tanggapan resmi dari Dewan Pengawas.
- **Manajemen Aspirasi Backoffice (`#/laporan-aspirasi`)**:
  - Halaman khusus Administrator dan Dewan Pengawas untuk meninjau tiket masuk, memfilter kategori, memberikan tanggapan/solusi resmi, dan mencatat jejak audit `logActivity`.

---

## 9. Ekosistem Retail / Toko Koperasi (`views/toko.html`)

Layanan belanja digital kebutuhan pokok dan produk usaha anggota:
- **Katalog Produk Koperasi**:
  - Daftar produk dengan gambar, deskripsi, satuan unit, dan indikator sisa stok riil.
  - Menampilkan **Harga Khusus Anggota** (`harga_anggota`) yang lebih hemat dibandingkan harga umum.
  - Filter kategori produk (*Sembako, Minuman, Makanan Ringan, ATK, dll.*) dan pencarian instan.
- **Keranjang Belanja (*Floating Cart Bar*)**:
  - Kontrol kuantitas barang (+ / -) dengan validasi batas stok maksimum secara instan.
  - Rangkuman total belanja dan item yang dipilih.
- **Metode Pembayaran Fleksibel**:
  1. **Autodebet Simpanan Sukarela (`sukarela`)**:
     - Sistem memvalidasi kecukupan saldo Simpanan Sukarela anggota secara real-time.
     - Jika saldo mencukupi, transaksi dieksekusi dalam database transaction: saldo Sukarela terpotong otomatis, stok berkurang, dan terbit nomor pesanan `ORD-[YYMMDD]-[RAND]`.
  2. **Bayar Tunai saat Ambil / COD (`tunai`)**:
     - Pembayaran diselesaikan langsung di gerai kasir saat anggota mengambil barang belanjaan di kantor koperasi.
- **Riwayat Pesanan Belanja**:
  - Daftar transaksi belanja anggota dilengkapi status pesanan (`pending`, `diproses`, `selesai`, `dibatalkan`) dan rincian produk yang dipesan.

---

## 10. Menu Cepat 8 Layanan & KTA Digital

- **Menu Cepat 8 Layanan (Home & Profil)**:
  - Grid akses navigasi 1-sentuhan:
    1. *Simpanan*: Rincian saldo & mutasi.
    2. *Pinjaman*: Jadwal cicilan & kartu pinjaman.
    3. *Tagihan*: Tagihan terdekat & bayar sukarela.
    4. *Toko*: Katalog belanja online koperasi.
    5. *Kesehatan*: Lembar transparansi kesehatan KKPKK.
    6. *Aspirasi*: Saluran aduan ke Dewan Pengawas.
    7. *KTA Digital*: Kartu tanda anggota resmi dengan QR Code.
    8. *Rekening Koran*: Unduh e-statement PDF.
- **KTA Digital (Kartu Tanda Anggota)**:
  - Kartu identitas anggota berdesain modern dengan foto profil, barcode / QR Code nomor keanggotaan unik, dan status aktif.
  - Mendukung penyesuaian foto avatar anggota langsung dari kamera / galeri HP.

---

## 11. Monitoring Log Portal Real-Time (`#/portal-logs`)

Menu pemantauan di sisi Administrator Backoffice untuk melacak keamanan dan adopsi aplikasi oleh anggota:
- **Metrik Real-Time**:
  - Jumlah login hari ini.
  - Jumlah anggota aktif berselancar saat ini (*active sessions*).
  - Total volume aktivitas (cek saldo, lihat mutasi, pengajuan bayar, belanja, kirim aspirasi).
  - Distribusi Platform: Komparasi Mobile Smartphone vs Desktop PC, breakdown OS (Android, iOS, Windows, macOS).
- **Log Rinci Jejak Akses**:
  - Waktu akses, Nama Anggota, Jenis Aktivitas, Browser (Chrome, Safari, Firefox), Alamat IP, dan Deteksi Lokasi Geografis (*City, Region, Country*).
  - Filter pencarian nama dan pagination data.

---

## 12. Spesifikasi Endpoint API Portal Anggota & Pengawas

| Method | Endpoint | Fungsi | Hak Akses |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/portal/login` | Login khusus anggota via portal PWA | Publik |
| `GET` | `/api/portal/summary` | Dashboard data saldo, pinjaman, dan tagihan terdekat | Anggota Login |
| `GET` | `/api/portal/tagihan-terdekat` | Mengambil data rincian angsuran yang harus dibayar | Anggota Login |
| `POST` | `/api/portal/bayar-angsuran-sukarela` | Submit permohonan autodebet angsuran via SS | Anggota Login |
| `GET` | `/api/portal/pinjaman` | Riwayat pinjaman & status pengajuan online | Anggota Login |
| `POST` | `/api/portal/pinjaman/ajukan` | Pengajuan pinjaman baru dari portal | Anggota Login |
| `GET` | `/api/portal/mutasi` | Riwayat transaksi tabungan anggota | Anggota Login |
| `GET` | `/api/portal/transparansi-kesehatan` | Mengambil skor KKPKK 4 pilar & indikator publik | Anggota Login |
| `GET` | `/api/portal/bantuan-info` | Informasi kontak CS, hotline Pengawas & FAQ | Anggota Login |
| `GET` | `/api/portal/aspirasi` | Riwayat tiket aspirasi milik anggota bersangkutan | Anggota Login |
| `POST` | `/api/portal/aspirasi` | Kirim aspirasi/pengaduan baru ke Dewan Pengawas | Anggota Login |
| `GET` | `/api/portal/retail-produk` | Katalog produk toko ritel & kategori produk aktif | Anggota Login |
| `POST` | `/api/portal/retail-order` | Checkout pesanan toko (autodebet SS / COD) | Anggota Login |
| `GET` | `/api/portal/retail-orders` | Riwayat status pesanan belanja toko anggota | Anggota Login |
| `GET` | `/api/angsuran/pengajuan` | Mengambil daftar pengajuan pending untuk bendahara | `angsuran.create` |
| `POST` | `/api/angsuran/pengajuan/approve`| Approval pemindahbukuan angsuran sukarela | `angsuran.create` |
| `POST` | `/api/angsuran/pengajuan/reject` | Tolak permohonan autodebet dengan alasan | `angsuran.create` |
| `GET` | `/api/aspirasi` | Daftar seluruh aspirasi anggota untuk Admin/Pengawas| `aspirasi.view` |
| `GET` | `/api/aspirasi/{id}` | Detail tiket aspirasi | `aspirasi.view` |
| `POST` | `/api/aspirasi/tanggapi/{id}`| Submit tanggapan resmi Dewan Pengawas atas tiket | `aspirasi.view` |
| `DELETE`| `/api/aspirasi/{id}` | Hapus tiket aspirasi | `superadmin` |
| `GET` | `/api/log/portal` | Mengambil data metrik dan riwayat `portal_logs` | `dashboard.view` |
