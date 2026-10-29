# Catatan Riwayat Versi & Pembaruan Aplikasi (Changelog)

Halaman ini mendokumentasikan seluruh riwayat pembaruan, penambahan fitur baru, peningkatan kenyamanan, dan perbaikan pada Aplikasi Koperasi Simpan Pinjam. 

Dokumentasi disajikan dalam bahasa operasional yang mudah dipahami oleh seluruh pengurus, staf administrasi, bendahara, pengawas, dan anggota koperasi.

---

## [v3.2.0] - 2026-10-29

### 📊 Tampilan Grid & Tabel Akuntansi Komprehensif
- **Pilihan Gaya Garis & Sekat Kisi Tabel (Grid Styles)**:
  - **Belang Zebra (Zebra Striping)**: Latar belakang baris selang-seling abu-abu lembut (`#f8fafc`) dengan efek sorot aksen hijau emerald saat kursor melintas, mencegah mata lelah atau salah membaca data saat menganalisis ribuan baris transaksi.
  - **Kisi Kotak Akuntansi Penuh (Bordered / Excel Spreadsheet Style)**: Seluruh sel `th` dan `td` dilengkapi garis pembatas vertikal dan horizontal tegas (`1px solid #cbd5e1` dan `#e2e8f0`) layaknya lembar kerja Excel atau buku kas fisik, memberikan batas kolom debit/kredit/saldo yang sangat jelas bagi akuntan.
  - **Minimalis Bersih (Clean Hairline)**: Garis horizontal ultra-tipis tanpa sekat vertikal untuk pengguna yang menyukai tampilan modern, bersih, dan lapang.
- **Format Tanggal Transaksi & Akuntansi Dinamis**:
  - Pilihan 4 format tanggal global: **Standar Indonesia (`DD/MM/YYYY`)**, **Standar ISO Sistem (`YYYY-MM-DD`)**, **Nama Bulan Singkat (`DD MMM YYYY`)**, dan **Formal Indonesia (`DD MMMM YYYY`)**.
  - Fungsi global `App.formatDate()` seketika memperbarui tampilan tanggal di seluruh tabel transaksi, buku besar, jurnal, mutasi, dan kartu angsuran.
- **Pratinjau Langsung Mini Buku Kas & Jurnal (Live Accounting Table Preview)**:
  - Disediakan simulasi tabel pembukuan kas nyata (Tanggal, No. Bukti, Uraian, Debit, Kredit, Saldo) langsung di dalam modal preferensi yang secara *realtime* memperlihatkan perubahan gaya kisi, kerapatan, format tanggal, dan pemisah angka saat dipilih.

### 🎛️ Pusat Preferensi & Kustomisasi Tampilan Lengkap
- **Modal Preferensi Terpadu (`#preferences-modal`)**:
  - Disediakan dialog preferensi komprehensif yang dapat diakses langsung dari tombol switcher tata letak navigasi, tray taskbar (ikon equalizer `ri-equalizer-line`), serta footer Start Menu.
  - **Format Pemisah Angka & Mata Uang**:
    - Pengguna dapat memilih gaya pemisah angka: **Indonesia/Eropa (`1.250.000,00` - Titik ribuan, Koma desimal)** atau **Internasional/US (`1,250,000.00` - Koma ribuan, Titik desimal)**.
    - Format terintegrasi secara menyeluruh pada fungsi formatting global `App.formatRupiah` dan `App.formatNumber`.
  - **Presisi Angka di Belakang Koma (Desimal)**:
    - Opsi tanpa desimal (`0 digit`, contoh: `Rp 1.250.000`) untuk pembacaan nominal yang ringkas dan bersih.
    - Opsi 2 desimal (`2 digit`, contoh: `Rp 1.250.000,00`) untuk keperluan pembukuan akuntansi presisi tinggi.
  - **Prefiks Simbol Mata Uang**:
    - Pilihan menampilkan simbol `Rp ` atau hanya angka murni sesuai preferensi pelaporan.
  - **Kepadatan Tabel Data (Table Density)**:
    - Mode **Padat (Compact)**: Spasi baris lebih rapat (`py-1.5 px-3`) untuk memuat lebih banyak baris data dalam satu layar bagi staf kasir & akuntan.
    - Mode **Nyaman (Comfortable)**: Spasi baris standar yang lega dan nyaman di mata (`py-3.5 px-4`).
  - **Skala Ukuran Huruf (Font Size Customization)**:
    - Tersedia 4 tingkat ukuran tipografi adaptif: **Kecil (13px)**, **Standar (14px)**, **Besar (15px)**, dan **Ekstra Besar (16px)** yang langsung mengubah skala `rem` dan `root font-size` secara responsif.
  - **Palet Tema Warna Aplikasi**:
    - Pilihan 8 warna aksen tema modern: Hijau Emerald, Biru Indigo, Biru Laut, Cyan Tropis, Violet Elegan, Oranye Hangat, Mawar Rose, dan Abu-Abu Slate.
  - **Kotak Pratinjau Langsung (Live Preview Box)**:
    - Menyajikan contoh tampilan angka, lencana status, dan contoh baris tabel secara instan saat preferensi diubah sebelum disimpan.
  - **Tombol Reset Bawaan Sistem**:
    - Memulihkan seluruh konfigurasi tampilan dan format angka kembali ke setelan default pabrik dengan satu klik.

### 🪟 Taskbar Windows yang Bersih: Tab Aplikasi yang Terbuka Saja
- **Pembersihan Bilah Menu Meniru Windows Taskbar Asli**:
  - Taskbar Windows (bawah & atas) kini tidak lagi menumpuk seluruh 18 tombol kategori menu di samping kolom "Cari menu...".
  - Di samping kolom pencarian, taskbar kini **hanya menampilkan tab/halaman yang pernah dibuka atau sedang aktif** selama sesi berjalan (`openedWindowsTabs`).
  - Setiap tab dilengkapi ikon modul, judul halaman, indikator aktif hijau emerald, dan tombol tutup silang `(x)` pada saat di-hover untuk menutup tab tersebut.
  - Menu Beranda/Dashboard selalu hadir sebagai tab utama.
  - Seluruh katalog menu dan submenu lengkap tetap dapat diakses dengan cepat dan rapi melalui tombol **Mulai (Start Menu)**.

---

## [v3.1.0] - 2026-10-29

### 🪟 Preferensi Tata Letak Navigasi Multi-Mode (Sidebar, Taskbar Bawah & Bilah Atas)
- **Tiga Pilihan Tata Letak Navigasi Fleksibel**:
  - **Sidebar Kiri (Default)**: Tata letak klasik dengan sidebar vertikal di sebelah kiri, lengkap dengan fitur lipat ramping (*compact mode*), kategori menu yang dapat diciutkan (*collapsible sections*), dan pin menu favorit.
  - **Taskbar Bawah (Windows 11 Desktop Style)**: Bilah navigasi horizontal mengambang dengan efek *glassmorphism backdrop blur* di bagian bawah layar. Dilengkapi tombol **Mulai (Start Menu)** berlogo koperasi, pencarian cepat (Ctrl+K), tombol modul tersemat, jam digital real-time, tray notifikasi pengajuan, dan profil pengguna.
  - **Bilah Atas (Top Taskbar)**: Bilah navigasi horizontal yang dipasang di bagian paling atas layar bagi pengguna yang menyukai tata letak desktop klasik atau layar ultra-wide.
- **Penyimpanan Preferensi Otomatis**:
  - Pilihan tata letak tersimpan di localStorage per pengguna (pp_nav_layout), sehingga posisi navigasi yang dipilih tetap konsisten dan aktif saat halaman dimuat ulang atau login berikutnya.
- **Pengalih Tata Letak Interaktif (Layout Picker)**:
  - Tersedia tombol cepat dengan ikon kisi/grid di topbar dan tray taskbar untuk beralih tata letak kapan saja dengan konfirmasi toast informatif.

### 📂 Menu Flyout Submenu Lengkap pada Mode Taskbar
- **Akses Submenu Seluruh Modul Tanpa Pembatasan**:
  - Pada mode taskbar Windows (bawah/atas), setiap tombol menu kelompok (seperti Anggota, Simpanan, Pinjaman, Akuntansi, Laporan, Pengaturan) kini dilengkapi indikator panah chevron (▲) yang memunculkan panel flyout submenu saat diklik.
  - Submenu menyajikan seluruh struktur modul dan sub-kategori secara terorganisir persis seperti pada menu sidebar, termasuk pengelompokan (*group labels*) dan lencana notifikasi pending (*pending badges*).
  - Tautan menu yang aktif ditandai dengan aksen hijau emerald dan garis penunjuk vertikal.
- **Start Menu Pop-up dengan Pencarian Dinamis**:
  - Start Menu bergaya Windows pop-up dilengkapi grid aplikasi tersemat (*pinned apps*) dengan palet warna khas, daftar menu berkategori dengan scroll halus, serta kolom pencarian langsung untuk menemukan modul atau transaksi dengan cepat.
  - Panel flyout dan start menu otomatis menutup saat pengguna mengklik di luar area (*click-outside-close*) atau saat memilih modul tujuan.

---

## [v3.0.0] - 2026-10-29

### 🔍 Overhaul Searchable-Select & Tampilan Akun COA Terbuka Penuh
- **Pelebaran Dinamis & Penyesuaian Ruang Layar Otomatis**:
  - Komponen global `searchable-select` kini menghitung lebar menu dropdown secara dinamis dengan batas minimal `440px` (atau mengikuti lebar trigger jika lebih besar) dan batas maksimal adaptif terhadap viewport (`calc(100vw - 32px)`).
  - **Auto-Alignment Tepi Layar & Modal**: Dropdown otomatis menghitung jarak ke sisi kanan layar/modal saat dibuka. Jika menu berpotensi terpotong di sebelah kanan, posisi perataan seketika beralih ke rata kanan (`right: 0; left: auto;`), menjamin seluruh isi menu selalu terlihat utuh.
- **Eliminasi Pemotongan Teks (`truncate`) & Tipografi Informatif**:
  - Menghapus pemotongan teks kaku dengan elipsis (`...`). Seluruh nama akun COA (*Chart of Accounts*) kini ditampilkan dengan pembungkus teks multi-baris alami (`break-words whitespace-normal leading-snug`).
  - Menampilkan badge kode akun monospaced dengan kontras tinggi, nama akun utama yang tegas, serta kategori/tipe akun di baris bawah.
  - Menambahkan atribut `title` pada elemen trigger dan seluruh opsi dropdown untuk memunculkan tooltip nama lengkap saat kursor diarahkan ke akun.

### 💵 Pelebaran Form & Tata Letak Akun Kas Masuk, Kas Keluar, & Mutasi Kas
- **Kenyamanan Input Transaksi Kasir & Bendahara**:
  - Memperluas ukuran modal Transaksi Kas Masuk dan Kas Keluar dari ukuran sempit menjadi `max-w-2xl` yang lapang.
  - Menempatkan bidang pemilihan **Akun Lawan / Kategori Biaya & Beban (Debit)** atau **Sumber Penerimaan (Kredit)** pada baris penuh (*full-width*) tersendiri, sehingga nama akun akuntansi yang panjang dapat dibaca secara leluasa tanpa terpotong batas kolom.
  - Menyempurnakan form transfer kas/bank internal pada modal Mutasi Kas dengan grid responsif yang rapi.

### 📚 Standardisasi Pemilihan Akun di Seluruh Modul Keuangan
- **Jurnal Umum**:
  - Memperlebar dropdown pencarian akun pada tabel entri debit/kredit manual dari lebar statis sempit menjadi responsif `min-w-full sm:min-w-[420px]`, `max-h-60`, dengan bayangan lembut `shadow-2xl` dan perataan teks nama akun yang tidak terpotong.
- **Transaksi Simpanan**:
  - Memperluas bidang pemilihan rekening bank tujuan transfer pada modal setoran dan penarikan simpanan menjadi lebar penuh (`sm:col-span-2`), dilengkapi tampilan opsi rekening multi-baris.
- **Pembayaran Angsuran Pinjaman**:
  - Memperluas dropdown akun bank penerimaan transfer angsuran dengan penataan opsi multi-baris dan elevasi visual `shadow-2xl`.
- **Pencairan & Pengajuan Pinjaman**:
  - Memperlebar modal verifikasi & pencairan pinjaman menjadi `max-w-xl`, menyajikan opsi rekening kas/bank pencairan tanpa pemotongan teks.
  - Memperbaiki tata letak formulir permohonan pinjaman dengan sistem grid responsif (`sm:grid-cols-2`) yang proporsional.
- **Pengaturan Kode Transaksi**:
  - Memperlebar modal pemetaan akun debit dan kredit transaksi akuntansi menjadi `max-w-2xl` dengan layout 2-kolom responsif (`grid-cols-1 sm:grid-cols-2`).
- **Toolbar Filter Laporan Buku Besar & Mutasi Simpanan**:
  - Memperlebar kontainer filter dropdown pilihan akun pada toolbar laporan dari `w-48` menjadi `sm:w-80 md:w-96` (Buku Besar) dan `sm:w-64 md:w-72` (Mutasi Simpanan), memastikan nama akun rekening yang sedang difilter dapat terbaca jelas.

### 📱 Pembaruan Desain Human-Crafted Portal Anggota & Login
- **Tampilan Autentik Buatan Manusia**:
  - Merombak total desain portal anggota dan halaman login agar tampak alami, profesional, dan nyaman digunakan anggota, menghilangkan kesan visual template kaku.
  - Memperbaiki ikon saldo simpanan sukarela pada kartu ringkasan dashboard portal anggota.
  - Pembaruan versi aplikasi portal anggota ke `v2.0.4`.

---

## [v2.9.9] - 2026-10-16

### 📑 Slide-Over Drawer Inspection (Panel Samping Non-Destruktif)
- **Inspeksi Data Mendalam Tanpa Kehilangan Konteks Layar**:
  - Menyediakan panel samping geser kanan (*Slide-Over Drawer*) non-destruktif berarsitektur global `App.openDrawer(contentHtml, opts)` dan `App.closeDrawer()`.
  - Staf/pengurus dapat memeriksa profil lengkap anggota, rekening simpanan aktif, portofolio pinjaman, atau rincian transaksi kas secara komprehensif tanpa harus berpindah halaman atau menutup tabel master data aktif.
  - **Kenyamanan Operasional & Filter Terjaga**: Posisi kueri pencarian, scroll tabel, dan halaman pagination tetap tersimpan utuh di latar belakang.
  - **Aksesibilitas Cepat**: Terintegrasi dengan tombol keyboard `Escape` untuk menutup panel secara instan, backdrop blur lembut (`backdrop-blur-[2px]`), serta footer navigasi cepat menuju halaman penuh atau form koreksi.
  - **Integrasi di Seluruh Modul Inti**: Dilengkapi tombol aksi inspeksi cepat (`ri-side-bar-line`) langsung pada tabel Data Anggota (`App.inspectAnggota`) dan tabel Pinjaman (`App.inspectPinjaman`).

### 🌅 Human-Touch Greeting & Briefing Operasional Harian di Dashboard
- **Sentuhan Hangat Personal & Rangkuman Kinerja Harian**:
  - Menghadirkan banner ucapan salam manusiawi (*human touch greeting*) di bagian teratas Dashboard utama yang beradaptasi secara dinamis menurut waktu lokal:
    - 🌅 **Selamat Pagi** (04:00 - 10:59)
    - ☀️ **Selamat Siang** (11:00 - 14:59)
    - 🌤️ **Selamat Sore** (15:00 - 17:59)
    - 🌙 **Selamat Malam** (18:00 - 03:59)
  - **Identitas Personal Pengurus**: Menyapa nama lengkap pengguna dan menampilkan lencana jabatan resmi (*Role*) serta tanggal berbahasa Indonesia yang bersahabat (misal: *Jumat, 16 Oktober 2026*).
  - **Kutipan Koperasi & Etika Finansial Hari Ini**: Rotasi kutipan inspiratif mengenai asas kekeluargaan, kejujuran akuntansi, dan amanah gotong royong koperasi (misal dari Bung Hatta dan prinsip dasar jati diri koperasi).
  - **Kartu Briefing Operasional Harian (*Daily Operational Briefing*)**: Rangkuman ringkas status kerja aktif hari ini, meliputi antrean persetujuan pinjaman yang membutuhkan tindak lanjut komite kredit, rasio likuiditas kas, dan tombol pintas aksi langsung ke buku kas dan antrean pembiayaan.

### 🧾 Thermal Receipt Preview dengan Efek Gerigi Kertas Sobek (Serrated Paper Edge)
- **Pratinjau Fisik Struk Kertas Kasir Sejati**:
  - Menghadirkan modal pratinjau struk kasir (*thermal receipt preview*) sebelum dokumen dicetak ke mesin printer fisik kasir (kompatibel kertas 58mm dan 80mm).
  - **Efek Gerigi Kertas Sobek (*Serrated Saw-Tooth Edge*)**: Menerapkan efek visual gerigi kertas sobek murni dengan CSS gradient segitiga saw-tooth pada sisi atas (`::before`) dan sisi bawah (`::after`) struk, meniru hasil sobekan pisau pemotong mesin printer kasir fisik.
  - **Sentuhan Otentik Kasir Toko & Koperasi**:
    - Tipografi tabular monospaced (*JetBrains Mono*) dengan garis ganda (*double line*) dan garis putus-putus (*dashed line*).
    - Cap Stempel Karet Fisik miring (*Rubber Stamp "LUNAS" / "DITERIMA" / "TERVERIFIKASI"*) yang tercetak di atas dokumen.
    - Simulasi kode batang visual (*vector barcode*) dengan nomor transaksi resmi.
    - Tombol cepat **Cetak ke Printer Fisik** (*ESC/POS print*) dan tombol **Salin Ringkasan Struk** ke papan klip (*clipboard*).
  - **Tersedia di Menu Pembayaran**: Terintegrasi pada dropdown aksi tabel Pembayaran Angsuran dan Transaksi Simpanan.

---

## [v2.9.8] - 2026-10-16

### 🖋️ Tipografi Finansial Monospace Tabular (Human-Crafted Accounting Precision)
- **Integrasi Huruf JetBrains Mono & Angka Sejajar (Tabular Figures)**:
  - Mengintegrasikan font **JetBrains Mono** standar industri fintech pada seluruh nominal Rupiah, nomor rekening, nomor akad pinjaman, kode akun jurnal, dan kolom tabel numerik.
  - Menerapkan fitur tipografi `font-variant-numeric: tabular-nums slashed-zero` (`font-feature-settings: 'tnum' 1, 'zero' 1`).
  - **Kerapian Lurus Vertikal**: Setiap angka 0 s/d 9 memiliki lebar horizontal yang presisi sama persis, memastikan digit desimal, ribuan, dan jutaan pada laporan keuangan (Buku Besar, Neraca, Mutasi, Baki Debet, Arus Kas) sejajar lurus secara vertikal layaknya lembar kerja cetak akuntansi profesional buatan manusia.

### 🔴 Efek Stempel Karet Fisik (Authentic Rubber Stamp Effect)
- **Sentuhan Otentik Stempel Cap Dokumen Resmi Koperasi**:
  - Menggantikan badge status digital kaku dengan efek visual **Stempel Karet Manual (*Physical Rubber Stamp*)** bertekstur tinta basah dengan sudut miring dinamis (`-11deg`) dan batas garis ganda putus-putus (*dashed border*).
  - **Animasi Bantingan Stempel (*Stamp Slam*)**: Memberikan animasi ketukan stempel alami yang mantap saat dokumen atau modal dibuka.
  - **Varian Cap Status Finansial Terpadu**:
    - 🟢 **LUNAS**: Stempel hijau zamrud (*emerald*) pada kartu angsuran lunas dan kuitansi pembayaran resmi.
    - 🔵 **TERVERIFIKASI**: Stempel biru indigo (*verified*) pada voucher kas resmi (BKM/BKK/BMK), sampul buku simpanan, dan kartu akad pinjaman aktif.
    - 🔷 **LUNAS DIPERCEPAT**: Stempel teal pada modal pelunasan pinjaman dipercepat (*early settlement*).
    - 🔴 **DIBATALKAN / REVERSED**: Stempel merah tua (*crimson*) tebal pada voucher atau transaksi yang telah dikoreksi/dibatalkan.
  - **Dukungan Dokumen Cetak Fisik**: Stempel juga terintegrasi otomatis ke dalam template cetak voucher kas resmi via iframe, sehingga saat dicetak ke printer fisik atau PDF dokumen terlihat sah berstempel.

---

## [v2.9.7] - 2026-10-16

### 📌 Bar Ringkasan Melayang Adaptif (Sticky Floating Table Summary Bar)
- **Monitoring Total Tanpa Repot Menggulir Layar**:
  - Pada laporan keuangan dan transaksi berskala panjang (Buku Besar, Arus Kas, Laporan Baki Debet, Laporan Mutasi Simpanan, Laporan Mutasi Angsuran):
  - Saat staf atau pengurus memeriksa puluhan/ratusan baris data di bagian tengah dan baris total tabel berada di luar jangkauan pandangan (*off-screen*), panel ringkasan total bergaya *frosted glass* otomatis melayang (*sticky dock*) di bagian bawah layar.
  - **Indikator Metrik Kumulatif**: Menampilkan nilai total utama (Total Debit, Total Kredit, Saldo Akhir, Baki Debet, atau Mutasi) dengan tipografi monospaced tebal dan warna kontras yang ramah mata.
  - **Kendali Navigasi Praktis**: Dilengkapi tombol **Lompat ke Ujung Tabel** (*smooth scroll to bottom*), tombol minimize (*ciutkan menjadi kapsul ringkas*), dan tombol tutup manual.
  - **Pembersihan Otomatis**: Bar otomatis menyembunyikan diri saat bagian `<tfoot>` tabel asli memasuki pandangan layar (*in-view*) dan otomatis dibersihkan saat berpindah halaman menu.

### 🗓️ Widget Kalender Jatuh Tempo Finansial (Due-Dates Tracker)
- **Monitoring Jadwal Angsuran & Proyeksi Kas Masuk Interaktif**:
  - Kartu angsuran jatuh tempo statis pada **Dashboard** kini di-upgrade menjadi widget kalender finansial interaktif penuh.
  - **Navigasi Kalender Bulanan**: Pengurus dapat melihat hari-hari dalam sebulan dengan indikator titik warna:
    - 🔴 **Merah / Berdenyut (Pulse)**: Angsuran menunggak / melewati batas tanggal jatuh tempo.
    - 🔵 **Biru / Indigo**: Angsuran yang jatuh tempo tepat hari ini.
    - 🟡 / 🟢 **Hijau**: Angsuran yang akan datang (*upcoming schedule*).
  - **Mode Tampilan Ganda (Dual View)**: Tersedia pilihan mode **Kalender Bulanan** (Grid 7 Hari) dan mode **Daftar Prioritas** (Filter Terlambat, Hari Ini, dan Mendatang).
  - **Kartu Ringkasan KPI Eksekutif**:
    - **Total Tagihan Bulan Berjalan**: Total frekuensi dan akumulasi nilai rupiah kas masuk yang diproyeksikan.
    - **Jatuh Tempo Hari Ini**: Peringatan tagihan yang harus diselesaikan pada hari berjalan.
    - **Tunggakan Terlambat (Overdue)**: Rekapitulasi pinjaman bermasalah yang membutuhkan tindakan penagihan segera.
  - **Aksi Cepat 1-Klik**:
    - 🟢 **Kirim Pengingat WhatsApp Instan**: Membuka WhatsApp secara otomatis dengan pesan resmi, sopan, dan berformat rapi (*Nomor Pinjaman, Angsuran ke-X, Jumlah Tagihan, dan Tanggal Jatuh Tempo*) langsung ke nomor kontak anggota.
    - 💳 **Tombol Bayar Langsung**: Langsung membuka pencarian dan form pembayaran angsuran untuk pinjaman anggota yang bersangkutan.

---

## [v2.9.5] - 2026-10-16

### ⚡ Filter Preset Waktu Cepat (Quick Date Chips) pada Seluruh Laporan
- **Pemilihan Rentang Waktu 1-Klik (Quick Date Presets)**:
  - Seluruh halaman laporan keuangan dan transaksi kini dilengkapi tombol *Quick Date Chips* instan: **Hari Ini**, **7 Hari**, **Bulan Ini**, **Bulan Lalu**, dan **Tahun Ini**.
  - Mengeliminasi proses memilih tanggal secara manual pada kalender picker untuk kebutuhan harian dan bulanan yang repetitif.
  - **Sinkronisasi Warna & Status Chip Aktif**: Penanda chip yang diklik kini otomatis mempertahankan status aktifnya (`is-active` dengan warna primer biru/indigo) secara persisten saat data laporan dimuat ulang, serta otomatis merespons format tanggal ISO/DMY dan Flatpickr.
  - Diterapkan secara merata pada:
    - **Kas Masuk & Kas Keluar** (Kas Transaksi)
    - **Laporan Arus Kas** (Direct Cash Flow)
    - **Buku Besar** (General Ledger)
    - **Jurnal Umum & Penyesuaian**
    - **Laporan Laba / Rugi**
    - **Laporan Mutasi Simpanan** (Global & Rekap)
    - **Mutasi Simpanan Anggota Individual**
    - **Laporan Mutasi Angsuran Pinjaman**
    - **Daftar Transaksi Simpanan**
    - **Daftar Transaksi Pembayaran Angsuran**
    - **Buku Tabungan / Simpanan Anggota**
    - **Kartu Piutang / Angsuran Pinjaman**

### 📐 Mode Kerapatan Tabel Fleksibel (Compact vs Comfortable Density View)
- **Personalisasi Tampilan Baris Tabel (Display Density)**:
  - Menyediakan 2 mode kerapatan visual untuk seluruh tabel data koperasi:
    - **Mode Normal (Comfortable)**: Jarak baris lega, nyaman untuk operasional kasir sehari-hari dan penggunaan layar sentuh/tablet.
    - **Mode Padat (Compact Mode)**: Mengurangi padding baris 35–40%, merampingkan ukuran teks, ikon, dan lencana status. Sangat ideal bagi bagian akuntansi, audit, dan pengawas untuk memeriksa 30–40 baris transaksi sekaligus dalam satu layar monitor tanpa perlu banyak menggulir (*scrolling*).
  - **Tombol Pengubah Kerapatan Global di Topbar**: Tersedia ikon pengatur kerapatan di bilah navigasi atas (topbar) di samping tombol Dark Mode, sehingga dapat diakses dari mana saja.
  - **Tombol Pengubah Inline di Seluruh Menu Tabel Data & Laporan**:
    - **Laporan Keuangan & Akuntansi**: Neraca, Laba Rugi, Perubahan Ekuitas, Pertumbuhan Laba/Rugi, Arus Kas, Buku Besar, Jurnal.
    - **Operasional Simpan Pinjam**: Kas Transaksi, Angsuran, Simpanan, Pinjaman, Mutasi Simpanan, Rekening Simpanan, Rekening Pinjaman, Buku Simpanan, Kartu Angsuran.
    - **Laporan Portofolio & Risiko**: Laporan Baki Debet, Laporan Kolektibilitas (NPL), Laporan Agunan, Monitoring Simpanan Wajib, Laporan Jasa Anggota.
    - **Master Data & Konfigurasi**: Chart of Accounts (Akun), Anggota, Jenis Simpanan, Jenis Pinjaman, Biaya Pinjaman, Kode Transaksi, Manajemen User, Pengumuman, Agunan.
    - **Tata Kelola & Audit**: Sesi RAT, Jasa Partisipatif, Pembagian SHU, Audit Log Sistem, Portal Member Logs, Toko Koperasi (Pesanan), Aspirasi & Pengaduan.
  - **Penyimpanan Preferensi Otomatis**: Pengaturan kerapatan disimpan di memori browser pengguna (`localStorage`) dan langsung diterapkan secara mulus ke seluruh halaman tanpa perlu mengatur ulang.

---

## [v2.9.3] - 2026-10-16

### 📈 Indikator Gelombang Tren (Micro Sparkline Charts) pada Kartu Ringkasan
- **Grafik Tren Bergelombang Interaktif (Fintech-Grade Micro Sparklines)**:
  - Seluruh kartu ringkasan eksekutif pada **Dashboard** (Total Anggota, Total Simpanan, Pinjaman Aktif, dan Pinjaman Pending) kini diperkaya dengan grafik gelombang mikro berbasis SVG modern (*Bézier curve smoothing*).
  - Dilengkapi arsir gradien warna transparan (*ambient gradient fill*) dan titik suar bercahaya (*glowing pulse beacon*) di ujung kurva yang berkedip dinamis untuk menunjukkan posisi data terkini.
  - **Lencana Perubahan Tren (Trend Badge Pill)**: Dilengkapi lencana persentase tren perbandingan (misalnya `+5.2%` hijau untuk tren naik atau `-1.8%` merah untuk penurunan) beserta indikator arah panah dan keterangan rentang waktu (misalnya `Tren 7 hari` atau `Inflow kumulatif`).
  - **Kartu Likuiditas Kas**: Saldo Kas Operasional (Akun 1000) pada blok Skor Likuiditas kini juga dilengkapi gelombang arus dana real-time.
  - **Modul Kas Masuk & Kas Keluar**: Empat kartu ringkasan kas (Penerimaan Kas, Pengeluaran Beban, Arus Kas Bersih/Net Flow, dan Perputaran Kas) kini menampilkan grafik ombak arus kas langsung di bawah ikon transaksi.
  - **Super Ringan & Tanpa Beban**: Dirancang murni menggunakan kalkulasi vektor SVG dan CSS hardware-accelerated tanpa perpustakaan eksternal (0 kB external bundle library), sehingga halaman tetap terbuka dalam sekejap tanpa lag.

---

## [v2.9.2] - 2026-10-16

### 🎨 Desain Dropdown Interaktif & Pencarian Otomatis (Smart Searchable Combobox)
- **Transformasi Dropdown Pilihan Data Modern**:
  - Menggantikan dropdown `<select>` polosan bawaan browser dengan komponen pilihan interaktif modern (**Smart Combobox**) yang elegan, bergaris tepi halus, dan berlatar putih bersih dengan bayangan lembut.
  - **Pencarian Cepat Saat Mengetik (Autocomplete)**: Pengguna tidak perlu lagi menggulir daftar ratusan akun atau jenis transaksi secara manual. Cukup ketik kode (misal `1101` atau `5101`), nama akun, atau kata kunci lainnya, daftar pilihan akan langsung menyaring hasil secara instan (0 milidetik).
  - **Penanda Teks yang Dicocokkan (Search Highlighting)**: Karakter atau kata yang cocok dengan ketikan pengguna otomatis disorot dengan warna kuning lembut, memudahkan mengenali hasil pencarian secara sekilas.
  - **Tata Letak Informasi Kaya (Rich Data Badges)**:
    - Untuk **Bagan Akun Keuangan (COA)**: Kode akun disajikan dalam kotak lencana (badge) bernuansa font monospace biru/indigo, nama akun tebal, serta kategori/tipe akun di sisi kanan.
    - Untuk **Produk Pinjaman**: Dilengkapi rincian suku bunga dan batas tenor maksimal.
    - Untuk **Kode Transaksi**: Dilengkapi ikon arah debit/kredit dan badge ringkas.
  - **Navigasi Penuh Menggunakan Keyboard**:
    - Tombol panah atas & bawah (↑ ↓) untuk berpindah pilihan secara cepat.
    - Tombol `Enter` untuk menetapkan pilihan.
    - Tombol `Escape` (ESC) untuk menutup daftar pilihan.
  - **Tombol Hapus Pilihan Sekali Klik**: Tersedia ikon silang cepat (reset) untuk mengosongkan atau mengganti pilihan dalam 1 kali klik.
  - **Pendeteksi Batas Layar Cerdas (Auto-Flip)**: Jika form berada di dekat bagian bawah layar, daftar dropdown otomatis membuka ke arah atas sehingga tidak pernah terpotong oleh batas monitor.
  - **Penerapan Luas di Seluruh Modul Aplikasi**:
    - **Kas Masuk, Kas Keluar & Mutasi Kas**: Pilihan Rekening Kas/Bank & Akun Lawan COA.
    - **Filter Cepat Akun Kas**: Filter rekening kas pada daftar transaksi kasir.
    - **Buku Besar Keuangan**: Filter pencarian cepat akun buku besar.
    - **Pengaturan Kode Transaksi**: Pilihan Akun Debit & Akun Kredit COA.
    - **Pengaturan Jenis Simpanan**: Pilihan Akun COA Kewajiban simpanan.
    - **Pengaturan Jenis Pinjaman**: Pilihan Akun Neraca Piutang pinjaman.
    - **Pengaturan Biaya Pinjaman**: Pilihan Akun Pendapatan potongan biaya pencairan pinjaman.
    - **Proses Akhir Tahun (Tutup Buku)**: Pilihan Akun Modal Tujuan SHU.
    - **Mutasi Simpanan Anggota**: Filter cepat Jenis Simpanan.
    - **Pengajuan Pinjaman**: Pilihan Jenis Produk Pinjaman.
    - **Pembukaan Rekening Simpanan**: Pilihan Produk Simpanan anggota.
    - **Manajemen Agunan**: Pilihan Tipe Agunan (BPKB, Sertifikat SHM, Deposito, dll).
    - **Chart of Accounts (COA)**: Pilihan Kelompok Akun pembukuan.
    - **Manajemen Pengguna (User)**: Pilihan Role Hak Akses Petugas.

---

## [v2.9.1] - 2026-10-15

### 🚀 Produktivitas & Kenyamanan Kerja Kasir & Admin
- **Menu Pintas Cepat (Command Palette `Ctrl + K`)**:
  - Membuka jendela pencarian instan dari mana saja cukup dengan menekan tombol `Ctrl + K` (atau klik kotak pencarian di bilah atas).
  - Tampilan awal langsung menyediakan **Aksi Cepat Kasir**: Input Kas Masuk, Input Kas Keluar, Setor Simpanan, Ajukan Pinjaman, Bayar Angsuran, Tambah Anggota, dan Buka Laporan.
  - Pencarian pintar: Mengetik nama anggota atau nomor pinjaman langsung menyaring data secara seketika dan dapat dipilih menggunakan tombol panah atas/bawah (↑↓) dan tombol Enter pada keyboard.
- **Kalkulator Kasir & Simulasi Angsuran Melayang (Pintasan `Alt + C`)**:
  - Tombol kalkulator praktis di bagian atas aplikasi atau dengan menekan tombol `Alt + C` pada keyboard.
  - **Kalkulator Harian Kasir**: Dilengkapi tulisan **Terbilang Rupiah Otomatis** saat menghitung angka, tombol nominal cepat (+50rb, +100rb, +500rb, +1jt), dan tombol salin nominal.
  - **Hitung Uang Kembalian**: Menghitung selisih uang diterima kasir dikurangi total tagihan belanja/setoran secara otomatis dengan warna penanda yang jelas (Hijau jika pas/lebih, Merah jika kurang).
  - **Simulasi Angsuran Pinjaman Cepat**: Memasukkan plafon pinjaman, jangka waktu bulan, dan suku bunga per bulan; sistem langsung menghitung cicilan pokok, bunga, total angsuran per bulan, dan total pengembalian. Dilengkapi tombol **"Salin Rincian Simulasi"** yang siap langsung dikirimkan ke pesan WhatsApp anggota.
- **Suara Konfirmasi Transaksi (Audio Feedback Kasir)**:
  - Bunyi denting harmonik lembut saat transaksi berhasil disimpan, bunyi register kasir saat menambah uang, dan nada pengingat ramah saat ada kekurangan data atau peringatan saldo.
  - Tombol pengatur suara di bagian atas untuk membisukan (Mute) atau mengaktifkan kembali suara kapan saja sesuai kebutuhan ruangan kantor koperasi.
- **Catatan Memo Internal Anggota (Staff Sticky Notes)**:
  - Tombol **"Catatan Memo"** pada halaman profil rincian anggota. Petugas kasir dan bagian kredit dapat menyematkan catatan penting internal (seperti perjanjian tanggal pembayaran angsuran, nomor telepon cadangan keluarga, atau pesan khusus) yang hanya dapat dibaca oleh staf internal koperasi.

---

## [v2.9.0] - 2026-10-15

### 📄 Format Cetak Dokumen & Laporan Resmi Koperasi (Bersih & Hemat Tinta)
- **Kop Surat Resmi Koperasi Hemat Tinta**:
  - Menggantikan tampilan kop warna gelap yang boros tinta printer dengan **Kop Surat Resmi Berlatar Putih Bersih** dan aksen garis warna tema koperasi, sangat tajam dan profesional saat dicetak fisik ke kertas maupun saat dibaca di layar HP/komputer.
  - **Logo Lembaga & Lambang Inisial**: Menampilkan logo resmi koperasi di sisi kiri atas secara presisi, atau lambang monogram khusus jika logo belum diunggah.
  - **Identitas Lengkap Koperasi**: Mencantumkan nama koperasi (huruf tebal), status badan hukum, alamat kantor cabang/pusat, serta nomor telepon, email, dan website resmi lembaga.
  - **Kotak Keterangan Petugas & Waktu Cetak (Pojok Kanan Atas)**: Kotak rapi yang mencatat waktu cetak lengkap (tanggal, jam, dan zona WIB), nama lengkap staf/petugas pencetak beserta jabatannya, serta nomor referensi dokumen resmi.
  - **Garis Pembatas Ganda Standar Pembukuan**: Pembatas kop resmi standar akuntansi berupa kombinasi garis tegas dan garis aksen tipis.
- **Judul & Keterangan Periode Laporan**:
  - Judul laporan diperjelas dengan garis aksen vertikal di sisi kiri, serta keterangan rentang tanggal/periode yang menyatu rapi tanpa saling menimpa.
- **Kotak Ringkasan Keuangan yang Jelas & Rapi**:
  - Kotak ringkasan total saldo, pendapatan, atau pengeluaran di bagian atas tabel kini berlatar putih bersih dengan garis tepi halus.
  - Tulisan angka nominal otomatis menyesuaikan ukuran secara cerdas jika mencapai ratusan juta hingga miliaran rupiah, sehingga angka tidak pernah terpotong atau sesak.
- **Tabel Data Keuangan Rapi & Mudah Dibaca**:
  - Seluruh angka uang (Rupiah) otomatis rata kanan dan sejajar rapi dari atas ke bawah agar mudah dihitung dan ditinjau.
  - Nomor urut, tanggal transaksi, dan status otomatis rata tengah.
  - **Warna Tanda Status Lembut**: Status transaksi menggunakan warna yang mudah dibedakan namun tidak menyilaukan (Hijau untuk status Lancar, Lunas, dan Aktif; Kuning untuk Pending, Proses, dan Perlu Perhatian; Merah untuk status Menunggak, Macet, dan Ditolak).
- **Kolom Tanda Tangan Resmi Pengurus Koperasi**:
  - Setiap laporan keuangan otomatis menyertakan kolom pengesahan resmi di akhir lembar:
    - Tempat dan tanggal cetak resmi berbahasa Indonesia (contoh: *Kota, 15 Oktober 2026*).
    - Kolom Mengetahui / Menyetujui (*Ketua Pengurus Koperasi*).
    - Kolom Pembuat / Pemeriksa Dokumen (*Bagian Pembukuan / Bendahara* lengkap dengan nama petugas login).
  - Jika sisa ruang di halaman terakhir terlalu sempit, tanda tangan otomatis berpindah ke halaman pengesahan baru yang rapi tanpa menabrak tabel.
- **Keterangan Nomor Halaman yang Akurat**:
  - Mencantumkan nomor halaman lengkap (*contoh: Halaman 1 dari 3, Halaman 2 dari 3*), hak cipta resmi atas nama koperasi Anda, serta jaminan keabsahan dokumen pembukuan elektronik.

---

## [v2.8.9] - 2026-10-15

### 🎨 Kemudahan Navigasi Menu & Tanda Tugas Baru
- **Tanda Angka Tugas Baru (Pending) Otomatis**:
  - Menu harian kini dilengkapi bulatan angka berwarna yang berkedip lembut saat ada tugas yang perlu ditindaklanjuti admin: *Pengajuan Pinjaman Baru dari Anggota*, *Pengecekan Pembayaran Angsuran*, *Pesanan Toko Baru*, dan *Pesan Aspirasi & Pengawas*.
  - **Sistem Sangat Ringan & Tidak Bikin Lambat**: Cara pengecekan tugas baru dirancang sangat efisien agar aplikasi tetap terbuka seketika dan tidak macet, bahkan saat data anggota koperasi sudah mencapai puluhan ribu orang.
  - Angka tugas otomatis diperbarui saat Anda kembali membuka tab aplikasi di komputer.
- **Tanda Pengingat pada Menu Induk**:
  - Jika menu Pinjaman atau Keuangan sedang dalam keadaan tertutup/terlipat, menu utama tetap menampilkan tanda titik berwarna, sehingga tidak ada tugas anggota yang terlewat oleh petugas.
- **Kelompok Menu Bisa Dilipat (Sesuai Kebutuhan)**:
  - Seluruh kelompok menu di bilah samping (*NAVIGASI*, *MASTER DATA*, *TRANSAKSI*, *LAPORAN*, *SISTEM*) kini dapat dilipat atau dibuka cukup dengan satu klik.
  - Pilihan menu yang Anda buka akan diingat oleh sistem, sehingga tampilan tetap rapi setiap kali Anda membuka aplikasi.
  - Menu yang sedang dibuka otomatis terbuka sendiri agar Anda selalu tahu sedang berada di halaman mana.
- **Struktur Garis Pohon Menu yang Rapi**:
  - Garis penghubung submenu kini tampil lebih halus menyerupai cabang pohon, dan menyala dengan warna aksen oranye saat kursor didekatkan.
- **⭐ Menu Favorit Pilihan Anda**:
  - Pengurus dan petugas kini dapat menandai menu yang paling sering dibuka sehari-hari dengan mengklik tanda bintang (⭐).
  - Menu pilihan akan langsung disematkan pada baris paling atas **`⭐ FAVORIT SAYA`** lengkap dengan tanda jumlah tugas baru masing-masing.
- **🖥️ Mode Layar Luas (Tampilan Menu Ringkas 64px)**:
  - Tersedia tombol pada logo atas untuk merampingkan bilah menu samping menjadi baris ikon kecil.
  - Menghemat ruang layar hingga 156 pixel untuk memberikan area pandang yang jauh lebih lega saat membaca tabel keuangan yang berkolom lebar (seperti Buku Besar, Jurnal Umum, dan Neraca).
  - Tanda tugas baru dan petunjuk nama menu tetap muncul saat kursor didekatkan ke ikon.

---

## [v2.8.8] - 2026-10-10

### ⚡ Akselerasi Kecepatan & Pencarian Tabel Praktis
- **Pencarian Otomatis Saat Mengetik (Tanpa Perlu Tekan Enter)**:
  - Cukup ketik nama anggota atau nomor bukti pada kotak pencarian di tabel anggota, simpanan, pinjaman, angsuran, kas, atau jurnal; data tabel akan langsung tersaring otomatis 350 milidetik setelah Anda berhenti mengetik.
  - Posisi kursor ketik tetap terjaga dan tidak akan loncat keluar dari kotak pencarian saat tabel menyegarkan data.
  - Kotak pencarian Jurnal Umum kini juga mendukung tombol Enter untuk pencarian seketika.
- **Aplikasi Terbuka Lebih Ringan Saat Pertama Kali Masuk**:
  - Komponen cetak dokumen PDF dan kode QR diatur agar dimuat di latar belakang tanpa menghalangi halaman utama, sehingga layar dashboard aplikasi terbuka 2 kali lebih cepat.

---

## [v2.8.7] - 2026-10-10

### 🚀 Peningkatan Kelancaran & Kecepatan Kerja Aplikasi
- **Perpindahan Halaman Instan Tanpa Menunggu**:
  - Saat kursor mouse diarahkan ke nama menu, sistem langsung menyiapkan halaman tersebut di balik layar, sehingga saat menu diklik halaman berpindah seketika tanpa putaran loading lama.
- **Formulir Transaksi Terbuka Seketika**:
  - Daftar pilihan akun rekening, jenis simpanan, dan jenis pinjaman disimpan sementara di memori komputer selama 5 menit.
  - Formulir input simpanan, pencairan pinjaman, dan transaksi kas terbuka langsung dalam hitungan milidetik tanpa harus memanggil server berulang kali.
  - Data pilihan otomatis diperbarui kembali saat ada penambahan atau pengubahan data master.
- **Lancar Saat Banyak Petugas Membuka Laporan Bersamaan**:
  - Sistem disesuaikan agar beberapa petugas dapat membuka laporan keuangan, ringkasan dashboard, dan data transaksi secara bersamaan tanpa saling menunggu antrean di server.
- **Hemat Kuota Internet Hingga 80%**:
  - Seluruh pengiriman data otomatis dikompresi sehingga sangat hemat kuota dan terasa ringan saat diakses melalui internet kantor cabang atau koneksi seluler.
- **Hemat Daya Baterai Laptop & Komputer**:
  - Pengecekan data otomatis dijeda saat tab peramban sedang diminimalkan atau tidak sedang dilihat oleh petugas.

---

## [v2.8.6] - 2026-10-09

### 🎨 Perbaikan Tampilan Menu Kas & Pilihan Tanggal
- **Warna Header Menu Kas Lebih Tegas & Nyaman**:
  - Bagian atas menu Kas Masuk dan Kas Keluar dipercantik dengan warna biru tua resmi dan tulisan putih yang kontras.
  - Tombol aksi utama (*+ Kas Masuk*, *- Kas Keluar*, dan *Mutasi Kas*) kini tampil dengan warna penuh yang tegas dan mudah dilihat.
- **Kotak Pilihan Tanggal Tidak Lagi Sempit**:
  - Mengatasi tampilan pilihan rentang tanggal pencarian ("Dari Tanggal" s/d "Sampai Tanggal") yang sebelumnya bertumpuk atau terpotong pada layar laptop standar.
  - Baris filter kini tertata lega, tombol segarkan data berada di posisi yang nyaman, dan tombol pilihan periode (*Hari Ini*, *7 Hari*, *Bulan Ini*) tersusun rapi.

---

## [v2.8.5] - 2026-10-09

### 💎 Pembaruan Lengkap Menu Kas Masuk, Kas Keluar & Mutasi Kas
- **Ringkasan Keuangan Kas Harian (4 Kotak Utama)**:
  - **Kas Masuk**: Total penerimaan uang koperasi dan jumlah transaksi masuk.
  - **Kas Keluar**: Total pengeluaran beban biaya operasional dan frekuensi transaksi.
  - **Arus Kas Bersih**: Tanda otomatis yang langsung menunjukkan posisi kas koperasi berstatus `SURPLUS KAS (+)` warna hijau atau `DEFISIT KAS (-)` warna merah.
  - **Rekening Aktif**: Total keseluruhan perputaran kas dan jumlah rekening kas serta rekening bank koperasi yang aktif.
- **Penyaringan Transaksi Cepat & Praktis**:
  - Tombol tab cepat: *Semua Transaksi*, *📥 Kas Masuk*, *📤 Kas Keluar*, dan *⇄ Mutasi Kas*.
  - Pilihan periode instan dalam 1 klik: *Hari Ini*, *7 Hari Terakhir*, *Bulan Ini*, *Bulan Lalu*, dan *Tahun Ini*.
  - Penyaringan khusus berdasarkan rekening tertentu (misal: hanya Kas Tunai Kasir, Bank BRI, atau Bank Jatim).
  - Kotak pencarian nomor bukti dan uraian transaksi dilengkapi tombol silang (`✕`) untuk menghapus pencarian seketika.
- **Tanda Aliran Uang yang Jelas**:
  - Setiap baris catatan kas menampilkan panah arah perpindahan uang (contoh: dari Kas Utama ➔ Beban Listrik, atau dari Kasir ➔ Rekening Bank BRI Koperasi).
  - Angka nominal menggunakan warna yang tegas (Hijau untuk uang masuk, Merah untuk uang keluar, dan Biru untuk mutasi transfer bank).
- **Cetak Bukti Kas Resmi (BKM, BKK, BMK)**:
  - Setiap transaksi dapat dicetak menjadi bukti kas resmi: Bukti Kas Masuk (BKM), Bukti Kas Keluar (BKK), atau Bukti Memori Kas (BMK).
  - Dilengkapi kop koperasi, nomor bukti, tanggal, pihak terkait, tulisan **Terbilang Rupiah Otomatis**, rincian pos pembukuan, dan 4 kolom tanda tangan (Menyetujui, Pembukuan, Kasir/Bendahara, dan Penyetor/Penerima).
  - Cetak langsung bekerja tanpa terhalang pemblokir pop-up browser.
- **Formulir Input Kas Dilengkapi Bantuan Hitung**:
  - Pengetikan nominal uang otomatis menampilkan tanda titik ribuan dan teks **Terbilang Rupiah** secara langsung untuk mencegah salah ketik.
  - Tombol pintas tambah nominal cepat (`+50rb`, `+100rb`, `+500rb`, `+1jt`, `+5jt`, `+10jt`).
  - Fitur baru **Pindah Buku Antar Bank (Mutasi Kas)** untuk perpindahan uang dari kas tunai ke rekening bank atau antar rekening bank koperasi.
  - Menampilkan simulasi catatan debit-kredit akuntansi sebelum transaksi disimpan.
- **Membuka Halaman Kas 100x Lebih Cepat**:
  - Seluruh riwayat transaksi kas kini langsung tampil seketika di layar tanpa jeda waktu tunggu.

---

## [v2.8.4] - 2026-10-09

### 🛠️ Perbaikan Formulir Jurnal & Kemudahan Penggunaan
- **Perbaikan Formulir Jurnal Akuntansi**:
  - Mengatasi kendala di mana kotak formulir entri jurnal sempat tertutup bayangan abu-abu dan isian tidak bisa diketik. Sekarang formulir terbuka bersih di tengah layar dan siap diisi.
- **Kemudahan Pemilihan Akun Bagi Staf Pembukuan**:
  - Staf administrasi dan kasir kini dapat langsung memilih daftar rekening akun saat mencatat transaksi tanpa terhambat peringatan izin sistem.
- **Tutup Jendela Dialog Cukup Tekan Tombol ESC**:
  - Menutup kotak dialog atau formulir yang terbuka kini cukup dengan menekan tombol `Escape (Esc)` pada keyboard komputer Anda.
- **Pemberitahuan yang Ramah Saat Jaringan Terganggu**:
  - Jika terjadi kendala koneksi internet saat menyimpan data, sistem menampilkan pesan petunjuk yang jelas dan menutup proses secara bersih tanpa membuat layar membeku.

---

## [v2.8.3] - 2026-10-09

### ✨ Efek Tombol Responsif & Perlindungan Anti-Dobel Klik
- **Efek Sentuhan Tombol yang Lembut**:
  - Setiap tombol aksi, menu, dan tab kini memberikan efek gelombang lembut saat diklik, memberikan kepastian langsung bahwa tombol telah berhasil ditekan.
- **Perlindungan Anti-Dobel Klik**:
  - Saat tombol simpan atau bayar diklik, tombol otomatis berubah menampilkan tanda berputar dan terkunci sementara sampai proses selesai, mencegah transaksi tersimpan ganda akibat ketidaksengajaan klik dua kali.
  - Jika isian form ada yang belum lengkap, tombol otomatis kembali normal dan siap digunakan lagi.

---

## [v2.8.2] - 2026-10-09

### 🚀 Peningkatan Kecepatan Formulir di Seluruh Menu
- **Persetujuan Pinjaman Lebih Cepat**:
  - Kotak persetujuan dan pencairan pinjaman kini terbuka seketika dan data biaya pinjaman langsung tersedia tanpa waktu tunggu.
- **Formulir Jurnal, Hak Akses, dan Pengumuman Terbuka Instan**:
  - Peningkatan kecepatan pembukaan jendela dialog di menu Jurnal Umum, Pengaturan Hak Akses Staf, dan Pengumuman Koperasi.
- **Pemeliharaan Database Terjadwal**:
  - Penambahan skrip pemeliharaan indeks database berkala untuk menjaga kecepatan pencarian data di server koperasi.

---

## [v2.8.1] - 2026-10-09

### ⚡ Kecepatan Kerja Admin & Tampilan Loading Modern
- **Formulir Kedua Terbuka 0 Detik**:
  - Setelah membuka suatu formulir transaksi sekali, pembukaan berikutnya berlangsung seketika dari memori browser tanpa perlu mengambil data ulang dari server.
- **Tampilan Kotak Form Tidak Membeku**:
  - Saat tombol "Tambah", "Bayar", atau "Edit" diklik, kotak dialog langsung muncul dengan pola kerangka lembut, menghilangkan kesan aplikasi macet saat mengambil data jaringan.
- **Pencarian Data Anggota, Simpanan & Pinjaman Jauh Lebih Cepat**:
  - Peningkatan kecepatan penarikan data transaksi simpanan, pengajuan pinjaman, jadwal angsuran, dan pencarian anggota di database.

---

## [v2.8.0] - 2026-10-09

### 📲 Modul Pengingat Tagihan Pinjaman & Notifikasi Layar HP Anggota
- **Pusat Pemantauan Perangkat Anggota Terhubung**:
  - Menampilkan jumlah anggota yang telah mengaktifkan izin notifikasi di ponsel pintar mereka (Android, iPhone, maupun komputer desktop).
  - Tersedia tombol **"Tes Kirim Pesan"** ke anggota tertentu untuk memastikan notifikasi sampai ke ponsel anggota.
- **Riwayat Pengiriman Notifikasi Koperasi**:
  - Mencatat riwayat setiap pesan yang terkirim ke anggota: bukti setoran simpanan, penarikan uang, persetujuan pinjaman, pelunasan angsuran, pengingat jatuh tempo, hingga pemberitahuan pembatalan transaksi yang transparan.
- **Pengiriman Pesan Massal (Broadcast) ke Seluruh Anggota**:
  - Pengurus dapat mengirimkan informasi penting atau pengumuman darurat langsung ke layar depan ponsel seluruh anggota koperasi.
  - Dilengkapi fitur **Contoh Tampilan Layar HP** untuk melihat simulasi pesan sebelum benar-benar dikirimkan.
- **Pengingat Khusus Tagihan Pinjaman Jatuh Tempo**:
  - Pengelompokan cerdas tagihan pinjaman anggota berdasarkan tingkat urgensi:
    1. 📅 **H-5 s/d H-1**: Tagihan yang akan segera jatuh tempo dalam waktu dekat.
    2. ⚠️ **H-0**: Tagihan yang jatuh tempo HARI INI.
    3. ⏳ **Terlambat 1 - 7 Hari**: Masa tenggang awal keterlambatan.
    4. 🚨 **Terlambat 8 - 30 Hari**: Terlambat sekitar 1 bulan (Persiapan Surat Peringatan SP 1).
    5. 🛑 **Menunggak Lebih dari 30 Hari**: Pinjaman macet (Surat Peringatan SP 2 & 3).
    6. 🌐 **Seluruh Tagihan Belum Lunas**: Rekap total tagihan pinjaman yang beredar.
  - Pengurus dapat mengirim pesan pengingat tagihan cukup dengan mencentang nama anggota atau mengirim ke seluruh kelompok dalam 1 klik.
  - Teks pesan otomatis memuat nama anggota, jenis pinjaman, angsuran ke berapa, nominal tagihan, dan tanggal jatuh tempo secara akurat.

---

## [v2.7.0] - 2026-10-06

### 🛍️ Pengelolaan Pesanan Belanja Anggota di Toko Koperasi
- **Daftar Pesanan Belanja Anggota yang Masuk**:
  - Menghubungkan pesanan belanja dari aplikasi HP anggota langsung ke layar komputer kasir/staf toko koperasi.
  - Ringkasan pesanan harian: Total Pesanan, Perlu Diproses (Baru Masuk), Sedang Disiapkan, Siap Diambil, dan Selesai (lengkap dengan total perputaran omset toko).
  - Penyaringan mudah berdasarkan nama anggota, nomor pesanan, status pesanan, metode bayar (Tunai saat ambil vs Potong Simpanan Sukarela), dan tanggal belanja.
- **Alur Kerja Pemrosesan Pesanan**:
  - Kotak rincian pesanan menampilkan daftar barang yang dibeli, total bayar, catatan anggota, serta tombol kirim pesan WhatsApp ke anggota dalam 1 klik.
  - Tombol tahapan kerja yang mudah dipahami: *Mulai Siapkan* ➔ *Tandai Siap Diambil* ➔ *Selesaikan Pesanan (Sudah Diserahkan)*.
  - Pembatalan pesanan yang aman: jika pesanan dibatalkan, saldo simpanan sukarela anggota otomatis dikembalikan dan stok barang kembali masuk ke toko.
- **Cetak Struk Belanja & Laporan Penjualan**:
  - Cetak struk belanja ukuran printer kasir kecil (58mm/80mm) yang siap diselipkan ke kantong belanjaan anggota.
  - Ekspor rekapitulasi penjualan toko ke format PDF dan file Excel (CSV).

---

## [v2.6.0] - 2026-09-21

### 🔔 Pembayaran Angsuran Mandiri via Simpanan Sukarela
- **Persetujuan Pembayaran Angsuran oleh Bendahara & Kasir**:
  - Anggota dapat mengajukan pembayaran angsuran pinjaman mereka secara mandiri menggunakan saldo Simpanan Sukarela dari ponsel mereka.
  - **Tanda Lonceng Pengingat di Layar Admin**: Ikon lonceng di bagian atas aplikasi menampilkan jumlah pengajuan pembayaran yang sedang menunggu verifikasi secara langsung.
  - **Pemeriksaan Saldo yang Aman**:
    - Menampilkan data anggota, pinjaman, rincian pokok, bunga, denda, dan total tagihan.
    - Menampilkan saldo simpanan sukarela anggota saat ini, jumlah tagihan, dan perkiraan sisa saldo setelah dipotong.
    - Tombol persetujuan otomatis terkunci jika saldo simpanan anggota tidak mencukupi, sehingga aman dari kesalahan penarikan.
  - **Pembukuan Otomatis Tanpa Uang Tunai**:
    - Begitu disetujui Bendahara, angsuran dinyatakan lunas dan saldo rekening tabungan sukarela anggota otomatis terpotong tanpa perlu menghitung uang fisik di meja kasir.
    - Opsi penolakan dilengkapi alasan penolakan yang otomatis terkirim ke ponsel anggota.
- **Penyempurnaan Menu Pembayaran Angsuran**:
  - Penambahan filter tanggal mulai dan tanggal selesai pada daftar riwayat pembayaran angsuran.
  - Tata letak pencarian yang lebih rapi dan nyaman digunakan.
- **Dukungan Nama Anggota yang Menggunakan Tanda Petik Satu (`'`)**:
  - Memperbaiki pemilihan nama anggota yang memiliki tanda petik (seperti: *Ma'ruf*, *D'Angelo*, *Jum'at*) pada kotak pencarian agar tidak memunculkan kesalahan sistem.
- **Pembaruan Aplikasi HP Anggota (Portal PWA)**:
  - Beranda aplikasi anggota kini menampilkan kartu pengingat tagihan angsuran terdekat beserta tanggal jatuh tempo dan tombol cepat bayar via simpanan sukarela.

---

## [v2.5.1] - 2026-09-19

### 💰 Pembayaran Angsuran Langsung dari Simpanan Sukarela di Kantor
- **Pilihan Metode Bayar Baru di Kasir**:
  - Petugas kasir kini dapat memilih metode pembayaran **Simpanan Sukarela** saat menerima pembayaran angsuran di kantor.
  - Saldo tabungan sukarela anggota langsung terlihat di layar form angsuran. Jika saldo kurang, sistem akan memberikan peringatan dan tombol simpan terkunci otomatis.
- **Otomatis Masuk Buku Tabungan & Jurnal Pembukuan**:
  - Saldo rekening tabungan anggota langsung berkurang dan tercatat rapi di buku tabungan dengan keterangan nomor angsuran terkait.
  - Jurnal akuntansi otomatis mencatat pemindahan saldo tanpa mempengaruhi kas fisik koperasi.
- **Pembatalan Transaksi yang Aman**:
  - Jika transaksi angsuran yang dipotong dari simpanan dibatalkan (direversal), dana otomatis kembali utuh ke saldo tabungan anggota.
- **Struk Kasir Resmi**:
  - Struk cetak pembayaran angsuran dengan jelas mencantumkan keterangan metode bayar `SIMPANAN SUKARELA`.

---

## [v2.5.0] - 2026-09-16

### 📊 Laporan Perubahan Modal (Ekuitas) Lengkap untuk Dokumen RAT
- **Tiga Sudut Pandang Laporan Perubahan Modal**:
  - **Sudut Pandang Aliran Modal**: Memantau mutasi modal bertahap mulai dari *Saldo Modal Awal per 1 Januari* ➔ *(+) Penambahan Modal Sendiri* (Simpanan Pokok, Simpanan Wajib, Dana Cadangan, dan SHU Tahun Berjalan) ➔ *(-) Pengurangan Modal* (Pengembalian simpanan anggota keluar) ➔ *Saldo Akhir Modal per 31 Desember*.
  - **Sudut Pandang Perbandingan Tahunan**: Membandingkan posisi modal *Tahun Ini vs Tahun Lalu*, lengkap dengan angka kenaikan rupiah, persentase pertumbuhan, dan tanda arah tren (Naik, Turun, atau Stabil).
  - **Sudut Pandang Tabel Matriks Resmi (8 Kolom SAK EP)**: Format tabel resmi untuk lampiran buku laporan pertanggungjawaban Pengurus pada Rapat Anggota Tahunan (RAT).
- **Jaminan 100% Cocok dengan Neraca**:
  - Total Modal Akhir secara otomatis diverifikasi terhadap pos Modal pada Laporan Neraca per 31 Desember, menjamin saldo seimbang tanpa selisih (Rp 0).
- **Cetak Dokumen Resmi & Ekspor Excel**:
  - Format cetak PDF posisi mendatar (Landscape) ber-kop surat resmi koperasi, catatan pengesahan standar akuntansi, dan 3 kolom tanda tangan legal (*Pengawas*, *Ketua*, dan *Bendahara*).
  - Ekspor berkas ke Microsoft Excel (CSV).

### 🏛️ Penilaian Kesehatan Koperasi Sesuai Pedoman Kemenkop UKM Terbaru
- **Pedoman Hukum Resmi & Mutakhir**:
  - Menyelaraskan seluruh rumus dan standar penilaian kesehatan sesuai peraturan Kementerian Koperasi dan UKM RI terbaru (**Permenkop UKM No. 9/2020 jo. No. 2/2024 & No. 8/2023**).
  - Menggunakan instrumen resmi **Kertas Kerja Pemeriksaan Kesehatan Koperasi (KKPKK)** dengan 4 pilar pengawasan:
    1. *Tata Kelola (Bobot 30%)*: Kelembagaan, kelengkapan izin NIK, penyelenggaraan RAT, dan kepatuhan pembukuan seimbang.
    2. *Profil Risiko (Bobot 15%)*: Rasio kredit macet/NPL (target di bawah 5%), ketersediaan dana kas likuid, dan kecukupan cadangan risiko.
    3. *Kinerja Keuangan (Bobot 40%)*: Kemampuan menghasilkan SHU terhadap aset dan modal, efisiensi beban operasional (BOPO), dan kemandirian usaha.
    4. *Permodalan (Bobot 15%)*: Kecukupan modal sendiri terhadap risiko pinjaman dan total aset koperasi.
- **Predikat Resmi Standar Kementerian**:
  - Klasifikasi predikat hasil penilaian: 🟢 **Sehat** (nilai 80 ke atas), 🔵 **Cukup Sehat** (nilai 66 s/d 79), 🟡 **Dalam Pengawasan** (nilai 51 s/d 65), dan 🔴 **Dalam Pengawasan Khusus** (nilai di bawah 51).
- **Simpanan Pokok & Wajib Diakui sebagai Modal Sendiri**:
  - Penghitungan modal sendiri kini mencakup simpanan pokok dan simpanan wajib anggota sesuai undang-undang koperasi.

### 🧭 Penataan Urutan Menu Sesuai Alur Kerja Harian
- **Urutan Menu Lebih Terstruktur**:
  - **Master Data**: Mengelompokkan pengaturan jenis pinjaman dan biaya pinjaman agar berdampingan, diikuti kode transaksi dan daftar akun perkiraan.
  - **Transaksi**: Menempatkan *Kas Masuk & Keluar* di urutan teratas untuk operasional harian teller, disusul modul Simpanan, Pinjaman, dan Jurnal Keuangan.
  - **Laporan Keuangan**: Disusun berurutan sesuai alur pembukuan standar: *Neraca* ➔ *Laba Rugi* ➔ *Pertumbuhan SHU* ➔ *Arus Kas* ➔ *Perubahan Modal* ➔ *Buku Besar* ➔ *Pemeriksaan Saldo* ➔ *Kepatuhan Kemenkop* ➔ *Tingkat Kesehatan*.
  - **Sistem**: Menempatkan menu *RAT & Akhir Tahun* di bagian paling atas kelompok Sistem.

### 🛡️ Pemeriksaan Keseimbangan Saldo Pembukuan (100% Seimbang)
- **Keseimbangan Modul vs Buku Besar**:
  - Memastikan saldo pembukuan Simpanan Pokok, Simpanan Wajib, Simpanan Sukarela, dan Piutang Pinjaman seluruh anggota 100% seimbang terhadap saldo Buku Besar Akuntansi dengan selisih Rp 0.
- **Pencegahan Selisih di Masa Depan**:
  - Sistem otomatis mengenali pencatatan simpanan dari potongan pencairan pinjaman dan pelunasan angsuran pembaruan pinjaman secara akurat.

### 📈 Laporan Pertumbuhan SHU (Bulanan & Tahunan)
- **Grafik Pertumbuhan Antar Bulan**: Analisis kinerja 12 bulan dalam satu tahun buku untuk memantau pendapatan, beban, dan SHU bersih antar bulan.
- **Grafik Pertumbuhan Antar Tahun**: Analisis tren pendapatan dan SHU koperasi dari tahun ke tahun.
- **Ekspor Dokumen**: Dilengkapi diagram grafik, kartu ringkasan kinerja, cetak PDF resmi, dan ekspor ke Excel.

### 💵 Laporan Arus Kas & Kunci Tutup Buku Akhir Periode
- **Laporan Arus Kas Standar Akuntansi**: Mengelompokkan arus uang masuk dan keluar menjadi 3 aktivitas (Operasional, Investasi, dan Pendanaan) dengan verifikasi saldo kas riil terhadap neraca.
- **Kunci Periode Pembukuan (Tutup Buku)**: Fitur penguncian buku berkala agar data transaksi simpanan, pinjaman, angsuran, dan jurnal pada bulan/tahun yang sudah ditutup tidak bisa diubah atau dihapus secara tidak sengaja.

---

## [v2.1.9] - 2026-08-19

### 🛠️ Perbaikan & Penyempurnaan Sistem
- **Potongan Simpanan Wajib Saat Pencairan Pinjaman**: Memperbaiki pencatatan agar potongan simpanan wajib saat anggota mencairkan pinjaman selalu masuk ke rekening Simpanan Wajib secara tepat dan tidak tertukar.

---

## [v2.1.8] - 2026-08-19

### 🎨 Pembaruan Tampilan & Kenyamanan Pengguna
- **Tampilan Baru Transaksi Kas Masuk & Keluar**: Tampilan baris transaksi kas kini dapat dibuka untuk melihat rincian pembukuan akuntansi secara langsung.
- **Tombol Ekspor Langsung**: Menambahkan tombol unduh PDF dan Excel langsung dari daftar riwayat kas.
- **Fitur Pembatalan Transaksi Kas (Reversal)**: Menambahkan tombol pembatalan transaksi kas yang mudah digunakan jika kasir salah melakukan penginputan.

---

## [v2.1.7] - 2026-08-15

### ✨ Fitur Baru
- **Pencarian Simpanan Berdasarkan Rentang Tanggal**: Menambahkan pilihan tanggal awal dan tanggal akhir pada daftar simpanan untuk mempermudah pencarian setoran atau penarikan pada tanggal tertentu, lengkap dengan tombol cetak laporan.

---

## [v2.1.6] - 2026-08-15

### ✨ Fitur Baru
- **Pembaruan Pinjaman Lebih dari 1 Pinjaman Lama Sekaligus (Multi-Refinancing)**: Anggota kini dapat mengajukan satu pinjaman baru untuk melunasi sisa beberapa pinjaman lama sekaligus dalam satu kali pengajuan.
- **Pengaturan Bunga & Denda Berjalan yang Fleksibel**: Petugas dapat menyesuaikan potongan bunga atau denda berjalan untuk masing-masing pinjaman lama yang dilunasi.
- **Kalkulator Kas Bersih Otomatis**: Layar persetujuan langsung menampilkan jumlah uang bersih yang akan diterima oleh anggota setelah dipotong pelunasan pinjaman lama dan biaya administrasi.
- **Pembatalan Aman**: Jika pencairan pinjaman pembaruan dibatalkan, status pinjaman lama otomatis aktif kembali ke kondisi semula.

---

## [v2.1.5] - 2026-08-15

### 🛠️ Perbaikan & Penyempurnaan Sistem
- **Ketepatan Filter Tanggal Laporan Keuangan**: Memperbaiki penghitungan saldo pada laporan Neraca, Buku Besar, dan Penilaian Kesehatan agar hanya menjumlahkan transaksi dalam rentang tanggal yang dipilih.
- **Pencatatan Sisa Pinjaman yang Tepat**: Menyesuaikan pencatatan sisa pokok pinjaman baru agar selalu akurat terhadap nilai plafon pokok pinjaman, mencegah potensi selisih saldo di masa depan.

---

## [v2.1.4] - 2026-07-07

### 🎨 Pembaruan Tampilan & Kenyamanan Pengguna
- **Tombol Menu Aksi yang Ringkas**: Menggantikan deretan tombol panjang pada tabel Simpanan dan Angsuran dengan satu tombol dropdown **"Aksi"** yang rapi, sehingga tabel lebih lega dan nyaman dibaca.

---

## [v2.1.3] - 2026-07-07

### ✨ Fitur Baru
- **Cetak Struk Kasir Printer Thermal (Ukuran 58mm / 80mm)**: Menambahkan tombol cetak struk kasir ukuran kertas struk kecil pada transaksi simpanan dan pembayaran angsuran, lengkap dengan nama kasir dan tempat tanda tangan anggota.

---

## [v2.1.2] - 2026-07-07

### ✨ Fitur Baru
- **Pintasan Langsung ke Sumber Transaksi**: Menambahkan tombol "Buka Transaksi" pada rincian jurnal otomatis untuk langsung menuju ke data simpanan atau pinjaman aslinya.
- **Tanda Transaksi yang Pernah Diedit**: Transaksi yang pernah mengalami koreksi ditandai dengan badge khusus berwarna kuning. Mengklik badge akan memperlihatkan riwayat lengkap perubahan data sebelum dan sesudah diedit.

---

## [v2.1.1] - 2026-07-07

### ✨ Fitur Baru & Pembaruan Tampilan
- **Koreksi Jurnal Umum & Angsuran**: Petugas yang berwenang dapat mengoreksi keterangan, tanggal, atau nominal pada catatan Jurnal Umum dan pembayaran Angsuran jika terdapat kekeliruan input.
- **Penyederhanaan Kolom Tabel**: Rincian pokok pinjaman, bunga, dan denda digabung menjadi satu kolom informasi yang rapi dan hemat tempat.

---

## [v2.1.0] - 2026-07-07

### ✨ Fitur Baru
- **Metode Pembayaran Transfer Bank**: Pilihan metode bayar Transfer Bank lengkap dengan pemilihan rekening bank koperasi tujuan pada modul Simpanan, Angsuran, Pinjaman, dan Jurnal.
- **Penyaringan Berdasarkan Metode Bayar**: Memfilter transaksi berdasarkan pembayaran Tunai atau Transfer Bank.

---

## [v2.0.5] - 2026-06-24

### ✨ Fitur Baru & Perbaikan
- **Pintasan Cepat Setoran Simpanan Wajib**: Tombol cepat untuk langsung mencatat setoran Simpanan Wajib anggota dari halaman pemantauan simpanan wajib.
- **Tampilan Tabel Simpanan Lebih Rapi**: Tampilan baris data simpanan dibuat lebih kompak dan menyertakan nomor rekening simpanan.

---

## [v2.0.4] - 2026-05-20

### 📄 Peningkatan Kualitas Cetak Dokumen PDF
- **Desain Laporan PDF Standar Resmi**: Menghadirkan tampilan header bergradien rapi, garis aksen subjudul, dan keterangan nomor halaman (*Halaman X dari Y*) pada seluruh laporan koperasi.
- **Ukuran Lebar Kolom Otomatis**: Kolom teks keterangan otomatis diberi ruang lebih luas, sedangkan kolom angka nominal menyesuaikan agar tidak ada teks yang terpotong.
- **Pewarnaan Status Transaksi yang Jelas**: Warna status (LANCAR, MACET, PENDING, LUNAS) tampil rapi dan mudah dibaca pada lembaran PDF.

---

## [v2.0.1] - 2026-05-10

### ✨ Fitur Baru & Tampilan
- **Logo & Nama Koperasi Dinamis di Halaman Masuk**: Halaman login langsung menampilkan nama resmi dan logo koperasi sesuai pengaturan lembaga.
- **Tanda Tangan Digital Kode QR pada Surat Pinjaman (SPK)**: Dokumen Surat Persetujuan Pinjaman kini dilengkapi kode QR resmi untuk membuktikan keaslian dokumen secara instan.
- **Halaman Detail Anggota Modern**: Informasi anggota ditata dalam tab-tab rapi (Ringkasan, Simpanan, Pinjaman, dan Profil) lengkap dengan grafik kemajuan pelunasan pinjaman.
- **Panel Pemantauan Kesehatan Finansial**: Ringkasan persentase kredit macet, penambahan anggota baru, dan perputaran transaksi kas di beranda utama pengurus.
- **Tombol Pintas Aksi Cepat**: Tombol bulat di pojok layar untuk mencatat simpanan, pinjaman, atau pendaftaran anggota baru secara instan dari halaman mana saja.

---

## [v1.8.0] - 2026-05-07

### ✨ Fitur Baru
- **Ringkasan Total Saldo Pinjaman per Jenis**: Menampilkan kartu ringkasan total saldo berdasarkan jenis pinjaman (misal: Pinjaman Reguler, Insidental, Konsumtif) di bagian atas laporan.
- **Saring Data Cukup Klik Kartu**: Pengurus dapat menyaring tabel laporan hanya dengan mengklik kartu jenis pinjaman yang diinginkan.

---

## [v1.7.0] - 2026-05-03

### ✨ Fitur Baru
- **Sistem Pembatalan Transaksi yang Aman (Reversal)**: Membatalkan transaksi salah input pada Jurnal, Simpanan, Angsuran, atau Pencairan Pinjaman tanpa menghapus catatan asli, sehingga tetap memenuhi standar audit pembukuan.
- **Label Transaksi Batal**: Transaksi yang telah dibatalkan ditandai dengan badge jelas `DIBATALKAN` pada tabel.

---

## [v1.6.0] - 2026-04-22

### ✨ Fitur Baru
- **Pemantauan Aktivitas Aplikasi HP Anggota**: Pengurus dapat melihat jumlah anggota yang sedang aktif membuka aplikasi HP koperasi, membedakan pengguna HP Android, iPhone, maupun komputer desktop.

---

## [v1.5.0] - 2026-04-22

### ✨ Fitur Baru & Tampilan
- **Pengurutan Kolom Laporan**: Mengklik judul kolom tabel laporan saldo simpanan kini otomatis mengurutkan data dari nilai tertinggi ke terendah atau sebaliknya.
- **Dukungan Simpanan Partisipatif**: Menambahkan produk Simpanan Partisipatif pada laporan simpanan dan aplikasi anggota.

---

## [v1.4.0] - 2026-03-13

### ✨ Fitur Baru
- **Unggah Logo Resmi Koperasi**: Pengurus dapat mengunggah file logo koperasi pada halaman Pengaturan, yang otomatis tampil di aplikasi dan kop surat cetak laporan.

---

## [v1.3.0] - 2026-03-09

### ✨ Fitur Baru
- **Pencadangan & Pemulihan Data Koperasi (Backup & Restore)**: Fasilitas untuk mengunduh berkas cadangan database koperasi secara mandiri demi keamanan arsip data lembaga.

---

## [v1.2.0] - 2026-03-09

### ✨ Fitur Baru
- **Catatan Jejak Aktivitas Petugas (Audit Log)**: Sistem otomatis mencatat riwayat penambahan, pengubahan, atau penghapusan transaksi beserta nama petugas yang melakukannya untuk transparansi operasional.

---

## [v1.1.0] - 2026-03-05

### ✨ Fitur Baru
- **Modul Rapat Anggota Tahunan (RAT) & Pembagian SHU**:
  - Fasilitas pencatatan agenda RAT dan pengundian nomor undian doorprize bagi anggota yang hadir.
  - Pembagian SHU (Sisa Hasil Usaha) otomatis berdasarkan Jasa Modal dan Jasa Anggota, serta pencegahan pembagian SHU ganda.

---

## [v1.0.0] - 2026-03-01

### ✨ Rilis Perdana Aplikasi Koperasi Simpan Pinjam
- **Manajemen Anggota**: Pendaftaran anggota baru, perubahan data profil, dan penonaktifan anggota.
- **Modul Simpanan**: Pengelolaan jenis simpanan (Pokok, Wajib, Sukarela), pencatatan setoran, penarikan, dan buku mutasi tabungan.
- **Modul Pinjaman**: Pengajuan pinjaman, persetujuan pengurus, pencairan dana, pembayaran angsuran berkala, dan pencatatan jaminan/agunan.
- **Modul Pembukuan Keuangan**: Jurnal umum, buku besar, neraca keuangan, dan perhitungan laba rugi.
- **Laporan Lengkap Koperasi**: Laporan saldo simpanan, buku tabungan, laporan portofolio pinjaman, baki debet, tingkat kolektibilitas kredit, dan kartu angsuran pinjaman.
- **Hak Akses Pengguna (RBAC)**: Pembagian kewenangan yang aman antara Administrator, Pengurus, Petugas Kasir, dan Anggota Koperasi.
- **Aplikasi Anggota di Ponsel (PWA)**: Anggota dapat mengecek saldo simpanan, jadwal angsuran pinjaman, dan mutasi transaksi secara mandiri melalui HP.
- **Pengumuman Koperasi**: Fasilitas penyampaian berita dan pengumuman resmi koperasi kepada seluruh anggota.
- **Pilihan Tema Warna Aplikasi**: Pengaturan warna tampilan sistem yang dapat disesuaikan dengan identitas koperasi Anda.
