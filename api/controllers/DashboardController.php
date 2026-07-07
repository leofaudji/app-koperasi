<?php
// Dashboard Controller
authCheck();
checkPermission('dashboard.view');

$db = Database::getInstance();

switch ($method) {
    case 'GET':
        $redis = RedisManager::getInstance();
        $cacheKey = 'dashboard_stats_v21';
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

        // Total Kas (Account 100, 101, 102, 103, 1000)
        $kasBalance = $db->fetch(
            "SELECT COALESCE(SUM(debit - kredit), 0) as total 
             FROM jurnal_detail jd 
             JOIN akun a ON jd.akun_id = a.id 
             WHERE a.kode IN ('100', '101', '102', '103', '1000')"
        );
        $totalKas = $kasBalance['total'] ?? 0;
        
        // Liquidity Ratio (%)
        $totalSimp = $totalSimpanan['total'] ?? 0;
        $liquidityRatio = $totalSimp > 0 ? round(($totalKas / $totalSimp) * 100, 2) : 100;

        // 1. NPL Ratio (Kredit Macet > 90 hari)
        // Defini: (Sisa Pinjaman yang memiliki tunggakan > 90 hari) sesuai Laporan Kolektibilitas
        $totalOutstanding = $totalPinjaman['total'] ?? 0;
        $totalMacet = $db->fetch(
            "SELECT COALESCE(SUM(sisa_pinjaman), 0) as total 
             FROM pinjaman 
             WHERE id IN (
                SELECT DISTINCT pinjaman_id 
                FROM angsuran 
                WHERE status = 'terlambat' 
                OR (status = 'belum' AND tgl_jatuh_tempo < DATE_SUB(CURDATE(), INTERVAL 90 DAY))
             ) AND status = 'cair'"
        );
        $nplRatio = $totalOutstanding > 0 ? round(($totalMacet['total'] / $totalOutstanding) * 100, 2) : 0;

        // 2. Member Growth (% Month over Month)
        $thisMonth = date('Y-m');
        $lastMonth = date('Y-m', strtotime('first day of last month'));
        $newMembers = $db->count("SELECT COUNT(*) FROM anggota WHERE DATE_FORMAT(tgl_daftar, '%Y-%m') = ?", [$thisMonth]);
        $oldMembers = $db->count("SELECT COUNT(*) FROM anggota WHERE DATE_FORMAT(tgl_daftar, '%Y-%m') < ?", [$thisMonth]);
        $memberGrowth = $oldMembers > 0 ? round(($newMembers / $oldMembers) * 100, 1) : 100;

        // 3. Transaction Volume (Last 30 Days)
        $txSimpanan = $db->count("SELECT COUNT(*) FROM simpanan WHERE tgl_transaksi >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)");
        $txAngsuran = $db->count("SELECT COUNT(*) FROM angsuran WHERE tgl_bayar >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)");
        $txVolume = $txSimpanan + $txAngsuran;

        $stats = [
            'total_anggota' => $totalAnggota,
            'total_simpanan' => $totalSimp,
            'total_pinjaman' => $totalOutstanding,
            'total_kas' => $totalKas,
            'liquidity_ratio' => $liquidityRatio,
            'npl_ratio' => $nplRatio,
            'member_growth' => $memberGrowth,
            'tx_volume' => $txVolume,
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
