# Riwayat Perubahan Portal Anggota

Semua pembaruan fitur dan perbaikan pada aplikasi portal anggota didokumentasikan di sini.

---

## [2.0.5] - 2026-10-29

### Redesain Ikon & Logo Resmi Portal Anggota (Human-Crafted & Anti AI-Slop)

- **Ikon Aplikasi Baru Berwarna Putih Kehijauan**:
  - Menggantikan ikon AI-slop (gambar dompet kartun 3D, koin melayang, dan teks bahasa Inggris "KSP Credit Union Growth & Savings" dengan efek neon cyan).
  - Mengadopsi lambang resmi kelembagaan Koperasi Indonesia yang bersih, presisi, dan proporsional secara vektor murni:
    - **Perisai Pengayoman**: Menegaskan proteksi, integritas, dan keamanan simpan pinjam anggota.
    - **Pohon Beringin Geometris Modern**: Simbol pengayoman, kekeluargaan, dan keteguhan gerakan koperasi.
    - **Timbangan Keadilan**: Simbol transparansi, keadilan, dan asas saling percaya.
    - **Bintang Kejayaan**: Simbol ketuhanan, keluhuran budi, dan arah visi koperasi.
  - Skema warna ikon: **Putih Kehijauan** (*Luminous Mint-White*) di atas latar belakang gradien hijau zamrud koperasi (*deep emerald-teal*) yang elegan dan berwibawa.
- **Optimasi Aset & Standar Resolusi PWA**:
  - `portal/icons/icon.svg`: Sumber vektor master resolusi tak terbatas (lossless).
  - `portal/icons/icon-512.png` & `icon-192.png`: Format PNG teroptimasi resolusi tinggi dan tajam, menggantikan file AI sebelumnya yang berukuran 420 KB menjadi ringan (~25 KB) dan ramah memori.
  - Sinkronisasi favicon browser dan fallback logo portal pada splash screen dan form login agar otomatis menggunakan ikon resmi baru.
- **Service Worker Cache Update**:
  - Cache dinaikkan ke `v101` untuk memastikan browser dan perangkat PWA langsung memuat aset visual terbaru tanpa kendala cache lama.

## [2.0.4] - 2026-10-28

### Human-Crafted Login Experience & Perbaikan Visual Saldo Sukarela

- **Redesain Halaman Login (Human-Crafted & Anti AI-Slop)**:
  - Menghilangkan ornamen visual berlebihan (grid lines sci-fi, radial glow raksasa, slogan klise, dan kotak miring splash screen).
  - Menampilkan identitas logo resmi koperasi (`logo_url`) dengan wadah berbingkai kelembagaan yang bersih dan berwibawa.
  - Menambahkan tombol interaktif toggle lihat/sembunyikan kata sandi (_Show/Hide Password_) pada kolom input kata sandi.
  - Menambahkan tombol _Pusat Bantuan_ interaktif berbasis dialog SweetAlert2 yang memuat panduan nomor anggota dan format tanggal lahir (DDMMYYYY).
  - Mengaktifkan kembali pemilihan teks normal (`user-select: text`) agar anggota dapat menyalin nomor akun, no transaksi, dan rekening dengan nyaman.
- **Perbaikan Ikon Saldo Sukarela (Home Dashboard)**:
  - Memperbaiki class ikon yang sebelumnya menggunakan `bi-wallet-check` (tidak valid di Bootstrap Icons) menjadi `bi-wallet2` yang resmi dan valid.

## [2.0.3] - 2026-10-09

### Notifikasi Push Pembayaran Angsuran Pinjaman (Real-Time Struk Digital)

- **Web Push Pembayaran Angsuran Kredit**:
  - **Trigger Pembayaran Angsuran (Angsuran Diterima! ✅)**: Notifikasi push otomatis terkirim seketika saat anggota membayar angsuran di kasir (tunai/transfer) maupun disetujui via autodebet simpanan sukarela, mencantumkan angsuran ke-X, jenis pinjaman, nominal pembayaran, dan sisa pokok pinjaman terkini.
  - **Trigger Pelunasan Pinjaman (Pinjaman LUNAS! 🎉)**: Notifikasi push khusus dengan pesan selamat saat pembayaran angsuran berhasil melunasi pinjaman sepenuhnya.
  - **Pencatatan Log & Integrasi Menu Admin**: Terkoneksi langsung ke tabel `push_logs` dan modul pemantauan Web Push Notifikasi di panel admin.

## [2.0.2] - 2026-10-09

### Notifikasi Push Transaksi Simpanan (Setoran & Penarikan Real-Time)

- **Web Push Transaksi Finansial Simpanan**:
  - **Trigger Otomatis Setoran (Uang Masuk! 🪙)**: Notifikasi push terkirim secara instan ke perangkat anggota ketika kasir/teller menginput transaksi setoran simpanan (Pokok, Wajib, Sukarela, dll), mencantumkan jenis simpanan, nominal, dan saldo terkini (`saldo_sesudah`).
  - **Trigger Otomatis Penarikan (Penarikan Simpanan 💸)**: Notifikasi push real-time saat terjadi penarikan simpanan tunai, transfer, maupun pemotongan autodebet simpanan sukarela untuk pembayaran angsuran kredit.
  - **Trigger Koreksi / Reversal Administratif**: Memastikan mutasi pembalikan saldo simpanan akibat koreksi pembukuan tetap terkirim secara transparan ke anggota.
  - **Deep-Linking Tab Simpanan**: Mengetuk notifikasi push langsung mengarahkan dan membuka tab Simpanan (`/portal/#simpanan`) secara presisi dengan dukungan `hashchange` responsif.

## [2.0.0] - 2026-10-09

### Native Web Push Notifications (RFC 8291 / RFC 8292 VAPID)

- **Sistem Web Push Mandiri (100% Native PHP 8.3 & PWA)**:
  - **Enkripsi Kriptografi RFC 8291 (`aes128gcm`) & RFC 8292 (`ES256` VAPID)**: Menjalankan engine pengiriman web push langsung dari server PHP ke Google FCM & Apple APNs tanpa ketergantungan pihak ketiga.
  - **Tabel & Manajemen Subscription**: Mendaftarkan multi-device subscription anggota ke tabel database `push_subscriptions` dengan auto-eviction token kadaluarsa (404/410).
  - **Pemberitahuan Otomatis Pencairan Kredit**: Notifikasi push terkirim seketika saat pengurus/admin menyetujui & mencairkan pinjaman anggota.
  - **Pengingat Tagihan Otomatis (Cron Job H-3 & H-0)**: Menyediakan script `cron_push_reminders.php` untuk memicu notifikasi push pengingat jatuh tempo secara terjadwal setiap pagi.
  - **Pengaturan & Uji Coba di Profil Anggota**: Menambahkan toggle aktivasi push notification ramah pengguna serta tombol _"Tes Notifikasi"_ dengan feedback visual instan.

## [1.9.4] - 2026-10-09

### Clean & Focused Modern Home Experience (Decluttering)

- **Eliminasi Redundansi & Cognitive Overload**:
  - Merampingkan panjang gulir halaman Beranda (Home) hingga lebih dari 50% untuk menciptakan pengalaman _mobile banking_ yang bersih, lega, dan berkelas.
  - Menghilangkan duplikasi blok rincian di Beranda (_Komposisi Simpanan Detail_, _Daftar Pinjaman Berjalan_, dan _Neraca Personal_) yang sebelumnya menimbulkan pengulangan data karena informasi lengkapnya telah tersedia di Tab Simpanan, Tab Pinjaman, dan Tab Laporan.
  - Merestrukturisasi _Wallet Card_ menjadi kartu digital premium tanpa tombol-tombol kecil yang berdesakan, serta menambahkan pintasan sentuh intuitif (_touch-friendly_) ke Tab Simpanan dan Pinjaman.
  - Mempertahankan fokus utama beranda pada hal yang paling esensial bagi anggota: Ringkasan Saldo Simpanan, Tagihan Angsuran Terdekat (Billing Card), 8 Menu Layanan Koperasi, dan Feed Aktivitas Terakhir (Struk Digital).

## [1.9.3] - 2026-10-09

### Safari iOS & WebKit Date Compatibility Engine

- **Universal Multi-Format Date Parser (`parseDate`)**:
  - Memperbaiki isu tampilan `"Invalid Date"` dan `"NaN"` pada Safari iOS / WebKit (iPhone & iPad PWA mode).
  - WebKit menolak format MySQL datetime dengan pemisah spasi (`YYYY-MM-DD HH:mm:ss`), berbeda dengan V8 (Chrome/Android) yang lebih toleran.
  - Menambahkan parser cerdas berlapis dengan konversi otomatis ke standar ISO 8601 (`YYYY-MM-DDTHH:mm:ss`), fallback format slash (`YYYY/MM/DD`), serta ekstraksi komponen numerik tanggal manual.
  - Mengintegrasikan parser baru pada `fdate()`, `timeSince()`, badge kartu anggota digital, sinkronisasi waktu laporan keuangan, dan histori transaksi.

## [1.9.2] - 2026-10-09

### Client-Side Stale-While-Revalidate (SWR) Engine

- **Mesin Cache SWR Lokal Persisten (0ms Instant First-Render)**:
  - Menerapkan arsitektur caching Stale-While-Revalidate (SWR) di sisi klien (`localStorage`) dengan isolasi kunci spesifik per akun anggota (`kop_swr_${memberId}_${endpoint}`).
  - **Beranda Instan**: Saldo simpanan, status pinjaman, jadwal tagihan angsuran terdekat, banner transparansi, dan feed aktivitas tampil 0 milidetik seketika tanpa skeleton flicker saat aplikasi dibuka.
  - **Revalidasi Latar Belakang (Silent Background Sync)**: Permintaan jaringan ke server berjalan di latar belakang secara asinkron; saat respon tiba, cache lokal dan tampilan DOM diperbarui dengan mulus tanpa mengganggu fokus/interaksi pengguna.
  - **SWR Tab Simpanan & Pinjaman**: Tab Simpanan (`portal/saldo`) dan Pinjaman (`portal/pinjaman`) langsung merender data tersimpan saat diketuk; jika user sebelumnya telah memuat beranda, data saldo & pinjaman telah terisi di cache tanpa perlu request ulang.
  - **Offline Read-Only Resilience**: Data keuangan terakhir tetap dapat dibuka dan ditinjau oleh anggota secara aman saat koneksi internet terputus atau sinyal seluler drop, dilengkapi toast notifikasi "Mode Offline".
  - **Isolasi Keamanan & Auto-Eviction**: Seluruh cache SWR (`kop_swr_*`) dibersihkan secara otomatis saat anggota menekan "Keluar", saat sesi habis (401), maupun saat timeout idle 5 menit terpicu demi melindungi privasi data finansial anggota.

## [1.9.1] - 2026-10-09

### Performance & Speed Optimizations (Lightning Fast PWA)

- **Eliminasi Artificial Delay (Startup 10x Lebih Cepat)**:
  - Menghapus sleep delay buatan (`this.sleep(1000)`) pada inisialisasi awal dan mereduksi durasi transisi splash screen sehingga aplikasi terbuka seketika (_instant cold boot_ ~200-350ms).
- **Lazy-Loading Script Pihak Ketiga (Pangkas ~1 MB Render-Blocking Assets)**:
  - Menghapus pustaka eksternal berat (`html5-qrcode`, `qrcodejs`, `html2pdf`, dan `chart.js`) dari `<head>` `index.html`.
  - Script kini diunduh secara cerdas dan asinkronus (_on-demand_) hanya saat fitur terkait dipanggil (misal saat scan QR RAT, membalik kartu profil, atau mencetak PDF laporan).
  - Menghapus redundant CSS `@import` font di dalam style tag untuk mempercepat render typography.
- **Konsolidasi Endpoint API Beranda (Dashboard Summary)**:
  - Menghadirkan endpoint gabungan `portal/dashboard-summary` yang memproses 8 permintaan data beranda sekaligus dalam 1 siklus PHP/DB, memangkas roundtrip latensi jaringan secara signifikan.
- **Transisi Antar-Tab Instan (In-Memory View Caching & Stale-While-Revalidate)**:
  - Menyimpan snapshot view dan data di memori klien sehingga pergantian tab (Beranda, Simpanan, Pinjaman, dll.) terjadi seketika tanpa kedipan skeleton loading putih.
  - Mengaktifkan prefetching view HTML di latar belakang saat browser dalam kondisi idle.

## [1.9.0] - 2026-10-08

### Redesigned & Enhanced (Fintech-Grade Card Tagihan Angsuran)

- **Transformasi Kartu Tagihan Angsuran Beranda (Portal Home)**:
  - **Header & Identitas Pinjaman**: Menampilkan nomor kontrak resmi pinjaman berfont monospaced, jenis produk pinjaman, serta dua badge status sekaligus:
    1. _Kolektibilitas Standar Perbankan/Kemenkop_: **KOL 1 • Lancar** (hijau emerald) atau **KOL 2 • Perhatian Khusus** (merah rose jika melewati jatuh tempo).
    2. _Badge Urgensi Jatuh Tempo_: Penghitung mundur dinamis (_X Hari Lagi_, _Jatuh Tempo Hari Ini_, atau _Terlambat X Hari_ beranimasi halus).
  - **Bilah Progres Pelunasan Pinjaman (Tenor Progress Bar)**: Menampilkan visualisasi persentase tenor yang sudah berjalan (misal: _Angsuran ke-4 dari 12 bln • 33% Berjalan, 8 bln sisa_) dengan gradasi warna modern.
  - **Hero Financial Breakdown & Sisa Pokok Pinjaman**:
    - Nominal besar tebal tajam untuk Total Tagihan Bulan Ini.
    - Tanggal jatuh tempo lengkap.
    - **Total Sisa Pokok Pinjaman** (_Total saldo utang tersisa_) agar anggota mendapatkan gambaran menyeluruh terhadap sisa kewajiban mereka.
    - Pembagian rincian 3 pilar biaya (_Pokok_, _Jasa/Bunga_, dan _Denda_) dalam kisi kartu mikro yang bersih dan transparan.
  - **Integrasi Pintar Simpanan Sukarela & Autodebet**:
    - _Jika Saldo Sukarela Cukup_: Kartu hijau gradasi menampilkan estimasi sisa saldo setelah autodebet, serta tombol eksekusi 1-klik _"Bayar Angsuran via Simpanan Sukarela"_ dengan konfirmasi modal instan.
    - _Jika Saldo Sukarela Kurang_: Kartu peringatan transparan menampilkan nominal defisit (_Kurang Rp X untuk autodebet_) lengkap dengan tombol pintas _"Top Up Simpanan Sukarela"_ dan opsi pembayaran alternatif.
    - _Jika Sedang Diverifikasi_: Indikator status berjalan ketika pengajuan pembayaran sedang ditinjau bendahara koperasi.
  - **Redesain Kartu Selesai & Bebas Pinjaman**:
    - _Semua Angsuran Lunas_: Kartu perayaan rekam jejak kredit prima (KOL 1) dengan penawaran fasilitas pinjaman limit baru.
    - _Bebas Pinjaman_: Kartu promosi keanggotaan institusional dengan kalkulator simulasi pinjaman.
  - **Optimasi Kode**: Menghapus duplikasi kode mati pada skrip utama dan memperbarui _cache version_ PWA ke `v90`.

## [1.8.9] - 2026-10-08

### Added & Improved (Human Touch & Institusional Koperasi)

- **Langkah 1: Avatar Vektor Offline Lokal & Human Touch**:
  - Menggantikan ketergantungan placeholder eksternal `ui-avatars.com` dengan sistem avatar vektor SVG lokal dinamis (_offline first_) berseri gradasi squircle profesional yang disesuaikan secara otomatis dengan inisial nama anggota.
  - Mendukung tampilan foto profil asli anggota yang diunggah ke sistem.
  - Memperbarui narasi dan _copywriting_ kondisi kosong (_empty state_) pada tab Beranda, Simpanan, Pinjaman, dan Mutasi dengan bahasa kelembagaan koperasi yang hangat, komunikatif, dan manusiawi (bukan generic "No data").
- **Langkah 2: Status Operasional Layanan Kas & Legalitas Lembaga**:
  - Menambahkan bilah status operasional _real-time_ (`#h-operational-bar`) di Beranda yang mendeteksi jam kerja kas teller (_"🟢 Layanan Kas Buka (08.00 - 15.00 WIB)"_ / _"⚪ Kantor Kas Tutup"_), lengkap dengan tombol WhatsApp CS Bantuan Pengurus Koperasi.
  - Menambahkan Kartu Identitas Legalitas Koperasi pada tab Profil, menampilkan Nomor SK Badan Hukum Kemenkumham RI, nama Ketua Koperasi, jam operasional kas, alamat sekretariat resmi, dan tombol WhatsApp CS.
- **Langkah 3: Bukti Transaksi Digital Resmi (Receipt Voucher Slip)**:
  - Menghadirkan bottom sheet modal Bukti Transaksi Digital (`#modal-bukti-transaksi`) yang kini dapat diakses langsung dari berbagai titik interaksi:
    1. **Menu Cepat Beranda**: Tombol khusus _"Struk Digital"_ di baris menu Beranda.
    2. **Feed Aktivitas Terakhir**: Tombol _"Buka Struk"_ di header dan badge _"Struk"_ di setiap baris transaksi (serta tombol contoh struk saat riwayat kosong).
    3. **Buku Mutasi Simpanan**: Setiap baris mutasi memiliki tombol/klik slip struk resmi.
    4. **Jadwal Angsuran Pinjaman**: Setiap angsuran yang lunas memiliki tombol _"Lihat Bukti Bayar (Struk Resmi)"_.
    5. **Pesanan Toko**: Tombol _"Struk Belanja"_ pada detail pesanan toko ritel.
  - Dilengkapi nomor referensi unik, verifikasi sistem koperasi, tombol _"Kirim via WA"_ berstempel teks rapi, dan _"Cetak Slip"_ kasir.
  - Perbaikan _cache-busting_ PWA dan penomoran aset skrip agar pembaruan langsung tampil pada peramban anggota tanpa tertahan cache lama.

## [1.8.8] - 2026-10-08

### Improved

- **Peningkatan Ketajaman & Bobot Tipografi (Plus Jakarta Sans 300-900)**:
  - Melengkapi impor font Google Fonts dengan bobot tebal presisi `800` (Extra Bold) dan `900` (Black) agar angka saldo dan judul nominal tampil tebal alami tanpa distorsi _faux-bolding_.
  - Menambahkan optimasi _antialiasing_ (`-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale`, dan `text-rendering: optimizeLegibility`).
  - Mengaktifkan fitur angka sejajar (_tabular numbers_ `font-feature-settings: "tnum" 1, "cv11" 1`) untuk kerapian susunan nominal rupiah.

## [1.8.7] - 2026-10-08

### Fixed

- **Perbaikan Duplikasi Ikon pada Feed Aktivitas Terakhir**:
  - Memisahkan class pembungkus kotak background (`boxClass`) dengan nama glyph Bootstrap Icons (`iconName`), sehingga elemen kontainer luar tidak lagi ikut memicu pseudo-element `::before` ganda dan ikon tampil tunggal secara rapi.

## [1.8.6] - 2026-10-08

### Fixed

- **Perbaikan Jarak & Struktur Antar-Kartu pada Beranda (Portal Home)**:
  - Memperbaiki tag penutup `</div>` yang sempat hilang pada blok notifikasi angsuran jatuh tempo (`#h-notif-angsuran`).
  - Mengganti utilitas `space-y-*` menjadi `flex flex-col gap-5` pada kontainer utama beranda agar jarak antar-kartu (20px) konsisten, proporsional, dan tidak terganggu saat elemen tertentu berstatus `hidden`.

## [1.8.5] - 2026-10-08

### Added & Improved

- **Widget Musim RAT (RAT E-Voting & Quorum Countdown)**:
  - Menampilkan kartu interaktif otomatis pada Beranda saat terdapat sesi RAT aktif/persiapan.
  - Menampilkan status kuorum kehadiran _real-time_ (persentase & jumlah anggota hadir terhadap batas sah 50% UU Koperasi).
  - Status presensi anggota (tercatat / belum hadir) serta status hak suara e-voting (jumlah topik yang belum dipilih).
  - Tombol aksi cepat _"Buka RAT"_ untuk langsung menuju ruang musyawarah dan pemungutan suara online.
- **Feed Aktivitas Transaksi Terbaru (Recent Activity Passbook)**:
  - Menampilkan 5 riwayat transaksi terpadu lintas layanan (Setoran/Penarikan Simpanan, Angsuran Pinjaman, dan Belanja Toko Retail).
  - Dilengkapi ikon kategori visual, arah arus kas (+/-), tanggal, deskripsi kode transaksi, badge status, serta tautan menuju Buku Rekening lengkap.

## [1.8.4] - 2026-10-08

### Improved & Reordered

- **Optimalisasi & Reorganisasi Fungsional Beranda (Portal Home)**:
  - **Hierarki Aksi Prioritas Tinggi**: Memindahkan widget _Tagihan & Jadwal Angsuran Terdekat_ langsung di bawah kartu Saldo Simpanan (Wallet Card) sehingga anggota dapat langsung mengecek jatuh tempo dan membayar autodebet cicilan via simpanan sukarela tanpa harus menggulir jauh ke bawah.
  - **Aksi Cepat Saldo Terpadu**: Menambahkan tombol pintas interaktif (_+ Setor Simpanan_, _+ Ajukan Kredit_, _Belanja Toko_) langsung pada kartu Saldo Simpanan.
  - **Pembaruan 8 Menu Layanan Koperasi**: Merapikan Menu Cepat dengan memasukkan tombol penting _"Ajukan Kredit"_ dan menghilangkan duplikasi menu Kepatuhan yang sudah diwakili oleh Banner Transparansi Kesehatan Koperasi.
  - **Penataan Rapi Portofolio**: Mengelompokkan Neraca Personal, Komposisi Simpanan, dan Daftar Pinjaman Berjalan dengan tipografi dan visual kartu yang lebih terstruktur dan elegan.

## [1.8.3] - 2026-10-08

### Fixed & Improved

- **Detail Rincian Belanja pada Pesanan Saya & Spasi Toko Koperasi**:
  - Menambahkan modal bottom sheet detail belanja pada tab "Pesanan Saya" (thumbnail, rincian barang, jumlah, satuan, subtotal, dan status pesanan).
  - Menambahkan jarak vertikal yang lebih proporsional antara header kartu Saldo Sukarela dan tab navigasi Katalog Produk / Pesanan Saya.

## [1.8.2] - 2026-10-06

### Fixed & Improved

- **Perbaikan Tombol Beli & Keranjang Toko Koperasi di Server Produksi**:
  - Memperbaiki kegagalan perbandingan ID produk (`strict type comparison mismatch` antara string PDO database dan number JavaScript) yang menyebabkan tombol "Beli" tidak merespons di lingkungan server produksi.
  - Menambahkan _type casting_ integer/float secara eksplisit pada endpoint `/api/portal/retail-produk`.
  - Menambahkan validasi dan notifikasi batas sisa stok serta indikator visual _"Stok Habis"_.

## [1.8.1] - 2026-10-04

### Fixed & Improved

- **Sinkronisasi 100% Predikat & Skor Kesehatan Koperasi (KKPKK)**:
  - Menyatukan engine perhitungan kesehatan koperasi antara **Role Admin** ([KesehatanController.php](file:///d:/laragon/www/app-koperasi/api/controllers/KesehatanController.php)) dan **Portal Anggota** ([PortalController.php](file:///d:/laragon/www/app-koperasi/api/controllers/PortalController.php)) melalui shared helper [kesehatan_helper.php](file:///d:/laragon/www/app-koperasi/api/config/kesehatan_helper.php).
  - Memastikan nilai skor akhir (0-100), 4 aspek KKPKK (Tata Kelola 30%, Profil Risiko 15%, Kinerja 40%, Permodalan 15%), dan predikat resmi Kemenkop UKM (_Sehat_, _Cukup Sehat_, _Dalam Pengawasan_, atau _Dalam Pengawasan Khusus_) tampil persis sama secara real-time.
  - Banner transparansi pada Beranda kini dinamis menyesuaikan warna, ikon, dan label predikat resmi koperasi.

## [1.8.0] - 2026-10-04

### Added

- **Dashboard Transparansi & Kepatuhan Kemenkop UKM**:
  - Evaluasi 4 pilar kesehatan resmi sesuai Permenkop UKM No. 2 Tahun 2024 (Tata Kelola, Profil Risiko, Kinerja Keuangan, dan Permodalan).
  - Indikator keterbukaan publik (Total Aset, Modal Sendiri, Kas Likuid, Pertumbuhan Anggota, Rasio NPL, dan NIK Koperasi).
  - Banner transparansi interaktif pada halaman Beranda dengan badge skor kesehatan resmi.
- **Pusat Bantuan, Aspirasi & Kontak Pengawas**:
  - Akses langsung kontak pengurus/kasir & Dewan Pengawas independen via WhatsApp.
  - FAQ interaktif menjawab pertanyaan umum seputar simpanan, pinjaman, autodebet sukarela, dan SHU.
  - Formulir Surat Aspirasi & Pengaduan ke Dewan Pengawas dengan opsi identitas atau proteksi anonimitas anggota.
  - Riwayat pelacakan tiket aspirasi anggota.
- **Ekosistem Retail / Toko Koperasi**:
  - Katalog belanja online produk kebutuhan pokok & binaan koperasi dengan harga khusus anggota.
  - Fitur keranjang belanja (Floating Cart Bar) dan filter kategori produk.
  - Pembayaran fleksibel: Autodebet saldo Simpanan Sukarela atau bayar tunai saat ambil di kantor (Pick-up/COD).
  - Riwayat pesanan belanja real-time.
- **Menu Cepat 8 Layanan (Home & Profil)**: Integrasi akses cepat ke KTA Digital, Toko, Kepatuhan, dan Aspirasi.

## [1.7.1] - 2026-10-04

### Fixed

- **Session Expiry False-Positive**: Memperbaiki validasi sesi di `portal.js` agar error status 500 tidak disalahartikan sebagai sesi habis.
- **Service Worker API Caching**: Memperbaiki `sw.js` agar hanya menyimpan response API berstatus 200 GET, mencegah error caching pada request POST login dan caching error 500/401.

## [1.7.0] - 2026-09-21

### Added

- **Widget Tagihan & Jadwal Angsuran Terdekat (Billing Card)**:
  - Menggantikan widget estimasi SHU tahunan di beranda dengan kartu ringkasan tagihan angsuran terdekat yang belum lunas.
  - Menampilkan informasi nomor pinjaman, tenor, angsuran ke-X, total nominal tagihan (mendukung masking privacy mode), serta rincian pokok, bunga, dan denda.
  - Status badge tenggat dinamis: _Terlambat X Hari_ (merah), _Jatuh Tempo Hari Ini!_ (amber/pulse), atau _X Hari Lagi_ (biru).
  - **Quick Payment via Simpanan Sukarela**: Tombol aksi langsung dari beranda untuk mengajukan pembayaran angsuran autodebet jika saldo mencukupi.
  - Indikator status _Menunggu ACC Bendahara_ dan kartu apresiasi jika semua pinjaman telah lunas.
- **Pengajuan Pembayaran Angsuran via Simpanan Sukarela pada Tab Pinjaman**:
  - Tombol "Bayar via Sukarela" pada daftar angsuran yang belum lunas di tab pinjaman.
  - Validasi saldo real-time dan notifikasi konfirmasi SweetAlert interaktif.

## [1.6.2] - 2026-05-06

### Added

- **Dynamic Branding**:
  - **Header Rekening Koran**: Header cetak mutasi dan laporan kini menggunakan nama aplikasi yang dikonfigurasi di menu pengaturan.
  - **Logo & Identity**: Integrasi logo instansi/koperasi pada header PDF secara otomatis untuk identitas laporan yang lebih profesional.

## [1.6.1] - 2026-05-05

### Added

- **Native Experience Engine**:
  - **Skeleton Shimmer**: Pemuatan data visual yang lebih halus menggantikan loading spinner konvensional.
  - **Haptic Feedback**: Getaran taktil pada navigasi untuk respon aplikasi yang lebih hidup.
  - **Native Interactions**: Proteksi seleksi teks dan optimasi safe-area untuk perangkat layar penuh (Notch).
- **Hardened Security**: Sesi logout otomatis di sisi server (Idle Monitor) dan validasi visibilitas real-time.

### Fixed

- **Header Lock**: Memastikan header (Nama & No Anggota) tetap terkunci di atas (fixed) dan tidak terpengaruh oleh tarikan scroll atau transisi tab.
- **Data PDF Precision**: Sinkronisasi kolom Pokok & Bunga pada rincian pinjaman serta perbaikan filter periode cetak.

## [1.4.4] - 2026-05-04

### Improvements

- **UI Fix:** Memperbaiki tampilan ikon Privacy Toggle yang sebelumnya tidak muncul karena kesalahan sintaksis pada template HTML.
- **Optimization:** Sinkronisasi status ikon privasi secara real-time saat berpindah tab.
