<?php
// Dashboard Controller
authCheck();
checkPermission('dashboard.view');

$db = Database::getInstance();

switch ($method) {
    case 'GET':
        $redis = RedisManager::getInstance();
        $cacheKey = 'dashboard_stats_v19';
        $cachedStats = $redis->get($cacheKey);

        if ($cachedStats) {
            successResponse($cachedStats);
        }

        $totalAnggota = $db->count("SELECT COUNT(*) FROM anggota WHERE status = 'aktif'");

        // Total simpanan (D - K)
        $totalSimpanan = $db->fetch(
            "SELECT COALESCE(SUM(CASE WHEN kt.dk='D' THEN s.jumlah ELSE -s.jumlah END),0) as total
             FROM simpanan s JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id"
        );

        // Total pinjaman aktif
        $totalPinjaman = $db->fetch(
            "SELECT COALESCE(SUM(sisa_pinjaman),0) as total FROM pinjaman WHERE status = 'cair'"
        );

        // Pinjaman pending count
        $pinjamanPending = $db->count("SELECT COUNT(*) FROM pinjaman WHERE status = 'pending'");

        // Simpanan per jenis
        $simpananPerJenis = $db->fetchAll(
            "SELECT js.nama,
                COALESCE(SUM(CASE WHEN kt.dk='D' THEN s.jumlah ELSE -s.jumlah END),0) as total
             FROM jenis_simpanan js
             LEFT JOIN simpanan s ON js.id = s.jenis_simpanan_id
             LEFT JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
             GROUP BY js.id, js.nama ORDER BY js.kode"
        );

        // Angsuran jatuh tempo (7 hari ke depan)
        $angsuranJatuhTempo = $db->fetchAll(
            "SELECT ag.angsuran_ke, ag.tgl_jatuh_tempo, ag.total,
                    p.no_pinjaman, a.nama as anggota
             FROM angsuran ag
             JOIN pinjaman p ON ag.pinjaman_id = p.id
             JOIN anggota a ON p.anggota_id = a.id
             WHERE ag.status = 'belum' AND ag.tgl_jatuh_tempo BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
             ORDER BY ag.tgl_jatuh_tempo
             LIMIT 10"
        );

        // Pinjaman per jenis
        $pinjamanPerJenis = $db->fetchAll(
            "SELECT jp.nama, COALESCE(SUM(p.sisa_pinjaman),0) as total
             FROM jenis_pinjaman jp
             LEFT JOIN pinjaman p ON jp.id = p.jenis_pinjaman_id AND p.status = 'cair'
             GROUP BY jp.id, jp.nama ORDER BY jp.nama"
        );

        // Transaksi simpanan terakhir
        $transaksiTerakhir = $db->fetchAll(
            "SELECT s.no_transaksi, s.tgl_transaksi, s.jumlah,
                    a.nama as anggota, js.nama as jenis_simpanan,
                    kt.kode as kode_transaksi, kt.nama as nama_transaksi, kt.dk
             FROM simpanan s
             JOIN anggota a ON s.anggota_id = a.id
             JOIN jenis_simpanan js ON s.jenis_simpanan_id = js.id
             JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
             ORDER BY s.created_at DESC
             LIMIT 10"
        );

        $stats = [
            'total_anggota' => $totalAnggota,
            'total_simpanan' => $totalSimpanan['total'] ?? 0,
            'total_pinjaman' => $totalPinjaman['total'] ?? 0,
            'pinjaman_pending' => $pinjamanPending,
            'simpanan_per_jenis' => $simpananPerJenis,
            'pinjaman_per_jenis' => $pinjamanPerJenis,
            'angsuran_jatuh_tempo' => $angsuranJatuhTempo,
            'transaksi_terakhir' => $transaksiTerakhir
        ];

        // Cache for 5 minutes
        $redis->set($cacheKey, $stats, 300);

        successResponse($stats);
        break;

    default:
        errorResponse('Method not allowed', 405);
}
