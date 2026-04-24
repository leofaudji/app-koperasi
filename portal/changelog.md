# Riwayat Perubahan Portal Anggota

Semua pembaruan fitur dan perbaikan pada aplikasi portal anggota didokumentasikan di sini.

---

## [1.3.1] - 2026-04-24
### Infrastructure Modernization
Refaktor besar-besaran pada arsitektur kode untuk performa dan skalabilitas.
- Pemisahan logika JavaScript dari file index ke file modular `portal.js`.
- Implementasi mekanisme `forceUpdate()` untuk sinkronisasi versi yang lebih handal.
- Optimasi pemuatan aset melalui Service Worker v42.
- Peningkatan manajemen cache untuk mencegah tampilan antarmuka yang usang (stale UI).

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
