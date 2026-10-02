# PRD - 11: Kepatuhan Regulasi Kemenkop UKM dan Penilaian Kesehatan Koperasi (KKPKK)

## 1. Ikhtisar & Landasan Hukum Kontemporer
Modul Kepatuhan Regulasi dan Kesehatan Koperasi berfungsi mengukur kelayakan, tata kelola, dan solvabilitas finansial koperasi secara objektif berdasarkan kerangka hukum perkoperasian Indonesia kontemporer.

Modul ini telah diselaraskan penuh dengan:
1. **Peraturan Menteri Koperasi dan UKM No. 9 Tahun 2020** tentang Pengawasan Koperasi.
2. **Peraturan Menteri Koperasi dan UKM No. 2 Tahun 2024** tentang Tata Kelola Koperasi dan Klasifikasi Usaha Koperasi.
3. **Peraturan Menteri Koperasi dan UKM No. 8 Tahun 2023** tentang Penyelenggaraan Usaha Simpan Pinjam oleh Koperasi.
4. **Instrumen Kertas Kerja Pemeriksaan Kesehatan Koperasi (KKPKK)** resmi Kemenkop UKM.

---

## 2. Kertas Kerja Pemeriksaan Kesehatan Koperasi (KKPKK 4 Pilar)

Pemeriksaan kesehatan dilakukan melalui menu **Tingkat Kesehatan** (`#/kesehatan-koperasi`) dengan bobot total 100% yang terbagi ke dalam 4 pilar utama:

```text
┌────────────────────────────────────────────────────────────────────────┐
│        KERTAS KERJA PEMERIKSAAN KESEHATAN KOPERASI (KKPKK)             │
│                                                                        │
│   ┌─────────────────────┐   ┌─────────────────────┐                    │
│   │ 1. TATA KELOLA      │   │ 2. PROFIL RISIKO    │                    │
│   │    Bobot: 30%       │   │    Bobot: 15%       │                    │
│   └─────────────────────┘   └─────────────────────┘                    │
│   ┌─────────────────────┐   ┌─────────────────────┐                    │
│   │ 3. KINERJA KEUANGAN │   │ 4. PERMODALAN       │                    │
│   │    Bobot: 40%       │   │    Bobot: 15%       │                    │
│   └─────────────────────┘   └─────────────────────┘                    │
│                                                                        │
│   SKOR AKHIR = (P1 × 30%) + (P2 × 15%) + (P3 × 40%) + (P4 × 15%)      │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Pilar 1: Tata Kelola (Bobot 30%)
Menilai kepatuhan aspek kelembagaan dan akuntabilitas kepengurusan:
- **Prinsip Koperasi**: Kepatuhan keanggotaan aktif dan keterlibatan anggota.
- **Kelembagaan & Legalitas**: Kepemilikan Nomor Induk Koperasi (NIK) yang valid, AD/ART resmi, dan izin usaha simpan pinjam.
- **Manajemen & Akuntabilitas**:
  - Penyelenggaraan RAT tepat waktu (maksimal 6 bulan setelah tutup tahun buku).
  - Transparansi pembukuan: Kepatuhan standar akuntansi SAK EP dan audit saldo GL (rekonsiliasi saldo 100% balance).

### 2.2 Pilar 2: Profil Risiko (Bobot 15%)
Mengevaluasi risiko operasional dan eksposur portofolio kredit:
- **Risiko Pembiayaan / Kredit (NPL)**:
  - Rasio kredit bermasalah (Kolektibilitas 3, 4, dan 5) terhadap total baki debet pinjaman. Standar ideal: $\text{NPL} \le 5\%$.
- **Risiko Likuiditas (Cash Ratio)**:
  - Rasio ketersediaan kas dan setara kas terhadap kewajiban simpanan sukarela jangka pendek. Standar ideal: $\text{Cash Ratio} \ge 10\%$.
- **Kecukupan Cadangan Risiko**: Pembentukan cadangan penyisihan penghapusan piutang (PPAP).

### 2.3 Pilar 3: Kinerja Keuangan (Bobot 40%)
Mengevaluasi efisiensi operasional dan rentabilitas aset:
- **Rentabilitas Aset (Return on Assets / ROA)**:
  $$\text{ROA} = \frac{\text{SHU Sebelum Pajak}}{\text{Total Aset}} \times 100\%$$
- **Rentabilitas Ekuitas (Return on Equity / ROE)**:
  $$\text{ROE} = \frac{\text{SHU Setelah Pajak}}{\text{Total Modal Sendiri}} \times 100\%$$
- **Efisiensi Beban Operasional (BOPO)**:
  $$\text{BOPO} = \frac{\text{Total Beban Operasional}}{\text{Total Pendapatan Operasional}} \times 100\% \quad (\text{Standar} < 90\%)$$
- **Kemandirian Operasional**: Kemampuan pendapatan jasa membiayai seluruh operasional koperasi tanpa ketergantungan utang luar.

### 2.4 Pilar 4: Permodalan (Bobot 15%)
Menilai ketahanan permodalan koperasi dalam menyerap risiko:
- **Rasio Modal Sendiri terhadap Total Aset**:
  Modal Sendiri mencakup Simpanan Pokok (212), Simpanan Wajib (213), Simpanan Partisipatif (214), dan Dana Cadangan (215). Standar sehat: $\ge 20\%$.
- **Capital Adequacy Ratio (CAR)**: Kecukupan modal sendiri terhadap Aktiva Tertimbang Menurut Risiko (ATMR).

---

## 3. Standar Nomenklatur Predikat Resmi Kemenkop UKM

Hasil akumulasi skor dari 4 pilar diklasifikasikan ke dalam 4 tingkatan predikat resmi:

| Nilai Skor Akhir | Predikat Resmi | Indikator Visual | Keterangan Tindak Lanjut Pengawasan |
| :---: | :---: | :---: | :--- |
| **80,00 – 100,00** | 🟢 **SEHAT** | Badge Hijau | Koperasi berkinerja prima, tata kelola baik, risiko terkendali. |
| **66,00 – < 80,00** | 🔵 **CUKUP SEHAT** | Badge Biru | Koperasi berkinerja baik, memiliki sedikit catatan minor. |
| **51,00 – < 66,00** | 🟡 **DALAM PENGAWASAN** | Badge Kuning | Koperasi memerlukan perbaikan manajemen dan restrukturisasi portofolio kredit. |
| **< 51,00** | 🔴 **DALAM PENGAWASAN KHUSUS** | Badge Merah | Koperasi dalam kondisi kritis; pembatasan penyaluran kredit dan pendampingan dinas. |

---

## 4. Dashboard Kepatuhan Kemenkop UKM (`#/kepatuhan-kemenkop`)

Menu khusus yang dirancang untuk mempermudah pelaporan berkala ke Dinas Koperasi dan Kementerian Koperasi & UKM:

### 4.1 Klasifikasi Kelompok Usaha Koperasi (KUK 1 – 4)
Sesuai Permenkop UKM No. 2 Tahun 2024, koperasi diklasifikasikan secara otomatis berdasarkan kapasitas usahanya:
- **KUK 1**: Modal Sendiri s/d Rp 2,5 Miliar, Total Aset s/d Rp 5 Miliar, Anggota s/d 5.000 orang.
- **KUK 2**: Modal Sendiri > Rp 2,5 M s/d Rp 15 Miliar, Total Aset > Rp 5 M s/d Rp 50 Miliar, Anggota > 5.000 s/d 9.000 orang.
- **KUK 3**: Modal Sendiri > Rp 15 M s/d Rp 40 Miliar, Total Aset > Rp 50 M s/d Rp 500 Miliar, Anggota > 9.000 s/d 20.000 orang.
- **KUK 4**: Modal Sendiri > Rp 40 Miliar, Total Aset > Rp 500 Miliar, Anggota > 20.000 orang.

### 4.2 Evaluasi 7 Rasio Prudensial Koperasi
1. **Batas Maksimum Pemberian Pinjaman (BMPP)**: Pinjaman terbesar kepada satu anggota tidak boleh melampaui $20\%$ dari modal sendiri koperasi.
2. **Rasio Kas / Likuiditas (Cash Ratio)**: Kesiapan kas likuid memenuhi penarikan anggota.
3. **Rasio Solvabilitas (Debt to Equity Ratio / DER)**: Rasio total hutang luar terhadap modal sendiri.
4. **Rasio Kredit Bermasalah (NPL)**: Rasio pinjaman macet terhadap total pinjaman.
5. **Rasio Kemandirian Modal Sendiri**: Proporsi modal internal terhadap total aset.
6. **Return on Equity (ROE)**: Kemampuan menghasilkan SHU bagi anggota.
7. **Return on Assets (ROA)**: Efektivitas penggunaan total aset koperasi.

### 4.3 Matriks Profil Online Data System (ODS)
- Pengecekan kelengkapan data administratif untuk sinkronisasi ke portal ODS Kemenkop UKM (Nomor Badan Hukum, NIK Koperasi, Tanggal Pengesahan Kemenkumham, Status Sertifikat Standar, NPWP Koperasi).

---

## 5. Ekspor Dokumen Resmi KKPKK

- Antarmuka menyediakan tombol **"Cetak KKPKK (PDF)"**.
- Dokumen dicetak dalam format resmi lembar kerja kementerian ber-kop surat lengkap, memuat rincian tabel per pilar skor, catatan auditor pengawas, serta blok 3 tanda tangan legal (*Pengawas*, *Ketua*, dan *Bendahara*).

---

## 6. Spesifikasi Endpoint API Kesehatan & Kemenkop

| Method | Endpoint | Fungsi | Hak Akses |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/kesehatan` | Menghitung skor KKPKK 4 pilar & predikat resmi | `keuangan.laba_rugi` |
| `GET` | `/api/kemenkop` | Dashboard KUK 1-4, 7 rasio prudensial, profil ODS | `keuangan.laba_rugi` |
