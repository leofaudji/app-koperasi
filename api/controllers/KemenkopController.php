<?php
/**
 * Kemenkop UKM Regulatory & Compliance Controller
 * Berdasarkan Permenkop UKM No. 2 Tahun 2024 & Permenkop UKM No. 9 Tahun 2020
 * Menghitung Klasifikasi Usaha Koperasi (KUK 1-4), Batas Prudensial (BMPP, NPL, Likuiditas, Solvabilitas),
 * dan Profil Kelembagaan untuk pelaporan ODS (Online Data System).
 */
authCheck();
checkPermission('keuangan.laba_rugi');
$db = Database::getInstance();
require_once __DIR__ . '/../config/finance_helpers.php';

if ($method !== 'GET') {
    errorResponse('Method not allowed', 405);
}

$tahun = $params['tahun'] ?? date('Y');
$tglAkhir = "$tahun-12-31";
$tglAwal = "$tahun-01-01";

$cacheKey = "rep_kemenkop_{$tahun}";
$responseData = getCachedData($cacheKey, function() use ($db, $tahun, $tglAwal, $tglAkhir) {

    // ══════════════════════════════════════════════════════════════
    // 1. DATA KELEMBAGAAN & PROFIL DARI APP_SETTINGS
    // ══════════════════════════════════════════════════════════════
    $settRows = $db->fetchAll("SELECT setting_key, setting_value FROM app_settings");
    $sett = [];
    foreach ($settRows as $sr) {
        $sett[$sr['setting_key']] = $sr['setting_value'];
    }

    $profil = [
        'nama_koperasi'   => $sett['app_name'] ?? 'Koperasi Simpan Pinjam',
        'badan_hukum'     => $sett['badan_hukum'] ?? '-',
        'nik_koperasi'    => $sett['nik_koperasi'] ?? '-',
        'tahun_berdiri'   => $sett['tahun_berdiri'] ?? '-',
        'alamat'          => $sett['alamat'] ?? '-',
        'telepon'         => $sett['telepon'] ?? '-',
        'email'           => $sett['email'] ?? '-',
        'website'         => $sett['website'] ?? '-',
        'ketua'           => $sett['ketua_koperasi'] ?? '-',
        'pengawas'        => $sett['pengawas_koperasi'] ?? '-',
        'manajer'         => $sett['manajer_koperasi'] ?? '-',
    ];

    // Anggota metrics
    $totalAnggota = $db->count("SELECT COUNT(*) FROM anggota WHERE status = 'aktif'");
    $anggotaPria = $db->count("SELECT COUNT(*) FROM anggota WHERE status = 'aktif' AND jenis_kelamin = 'L'");
    $anggotaWanita = $db->count("SELECT COUNT(*) FROM anggota WHERE status = 'aktif' AND jenis_kelamin = 'P'");
    $anggotaBaruTahunIni = $db->count("SELECT COUNT(*) FROM anggota WHERE YEAR(tgl_daftar) = ?", [$tahun]);
    $anggotaKeluarTahunIni = $db->count("SELECT COUNT(*) FROM anggota WHERE status = 'keluar' AND YEAR(updated_at) = ?", [$tahun]);

    // Data RAT
    $jurnalTutup = $db->fetch(
        "SELECT id, no_bukti, tgl_transaksi, created_at FROM jurnal WHERE ref_tipe = 'akhir_tahun' AND YEAR(tgl_transaksi) = ? LIMIT 1",
        [$tahun]
    );
    $statusRat = $jurnalTutup ? 'Sudah Tutup Buku / RAT' : 'Belum Tutup Buku';

    // ══════════════════════════════════════════════════════════════
    // 2. DATA KEUANGAN NERACA PER TANGGAL AKHIR TAHUN
    // ══════════════════════════════════════════════════════════════
    $akunNeraca = $db->fetchAll(
        "SELECT ak.kode, ak.nama, ak.tipe, ak.kelompok, ak.saldo_normal,
            CASE WHEN ak.saldo_normal='D'
                THEN COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN jd.debit ELSE 0 END),0) - COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN jd.kredit ELSE 0 END),0)
                ELSE COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN jd.kredit ELSE 0 END),0) - COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN jd.debit ELSE 0 END),0)
            END as saldo
        FROM akun ak
        LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id
        LEFT JOIN jurnal j ON jd.jurnal_id = j.id AND j.tgl_transaksi <= ?
        WHERE ak.is_active = 1 AND ak.tipe IN ('aset','kewajiban','modal')
        GROUP BY ak.id ORDER BY ak.kode",
        [$tglAkhir]
    );

    $totalAset = 0;
    $aktivaLancar = 0;
    $kasBank = 0;
    $piutangPinjaman = 0;
    $penyertaanJangkaPanjang = 0;
    $aktivaTetap = 0;

    $totalKewajiban = 0;
    $kewajibanLancar = 0;
    $kewajibanJangkaPanjang = 0;

    $totalModal = 0;
    $simpananPokokWajib = 0;
    $cadangan = 0;

    foreach ($akunNeraca as $a) {
        $saldo = (float) $a['saldo'];
        $tipe = $a['tipe'];
        $kode = (string) $a['kode'];
        $nama = strtolower((string) $a['nama']);
        $kel = strtolower((string) ($a['kelompok'] ?? ''));

        if ($tipe === 'aset') {
            $totalAset += $saldo;
            if (in_array($kode, ['100', '101', '102', '103', '1000', '1100']) || strpos($nama, 'kas') !== false || strpos($nama, 'bank') !== false) {
                $kasBank += $saldo;
            }
            if (in_array($kode, ['104', '105', '106', '107', '108', '1200', '190']) || strpos($nama, 'piutang') !== false) {
                $piutangPinjaman += $saldo;
            }
            if (strpos($kel, 'penyertaan') !== false || in_array($kode, ['112', '113', '114', '115', '116'])) {
                $penyertaanJangkaPanjang += $saldo;
            } elseif (strpos($kel, 'tetap') !== false || in_array($kode, ['117', '118', '119', '120'])) {
                $aktivaTetap += $saldo;
            } else {
                $aktivaLancar += $saldo;
            }
        } elseif ($tipe === 'kewajiban') {
            $totalKewajiban += $saldo;
            if (strpos($kel, 'panjang') !== false || in_array($kode, ['210'])) {
                $kewajibanJangkaPanjang += $saldo;
            } elseif (in_array($kode, ['212', '213', '214', '215', '216']) || strpos($kel, 'modal') !== false) {
                // Di COA koperasi ini, kode 212-214 masuk simpanan pokok & wajib anggota
                $simpananPokokWajib += $saldo;
            } else {
                $kewajibanLancar += $saldo;
            }
        } elseif ($tipe === 'modal') {
            $totalModal += $saldo;
            if (strpos($nama, 'cadangan') !== false) {
                $cadangan += $saldo;
            }
        }
    }

    // ══════════════════════════════════════════════════════════════
    // 3. DATA LABA RUGI (PHU)
    // ══════════════════════════════════════════════════════════════
    $akunLR = $db->fetchAll(
        "SELECT ak.kode, ak.nama, ak.tipe, ak.kelompok, ak.saldo_normal,
            CASE WHEN ak.saldo_normal='D'
                THEN COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN jd.debit ELSE 0 END),0) - COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN jd.kredit ELSE 0 END),0)
                ELSE COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN jd.kredit ELSE 0 END),0) - COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN jd.debit ELSE 0 END),0)
            END as saldo
        FROM akun ak
        LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id
        LEFT JOIN jurnal j ON jd.jurnal_id = j.id AND j.tgl_transaksi BETWEEN ? AND ?
        WHERE ak.is_active = 1 AND ak.tipe IN ('pendapatan','beban')
        GROUP BY ak.id ORDER BY ak.kode",
        [$tglAwal, $tglAkhir]
    );

    $totalPendapatan = 0;
    $pendapatanOperasional = 0;
    $pendapatanNonOperasional = 0;
    $totalBeban = 0;
    $bebanOperasional = 0;
    $bebanOrganisasi = 0;
    $bebanPajak = 0;

    foreach ($akunLR as $a) {
        $saldo = (float) $a['saldo'];
        $tipe = $a['tipe'];
        $kode = (string) $a['kode'];
        $nama = strtolower((string) $a['nama']);

        if ($tipe === 'pendapatan') {
            $totalPendapatan += $saldo;
            if (in_array($kode, ['400', '401', '402', '403', '404', '405', '406', '410'])) {
                $pendapatanOperasional += $saldo;
            } else {
                $pendapatanNonOperasional += $saldo;
            }
        } elseif ($tipe === 'beban') {
            $totalBeban += $saldo;
            if (strpos($nama, 'pajak') !== false || $kode === '507') {
                $bebanPajak += $saldo;
            } elseif (strpos($nama, 'rat') !== false || strpos($nama, 'organisasi') !== false || $kode === '500') {
                $bebanOrganisasi += $saldo;
            } else {
                $bebanOperasional += $saldo;
            }
        }
    }

    $shu = $totalPendapatan - $totalBeban;

    // Modal Sendiri Koperasi menurut Kemenkop:
    // Modal Ekuitas + Simpanan Pokok & Wajib + Cadangan + SHU Tahun Berjalan
    $modalSendiri = $totalModal + $simpananPokokWajib + $cadangan + $shu;
    $modalLuar = $kewajibanLancar + $kewajibanJangkaPanjang;

    // ══════════════════════════════════════════════════════════════
    // 4. DATA PINJAMAN & NPL
    // ══════════════════════════════════════════════════════════════
    $totalPenyaluranPinjaman = (float) ($db->fetch(
        "SELECT COALESCE(SUM(jumlah),0) as t FROM pinjaman WHERE YEAR(tgl_pengajuan) = ? AND status IN ('cair','lunas')",
        [$tahun]
    )['t'] ?? 0);

    $bakiDebetAktif = (float) ($db->fetch(
        "SELECT COALESCE(SUM(sisa_pinjaman),0) as t FROM pinjaman WHERE status = 'cair'"
    )['t'] ?? 0);

    // Baki Debet Bermasalah (Kurang Lancar + Diragukan + Macet / > 90 hari telat)
    $bakiDebetBermasalah = (float) ($db->fetch(
        "SELECT COALESCE(SUM(p.sisa_pinjaman),0) as t
         FROM pinjaman p
         WHERE p.status = 'cair'
         AND EXISTS (
             SELECT 1 FROM angsuran ag
             WHERE ag.pinjaman_id = p.id AND ag.status IN ('terlambat','belum')
             AND ag.tgl_jatuh_tempo < DATE_SUB(NOW(), INTERVAL 90 DAY)
         )"
    )['t'] ?? 0);

    // Pinjaman terbesar perorangan untuk evaluasi BMPP (Batas Maksimum Pemberian Pinjaman)
    $pinjamanTerbesar = $db->fetch(
        "SELECT p.id, p.no_pinjaman, p.jumlah, p.sisa_pinjaman, a.nama as anggota_nama
         FROM pinjaman p
         JOIN anggota a ON p.anggota_id = a.id
         WHERE p.status = 'cair'
         ORDER BY p.sisa_pinjaman DESC LIMIT 1"
    );

    // ══════════════════════════════════════════════════════════════
    // 5. EVALUASI KLASIFIKASI USAHA KOPERASI (KUK) — Permenkop 2/2024
    // ══════════════════════════════════════════════════════════════
    $tierAnggota = 1;
    if ($totalAnggota > 35000) $tierAnggota = 4;
    elseif ($totalAnggota > 9000) $tierAnggota = 3;
    elseif ($totalAnggota > 5000) $tierAnggota = 2;

    $tierModal = 1;
    if ($modalSendiri > 40000000000) $tierModal = 4;
    elseif ($modalSendiri > 15000000000) $tierModal = 3;
    elseif ($modalSendiri > 250000000) $tierModal = 2;

    $tierAset = 1;
    if ($totalAset > 500000000000) $tierAset = 4;
    elseif ($totalAset > 15000000000) $tierAset = 3;
    elseif ($totalAset > 2500000000) $tierAset = 2;

    // KUK ditentukan oleh level tertinggi agar memenuhi persyaratan pengawasan
    $kukLevel = max($tierAnggota, $tierModal, $tierAset);

    $kukInfo = [
        1 => [
            'level' => 1,
            'label' => 'KUK 1 (Skala Mikro / Primer Kabupaten/Kota)',
            'wilayah' => 'Dalam 1 Kabupaten / Kota',
            'pelayanan' => 'Hanya melayani anggota',
            'ketentuan' => 'Sistem akuntansi standar pembukuan manual/aplikasi sederhana, pengawasan tingkat Dinas Kabupaten/Kota'
        ],
        2 => [
            'level' => 2,
            'label' => 'KUK 2 (Skala Kecil / Lintas Daerah)',
            'wilayah' => 'Lintas Kabupaten / Kota dalam 1 Provinsi',
            'pelayanan' => 'Melayani anggota dan calon anggota',
            'ketentuan' => 'Wajib memiliki sistem pencatatan digital terintegrasi, laporan berkala ke Dinas Provinsi'
        ],
        3 => [
            'level' => 3,
            'label' => 'KUK 3 (Skala Menengah / Lintas Provinsi)',
            'wilayah' => 'Lintas Provinsi di wilayah Indonesia',
            'pelayanan' => 'Melayani anggota, calon anggota, dan koperasi mitra',
            'ketentuan' => 'Sistem IT online real-time, wajib audit KAP eksternal berkala, pengawasan Kemenkop UKM'
        ],
        4 => [
            'level' => 4,
            'label' => 'KUK 4 (Skala Besar / Nasional)',
            'wilayah' => 'Seluruh wilayah Negara Kesatuan Republik Indonesia',
            'pelayanan' => 'Melayani ekosistem koperasi nasional',
            'ketentuan' => 'Penerapan prudensial ketat standar OJK/Kemenkop, audit KAP publik, pelaporan ODS triwulanan'
        ]
    ];

    // ══════════════════════════════════════════════════════════════
    // 6. RASIO KEPATUHAN & BATAS PRUDENSIAL KEMENKOP
    // ══════════════════════════════════════════════════════════════
    $pct = fn($a, $b) => $b > 0 ? round(($a / $b) * 100, 2) : 0;

    // A. BMPP (Batas Maksimum Pemberian Pinjaman) - Maksimal 20% modal sendiri
    $sisaPinjTerbesar = (float)($pinjamanTerbesar['sisa_pinjaman'] ?? 0);
    $rasioBMPP = $modalSendiri > 0 ? $pct($sisaPinjTerbesar, $modalSendiri) : 0;
    $statusBMPP = $rasioBMPP <= 20 ? 'Aman' : 'Peringatan (Melampaui BMPP 20%)';
    $bmppColor = $rasioBMPP <= 20 ? 'success' : 'danger';

    // B. Rasio Likuiditas (Cash Ratio) - Kas & Bank / Kewajiban Lancar (Min 10-15%)
    $rasioLikuiditas = $kewajibanLancar > 0 ? $pct($kasBank, $kewajibanLancar) : 100;
    $statusLikuiditas = $rasioLikuiditas >= 15 ? 'Sehat (>= 15%)' : ($rasioLikuiditas >= 10 ? 'Cukup Sehat (10-15%)' : 'Kurang Sehat (< 10%)');
    $likuiditasColor = $rasioLikuiditas >= 10 ? 'success' : 'warning';

    // C. Rasio Solvabilitas - Modal Sendiri / Total Aset (Min 20-30%)
    $rasioSolvabilitas = $totalAset > 0 ? $pct($modalSendiri, $totalAset) : 0;
    $statusSolvabilitas = $rasioSolvabilitas >= 30 ? 'Sangat Solvabel (>= 30%)' : ($rasioSolvabilitas >= 20 ? 'Cukup Solvabel (20-30%)' : 'Rentan (< 20%)');
    $solvabilitasColor = $rasioSolvabilitas >= 20 ? 'success' : 'warning';

    // D. Rasio NPL (Non Performing Loan) - Pinjaman Bermasalah / Total Baki Debet (Maks 5%)
    $rasioNPL = $bakiDebetAktif > 0 ? $pct($bakiDebetBermasalah, $bakiDebetAktif) : 0;
    $statusNPL = $rasioNPL <= 5 ? 'Sehat (<= 5%)' : ($rasioNPL <= 10 ? 'Perhatian (5-10%)' : 'Buruk / Rawan (> 10%)');
    $nplColor = $rasioNPL <= 5 ? 'success' : ($rasioNPL <= 10 ? 'warning' : 'danger');

    // E. Rentabilitas Modal Sendiri (ROE) & Aset (ROA)
    $roe = $modalSendiri > 0 ? $pct($shu, $modalSendiri) : 0;
    $roa = $totalAset > 0 ? $pct($shu, $totalAset) : 0;

    // F. Rasio Kemandirian Modal (Modal Sendiri / Modal Luar)
    $rasioKemandirian = $modalLuar > 0 ? $pct($modalSendiri, $modalLuar) : 100;

    return [
        'tahun' => $tahun,
        'profil' => $profil,
        'kelembagaan' => [
            'total_anggota'       => $totalAnggota,
            'anggota_pria'        => $anggotaPria,
            'anggota_wanita'      => $anggotaWanita,
            'anggota_baru'        => $anggotaBaruTahunIni,
            'anggota_keluar'      => $anggotaKeluarTahunIni,
            'status_rat'          => $statusRat,
            'tgl_rat'             => $jurnalTutup['tgl_transaksi'] ?? '-'
        ],
        'kuk' => [
            'level'          => $kukLevel,
            'info'           => $kukInfo[$kukLevel],
            'detail_tier'    => [
                'anggota' => ['nilai' => $totalAnggota, 'tier' => $tierAnggota],
                'modal'   => ['nilai' => $modalSendiri, 'tier' => $tierModal],
                'aset'    => ['nilai' => $totalAset, 'tier' => $tierAset]
            ]
        ],
        'prudensial' => [
            'bmpp' => [
                'nama'          => 'Batas Maksimum Pemberian Pinjaman (BMPP)',
                'nilai'         => $rasioBMPP,
                'satuan'        => '%',
                'standar'       => 'Maks. 20% dari Modal Sendiri',
                'status'        => $statusBMPP,
                'color'         => $bmppColor,
                'peminjam'      => $pinjamanTerbesar ? $pinjamanTerbesar['anggota_nama'] : '-',
                'sisa_pinjaman' => $sisaPinjTerbesar,
                'modal_sendiri' => $modalSendiri
            ],
            'likuiditas' => [
                'nama'          => 'Rasio Likuiditas (Cash Ratio)',
                'nilai'         => $rasioLikuiditas,
                'satuan'        => '%',
                'standar'       => 'Min. 10% - 15%',
                'status'        => $statusLikuiditas,
                'color'         => $likuiditasColor,
                'kas_bank'      => $kasBank,
                'kewajiban_lancar' => $kewajibanLancar
            ],
            'solvabilitas' => [
                'nama'          => 'Rasio Solvabilitas',
                'nilai'         => $rasioSolvabilitas,
                'satuan'        => '%',
                'standar'       => 'Min. 20% - 30%',
                'status'        => $statusSolvabilitas,
                'color'         => $solvabilitasColor,
                'modal_sendiri' => $modalSendiri,
                'total_aset'    => $totalAset
            ],
            'npl' => [
                'nama'          => 'Rasio Kredit Bermasalah (NPL)',
                'nilai'         => $rasioNPL,
                'satuan'        => '%',
                'standar'       => 'Maks. 5.00%',
                'status'        => $statusNPL,
                'color'         => $nplColor,
                'bermasalah'    => $bakiDebetBermasalah,
                'total_baki_debet' => $bakiDebetAktif
            ],
            'kemandirian' => [
                'nama'          => 'Kemandirian Modal (Modal Sendiri / Luar)',
                'nilai'         => $rasioKemandirian,
                'satuan'        => '%',
                'standar'       => '>= 100% Mandiri',
                'status'        => $rasioKemandirian >= 100 ? 'Mandiri' : 'Tergantung Modal Luar',
                'color'         => $rasioKemandirian >= 100 ? 'success' : 'warning'
            ],
            'roe' => [
                'nama'          => 'Rentabilitas Modal Sendiri (ROE)',
                'nilai'         => $roe,
                'satuan'        => '%'
            ],
            'roa' => [
                'nama'          => 'Rentabilitas Aset (ROA)',
                'nilai'         => $roa,
                'satuan'        => '%'
            ]
        ],
        'neraca_ringkas' => [
            'kas_bank'             => $kasBank,
            'piutang_pinjaman'     => $piutangPinjaman,
            'aktiva_lancar'        => $aktivaLancar,
            'penyertaan'           => $penyertaanJangkaPanjang,
            'aktiva_tetap'         => $aktivaTetap,
            'total_aset'           => $totalAset,
            'kewajiban_lancar'     => $kewajibanLancar,
            'kewajiban_panjang'    => $kewajibanJangkaPanjang,
            'total_kewajiban'      => $totalKewajiban,
            'simpanan_pokok_wajib' => $simpananPokokWajib,
            'modal_ekuitas'        => $totalModal,
            'cadangan'             => $cadangan,
            'modal_sendiri'        => $modalSendiri
        ],
        'phu_ringkas' => [
            'pendapatan_operasional'     => $pendapatanOperasional,
            'pendapatan_non_operasional' => $pendapatanNonOperasional,
            'total_pendapatan'           => $totalPendapatan,
            'beban_operasional'          => $bebanOperasional,
            'beban_organisasi'           => $bebanOrganisasi,
            'beban_pajak'                => $bebanPajak,
            'total_beban'                => $totalBeban,
            'shu'                        => $shu
        ],
        'operasional_pinjaman' => [
            'total_penyaluran'  => $totalPenyaluranPinjaman,
            'baki_debet_aktif'  => $bakiDebetAktif,
            'baki_bermasalah'   => $bakiDebetBermasalah
        ]
    ];
});

successResponse($responseData);
