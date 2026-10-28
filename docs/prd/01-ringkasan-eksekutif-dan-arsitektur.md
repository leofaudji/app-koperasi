# PRD - 01: Ringkasan Eksekutif dan Arsitektur Sistem

## 1. Ringkasan Eksekutif (Executive Summary)

### 1.1 Visi Produk
Mewujudkan platform tata kelola Koperasi Simpan Pinjam modern yang transparan, akuntabel, patuh regulasi perundang-undangan Indonesia (Permenkop UKM & SAK EP), serta memberikan kemudahan layanan finansial digital dua arah:
1. **Backoffice Administrasi Koperasi**: Menyediakan sistem terintegrasi bagi Pengurus, Manajer, Kasir/Teller, dan Bagian Pembukuan untuk mengelola keanggotaan, operasional simpan-pinjam, pelaporan keuangan berstandar akuntansi publik, dan evaluasi tingkat kesehatan koperasi secara real-time.
2. **Portal Anggota Mandiri (PWA)**: Menyediakan aplikasi web progresif ringan bagi anggota koperasi untuk memantau tabungan, mengecek tagihan angsuran terdekat, melakukan pembayaran angsuran mandiri melalui saldo Simpanan Sukarela, mengajukan pinjaman online, dan mengunduh bukti transaksi secara transparan dari perangkat smartphone.

---

## 2. Arsitektur Sistem & Technology Stack

Sistem dirancang dengan arsitektur **Lightweight Modular Monolith** yang memisahkan antara Presentation Layer (SPA & PWA), Service/API Routing Layer, Data Persistence Layer, dan Caching Layer.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                              │
│                                                                        │
│   ┌─────────────────────────────┐    ┌─────────────────────────────┐   │
│   │    Backoffice Web App       │    │     Portal Anggota (PWA)    │   │
│   │  (index.html + app.js)      │    │  (portal/index.html + sw)   │   │
│   │  - SPA Hash Routing         │    │  - Mobile-First Responsive  │   │
│   │  - jsPDF Engine + Thermal   │    │  - Offline Cache Capability │   │
│   │  - Chart.js Dashboard       │    │  - Push/Live Notification   │   │
│   └──────────────┬──────────────┘    └──────────────┬──────────────┘   │
└──────────────────┼──────────────────────────────────┼──────────────────┘
                   │ HTTP/JSON (RESTful API)          │
                   ▼                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND API LAYER (PHP)                         │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ api/index.php (Front Controller & Centralized Router)          │   │
│   │ - Session Manager (Redis Session / Cookie Hardening)           │   │
│   │ - Middleware: auth.php, rbac.php, csrf.php                     │   │
│   │ - Helpers: finance_helpers.php, Audit Logging, Numbering       │   │
│   └──────────────────────────────┬─────────────────────────────────┘   │
│                                  │                                     │
│   ┌──────────────────────────────▼─────────────────────────────────┐   │
│   │ Controllers (30+ Domain Controllers)                           │   │
│   │ Anggota, Simpanan, Pinjaman, Angsuran, Keuangan, Kesehatan,    │   │
│   │ PerubahanEkuitas, Kemenkop, RAT, Portal, Audit, Backup, dll.   │   │
│   └──────────────────────────────┬─────────────────────────────────┘   │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌────────────────────────────────┐       ┌────────────────────────────────┐
│      PERSISTENCE LAYER         │       │        CACHING LAYER           │
│                                │       │                                │
│   MySQL / MariaDB (InnoDB)     │       │   Redis In-Memory Store        │
│   - UTF8mb4 Unicode            │       │   - Session Store (phpredis)   │
│   - Relational Foreign Keys    │       │   - Query & Report Caching     │
│   - ACID Transactions          │       │   - Invalidation by Domain     │
└────────────────────────────────┘       └────────────────────────────────┘
```

### 2.1 Spesifikasi Technology Stack

| Komponen | Teknologi Terpilih | Justifikasi & Karakteristik |
| :--- | :--- | :--- |
| **Backend Core** | PHP Native 7.4 / 8.x | Arsitektur ringan, cepat, tanpa overhead framework berat, mudah dideploy pada hosting/cPanel/VPS standar (Laragon / LAMP / LEMP). |
| **Database** | MySQL 5.7+ / 8.0 / MariaDB 10.3+ | Engine InnoDB dengan integritas referensial foreign key dan transaksi multi-tabel (`BEGIN`, `COMMIT`, `ROLLBACK`). |
| **In-Memory Cache** | Redis 5.0+ (`phpredis` / socket) | Menyimpan sesi pengguna terenkripsi, caching laporan berat (Neraca, GL, Kesehatan, Ekuitas), invalidasi cerdas. |
| **Frontend Backoffice** | Vanilla JavaScript (ES6+), HTML5 | Single Page Application (SPA) berbasis hash routing (`#/`), rendering komponen modular tanpa bundle build step. |
| **Frontend Portal** | PWA (Progressive Web App) | Service Worker caching (`v77`), `manifest.json`, dapat di-install di layar utama HP Android/iOS layaknya aplikasi native. |
| **Ikonografi & Desain** | Remix Icon (`ri-*`), CSS Variables | Sistem tema dinamis (8 pilihan warna: Indigo, Violet, Biru, Cyan, Hijau, Oranye, Merah, Abu-abu) & Dark/Light mode. |
| **Visualisasi Data** | Chart.js | Visualisasi portofolio simpanan/pinjaman, grafik MoM laba rugi, dan rasio likuiditas. |
| **Laporan Cetak** | jsPDF + jsPDF-AutoTable | Mesin generasi dokumen PDF otomatis di browser dengan kop resmi, dynamic page break, auto-width, dan proteksi text overlap. Dimuat non-blocking (`defer`). |
| **Cetak Kasir** | Raw HTML POS Thermal Print | Format cetak struk kasir thermal 76mm/80mm untuk printer kasir bluetooth/USB. |
| **Voucher Kasir** | Dynamic Iframe Printing | Cetak voucher bukti kas resmi (BKM, BKK, BMK) berstandar akuntansi dengan kop resmi dan 4 tanda tangan via iframe terisolasi. |
| **Mikro Telemetri** | Pure SVG Micro Sparklines | Kurva tren dinamis dengan Bézier smoothing & pulsing beacon pada kartu KPI tanpa dependensi pustaka berat. |
| **Kerapatan Tabel** | Dual-Density Mode Controller | Pengatur kerapatan tampilan tabel (`Comfortable` vs `Compact`) tersimpan persisten di `localStorage`. |
| **Bilah Ringkasan** | Sticky Floating Table Summary | Auto-docking bottom summary bar cerdas berbasis scroll observer dengan fitur minimize dan scroll-to-table. |

### 2.2 Arsitektur Akselerasi Kinerja (High-Performance Admin Engine)

Untuk menjamin responsivitas antarmuka berkecepatan tinggi (*sub-second response time*) dan pengalaman pengguna instan:

1. **Instant 0ms Module Prefetching on Hover**:
   - Sistem mendengarkan event sentuhan mouse (`pointerenter`) pada tautan sidebar. Modul JavaScript halaman target (`assets/js/pages/[page].js`) diunduh lebih awal sebelum pengguna melakukan klik, menghilangkan jeda unduh sehingga transisi halaman terjadi dalam 0 ms.
2. **Transparent In-Memory Master-Data Caching & In-Flight Promise Pooling**:
   - Master data yang sering dipanggil berulang di berbagai modal (`keuangan/akun`, `jenis-simpanan`, `jenis-pinjaman`, `kode-transaksi`, `roles`, `settings`, `menus`) di-cache di memori browser dengan masa berlaku (TTL) 5 menit (`App.cachedApi`).
   - Dilengkapi *In-Flight Promise Pooling* guna mencegah duplikasi request HTTP ketika beberapa komponen/dropdown meminta endpoint yang sama dalam milidetik yang sama.
   - Cache otomatis diinvalidsi (*Auto Cache Invalidation*) seketika terjadi aksi mutasi data (`POST`, `PUT`, `DELETE`).
3. **Pelepasan Kunci Sesi PHP (Non-Blocking Concurrency)**:
   - Pada seluruh endpoint `GET` read-only, backend memanggil `session_write_close()` sebelum controller dieksekusi.
   - Mengatasi batasan *session lock* native PHP sehingga browser dapat menjalankan multiple AJAX parallel requests (misal: agregat KPI, grafik, dan tabel data) tanpa terhambat antrean serial (*serialized request unblocking*).
4. **Kompresi Jaringan & Browser Asset Caching (`.htaccess`)**:
   - Mengaktifkan `mod_deflate` (Gzip) untuk kompresi berkas HTML, CSS, JS, JSON, SVG, dan Font, memangkas bobot transfer jaringan 70% – 80%.
   - Mengaktifkan `mod_expires` untuk caching aset statis gambar, logo, ikon, dan berkas font di memori browser pengguna.
5. **Resource Hints & Deferred Heavy Libraries**:
   - `<link rel="preconnect">` dan `<link rel="dns-prefetch">` pada `<head>` dokumen utama untuk Google Fonts dan CDN pihak ketiga, memangkas *First Contentful Paint (FCP)* sebesar 150ms – 300ms.
   - Pustaka berbobot besar (`jspdf.umd.min.js`, `jspdf-autotable`, `qrcode.min.js`) dimuat secara tertunda (`defer`) tanpa memblokir thread rendering browser.
6. **Global Unified Table Search Auto-Debounce (350ms)**:
   - Pendengar event pencarian global otomatis (`assets/js/app.js`) untuk seluruh input tabel data (`anggota-search`, `simp-search`, `pnj-search`, `ags-search`, `kas-search`, `jrn-search`).
   - Pemfilteran data aktif secara otomatis 350ms pasca ketukan terakhir dengan mekanisme *Cursor & Focus Preservation* sehingga pengguna dapat mengetik tanpa terputus ketika tabel melakukan render ulang.
7. **Smart Background Polling Guard**:
   - Polling berkala (notifikasi & sinkronisasi data) otomatis dijeda saat tab browser diminimalkan atau tidak aktif (`document.visibilityState === 'hidden'`), menghemat konsumsi daya CPU klien dan bandwidth server.
8. **Indeks Strategis Basis Data Produksi**:
   - Penerapan indeks komposit pada kolom-kolom query kritis (`pinjaman.status`, `pinjaman.tgl_pencairan`, `angsuran.status`, `angsuran.tgl_bayar`, `angsuran.tgl_jatuh_tempo`, `simpanan.tgl_transaksi`, `anggota.nama`, `anggota.status`).
9. **Fintech-Grade SVG Micro Sparklines (Zero-Library Footprint)**:
   - Kartu metrik KPI (Dashboard dan Transaksi Kas) dirender menggunakan SVG Bézier wave smoothing murni (`M x1 y1 C cx1 cy1, cx2 cy2, x2 y2...`) dengan area gradient fill semi-transparan dan titik ujung pulsing beacon aktif.
   - Zero-dependency: tidak menambah payload library grafik eksternal, dieksekusi secara instan (<2ms) di sisi klien dengan auto-scaling nilai minimum/maksimum dinamis.
10. **Dual-Density Display Modes (Comfortable vs Compact)**:
   - Pengontrol kerapatan visual tabel data global (`body.table-compact-mode`) yang memadatkan tinggi baris, padding sel (*cell padding* 6px-8px), serta ukuran font indikator untuk meningkatkan rasio informasi yang tampil di layar hingga 35-40% lebih banyak.
   - Pengguna dapat beralih mode kapan saja melalui tombol switcher di header navigasi maupun toolbar lokal di atas masing-masing tabel dengan status preferensi tersimpan otomatis di `localStorage`.
11. **Sticky Floating Table Summary Bar (Smart Auto-Docking)**:
   - Pengait bilah ringkasan melayang (`App.attachStickySummary`) yang memantau visibilitas tabel data keuangan panjang (Buku Besar, Arus Kas, Baki Debet, Mutasi Simpanan, Mutasi Angsuran) melalui scroll observer.
   - Ketika footer ringkasan asli tabel keluar dari batas bawah viewport, floating dock modern berdesain glassmorphism otomatis muncul merekatkan nilai total (Debit, Kredit, Baki Debet, Saldo Akhir) di bagian bawah layar.
   - Dilengkapi tombol minimize/expand dan tombol lompat cepat (*Scroll to Table*) untuk navigasi auditor yang efisien.
12. **Quick Date Chips Engine with Dynamic Active-State Tracking**:
   - Komponen filter rentang waktu instan (`App.renderDateChips`) yang menyediakan tombol pilihan cepat (*Hari Ini*, *7 Hari*, *Bulan Ini*, *Bulan Lalu*, *Tahun Ini*, *Semua Periode*).
   - Dilengkapi engine pelacak status aktif reaktif: ketika pengguna memilih chip atau mengubah tanggal secara manual melalui datepicker, sistem secara otomatis mengevaluasi kecocokan tanggal dan menandai tombol chip terkait dengan status aktif (`.date-chip.is-active`).
13. **Fintech Tabular Figures & JetBrains Mono Typography**:
   - Menerapkan font monospaced standar fintech `JetBrains Mono` yang dipadukan dengan aturan CSS `font-variant-numeric: tabular-nums slashed-zero` (`tnum` dan `zero`).
   - Seluruh digit numerik (0 s/d 9) memiliki lebar horizontal yang presisi sama, menjamin perataan vertikal sempurna pada laporan keuangan multi-kolom (Buku Besar, Arus Kas, Baki Debet) layaknya lembar kerja cetak akuntansi profesional.
14. **Physical Rubber Stamp Engine (Otentik Stempel Dokumen Koperasi)**:
   - Komponen visual `App.renderRubberStamp` yang menghasilkan efek cap stempel karet fisik dengan sudut miring manual (`-11deg`), garis ganda putus-putus (*dashed border*), tekstur tinta basah, dan animasi hentakan bantingan stempel natural.
   - Diterapkan pada kartu angsuran (*LUNAS / TERVERIFIKASI*), voucher bukti kas resmi (*BKM/BKK/BMK*), modal pelunasan pinjaman dipercepat (*LUNAS DIPERCEPAT*), dan dokumen cetak fisik/PDF.
15. **Slide-Over Drawer Inspection (Panel Samping Non-Destruktif)**:
   - Mekanisme panel samping geser kanan (*Slide-Over Drawer*) non-destruktif berarsitektur global `App.openDrawer(contentHtml, opts)` dan `App.closeDrawer()`.
   - Mengizinkan staf memeriksa profil anggota mendalam, rekening simpanan, dan portofolio pinjaman tanpa kehilangan konteks halaman (kueri pencarian, filter status, dan posisi scroll tabel master tetap terjaga utuh).
   - Dilengkapi shortcut keyboard `Escape`, backdrop blur lembut, dan integrasi tombol inspeksi instan di tabel Anggota dan Pinjaman.
16. **Human-Touch Greeting & Daily Operational Briefing Banner**:
   - Banner personal hangat di bagian atas Dashboard utama dengan ucapan salam kontekstual berbasis waktu lokal (*Pagi/Siang/Sore/Malam*), identitas nama & peran pengurus, dan tanggal ramah berbahasa Indonesia.
   - Dilengkapi rotasi harian kutipan bijak koperasi & integritas finansial (*Bung Hatta & prinsip koperasi*) serta kartu briefing operasional harian (*antrean persetujuan pinjaman, rasio likuiditas kas operasional, dan aksi cepat*).
17. **Thermal Receipt Preview with Serrated Paper Edge (Gerigi Kertas Sobek)**:
   - Modal pratinjau struk kasir termal (*58mm/80mm*) dengan efek visual gerigi kertas sobek segitiga (*saw-tooth serrated paper edge*) murni CSS gradient pada bagian atas dan bawah struk.
   - Dilengkapi tipografi monospaced tabular, stempel fisik LUNAS/TERVERIFIKASI, simulasi barcode vektor, tombol cetak langsung ke printer fisik, dan tombol salin ringkasan struk.

---

## 3. Topologi Lingkungan & Multi-Platform

Sistem terdiri dari dua titik masuk antarmuka:
1. **Sistem Pengurus & Kasir (Backoffice)**
   - Akses URL: `http://domain-koperasi/` atau `http://domain-koperasi/index.html`
   - Target Pengguna: Administrator Sistem, Petugas Kasir/Teller, Account Officer, Bagian Keuangan, Pengurus Koperasi.
   - Hak Akses: Diatur ketat melalui modul RBAC (Role-Based Access Control) berbasis izin granular.
2. **Portal Anggota Mandiri (PWA)**
   - Akses URL: `http://domain-koperasi/portal/`
   - Target Pengguna: Seluruh anggota koperasi yang terdaftar aktif.
   - Fitur Spesifik: Desain ramah sentuhan layar sentuh ponsel pintar (*mobile touch ergonomis*), biometrik/auto login, tombol autodebet tagihan instan.

---

## 4. Skema Database Inti (Entity Relationship Summary)

Sistem beroperasi di atas skema relasional yang saling mengunci secara integritas referensial:
- **`anggota`**: Menyimpan identitas tunggal anggota (No. Anggota unik, NIK 16 digit, nama, kontak, foto, status).
- **`users`**: Akun login pengurus dan anggota, berelasi ke `roles` dan secara opsional ke `anggota.id`.
- **`roles` & `permissions` & `role_permissions`**: Mengatur hak akses level modul dan aksi.
- **`jenis_simpanan` & `rekening_simpanan` & `simpanan`**: Struktur tabungan berjangka/rutin anggota beserta nomor rekening unik dan riwayat mutasi setoran/penarikan.
- **`jenis_pinjaman` & `pinjaman` & `angsuran`**: Pengelolaan akad pembiayaan, suku bunga flat, tenor, jadwal cicilan, dan denda.
- **`pengajuan_angsuran`**: Antrean verifikasi pembayaran cicilan mandiri anggota dari saldo Simpanan Sukarela.
- **`akun` & `jurnal` & `jurnal_detail`**: Inti buku besar akuntansi berpasangan (*double-entry bookkeeping*). Seluruh transaksi simpanan, pencairan pinjaman, dan angsuran terhubung ke jurnal melalui `ref_tipe` dan `ref_id`.
- **`audit_logs` & `portal_logs`**: Rekaman jejak audit perubahan data finansial dan log akses portal anggota real-time.

---

## 5. Standar Kualitas Non-Fungsional (Non-Functional Requirements)

1. **Integritas Finansial (Zero Discrepancy Standard)**:
   - Tidak boleh ada transaksi simpanan atau pinjaman yang tidak memiliki jurnal penyeimbang di buku besar.
   - Tidak ada saldo rekening simpanan bernilai negatif.
2. **Performa & Latensi**:
   - Respon API transaksi standar `< 150 ms`.
   - Pembukaan form modal operasional instan `0 ms` dari cache in-memory.
   - Laporan analitik neraca multi-tahun dengan Redis Cache `< 300 ms`.
   - Transisi navigasi halaman menu dengan prefetching hover `0 ms`.
3. **Keamanan Sesi & Transportasi**:
   - Enkripsi password menggunakan `password_hash()` algoritma Bcrypt standar industri.
   - Proteksi sesi: `HttpOnly`, `SameSite=Lax`, dan `Secure` flag saat berjalan di protokol HTTPS.
   - Proteksi CSRF (`X-CSRF-Token`) pada seluruh method mutasi data (`POST`, `PUT`, `DELETE`).
4. **Keandalan & Audit Trail**:
   - Seluruh mutasi koreksi data mencatat nilai sebelum (*old data*) dan sesudah (*new data*) dalam format JSON di `audit_logs`.
   - Reversal transaksi bersifat non-destruktif (contra-entry, tidak menghapus baris asli).
5. **Standar Interaksi Pengguna (UI/UX Fluidity)**:
   - Efek haptic ripple visual pada setiap klik tombol/tab.
   - Proteksi pengiriman data ganda (*double-click protection*) otomatis pada setiap aksi submit form.
   - Penutupan modal non-blocking via tombol keyboard `Esc` dan auto-clean up loading skeleton saat jaringan terganggu.
6. **Visibilitas Data & Kontinuitas Audit Finansial**:
   - Kontinuitas agregat numerik terjamin melalui Sticky Floating Table Summary Bar saat menavigasi tabel akuntansi multi-halaman tanpa kehilangan konteks total saldo.
   - Pengaturan kerapatan visual (Comfortable/Compact) adaptif memberikan efisiensi tinggi bagi staf pembukuan dan pengawas saat melakukan review ratusan baris data transaksi.
