<?php
// api/controllers/KolektibilitasController.php

authCheck();
$db = Database::getInstance();

$method = $_SERVER['REQUEST_METHOD'];
$action = $params['action'] ?? '';

checkPermission('laporan.view');

if ($method === 'GET') {
    // Ambil data semua pinjaman yang sedang 'cair'
    $pinjamanQuery = "
        SELECT 
            p.id, 
            p.no_pinjaman, 
            p.sisa_pinjaman, 
            a.nama as anggota_nama, 
            a.no_anggota,
            jp.nama as jenis_pinjaman,
            (
                SELECT MIN(tgl_jatuh_tempo) 
                FROM angsuran 
                WHERE pinjaman_id = p.id AND status = 'belum'
            ) as tgl_tunggakan
        FROM pinjaman p
        JOIN anggota a ON p.anggota_id = a.id
        JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
        WHERE p.status = 'cair' AND p.sisa_pinjaman > 0
        ORDER BY tgl_tunggakan ASC, p.id ASC
    ";

    $pinjamanList = $db->fetchAll($pinjamanQuery);

    $today = strtotime('today');

    // Summary
    $summary = [
        'lancar' => ['count' => 0, 'nominal' => 0],
        'dpk' => ['count' => 0, 'nominal' => 0],
        'kurang_lancar' => ['count' => 0, 'nominal' => 0],
        'diragukan' => ['count' => 0, 'nominal' => 0],
        'macet' => ['count' => 0, 'nominal' => 0],
        'total' => ['count' => 0, 'nominal' => 0],
        'total_npl' => ['count' => 0, 'nominal' => 0], // Kol 3, 4, 5
    ];

    $detailData = [];

    foreach ($pinjamanList as $p) {
        $sisaPokok = (float) $p['sisa_pinjaman'];
        $hariTelat = 0;
        $kategori = 1;      // 1=Lancar, 2=DPK, 3=KL, 4=D, 5=M
        $kategoriLabel = 'Lancar';

        if ($p['tgl_tunggakan']) {
            $jatuhTempo = strtotime($p['tgl_tunggakan']);
            if ($jatuhTempo < $today) {
                $hariTelat = floor(($today - $jatuhTempo) / 86400); // 1 hari = 86400 detik
            }
        }

        // Tentukan klasifikasi kolektibilitas berdasarkan hari telat
        if ($hariTelat == 0) {
            $kategori = 1;
            $kategoriLabel = 'Lancar';
            $summary['lancar']['count']++;
            $summary['lancar']['nominal'] += $sisaPokok;
        } elseif ($hariTelat >= 1 && $hariTelat <= 90) {
            $kategori = 2;
            $kategoriLabel = 'DPK (Dalam Perhatian Khusus)';
            $summary['dpk']['count']++;
            $summary['dpk']['nominal'] += $sisaPokok;
        } elseif ($hariTelat >= 91 && $hariTelat <= 120) {
            $kategori = 3;
            $kategoriLabel = 'Kurang Lancar';
            $summary['kurang_lancar']['count']++;
            $summary['kurang_lancar']['nominal'] += $sisaPokok;

            $summary['total_npl']['count']++;
            $summary['total_npl']['nominal'] += $sisaPokok;
        } elseif ($hariTelat >= 121 && $hariTelat <= 180) {
            $kategori = 4;
            $kategoriLabel = 'Diragukan';
            $summary['diragukan']['count']++;
            $summary['diragukan']['nominal'] += $sisaPokok;

            $summary['total_npl']['count']++;
            $summary['total_npl']['nominal'] += $sisaPokok;
        } else { // > 180 hari
            $kategori = 5;
            $kategoriLabel = 'Macet';
            $summary['macet']['count']++;
            $summary['macet']['nominal'] += $sisaPokok;

            $summary['total_npl']['count']++;
            $summary['total_npl']['nominal'] += $sisaPokok;
        }

        $summary['total']['count']++;
        $summary['total']['nominal'] += $sisaPokok;

        $p['hari_telat'] = $hariTelat;
        $p['kolektibilitas'] = $kategori;
        $p['kolektibilitas_label'] = $kategoriLabel;
        $detailData[] = $p;
    }

    $nplRatio = 0;
    if ($summary['total']['nominal'] > 0) {
        $nplRatio = ($summary['total_npl']['nominal'] / $summary['total']['nominal']) * 100;
    }

    successResponse([
        'summary' => $summary,
        'npl_ratio' => round($nplRatio, 2),
        'detail' => $detailData
    ]);

} else {
    errorResponse('Method not allowed', 405);
}
