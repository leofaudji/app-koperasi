# Riwayat Perubahan Portal Anggota

Semua pembaruan fitur dan perbaikan pada aplikasi portal anggota didokumentasikan di sini.

---

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
