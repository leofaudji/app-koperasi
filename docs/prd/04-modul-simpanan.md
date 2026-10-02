# PRD - 04: Modul Transaksi Simpanan dan Tabungan Anggota

## 1. Ikhtisar Modul
Modul Simpanan mengelola seluruh aktivitas penghimpunan dana dari anggota koperasi, mencakup pendaftaran rekening tabungan, transaksi setoran dan penarikan, monitoring kewajiban iuran rutin bulanan, pembukuan jurnal otomatis berpasangan (*double-entry*), pencetakan buku tabungan (*passbook*), hingga struk transaksi thermal POS.

---

## 2. Struktur Produk & Aturan Bisnis Simpanan

### 2.1 Simpanan Pokok (SP)
- **Karakteristik**: Syarat mutlak sahnya status keanggotaan koperasi sesuai UU Perkoperasian No. 25/1992.
- **Frekuensi & Nominal**: Disetorkan 1 (satu) kali saat pendaftaran anggota baru (misal: Rp 100.000).
- **Aturan Penarikan**: **Tidak dapat ditarik sama sekali** selama anggota masih berstatus `aktif`. Hanya dapat dicairkan apabila anggota resmi mengundurkan diri dari koperasi (`keluar`).
- **Klasifikasi Akuntansi**: Diakui sebagai bagian dari **Modal Sendiri / Ekuitas** (Akun COA `212`).

### 2.2 Simpanan Wajib (SW)
- **Karakteristik**: Iuran rutin bulanan untuk pemupukan modal kerja koperasi.
- **Frekuensi & Nominal**: Disetorkan setiap bulan dengan nominal seragam (misal: Rp 20.000 / bulan).
- **Aturan Penarikan**: Bersifat terikat; tidak dapat ditarik sewaktu-waktu dan hanya dikembalikan saat anggota keluar dari koperasi.
- **Klasifikasi Akuntansi**: Diakui sebagai bagian dari **Modal Sendiri / Ekuitas** (Akun COA `213`). Menjadi variabel pembagi dalam kalkulasi SHU Bagian Jasa Modal.

### 2.3 Simpanan Sukarela (SS)
- **Karakteristik**: Tabungan sukarela fleksibel anggota dengan fungsi transaksi harian.
- **Imbal Jasa**: Memperoleh bunga tabungan tahunan (default: 2.50% p.a.) yang dihitung dan dibukukan berkala.
- **Fleksibilitas Transaksi**: Anggota dapat menyetor dan menarik saldo sewaktu-waktu tanpa batasan frekuensi.
- **Interoperabilitas Pembayaran**: Saldo Simpanan Sukarela terintegrasi langsung dengan Modul Angsuran sebagai sumber dana autodebet / pembayaran cicilan pinjaman mandiri (*overbooking*).
- **Klasifikasi Akuntansi**: Diakui sebagai **Kewajiban Jangka Pendek / Titipan Anggota** (Akun COA `206`).

### 2.4 Simpanan Partisipatif (SPAR)
- **Karakteristik**: Instrumen modal penyertaan anggota untuk mendanai unit usaha koperasi tertentu.
- **Imbal Jasa**: Menerima bagi hasil atau jasa partisipatif berdasarkan persentase keuntungan usaha yang disepakati dalam RAT.
- **Klasifikasi Akuntansi**: Diakui sebagai bagian dari **Modal Ekuitas Partisipatif** (Akun COA `214`).

---

## 3. Manajemen Rekening Simpanan (`rekening_simpanan`)

Setiap anggota memiliki buku rekening unik untuk masing-masing jenis produk simpanan:
- **Format Nomor Rekening**: `[KODE_PRODUK]-[TAHUN][ID_ANGGOTA_5DIGIT]` (contoh: `SP-202600002`, `SW-202600002`, `SS-202600002`).
- **Integritas Saldo**:
  - Saldo rekening diperbarui secara atomik (`rekening_simpanan.saldo = saldo + jumlah_mutasi`).
  - **Integritas Mutlak**: Saldo rekening tidak boleh bernilai negatif (`saldo >= 0`). Transaksi penarikan yang melebihi saldo efektif akan diblokir oleh sistem dengan pesan error.

---

## 4. Alur Kerja Transaksi Simpanan

```text
┌─────────────────┐       ┌────────────────────────┐       ┌──────────────────────┐
│  Pilih Anggota  │ ────> │ Pilih Jenis Simpanan   │ ────> │ Tentukan Jenis:      │
│  & No. Rekening │       │ (SP, SW, SS, Partis.)  │       │ Setor (D) / Tarik (K)│
└─────────────────┘       └────────────────────────┘       └──────────┬───────────┘
                                                                      │
┌─────────────────┐       ┌────────────────────────┐                  │
│ Cetak Struk POS │ <──── │ Jurnal Otomatis &      │ <────────────────┘
│ / Nota PDF      │       │ Update Saldo Rekening  │ (Validasi Saldo & Tutup Buku)
└─────────────────┘       └────────────────────────┘
```

### 4.1 Input Transaksi Setoran & Penarikan
1. Petugas kasir memilih nama anggota (dilengkapi proteksi escape tanda petik).
2. Sistem menampilkan saldo terakhir rekening yang dipilih secara live.
3. Petugas menentukan:
   - Tanggal transaksi (default hari ini, divalidasi tidak melebihi tanggal kunci periode akuntansi).
   - Kode Transaksi (`STR` untuk setoran, `TRK` untuk penarikan).
   - Metode Pembayaran: `Tunai` (memotong/menambah akun Kas `100`/`1000`) atau `Transfer Bank` (memilih akun Bank tujuan `110`/`1100`).
   - Nominal Rupiah dan Keterangan.
4. Validasi Keamanan:
   - Jika transaksi penarikan melebihi saldo: sistem menampilkan peringatan defisit dan tombol simpan dinonaktifkan.
   - Jika tanggal transaksi berada pada periode akuntansi yang telah dikunci (tutup buku): sistem melempar error via `checkAccountingPeriodLock()`.
5. Eksekusi Transaksi (ACID Database Transaction):
   - Insert ke tabel `simpanan` (mencatat `saldo_sebelum` dan `saldo_sesudah`).
   - Update tabel `rekening_simpanan` (`saldo = saldo_sesudah`).
   - Generate No. Jurnal otomatis (`JRN...`) dan catat entri debit/kredit ke `jurnal` & `jurnal_detail`.
   - Invalidate cache Redis terkait (`member` dan `saving`).

### 4.2 Cetak Struk Kasir Thermal POS & PDF
- **Struk Thermal POS (76mm / 80mm)**: Didesain khusus untuk printer kasir thermal USB/Bluetooth. Mencantumkan logo koperasi, identitas koperasi, no. transaksi, waktu cetak, nama kasir, nama anggota, nomor rekening, jenis transaksi, nominal rupiah, saldo akhir, serta dua kolom tanda tangan (*Kasir/Teller* dan *Penyetor/Penerima*).
- **Kuitansi PDF A4**: Layout formal dokumen resmi untuk arsip fisik koperasi.

---

## 5. Fitur Monitoring Simpanan Wajib & Tunggakan

Untuk menjamin kedisiplinan pemupukan modal anggota, sistem menyediakan menu **Monitoring Simpanan Wajib** (`#/monitoring-simpanan-wajib`):
1. **Matriks 12 Bulan (Januari - Desember)**:
   - Menyajikan rekapitulasi status pembayaran iuran wajib setiap anggota per tahun berjalan.
   - **Badge Visual**:
     - 🟢 **Hijau (Lunas)**: Anggota telah menyetor simpanan wajib pada bulan tersebut.
     - 🔴 **Merah (Tertunggak)**: Anggota belum menyetor untuk bulan yang sudah jatuh tempo / lampau.
     - ⚪ **Abu-abu (Mendatang)**: Bulan kalender yang belum berjalan.
2. **Kalkulasi Tunggakan Akurat**:
   - Menghitung jumlah bulan tertunggak dan total nominal kewajiban yang harus dibayar.
   - Membedakan anggota baru yang mendaftar di tengah tahun agar tidak dihitung tertunggak untuk bulan sebelum bergabung.
3. **Shortcut Pembayaran Cepat**:
   - Tombol "Bayar Tunggakan" langsung pada baris anggota yang membuka modal transaksi simpanan dengan parameter `jenis_simpanan = SW` dan nominal otomatis terisi sejumlah tunggakan.

---

## 6. Buku Simpanan (Passbook Layout)

Menu **Buku Simpanan** (`#/buku-simpanan`) mereplikasi format fisik buku tabungan perbankan:
- **Filter**: Berdasarkan No. Anggota / Rekening dan Periode Tanggal.
- **Kolom Standar**: No, Tanggal Transaksi, Kode Sandi Transaksi, Keterangan, Mutasi Debet (Penarikan), Mutasi Kredit (Setoran), Saldo Akhir, Petugas.
- **Cetak Buku Tabungan**: Layout cetak khusus disesuaikan dengan ukuran passbook fisik atau diekspor ke PDF landscape resmi ber-kop surat koperasi.

---

## 7. Pembatalan Transaksi Simpanan (Reversal System)

Jika terjadi salah input oleh petugas kasir:
1. Tombol **"Reversal"** tersedia pada dropdown aksi baris transaksi simpanan (hanya untuk user yang memiliki izin).
2. Sistem tidak menghapus data asli (*non-destructive*), melainkan membukukan transaksi pembalik (*contra-entry*) dengan nomor bukti baru berawalan `REV...`.
3. Saldo pada `rekening_simpanan` otomatis dikembalikan ke posisi sebelum transaksi yang salah terjadi.
4. Jurnal pembalik otomatis dibentuk dengan posisi debit dan kredit ditukar.
5. Transaksi asli ditandai status visual **REVERSED** pada tabel laporan dan riwayat mutasi.

---

## 8. Spesifikasi Endpoint API Simpanan

| Method | Endpoint | Fungsi | Hak Akses |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/simpanan` | Mengambil riwayat transaksi simpanan dengan filter tanggal, produk, metode | `simpanan.view` |
| `GET` | `/api/simpanan/{id}` | Detail satu transaksi simpanan beserta info jurnal | `simpanan.view` |
| `POST` | `/api/simpanan` | Input transaksi setoran atau penarikan simpanan baru | `simpanan.create` |
| `POST` | `/api/simpanan/reverse` | Melakukan reversal non-destruktif transaksi simpanan | `simpanan.create` |
| `GET` | `/api/rekening-simpanan`| Daftar rekening simpanan anggota dan saldo aktif | `simpanan.view` |
| `GET` | `/api/simpanan/monitoring-wajib` | Matriks 12 bulan kepatuhan simpanan wajib anggota | `laporan.simpanan_saldo` |
| `GET` | `/api/simpanan/buku-tabungan` | Mengambil data passbook buku simpanan per rekening | `simpanan.view` |
