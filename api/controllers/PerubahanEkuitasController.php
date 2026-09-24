<?php
/**
 * Laporan Perubahan Ekuitas / Modal Controller
 * Sesuai Standar Akuntansi Keuangan Entitas Privat (SAK EP) & Permenkop UKM No. 2 Tahun 2024
 * Menyajikan mutasi saldo awal, penambahan, pengurangan, dan saldo akhir seluruh komponen modal koperasi:
 * 1. Simpanan Pokok (Akun 212)
 * 2. Simpanan Wajib (Akun 213)
 * 3. Simpanan Partisipatif (Akun 214)
 * 4. Dana Cadangan (Akun 215, 204, 208)
 * 5. Ekuitas Awal / Saldo Laba Ditahan (Akun 3999)
 * 6. SHU Periode Berjalan (Laba Rugi Tahun Berjalan)
 */
authCheck();
checkPermission('keuangan.neraca');
$db = Database::getInstance();

if ($method !== 'GET') {
    errorResponse('Method not allowed', 405);
}

$tahun = isset($params['tahun']) ? (int) $params['tahun'] : (int) date('Y');
$tglAwal = "$tahun-01-01";
$tglAkhir = "$tahun-12-31";

$cacheKey = "rep_ekuitas_{$tahun}";
$responseData = getCachedData($cacheKey, function() use ($db, $tahun, $tglAwal, $tglAkhir) {

    // ══════════════════════════════════════════════
    // A. DATA PROFIL KOPERASI DARI APP_SETTINGS
    // ══════════════════════════════════════════════
    $settRows = $db->fetchAll("SELECT setting_key, setting_value FROM app_settings");
    $sett = [];
    foreach ($settRows as $sr) {
        $sett[$sr['setting_key']] = $sr['setting_value'];
    }

    $profil = [
        'nama_koperasi' => $sett['app_name'] ?? 'Koperasi Simpan Pinjam',
        'badan_hukum'   => $sett['badan_hukum'] ?? '-',
        'nik_koperasi'  => $sett['nik_koperasi'] ?? '-',
        'alamat'        => $sett['alamat'] ?? '-',
        'ketua'         => $sett['ketua_koperasi'] ?? '-',
        'pengawas'      => $sett['pengawas_koperasi'] ?? '-',
        'manajer'       => $sett['manajer_koperasi'] ?? '-'
    ];

    // ══════════════════════════════════════════════
    // B. DEFINISI STRUKTUR KOMPONEN EKUITAS KOPERASI
    // ══════════════════════════════════════════════
    $komponenDef = [
        'simpanan_pokok' => [
            'nama' => 'Simpanan Pokok Anggota',
            'deskripsi' => 'Simpanan pokok modal awal anggota koperasi (Akun 212)',
            'akun_kodes' => ['212'],
            'keterangan_tambah' => 'Setoran Simpanan Pokok Anggota Baru',
            'keterangan_kurang' => 'Pengembalian Simpanan Pokok Anggota Keluar'
        ],
        'simpanan_wajib' => [
            'nama' => 'Simpanan Wajib Anggota',
            'deskripsi' => 'Simpanan wajib rutin bulanan pemupukan modal anggota (Akun 213)',
            'akun_kodes' => ['213'],
            'keterangan_tambah' => 'Setoran Simpanan Wajib Rutin Bulanan',
            'keterangan_kurang' => 'Pengembalian Simpanan Wajib Anggota Keluar'
        ],
        'simpanan_partisipatif' => [
            'nama' => 'Simpanan Partisipatif',
            'deskripsi' => 'Modal penyertaan/partisipatif sukarela anggota (Akun 214)',
            'akun_kodes' => ['214'],
            'keterangan_tambah' => 'Setoran Modal Partisipatif Anggota',
            'keterangan_kurang' => 'Penarikan / Pengembalian Simpanan Partisipatif'
        ],
        'dana_cadangan' => [
            'nama' => 'Dana Cadangan Koperasi',
            'deskripsi' => 'Cadangan umum & cadangan risiko dari alokasi SHU (Akun 215, 204, 208)',
            'akun_kodes' => ['215', '204', '208'],
            'keterangan_tambah' => 'Alokasi Cadangan Umum & Cadangan Risiko',
            'keterangan_kurang' => 'Penggunaan Cadangan untuk Menutup Risiko/Defisit'
        ],
        'ekuitas_awal' => [
            'nama' => 'Ekuitas Awal / Laba Ditahan',
            'deskripsi' => 'Saldo ekuitas awal pendirian / akumulasi saldo laba (Akun 3999)',
            'akun_kodes' => ['3999'],
            'keterangan_tambah' => 'Penyesuaian / Penambahan Ekuitas Awal',
            'keterangan_kurang' => 'Penyesuaian / Alokasi Ekuitas Awal'
        ]
    ];

    $komponenList = [];
    $totAwal = 0;
    $totTambah = 0;
    $totKurang = 0;
    $totAkhir = 0;

    foreach ($komponenDef as $key => $def) {
        $codes = $def['akun_kodes'];
        $placeholders = implode(',', array_fill(0, count($codes), '?'));

        // Saldo Awal (transaksi sebelum 1 Jan tahun berjalan)
        $qAwal = $db->fetch(
            "SELECT 
                COALESCE(SUM(CASE WHEN ak.saldo_normal='K' THEN jd.kredit - jd.debit ELSE jd.debit - jd.kredit END), 0) as saldo
             FROM akun ak
             JOIN jurnal_detail jd ON ak.id = jd.akun_id
             JOIN jurnal j ON jd.jurnal_id = j.id AND j.tgl_transaksi < ?
             WHERE ak.kode IN ($placeholders)",
            array_merge([$tglAwal], $codes)
        );
        $saldoAwal = (float)($qAwal['saldo'] ?? 0);

        // Mutasi Debit & Kredit tahun berjalan
        $qMutasi = $db->fetch(
            "SELECT 
                COALESCE(SUM(jd.debit), 0) as debit,
                COALESCE(SUM(jd.kredit), 0) as kredit
             FROM akun ak
             JOIN jurnal_detail jd ON ak.id = jd.akun_id
             JOIN jurnal j ON jd.jurnal_id = j.id AND j.tgl_transaksi BETWEEN ? AND ?
             WHERE ak.kode IN ($placeholders)",
            array_merge([$tglAwal, $tglAkhir], $codes)
        );
        $debit = (float)($qMutasi['debit'] ?? 0);
        $kredit = (float)($qMutasi['kredit'] ?? 0);

        // Pada akun liabilitas modal (Kredit), kredit = penambahan, debit = pengurangan
        $penambahan = $kredit;
        $pengurangan = $debit;
        $saldoAkhir = $saldoAwal + $penambahan - $pengurangan;

        $totAwal += $saldoAwal;
        $totTambah += $penambahan;
        $totKurang += $pengurangan;
        $totAkhir += $saldoAkhir;

        $komponenList[] = [
            'kode' => $key,
            'nama' => $def['nama'],
            'deskripsi' => $def['deskripsi'],
            'akun_terkait' => implode(', ', $codes),
            'saldo_awal' => $saldoAwal,
            'penambahan' => $penambahan,
            'detail_penambahan' => $def['keterangan_tambah'],
            'pengurangan' => $pengurangan,
            'detail_pengurangan' => $def['keterangan_kurang'],
            'saldo_akhir' => $saldoAkhir
        ];
    }

    // ══════════════════════════════════════════════
    // C. SHU PERIODE BERJALAN DARI LABA RUGI
    // ══════════════════════════════════════════════
    $qLR = $db->fetch(
        "SELECT 
            COALESCE(SUM(CASE WHEN ak.tipe='pendapatan' THEN (CASE WHEN ak.saldo_normal='K' THEN jd.kredit-jd.debit ELSE jd.debit-jd.kredit END) ELSE 0 END), 0) as pendapatan,
            COALESCE(SUM(CASE WHEN ak.tipe='beban' THEN (CASE WHEN ak.saldo_normal='D' THEN jd.debit-jd.kredit ELSE jd.kredit-jd.debit END) ELSE 0 END), 0) as beban
         FROM akun ak
         JOIN jurnal_detail jd ON ak.id = jd.akun_id
         JOIN jurnal j ON jd.jurnal_id = j.id AND j.tgl_transaksi BETWEEN ? AND ?
         WHERE ak.tipe IN ('pendapatan', 'beban')",
        [$tglAwal, $tglAkhir]
    );
    $pendapatan = (float)($qLR['pendapatan'] ?? 0);
    $beban = (float)($qLR['beban'] ?? 0);
    $shuBerjalan = $pendapatan - $beban;

    $shuTambah = max(0.0, $shuBerjalan);
    $shuKurang = abs(min(0.0, $shuBerjalan));

    $totTambah += $shuTambah;
    $totKurang += $shuKurang;
    $totAkhir += $shuBerjalan;

    $komponenList[] = [
        'kode' => 'shu_berjalan',
        'nama' => 'SHU Periode Berjalan',
        'deskripsi' => 'Hasil usaha bersih tahun buku berjalan dari Laba Rugi',
        'akun_terkait' => 'Akun Pendapatan (4xx) & Beban (5xx)',
        'saldo_awal' => 0.0,
        'penambahan' => $shuTambah,
        'detail_penambahan' => 'Sisa Hasil Usaha (SHU) Positif Periode Berjalan',
        'pengurangan' => $shuKurang,
        'detail_pengurangan' => ($shuKurang > 0) ? 'Defisit Operasional Periode Berjalan' : 'Pembagian SHU ke Anggota (RAT)',
        'saldo_akhir' => $shuBerjalan
    ];

    // ══════════════════════════════════════════════
    // D. REKONSILIASI NERACA (100% BALANCE CHECK)
    // ══════════════════════════════════════════════
    // Verifikasi terhadap total modal pada neraca
    $neracaModal = $db->fetch(
        "SELECT 
            COALESCE(SUM(CASE WHEN ak.saldo_normal='K' THEN jd.kredit - jd.debit ELSE jd.debit - jd.kredit END), 0) as modal_neraca
         FROM akun ak
         JOIN jurnal_detail jd ON ak.id = jd.akun_id
         JOIN jurnal j ON jd.jurnal_id = j.id AND j.tgl_transaksi <= ?
         WHERE ak.kode IN ('212','213','214','215','204','208','3999')",
        [$tglAkhir]
    );
    $totalModalNeraca = (float)($neracaModal['modal_neraca'] ?? 0) + $shuBerjalan;
    $selisihNeraca = round($totAkhir - $totalModalNeraca, 2);
    $isBalanced = (abs($selisihNeraca) < 0.01);

    // ══════════════════════════════════════════════
    // E. MATRIKS MUTASI PERUBAHAN EKUITAS (TABEL FORMAL)
    // ══════════════════════════════════════════════
    $matriks = [
        [
            'baris' => 'Saldo Awal per 1 Januari ' . $tahun,
            'simpanan_pokok' => $komponenList[0]['saldo_awal'],
            'simpanan_wajib' => $komponenList[1]['saldo_awal'],
            'simpanan_partisipatif' => $komponenList[2]['saldo_awal'],
            'dana_cadangan' => $komponenList[3]['saldo_awal'],
            'ekuitas_awal' => $komponenList[4]['saldo_awal'],
            'shu_berjalan' => 0.0,
            'total' => $totAwal,
            'is_header' => false,
            'is_total' => false
        ],
        [
            'baris' => 'Setoran Simpanan Pokok Anggota Baru (+)',
            'simpanan_pokok' => $komponenList[0]['penambahan'],
            'simpanan_wajib' => 0.0,
            'simpanan_partisipatif' => 0.0,
            'dana_cadangan' => 0.0,
            'ekuitas_awal' => 0.0,
            'shu_berjalan' => 0.0,
            'total' => $komponenList[0]['penambahan'],
            'is_header' => false,
            'is_total' => false
        ],
        [
            'baris' => 'Setoran Simpanan Wajib Rutin (+)',
            'simpanan_pokok' => 0.0,
            'simpanan_wajib' => $komponenList[1]['penambahan'],
            'simpanan_partisipatif' => 0.0,
            'dana_cadangan' => 0.0,
            'ekuitas_awal' => 0.0,
            'shu_berjalan' => 0.0,
            'total' => $komponenList[1]['penambahan'],
            'is_header' => false,
            'is_total' => false
        ],
        [
            'baris' => 'Penyertaan Simpanan Partisipatif (+)',
            'simpanan_pokok' => 0.0,
            'simpanan_wajib' => 0.0,
            'simpanan_partisipatif' => $komponenList[2]['penambahan'],
            'dana_cadangan' => 0.0,
            'ekuitas_awal' => 0.0,
            'shu_berjalan' => 0.0,
            'total' => $komponenList[2]['penambahan'],
            'is_header' => false,
            'is_total' => false
        ],
        [
            'baris' => 'Pemupukan Cadangan Umum & Risiko (+)',
            'simpanan_pokok' => 0.0,
            'simpanan_wajib' => 0.0,
            'simpanan_partisipatif' => 0.0,
            'dana_cadangan' => $komponenList[3]['penambahan'],
            'ekuitas_awal' => 0.0,
            'shu_berjalan' => 0.0,
            'total' => $komponenList[3]['penambahan'],
            'is_header' => false,
            'is_total' => false
        ],
        [
            'baris' => 'Penyesuaian Ekuitas Awal Pendirian (+/-)',
            'simpanan_pokok' => 0.0,
            'simpanan_wajib' => 0.0,
            'simpanan_partisipatif' => 0.0,
            'dana_cadangan' => 0.0,
            'ekuitas_awal' => $komponenList[4]['penambahan'] - $komponenList[4]['pengurangan'],
            'shu_berjalan' => 0.0,
            'total' => $komponenList[4]['penambahan'] - $komponenList[4]['pengurangan'],
            'is_header' => false,
            'is_total' => false
        ],
        [
            'baris' => 'Sisa Hasil Usaha (SHU) Bersih Berjalan (+/-)',
            'simpanan_pokok' => 0.0,
            'simpanan_wajib' => 0.0,
            'simpanan_partisipatif' => 0.0,
            'dana_cadangan' => 0.0,
            'ekuitas_awal' => 0.0,
            'shu_berjalan' => $shuBerjalan,
            'total' => $shuBerjalan,
            'is_header' => false,
            'is_total' => false
        ],
        [
            'baris' => 'Pengembalian Simpanan Pokok Anggota Keluar (-)',
            'simpanan_pokok' => -$komponenList[0]['pengurangan'],
            'simpanan_wajib' => 0.0,
            'simpanan_partisipatif' => 0.0,
            'dana_cadangan' => 0.0,
            'ekuitas_awal' => 0.0,
            'shu_berjalan' => 0.0,
            'total' => -$komponenList[0]['pengurangan'],
            'is_header' => false,
            'is_total' => false
        ],
        [
            'baris' => 'Pengembalian Simpanan Wajib Anggota Keluar (-)',
            'simpanan_pokok' => 0.0,
            'simpanan_wajib' => -$komponenList[1]['pengurangan'],
            'simpanan_partisipatif' => 0.0,
            'dana_cadangan' => 0.0,
            'ekuitas_awal' => 0.0,
            'shu_berjalan' => 0.0,
            'total' => -$komponenList[1]['pengurangan'],
            'is_header' => false,
            'is_total' => false
        ],
        [
            'baris' => 'Saldo Akhir per 31 Desember ' . $tahun,
            'simpanan_pokok' => $komponenList[0]['saldo_akhir'],
            'simpanan_wajib' => $komponenList[1]['saldo_akhir'],
            'simpanan_partisipatif' => $komponenList[2]['saldo_akhir'],
            'dana_cadangan' => $komponenList[3]['saldo_akhir'],
            'ekuitas_awal' => $komponenList[4]['saldo_akhir'],
            'shu_berjalan' => $komponenList[5]['saldo_akhir'],
            'total' => $totAkhir,
            'is_header' => false,
            'is_total' => true
        ]
    ];

    // ══════════════════════════════════════════════
    // F. FORMAT ALIRAN VERTIKAL (WATERFALL BRIDGE)
    // ══════════════════════════════════════════════
    $penambahanList = [];
    if ($komponenList[0]['penambahan'] > 0) {
        $penambahanList[] = [
            'nama' => 'Setoran Simpanan Pokok Anggota Baru',
            'akun' => '212',
            'nominal' => $komponenList[0]['penambahan'],
            'keterangan' => 'Penyertaan modal pokok anggota baru'
        ];
    }
    if ($komponenList[1]['penambahan'] > 0) {
        $penambahanList[] = [
            'nama' => 'Setoran Simpanan Wajib Rutin Bulanan',
            'akun' => '213',
            'nominal' => $komponenList[1]['penambahan'],
            'keterangan' => 'Akumulasi iuran simpanan wajib berkala'
        ];
    }
    if ($komponenList[2]['penambahan'] > 0) {
        $penambahanList[] = [
            'nama' => 'Setoran Modal Simpanan Partisipatif',
            'akun' => '214',
            'nominal' => $komponenList[2]['penambahan'],
            'keterangan' => 'Penyertaan simpanan khusus / partisipasi modal'
        ];
    }
    if ($komponenList[3]['penambahan'] > 0) {
        $penambahanList[] = [
            'nama' => 'Pemupukan Cadangan Umum & Risiko',
            'akun' => '215, 204, 208',
            'nominal' => $komponenList[3]['penambahan'],
            'keterangan' => 'Retensi pemupukan cadangan dari alokasi SHU'
        ];
    }
    if ($komponenList[4]['penambahan'] > 0) {
        $penambahanList[] = [
            'nama' => 'Penyesuaian / Penambahan Ekuitas Awal',
            'akun' => '3999',
            'nominal' => $komponenList[4]['penambahan'],
            'keterangan' => 'Penyesuaian saldo modal awal pendirian'
        ];
    }
    if ($shuTambah > 0) {
        $penambahanList[] = [
            'nama' => 'Sisa Hasil Usaha (SHU) Positif Tahun Berjalan',
            'akun' => 'Laba Rugi (4xx - 5xx)',
            'nominal' => $shuTambah,
            'keterangan' => 'Surplus bersih hasil usaha tahun buku ' . $tahun
        ];
    }

    $penguranganList = [];
    if ($komponenList[0]['pengurangan'] > 0) {
        $penguranganList[] = [
            'nama' => 'Pengembalian Simpanan Pokok (Anggota Keluar)',
            'akun' => '212',
            'nominal' => $komponenList[0]['pengurangan'],
            'keterangan' => 'Pencairan modal pokok anggota berhenti'
        ];
    }
    if ($komponenList[1]['pengurangan'] > 0) {
        $penguranganList[] = [
            'nama' => 'Pengembalian Simpanan Wajib (Anggota Keluar)',
            'akun' => '213',
            'nominal' => $komponenList[1]['pengurangan'],
            'keterangan' => 'Pencairan simpanan wajib anggota berhenti'
        ];
    }
    if ($komponenList[2]['pengurangan'] > 0) {
        $penguranganList[] = [
            'nama' => 'Penarikan / Pengembalian Simpanan Partisipatif',
            'akun' => '214',
            'nominal' => $komponenList[2]['pengurangan'],
            'keterangan' => 'Pencairan modal partisipatif'
        ];
    }
    if ($komponenList[3]['pengurangan'] > 0) {
        $penguranganList[] = [
            'nama' => 'Penggunaan Cadangan Risiko untuk Menutup Defisit',
            'akun' => '215, 204, 208',
            'nominal' => $komponenList[3]['pengurangan'],
            'keterangan' => 'Alokasi penutupan risiko pembiayaan / kerugian'
        ];
    }
    if ($komponenList[4]['pengurangan'] > 0) {
        $penguranganList[] = [
            'nama' => 'Penyesuaian / Alokasi Saldo Ekuitas Awal',
            'akun' => '3999',
            'nominal' => $komponenList[4]['pengurangan'],
            'keterangan' => 'Penyesuaian neraca saldo awal'
        ];
    }
    if ($shuKurang > 0) {
        $penguranganList[] = [
            'nama' => 'Defisit Operasional Periode Berjalan',
            'akun' => 'Laba Rugi (5xx > 4xx)',
            'nominal' => $shuKurang,
            'keterangan' => 'Defisit hasil usaha tahun buku ' . $tahun
        ];
    }

    $aliranVertikal = [
        'modal_awal' => $totAwal,
        'penambahan' => $penambahanList,
        'subtotal_penambahan' => $totTambah,
        'pengurangan' => $penguranganList,
        'subtotal_pengurangan' => $totKurang,
        'modal_akhir' => $totAkhir,
        'modal_neraca' => $totalModalNeraca,
        'selisih' => $selisihNeraca,
        'is_balanced' => $isBalanced
    ];

    // ══════════════════════════════════════════════
    // G. FORMAT KOMPARATIF TAHUNAN (YEAR-OVER-YEAR / YoY)
    // ══════════════════════════════════════════════
    $prevYear = $tahun - 1;
    $prevTglAwal = "$prevYear-01-01";
    $prevTglAkhir = "$prevYear-12-31";

    $qLRLalu = $db->fetch(
        "SELECT 
            COALESCE(SUM(CASE WHEN ak.tipe='pendapatan' THEN (CASE WHEN ak.saldo_normal='K' THEN jd.kredit-jd.debit ELSE jd.debit-jd.kredit END) ELSE 0 END), 0) as pendapatan,
            COALESCE(SUM(CASE WHEN ak.tipe='beban' THEN (CASE WHEN ak.saldo_normal='D' THEN jd.debit-jd.kredit ELSE jd.kredit-jd.debit END) ELSE 0 END), 0) as beban
         FROM akun ak
         JOIN jurnal_detail jd ON ak.id = jd.akun_id
         JOIN jurnal j ON jd.jurnal_id = j.id AND j.tgl_transaksi BETWEEN ? AND ?
         WHERE ak.tipe IN ('pendapatan', 'beban')",
        [$prevTglAwal, $prevTglAkhir]
    );
    $shuLalu = (float)($qLRLalu['pendapatan'] ?? 0) - (float)($qLRLalu['beban'] ?? 0);

    $komparatifItems = [];
    $totLalu = 0;
    foreach ($komponenList as $k) {
        $saldoLalu = ($k['kode'] === 'shu_berjalan') ? $shuLalu : (float)$k['saldo_awal'];
        $saldoKini = (float)$k['saldo_akhir'];
        $pertumbuhanNominal = $saldoKini - $saldoLalu;
        $pertumbuhanPersen = ($saldoLalu != 0) ? round(($pertumbuhanNominal / abs($saldoLalu)) * 100, 1) : ($saldoKini != 0 ? 100.0 : 0.0);
        $tren = ($pertumbuhanNominal > 0) ? 'naik' : (($pertumbuhanNominal < 0) ? 'turun' : 'stabil');

        $totLalu += $saldoLalu;
        $komparatifItems[] = [
            'kode' => $k['kode'],
            'nama' => $k['nama'],
            'akun' => $k['akun_terkait'],
            'saldo_lalu' => $saldoLalu,
            'saldo_kini' => $saldoKini,
            'pertumbuhan_nominal' => $pertumbuhanNominal,
            'pertumbuhan_persen' => $pertumbuhanPersen,
            'tren' => $tren
        ];
    }

    $totPertumbuhanNominal = $totAkhir - $totLalu;
    $totPertumbuhanPersen = ($totLalu != 0) ? round(($totPertumbuhanNominal / abs($totLalu)) * 100, 1) : ($totAkhir != 0 ? 100.0 : 0.0);
    $totTren = ($totPertumbuhanNominal > 0) ? 'naik' : (($totPertumbuhanNominal < 0) ? 'turun' : 'stabil');

    $komparatif = [
        'tahun_lalu' => $prevYear,
        'tahun_ini' => $tahun,
        'items' => $komparatifItems,
        'total_lalu' => $totLalu,
        'total_kini' => $totAkhir,
        'pertumbuhan_nominal' => $totPertumbuhanNominal,
        'pertumbuhan_persen' => $totPertumbuhanPersen,
        'tren' => $totTren
    ];

    return [
        'tahun' => $tahun,
        'periode' => [
            'tgl_awal' => $tglAwal,
            'tgl_akhir' => $tglAkhir
        ],
        'regulasi' => 'Standar Akuntansi Keuangan Entitas Privat (SAK EP) & Permenkop UKM No. 2 Tahun 2024',
        'ringkasan' => [
            'total_modal_awal' => $totAwal,
            'total_penambahan' => $totTambah,
            'total_pengurangan' => $totKurang,
            'total_modal_akhir' => $totAkhir,
            'total_modal_neraca' => $totalModalNeraca,
            'selisih_neraca' => $selisihNeraca,
            'is_balanced' => $isBalanced
        ],
        'aliran_vertikal' => $aliranVertikal,
        'komparatif' => $komparatif,
        'komponen' => $komponenList,
        'matriks' => $matriks,
        'profil' => $profil
    ];
});

successResponse($responseData);
