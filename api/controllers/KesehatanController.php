<?php
/**
 * Kesehatan Koperasi Controller
 * Berdasarkan Permenkop No. 20/Per/M.KUKM/XI/2008
 * 7 Aspek Penilaian Kesehatan KSP/USP Koperasi
 */
authCheck();
checkPermission('keuangan.laba_rugi'); // gunakan permission laporan keuangan
$db = Database::getInstance();

if ($method !== 'GET')
    errorResponse('Method not allowed', 405);

$tahun = $params['tahun'] ?? date('Y');
$tglAkhir = "$tahun-12-31";
$tglAwal = "$tahun-01-01";

// ══════════════════════════════════════════════
// A. AMBIL DATA NERACA (Akun Aset, Kewajiban, Modal)
// ══════════════════════════════════════════════
$akunNeraca = $db->fetchAll(
    "SELECT ak.kode, ak.nama, ak.tipe, ak.saldo_normal,
        CASE WHEN ak.saldo_normal='D'
            THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0)
            ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0)
        END as saldo
     FROM akun ak
     LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id
     LEFT JOIN jurnal j ON jd.jurnal_id = j.id AND j.tgl_transaksi <= ?
     WHERE ak.is_active = 1 AND ak.tipe IN ('aset','kewajiban','modal')
     GROUP BY ak.id ORDER BY ak.kode",
    [$tglAkhir]
);

$totalAset = 0;
$totalKewajiban = 0;
$totalModal = 0;
$kas = 0; // akun kode 1000
$piutang = 0; // akun kode 1200 (piutang pinjaman)

foreach ($akunNeraca as $a) {
    $saldo = (float) $a['saldo'];
    if ($a['tipe'] === 'aset') {
        $totalAset += $saldo;
    }
    if ($a['tipe'] === 'kewajiban') {
        $totalKewajiban += $saldo;
    }
    if ($a['tipe'] === 'modal') {
        $totalModal += $saldo;
    }
    if ($a['kode'] === '1000')
        $kas = $saldo;
    if ($a['kode'] === '1200')
        $piutang = $saldo;
}

// ══════════════════════════════════════════════
// B. AMBIL DATA LABA RUGI
// ══════════════════════════════════════════════
$akunLR = $db->fetchAll(
    "SELECT ak.kode, ak.nama, ak.tipe, ak.saldo_normal,
        CASE WHEN ak.saldo_normal='D'
            THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0)
            ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0)
        END as saldo
     FROM akun ak
     LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id
     LEFT JOIN jurnal j ON jd.jurnal_id = j.id AND j.tgl_transaksi BETWEEN ? AND ?
     WHERE ak.is_active = 1 AND ak.tipe IN ('pendapatan','beban')
     GROUP BY ak.id ORDER BY ak.kode",
    [$tglAwal, $tglAkhir]
);

$totalPendapatan = 0;
$totalBeban = 0;
foreach ($akunLR as $a) {
    if ($a['tipe'] === 'pendapatan')
        $totalPendapatan += (float) $a['saldo'];
    if ($a['tipe'] === 'beban')
        $totalBeban += (float) $a['saldo'];
}
$shu = $totalPendapatan - $totalBeban; // Sisa Hasil Usaha

// ══════════════════════════════════════════════
// C. AMBIL DATA OPERASIONAL SIMPAN PINJAM
// ══════════════════════════════════════════════

// Total simpanan (dana pihak ketiga = kewajiban simpanan)
$totalSimpanan = (float) ($db->fetch(
    "SELECT COALESCE(SUM(CASE WHEN kt.dk='D' THEN s.jumlah ELSE -s.jumlah END),0) as total
     FROM simpanan s JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id"
)['total'] ?? 0);

// Volume pinjaman yang diberikan (total outstanding)
$totalPinjaman = (float) ($db->fetch(
    "SELECT COALESCE(SUM(jumlah),0) as total FROM pinjaman WHERE status IN ('cair','lunas')"
)['total'] ?? 0);

// Pinjaman aktif (sisa outstanding)
$sisaPinjaman = (float) ($db->fetch(
    "SELECT COALESCE(SUM(sisa_pinjaman),0) as total FROM pinjaman WHERE status = 'cair'"
)['total'] ?? 0);

// Pinjaman pada anggota
$pinjamanAnggota = (float) ($db->fetch(
    "SELECT COALESCE(SUM(p.jumlah),0) as total
     FROM pinjaman p JOIN anggota a ON p.anggota_id = a.id
     WHERE p.status IN ('cair','lunas')"
)['total'] ?? 0);

// NPL: Pinjaman bermasalah (terlambat > 3 bulan)
$pinjamanBermasalah = (float) ($db->fetch(
    "SELECT COALESCE(SUM(p.sisa_pinjaman),0) as total
     FROM pinjaman p
     WHERE p.status = 'cair'
     AND EXISTS (
         SELECT 1 FROM angsuran ag
         WHERE ag.pinjaman_id = p.id AND ag.status IN ('terlambat','belum')
         AND ag.tgl_jatuh_tempo < DATE_SUB(NOW(), INTERVAL 90 DAY)
     )"
)['total'] ?? 0);

// Dana yang diterima (simpanan + kewajiban lain)
$danaDiterima = $totalSimpanan + $totalKewajiban;
if ($danaDiterima <= 0)
    $danaDiterima = $totalSimpanan ?: 1;

// Jumlah anggota
$totalAnggota = $db->count("SELECT COUNT(*) FROM anggota WHERE status = 'aktif'");

// Anggota yang memiliki pinjaman (partisipasi)
$anggotaPeminjam = $db->count(
    "SELECT COUNT(DISTINCT anggota_id) FROM pinjaman WHERE status IN ('cair','lunas')"
);

// Anggota yang memiliki simpanan
$anggotaPenabung = $db->count(
    "SELECT COUNT(DISTINCT anggota_id) FROM simpanan"
);

// Pendapatan dari anggota (bunga angsuran yang dibayar anggota)
$pendapatanAnggota = (float) ($db->fetch(
    "SELECT COALESCE(SUM(an.bunga + an.denda),0) as total
     FROM angsuran an JOIN pinjaman p ON an.pinjaman_id = p.id
     WHERE an.status IN ('lunas','terlambat')
     AND YEAR(an.tgl_bayar) = ?",
    [$tahun]
)['total'] ?? 0);

// Biaya operasional (total beban)
$biayaOperasional = $totalBeban;

// ══════════════════════════════════════════════
// D. HITUNG 7 ASPEK PENILAIAN
// ══════════════════════════════════════════════

/**
 * Helper: hitung skor berdasarkan range
 * $ranges = [[min, max, score], ...]
 */
function hitungSkor(float $nilai, array $ranges): float
{
    foreach ($ranges as [$min, $max, $skor]) {
        if ($nilai >= $min && ($max === null || $nilai < $max)) {
            return $skor;
        }
    }
    return 0;
}

function pct(float $a, float $b): float
{
    return $b > 0 ? round($a / $b * 100, 2) : 0;
}

$aspek = [];

// ══════════════════════════════════════════════
// 1. PERMODALAN (bobot 15)
// ══════════════════════════════════════════════
$modalSendiri = $totalModal + $shu;

// 1a. Rasio Modal Sendiri thd Total Aset (bobot 6)
$rasioModalAset = pct($modalSendiri, $totalAset ?: 1);
$skor1a = hitungSkor($rasioModalAset, [
    [0, 6, 0],
    [6, 9, 5],
    [9, 14, 7.5],
    [14, 21, 6],
    [21, 35, 5],
    [35, 60, 4],
    [60, null, 3]
]);

// 1b. Rasio Kecukupan Modal / CAR (bobot 9)
// ATMR: aset tertimbang = piutang (100%) + kas (0%)
$atmr = $piutang; // simplified
$car = pct($modalSendiri, $atmr ?: $totalAset ?: 1);
$skor1b = hitungSkor($car, [
    [0, 4, 0],
    [4, 6, 2.25],
    [6, 8, 4.5],
    [8, null, 9]
]);

$total1 = $skor1a + $skor1b;
$aspek[] = [
    'no' => 1,
    'nama' => 'Permodalan',
    'bobot' => 15,
    'skor' => round($total1, 2),
    'indikator' => [
        [
            'nama' => 'Rasio Modal Sendiri thd Total Aset',
            'nilai' => $rasioModalAset,
            'satuan' => '%',
            'bobot' => 6,
            'skor' => $skor1a,
            'formula' => 'Modal Sendiri / Total Aset × 100'
        ],
        [
            'nama' => 'Rasio Kecukupan Modal (CAR)',
            'nilai' => $car,
            'satuan' => '%',
            'bobot' => 9,
            'skor' => $skor1b,
            'formula' => 'Modal Sendiri / ATMR × 100'
        ],
    ]
];

// ══════════════════════════════════════════════
// 2. KUALITAS AKTIVA PRODUKTIF (bobot 25)
// ══════════════════════════════════════════════

// 2a. Rasio Volume Pinjaman pd Anggota thd Total Pinjaman (bobot 10)
$rasioVolumePinjaman = pct($pinjamanAnggota, $totalPinjaman ?: 1);
$skor2a = hitungSkor($rasioVolumePinjaman, [
    [0, 25, 0],
    [25, 50, 5],
    [50, 75, 7.5],
    [75, null, 10]
]);

// 2b. Rasio Pinjaman Bermasalah / NPL (bobot 5)
$npl = pct($pinjamanBermasalah, $sisaPinjaman ?: $totalPinjaman ?: 1);
$skor2b = hitungSkor($npl, [
    [0, 5, 5],
    [5, 10, 4],
    [10, 15, 3],
    [15, 20, 2],
    [20, null, 0]
]);

// 2c. Rasio Cadangan Risiko thd Pinjaman Bermasalah (bobot 5)
// Cadangan risiko ≈ modal sendiri yang tidak digunakan
$cadanganRisiko = max(0, $modalSendiri - $totalPinjaman);
$rasioCAR2 = $pinjamanBermasalah > 0 ? pct($cadanganRisiko, $pinjamanBermasalah) : 100;
$skor2c = hitungSkor($rasioCAR2, [
    [0, 10, 0],
    [10, 20, 1],
    [20, 40, 2],
    [40, 60, 3],
    [60, 80, 4],
    [80, null, 5]
]);

// 2d. Rasio Pinjaman Berisiko thd Total Pinjaman (bobot 5)
$pinjamanBerisiko = $pinjamanBermasalah; // simplified
$risikoRasio = pct($pinjamanBerisiko, $sisaPinjaman ?: 1);
$skor2d = hitungSkor($risikoRasio, [
    [0, 6, 5],
    [6, 20, 3],
    [20, 30, 1],
    [30, null, 0]
]);

$total2 = $skor2a + $skor2b + $skor2c + $skor2d;
$aspek[] = [
    'no' => 2,
    'nama' => 'Kualitas Aktiva Produktif',
    'bobot' => 25,
    'skor' => round($total2, 2),
    'indikator' => [
        [
            'nama' => 'Rasio Vol. Pinjaman Anggota thd Total Pinjaman',
            'nilai' => $rasioVolumePinjaman,
            'satuan' => '%',
            'bobot' => 10,
            'skor' => $skor2a,
            'formula' => 'Pinjaman Anggota / Total Pinjaman × 100'
        ],
        [
            'nama' => 'Rasio Pinjaman Bermasalah (NPL)',
            'nilai' => $npl,
            'satuan' => '%',
            'bobot' => 5,
            'skor' => $skor2b,
            'formula' => 'Pinjaman Bermasalah / Total Pinjaman × 100'
        ],
        [
            'nama' => 'Rasio Cadangan Risiko thd Pinjaman Bermasalah',
            'nilai' => $rasioCAR2,
            'satuan' => '%',
            'bobot' => 5,
            'skor' => $skor2c,
            'formula' => 'Cadangan Risiko / Pinjaman Bermasalah × 100'
        ],
        [
            'nama' => 'Rasio Pinjaman Berisiko thd Total Pinjaman',
            'nilai' => $risikoRasio,
            'satuan' => '%',
            'bobot' => 5,
            'skor' => $skor2d,
            'formula' => 'Pinjaman Berisiko / Total Pinjaman × 100'
        ],
    ]
];

// ══════════════════════════════════════════════
// 3. MANAJEMEN (bobot 15)
// ══════════════════════════════════════════════
// Penilaian manajemen menggunakan proxy data yang tersedia
// Karena penilaian manajemen idealnya memerlukan kuesioner,
// kita gunakan pendekatan kuantitatif:

// 3a. Manajemen Umum (bobot 3) — proxy: pertumbuhan anggota jika > 0
$mgmUmum = $totalAnggota > 0 ? 3 : 1;

// 3b. Kelembagaan (bobot 3) — proxy: ada modal sendiri positif
$mgmKel = $modalSendiri > 0 ? 3 : 1;

// 3c. Manajemen Permodalan (bobot 3) — proxy: CAR >= 8%
$mgmModal = $car >= 8 ? 3 : ($car >= 4 ? 2 : 1);

// 3d. Manajemen Aktiva (bobot 3) — proxy: NPL < 10%
$mgmAktiva = $npl < 5 ? 3 : ($npl < 10 ? 2 : 1);

// 3e. Manajemen Likuiditas (bobot 3) — proxy: kas > 0
$mgmLik = $kas > 0 ? 3 : 1;

$total3 = $mgmUmum + $mgmKel + $mgmModal + $mgmAktiva + $mgmLik;
$aspek[] = [
    'no' => 3,
    'nama' => 'Manajemen',
    'bobot' => 15,
    'skor' => round($total3, 2),
    'indikator' => [
        ['nama' => 'Manajemen Umum', 'nilai' => $totalAnggota, 'satuan' => 'anggota', 'bobot' => 3, 'skor' => $mgmUmum, 'formula' => 'Proxy: jumlah anggota aktif'],
        ['nama' => 'Kelembagaan', 'nilai' => $modalSendiri, 'satuan' => 'Rp', 'bobot' => 3, 'skor' => $mgmKel, 'formula' => 'Proxy: modal sendiri positif'],
        ['nama' => 'Manajemen Permodalan', 'nilai' => $car, 'satuan' => '%', 'bobot' => 3, 'skor' => $mgmModal, 'formula' => 'Proxy: CAR ≥ 8%'],
        ['nama' => 'Manajemen Aktiva', 'nilai' => $npl, 'satuan' => '%', 'bobot' => 3, 'skor' => $mgmAktiva, 'formula' => 'Proxy: NPL < 5%'],
        ['nama' => 'Manajemen Likuiditas', 'nilai' => $kas, 'satuan' => 'Rp', 'bobot' => 3, 'skor' => $mgmLik, 'formula' => 'Proxy: kas > 0'],
    ]
];

// ══════════════════════════════════════════════
// 4. EFISIENSI (bobot 10)
// ══════════════════════════════════════════════

// 4a. Biaya Operasional / Partisipasi Bruto (bobot 4)
$partisipasiBruto = $pendapatanAnggota > 0 ? $pendapatanAnggota : $totalPendapatan;
$rasioBO = pct($biayaOperasional, $partisipasiBruto ?: 1);
$skor4a = hitungSkor($rasioBO, [
    [0, 68, 4],
    [68, 75, 3],
    [75, 84, 2],
    [84, 100, 1],
    [100, null, 0]
]);

// 4b. Beban Usaha / SHU Kotor (bobot 4)
$shuKotor = $totalPendapatan;
$rasioBeban = pct($biayaOperasional, $shuKotor ?: 1);
$skor4b = hitungSkor($rasioBeban, [
    [0, 40, 4],
    [40, 60, 3],
    [60, 80, 2],
    [80, 100, 1],
    [100, null, 0]
]);

// 4c. Efisiensi Pelayanan (bobot 2) — biaya per anggota
$biayaPerAnggota = $totalAnggota > 0 ? $biayaOperasional / $totalAnggota : 0;
$skor4c = hitungSkor($biayaPerAnggota / 1000, [
    [0, 100, 2],
    [100, 150, 1.5],
    [150, 200, 1],
    [200, null, 0]
]);

$total4 = $skor4a + $skor4b + $skor4c;
$aspek[] = [
    'no' => 4,
    'nama' => 'Efisiensi',
    'bobot' => 10,
    'skor' => round($total4, 2),
    'indikator' => [
        [
            'nama' => 'Rasio Biaya Operasional thd Partisipasi Bruto',
            'nilai' => $rasioBO,
            'satuan' => '%',
            'bobot' => 4,
            'skor' => $skor4a,
            'formula' => 'Biaya Ops / Partisipasi Bruto × 100'
        ],
        [
            'nama' => 'Rasio Beban Usaha thd SHU Kotor',
            'nilai' => $rasioBeban,
            'satuan' => '%',
            'bobot' => 4,
            'skor' => $skor4b,
            'formula' => 'Beban Usaha / SHU Kotor × 100'
        ],
        [
            'nama' => 'Efisiensi Pelayanan (biaya per anggota)',
            'nilai' => round($biayaPerAnggota),
            'satuan' => 'Rp',
            'bobot' => 2,
            'skor' => $skor4c,
            'formula' => 'Total Biaya / Jumlah Anggota'
        ],
    ]
];

// ══════════════════════════════════════════════
// 5. LIKUIDITAS (bobot 15)
// ══════════════════════════════════════════════

// 5a. Rasio Kas (bobot 10)
$kewLancar = $totalSimpanan; // simpanan = kewajiban lancar
$rasioKas = pct($kas, $kewLancar ?: 1);
$skor5a = hitungSkor($rasioKas, [
    [0, 10, 5],
    [10, 15, 10],
    [15, 20, 10],
    [20, null, 5]
]);

// 5b. Rasio Pinjaman thd Dana Diterima (bobot 5)
$rasioLDR = pct($sisaPinjaman, $danaDiterima ?: 1);
$skor5b = hitungSkor($rasioLDR, [
    [0, 60, 2.5],
    [60, 71, 5],
    [71, 80, 5],
    [80, 91, 2.5],
    [91, null, 1]
]);

$total5 = $skor5a + $skor5b;
$aspek[] = [
    'no' => 5,
    'nama' => 'Likuiditas',
    'bobot' => 15,
    'skor' => round($total5, 2),
    'indikator' => [
        [
            'nama' => 'Rasio Kas',
            'nilai' => $rasioKas,
            'satuan' => '%',
            'bobot' => 10,
            'skor' => $skor5a,
            'formula' => 'Kas / Kewajiban Lancar × 100'
        ],
        [
            'nama' => 'Rasio Pinjaman / Dana Diterima (LDR)',
            'nilai' => $rasioLDR,
            'satuan' => '%',
            'bobot' => 5,
            'skor' => $skor5b,
            'formula' => 'Sisa Pinjaman / Dana Diterima × 100'
        ],
    ]
];

// ══════════════════════════════════════════════
// 6. KEMANDIRIAN DAN PERTUMBUHAN (bobot 10)
// ══════════════════════════════════════════════

// 6a. Rentabilitas Aset / ROA (bobot 3)
$roa = pct($shu, $totalAset ?: 1);
$skor6a = hitungSkor($roa, [
    [0, 3, 0],
    [3, 6, 1],
    [6, 9, 2],
    [9, null, 3]
]);

// 6b. Rentabilitas Modal Sendiri / ROE (bobot 3)
$roe = pct($shu, $modalSendiri ?: 1);
$skor6b = hitungSkor($roe, [
    [0, 3, 0],
    [3, 6, 1],
    [6, 9, 2],
    [9, null, 3]
]);

// 6c. Kemandirian Operasional (bobot 4)
$kemandirianOps = pct($totalPendapatan, $totalBeban ?: 1);
$skor6c = hitungSkor($kemandirianOps, [
    [0, 100, 0],
    [100, 110, 2],
    [110, 125, 3],
    [125, null, 4]
]);

$total6 = $skor6a + $skor6b + $skor6c;
$aspek[] = [
    'no' => 6,
    'nama' => 'Kemandirian & Pertumbuhan',
    'bobot' => 10,
    'skor' => round($total6, 2),
    'indikator' => [
        [
            'nama' => 'Rentabilitas Aset (ROA)',
            'nilai' => $roa,
            'satuan' => '%',
            'bobot' => 3,
            'skor' => $skor6a,
            'formula' => 'SHU / Total Aset × 100'
        ],
        [
            'nama' => 'Rentabilitas Modal Sendiri (ROE)',
            'nilai' => $roe,
            'satuan' => '%',
            'bobot' => 3,
            'skor' => $skor6b,
            'formula' => 'SHU / Modal Sendiri × 100'
        ],
        [
            'nama' => 'Kemandirian Operasional',
            'nilai' => $kemandirianOps,
            'satuan' => '%',
            'bobot' => 4,
            'skor' => $skor6c,
            'formula' => 'Total Pendapatan / Total Beban × 100'
        ],
    ]
];

// ══════════════════════════════════════════════
// 7. JATIDIRI KOPERASI (bobot 10)
// ══════════════════════════════════════════════

// 7a. Rasio Partisipasi Bruto (bobot 7)
$rasioPartisipasi = pct($partisipasiBruto, $totalPendapatan ?: 1);
$skor7a = hitungSkor($rasioPartisipasi, [
    [0, 25, 1],
    [25, 50, 2],
    [50, 75, 5],
    [75, null, 7]
]);

// 7b. Rasio Promosi Ekonomi Anggota / PEA (bobot 3)
// PEA = manfaat yang diterima anggota (simpanan + pinjaman opportunity)
$peaTotal = ($totalAnggota > 0) ? ($totalSimpanan + $pinjamanAnggota) / $totalAnggota : 0;
$rasioPartisipasiAnggota = pct($anggotaPenabung + $anggotaPeminjam, $totalAnggota * 2 ?: 1);
$skor7b = hitungSkor($rasioPartisipasiAnggota, [
    [0, 25, 0],
    [25, 50, 1],
    [50, 75, 2],
    [75, null, 3]
]);

$total7 = $skor7a + $skor7b;
$aspek[] = [
    'no' => 7,
    'nama' => 'Jatidiri Koperasi',
    'bobot' => 10,
    'skor' => round($total7, 2),
    'indikator' => [
        [
            'nama' => 'Rasio Partisipasi Bruto',
            'nilai' => $rasioPartisipasi,
            'satuan' => '%',
            'bobot' => 7,
            'skor' => $skor7a,
            'formula' => 'Pendapatan dari Anggota / Total Pendapatan × 100'
        ],
        [
            'nama' => 'Promosi Ekonomi Anggota (PEA)',
            'nilai' => $rasioPartisipasiAnggota,
            'satuan' => '%',
            'bobot' => 3,
            'skor' => $skor7b,
            'formula' => '(Anggota Menabung + Anggota Meminjam) / (Anggota × 2) × 100'
        ],
    ]
];

// ══════════════════════════════════════════════
// TOTAL SKOR & PREDIKAT
// ══════════════════════════════════════════════
$totalSkor = array_sum(array_column($aspek, 'skor'));
$totalBobot = array_sum(array_column($aspek, 'bobot'));

if ($totalSkor >= 80) {
    $predikat = 'Sehat';
    $predikatKode = 'sehat';
} elseif ($totalSkor >= 60) {
    $predikat = 'Cukup Sehat';
    $predikatKode = 'cukup';
} elseif ($totalSkor >= 40) {
    $predikat = 'Kurang Sehat';
    $predikatKode = 'kurang';
} elseif ($totalSkor >= 20) {
    $predikat = 'Tidak Sehat';
    $predikatKode = 'tidak';
} else {
    $predikat = 'Sangat Tidak Sehat';
    $predikatKode = 'sangat_tidak';
}

jsonResponse([
    'success' => true,
    'data' => [
        'tahun' => $tahun,
        'total_skor' => round($totalSkor, 2),
        'total_bobot' => $totalBobot,
        'persentase' => round($totalSkor, 2), // skor IS the percentage (max 100)
        'predikat' => $predikat,
        'predikat_kode' => $predikatKode,
        'aspek' => $aspek,

        // Ringkasan data keuangan
        'ringkasan' => [
            'total_aset' => $totalAset,
            'total_kewajiban' => $totalKewajiban,
            'modal_sendiri' => $modalSendiri,
            'total_simpanan' => $totalSimpanan,
            'total_pinjaman' => $totalPinjaman,
            'sisa_pinjaman' => $sisaPinjaman,
            'npl_nominal' => $pinjamanBermasalah,
            'shu' => $shu,
            'total_pendapatan' => $totalPendapatan,
            'total_beban' => $totalBeban,
            'kas' => $kas,
            'total_anggota' => $totalAnggota,
        ]
    ]
]);
