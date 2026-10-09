# Riwayat Perubahan Portal Anggota

Semua pembaruan fitur dan perbaikan pada aplikasi portal anggota didokumentasikan di sini.

---

## [1.9.1] - 2026-10-09
### Performance & Speed Optimizations (Lightning Fast PWA)
- **Eliminasi Artificial Delay (Startup 10x Lebih Cepat)**:
    - Menghapus sleep delay buatan (`this.sleep(1000)`) pada inisialisasi awal dan mereduksi durasi transisi splash screen sehingga aplikasi terbuka seketika (*instant cold boot* ~200-350ms).
- **Lazy-Loading Script Pihak Ketiga (Pangkas ~1 MB Render-Blocking Assets)**:
    - Menghapus pustaka eksternal berat (`html5-qrcode`, `qrcodejs`, `html2pdf`, dan `chart.js`) dari `<head>` `index.html`.
    - Script kini diunduh secara cerdas dan asinkronus (*on-demand*) hanya saat fitur terkait dipanggil (misal saat scan QR RAT, membalik kartu profil, atau mencetak PDF laporan).
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
        1. *Kolektibilitas Standar Perbankan/Kemenkop*: **KOL 1 • Lancar** (hijau emerald) atau **KOL 2 • Perhatian Khusus** (merah rose jika melewati jatuh tempo).
        2. *Badge Urgensi Jatuh Tempo*: Penghitung mundur dinamis (*X Hari Lagi*, *Jatuh Tempo Hari Ini*, atau *Terlambat X Hari* beranimasi halus).
    - **Bilah Progres Pelunasan Pinjaman (Tenor Progress Bar)**: Menampilkan visualisasi persentase tenor yang sudah berjalan (misal: *Angsuran ke-4 dari 12 bln • 33% Berjalan, 8 bln sisa*) dengan gradasi warna modern.
    - **Hero Financial Breakdown & Sisa Pokok Pinjaman**:
        - Nominal besar tebal tajam untuk Total Tagihan Bulan Ini.
        - Tanggal jatuh tempo lengkap.
        - **Total Sisa Pokok Pinjaman** (*Total saldo utang tersisa*) agar anggota mendapatkan gambaran menyeluruh terhadap sisa kewajiban mereka.
        - Pembagian rincian 3 pilar biaya (*Pokok*, *Jasa/Bunga*, dan *Denda*) dalam kisi kartu mikro yang bersih dan transparan.
    - **Integrasi Pintar Simpanan Sukarela & Autodebet**:
        - *Jika Saldo Sukarela Cukup*: Kartu hijau gradasi menampilkan estimasi sisa saldo setelah autodebet, serta tombol eksekusi 1-klik *"Bayar Angsuran via Simpanan Sukarela"* dengan konfirmasi modal instan.
        - *Jika Saldo Sukarela Kurang*: Kartu peringatan transparan menampilkan nominal defisit (*Kurang Rp X untuk autodebet*) lengkap dengan tombol pintas *"Top Up Simpanan Sukarela"* dan opsi pembayaran alternatif.
        - *Jika Sedang Diverifikasi*: Indikator status berjalan ketika pengajuan pembayaran sedang ditinjau bendahara koperasi.
    - **Redesain Kartu Selesai & Bebas Pinjaman**:
        - *Semua Angsuran Lunas*: Kartu perayaan rekam jejak kredit prima (KOL 1) dengan penawaran fasilitas pinjaman limit baru.
        - *Bebas Pinjaman*: Kartu promosi keanggotaan institusional dengan kalkulator simulasi pinjaman.
    - **Optimasi Kode**: Menghapus duplikasi kode mati pada skrip utama dan memperbarui *cache version* PWA ke `v90`.

## [1.8.9] - 2026-10-08
### Added & Improved (Human Touch & Institusional Koperasi)
- **Langkah 1: Avatar Vektor Offline Lokal & Human Touch**:
    - Menggantikan ketergantungan placeholder eksternal `ui-avatars.com` dengan sistem avatar vektor SVG lokal dinamis (*offline first*) berseri gradasi squircle profesional yang disesuaikan secara otomatis dengan inisial nama anggota.
    - Mendukung tampilan foto profil asli anggota yang diunggah ke sistem.
    - Memperbarui narasi dan *copywriting* kondisi kosong (*empty state*) pada tab Beranda, Simpanan, Pinjaman, dan Mutasi dengan bahasa kelembagaan koperasi yang hangat, komunikatif, dan manusiawi (bukan generic "No data").
- **Langkah 2: Status Operasional Layanan Kas & Legalitas Lembaga**:
    - Menambahkan bilah status operasional *real-time* (`#h-operational-bar`) di Beranda yang mendeteksi jam kerja kas teller (*"🟢 Layanan Kas Buka (08.00 - 15.00 WIB)"* / *"⚪ Kantor Kas Tutup"*), lengkap dengan tombol WhatsApp CS Bantuan Pengurus Koperasi.
    - Menambahkan Kartu Identitas Legalitas Koperasi pada tab Profil, menampilkan Nomor SK Badan Hukum Kemenkumham RI, nama Ketua Koperasi, jam operasional kas, alamat sekretariat resmi, dan tombol WhatsApp CS.
- **Langkah 3: Bukti Transaksi Digital Resmi (Receipt Voucher Slip)**:
    - Menghadirkan bottom sheet modal Bukti Transaksi Digital (`#modal-bukti-transaksi`) yang kini dapat diakses langsung dari berbagai titik interaksi:
        1. **Menu Cepat Beranda**: Tombol khusus *"Struk Digital"* di baris menu Beranda.
        2. **Feed Aktivitas Terakhir**: Tombol *"Buka Struk"* di header dan badge *"Struk"* di setiap baris transaksi (serta tombol contoh struk saat riwayat kosong).
        3. **Buku Mutasi Simpanan**: Setiap baris mutasi memiliki tombol/klik slip struk resmi.
        4. **Jadwal Angsuran Pinjaman**: Setiap angsuran yang lunas memiliki tombol *"Lihat Bukti Bayar (Struk Resmi)"*.
        5. **Pesanan Toko**: Tombol *"Struk Belanja"* pada detail pesanan toko ritel.
    - Dilengkapi nomor referensi unik, verifikasi sistem koperasi, tombol *"Kirim via WA"* berstempel teks rapi, dan *"Cetak Slip"* kasir.
    - Perbaikan *cache-busting* PWA dan penomoran aset skrip agar pembaruan langsung tampil pada peramban anggota tanpa tertahan cache lama.

## [1.8.8] - 2026-10-08
### Improved
- **Peningkatan Ketajaman & Bobot Tipografi (Plus Jakarta Sans 300-900)**:
    - Melengkapi impor font Google Fonts dengan bobot tebal presisi `800` (Extra Bold) dan `900` (Black) agar angka saldo dan judul nominal tampil tebal alami tanpa distorsi *faux-bolding*.
    - Menambahkan optimasi *antialiasing* (`-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale`, dan `text-rendering: optimizeLegibility`).
    - Mengaktifkan fitur angka sejajar (*tabular numbers* `font-feature-settings: "tnum" 1, "cv11" 1`) untuk kerapian susunan nominal rupiah.

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
    - Menampilkan status kuorum kehadiran *real-time* (persentase & jumlah anggota hadir terhadap batas sah 50% UU Koperasi).
    - Status presensi anggota (tercatat / belum hadir) serta status hak suara e-voting (jumlah topik yang belum dipilih).
    - Tombol aksi cepat *"Buka RAT"* untuk langsung menuju ruang musyawarah dan pemungutan suara online.
- **Feed Aktivitas Transaksi Terbaru (Recent Activity Passbook)**:
    - Menampilkan 5 riwayat transaksi terpadu lintas layanan (Setoran/Penarikan Simpanan, Angsuran Pinjaman, dan Belanja Toko Retail).
    - Dilengkapi ikon kategori visual, arah arus kas (+/-), tanggal, deskripsi kode transaksi, badge status, serta tautan menuju Buku Rekening lengkap.

## [1.8.4] - 2026-10-08
### Improved & Reordered
- **Optimalisasi & Reorganisasi Fungsional Beranda (Portal Home)**:
    - **Hierarki Aksi Prioritas Tinggi**: Memindahkan widget *Tagihan & Jadwal Angsuran Terdekat* langsung di bawah kartu Saldo Simpanan (Wallet Card) sehingga anggota dapat langsung mengecek jatuh tempo dan membayar autodebet cicilan via simpanan sukarela tanpa harus menggulir jauh ke bawah.
    - **Aksi Cepat Saldo Terpadu**: Menambahkan tombol pintas interaktif (*+ Setor Simpanan*, *+ Ajukan Kredit*, *Belanja Toko*) langsung pada kartu Saldo Simpanan.
    - **Pembaruan 8 Menu Layanan Koperasi**: Merapikan Menu Cepat dengan memasukkan tombol penting *"Ajukan Kredit"* dan menghilangkan duplikasi menu Kepatuhan yang sudah diwakili oleh Banner Transparansi Kesehatan Koperasi.
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
    - Menambahkan *type casting* integer/float secara eksplisit pada endpoint `/api/portal/retail-produk`.
    - Menambahkan validasi dan notifikasi batas sisa stok serta indikator visual *"Stok Habis"*.

## [1.8.1] - 2026-10-04
### Fixed & Improved
- **Sinkronisasi 100% Predikat & Skor Kesehatan Koperasi (KKPKK)**:
    - Menyatukan engine perhitungan kesehatan koperasi antara **Role Admin** ([KesehatanController.php](file:///d:/laragon/www/app-koperasi/api/controllers/KesehatanController.php)) dan **Portal Anggota** ([PortalController.php](file:///d:/laragon/www/app-koperasi/api/controllers/PortalController.php)) melalui shared helper [kesehatan_helper.php](file:///d:/laragon/www/app-koperasi/api/config/kesehatan_helper.php).
    - Memastikan nilai skor akhir (0-100), 4 aspek KKPKK (Tata Kelola 30%, Profil Risiko 15%, Kinerja 40%, Permodalan 15%), dan predikat resmi Kemenkop UKM (*Sehat*, *Cukup Sehat*, *Dalam Pengawasan*, atau *Dalam Pengawasan Khusus*) tampil persis sama secara real-time.
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
    - Status badge tenggat dinamis: *Terlambat X Hari* (merah), *Jatuh Tempo Hari Ini!* (amber/pulse), atau *X Hari Lagi* (biru).
    - **Quick Payment via Simpanan Sukarela**: Tombol aksi langsung dari beranda untuk mengajukan pembayaran angsuran autodebet jika saldo mencukupi.
    - Indikator status *Menunggu ACC Bendahara* dan kartu apresiasi jika semua pinjaman telah lunas.
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

---

## [1.4.3] - 2026-05-04

## [1.4.2] - 2026-05-04

## [1.4.1] - 2026-05-04

## [1.4.0] - 2026-04-30

---
## [1.3.9] - 2026-04-27
### UI/UX
- Desain ulang kartu simulasi pinjaman agar lebih menarik dan profesional.
- Penambahan detail rincian Total Bunga dan Total Pengembalian pada simulasi portal.

---

## [1.3.8] - 2026-04-27
### Fixed
- Perbaikan error "401 Unauthorized" pada konsol saat inisialisasi awal.
- Perbaikan bug "400 Bad Request" pada pengajuan pinjaman (fix double-stringification).
- Peningkatan stabilitas transaksi di backend dengan database transaction.

---

## [1.3.7] - 2026-04-27
### Layout Optimization
Perbaikan tata letak halaman untuk menghilangkan ruang kosong berlebih di bagian bawah.
- Penghapusan padding redundan pada tab Simpanan dan Pinjaman.
- Standarisasi jarak aman navigasi bawah melalui kontainer utama.

---

## [1.3.6] - 2026-04-27

---

## [1.3.3] - 2026-04-25
### Update Mechanism Refinement
Peningkatan pengalaman pengguna saat proses pembaruan aplikasi.
- Penambahan jeda visual (sleep) pada splash screen untuk transisi yang lebih premium.
- Tampilan nomor versi real-time pada splash screen saat pengecekan update.
- Status "System up to date" yang lebih jelas bagi pengguna.

---

## [1.3.1] - 2026-04-24

---

## [1.3.0] - 2026-04-24
### UI/UX Milestone Release
Pembaruan besar pada antarmuka dan pengalaman pengguna portal.
- Integrasi link official produk CRUDWorks pada menu Tentang Aplikasi.
- Implementasi sistem Kontras Terbalik pada ID Card untuk visibilitas maksimal.
- Overhaul sistem Riwayat Perubahan dengan layout Timeline modern.
- Peningkatan stabilitas dark mode dan persistensi preferensi pengguna.

---

## [1.2.9] - 2026-04-24
### Modern Timeline Changelog
Perombakan total tampilan riwayat perubahan aplikasi.
- Desain 'Timeline' yang lebih modern dan informatif.
- Dukungan tampilan multi-baris dan bullet-points untuk detail update.
- Layout yang sepenuhnya mendukung mode gelap (dark mode).
- Animasi interaksi yang lebih halus pada setiap node timeline.

---

## [1.2.8] - 2026-04-24
### Kontras Tinggi ID Card
Implementasi desain kartu dengan kontras dinamis untuk visibilitas maksimal.
- Tema 'White Ceramic' aktif otomatis saat Portal dalam Mode Gelap.
- Tema 'Obsidian Gold' aktif otomatis saat Portal dalam Mode Terang.
- Efek glassmorphism yang lebih halus pada transisi tema.

---

## [1.2.7] - 2026-04-24
### ID Card Adaptif & Premium
Pembaruan estetika Kartu Anggota Digital dengan dua varian tema premium.
- Penambahan varian 'White Ceramic' untuk kesan bersih dan minimalis.
- Optimasi gradasi mesh pada varian 'Obsidian Gold'.
- Perbaikan layout elemen pada bagian depan kartu (Front Side).

---

## [1.2.6] - 2026-04-24
### Stabilitas & Persistensi
Peningkatan sistem pengaturan tema dan performa aplikasi.
- Implementasi penyimpanan preferensi tema di LocalStorage.
- Penambahan blocking script untuk mencegah 'white flash' saat load.
- Sinkronisasi otomatis tombol switch tema dengan status aplikasi.

---

## [1.2.5] - 2026-04-24
### Refinement Menu Profil
Penyempurnaan elemen antarmuka pada halaman profil anggota.
- Header profil kini mendukung dark mode secara penuh.
- Perbaikan border-radius dan shadow pada menu fungsional.
- Navigasi kembali ke home yang lebih responsif.

---

## [1.2.4] - 2026-04-24
### Immersive Dark Mode
Transformasi antarmuka portal menjadi sepenuhnya mendukung tema gelap.
- Penerapan palet warna 'Obsidian 950' sebagai latar belakang utama.
- Update tampilan halaman login agar sesuai dengan tema aplikasi.
- Penyesuaian elemen dekoratif agar tetap nyaman di mata.

---

## [1.2.3] - 2026-04-24
### Perbaikan Parser Changelog
Optimasi sistem pembacaan file riwayat perubahan.
- Regex parser yang lebih robust terhadap variasi baris baru (CRLF/LF).
- Dukungan untuk tampilan riwayat yang lebih panjang.
- Perbaikan sinkronisasi versi antara server dan client.
