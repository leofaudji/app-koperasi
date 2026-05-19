<?php
// Log Controller (Admin side)
$db = Database::getInstance();

switch ($id) {
    case 'journey':
        authCheck();
        $anggotaId = $params['anggota_id'] ?? 0;
        if (!$anggotaId)
            errorResponse('ID Anggota wajib diisi');

        $logs = $db->fetchAll(
            "SELECT * FROM portal_logs 
             WHERE anggota_id = ? 
             ORDER BY created_at DESC 
             LIMIT 50",
            [$anggotaId]
        );
        successResponse($logs);
        break;

    case 'activities':
        authCheck();
        $anggotaId = $params['anggota_id'] ?? 0;
        if (!$anggotaId)
            errorResponse('ID Anggota wajib diisi');

        // Menggabungkan berbagai log aktivitas anggota
        $sql = "
            (SELECT 'security' as type, activity as title, CONCAT(COALESCE(platform,''), ' · ', COALESCE(browser,'')) as detail, created_at 
             FROM portal_logs WHERE anggota_id = ?)
            UNION ALL
            (SELECT 'profile' as type, action as title, CONCAT('Audit: ', table_name, ' (ID:', record_id, ')') as detail, created_at 
             FROM audit_logs WHERE table_name = 'anggota' AND record_id = ?)
            UNION ALL
            (SELECT 'finance' as type, CONCAT('Simpanan: ', js.nama) as title, s.no_transaksi as detail, s.created_at 
             FROM simpanan s JOIN jenis_simpanan js ON s.jenis_simpanan_id = js.id 
             WHERE s.anggota_id = ?)
            UNION ALL
            (SELECT 'finance' as type, 'Pencairan Pinjaman' as title, p.no_pinjaman as detail, p.created_at 
             FROM pinjaman p WHERE p.anggota_id = ? AND p.status IN ('cair', 'lunas'))
            UNION ALL
            (SELECT 'finance' as type, 'Pembayaran Angsuran' as title, a.no_transaksi as detail, a.created_at 
             FROM angsuran a JOIN pinjaman p ON a.pinjaman_id = p.id 
             WHERE p.anggota_id = ? AND a.status != 'belum')
            ORDER BY created_at DESC LIMIT 30";

        $activities = $db->fetchAll($sql, [$anggotaId, $anggotaId, $anggotaId, $anggotaId, $anggotaId]);
        successResponse($activities);
        break;

    case 'stats':
        authCheck();
        $today = date('Y-m-d');
        
        $loginToday = $db->count("SELECT COUNT(*) FROM portal_logs WHERE activity = 'Login ke Portal' AND DATE(created_at) = ?", [$today]);
        $activeUsers = $db->count("SELECT COUNT(DISTINCT anggota_id) FROM portal_logs WHERE DATE(created_at) = ?", [$today]);
        $totalActivity = $db->count("SELECT COUNT(*) FROM portal_logs WHERE DATE(created_at) = ?", [$today]);
        $platforms = $db->fetchAll("SELECT platform, COUNT(*) as total FROM portal_logs WHERE DATE(created_at) = ? GROUP BY platform", [$today]);
        $browsers = $db->fetchAll("SELECT browser, COUNT(*) as total FROM portal_logs WHERE DATE(created_at) = ? GROUP BY browser", [$today]);
        
        $suspiciousUsers = $db->fetchAll("
            SELECT a.nama, COUNT(DISTINCT ip_address) as ip_count 
            FROM portal_logs l
            JOIN anggota a ON l.anggota_id = a.id
            WHERE l.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            GROUP BY l.anggota_id 
            HAVING ip_count > 1
        ");

        $failedLogins = $db->count("SELECT COUNT(*) FROM portal_logs WHERE activity LIKE 'Gagal Login%' AND DATE(created_at) = ?", [$today]);

        // AI Insight Logic (Rule-based)
        $insights = [];
        $status = 'Aman';
        $color = 'emerald';

        if (count($suspiciousUsers) > 0) {
            $status = 'Waspada';
            $color = 'amber';
            $names = implode(', ', array_column(array_slice($suspiciousUsers, 0, 2), 'nama'));
            $insights[] = "Terdeteksi **" . count($suspiciousUsers) . " anggota** dengan multi-IP (termasuk $names). Mohon pantau aktifitas mereka.";
        }

        if ($failedLogins > 5) {
            $status = 'Bahaya';
            $color = 'red';
            $insights[] = "Terdapat **$failedLogins percobaan gagal login** hari ini. Waspadai potensi serangan brute-force.";
        }

        if ($activeUsers > 10) {
            $insights[] = "Antusiasme tinggi! **$activeUsers anggota** aktif menggunakan portal hari ini.";
        }

        if (empty($insights)) {
            $insights[] = "Sistem berjalan optimal. Belum ada anomali keamanan yang terdeteksi hari ini.";
        }

        $stats = [
            'login_today' => $loginToday,
            'active_users' => $activeUsers,
            'total_activity' => $totalActivity,
            'platforms' => $platforms,
            'browsers' => $browsers,
            'suspicious_count' => count($suspiciousUsers),
            'ai_insight' => [
                'status' => $status,
                'color' => $color,
                'messages' => $insights
            ]
        ];
        
        successResponse($stats);
        break;

    case 'portal':
        authCheck();
        $page = $params['page'] ?? 1;
        $perPage = $params['per_page'] ?? 20;
        $search = $params['search'] ?? '';
        
        $where = "WHERE 1=1";
        $sqlParams = [];
        
        if (!empty($search)) {
            $where .= " AND (a.nama LIKE ? OR a.no_anggota LIKE ? OR l.activity LIKE ? OR l.ip_address LIKE ? OR l.location LIKE ?)";
            $sqlParams = ["%$search%", "%$search%", "%$search%", "%$search%", "%$search%"];
        }
        
        $query = "SELECT l.*, a.nama as anggota_nama, a.no_anggota,
                  (SELECT COUNT(DISTINCT ip_address) FROM portal_logs l2 
                   WHERE l2.anggota_id = l.anggota_id 
                   AND l2.created_at >= DATE_SUB(l.created_at, INTERVAL 24 HOUR)
                   AND l2.created_at <= l.created_at) as session_ips
                  FROM portal_logs l 
                  JOIN anggota a ON l.anggota_id = a.id 
                  $where 
                  ORDER BY l.created_at DESC";
                  
        $countQuery = "SELECT COUNT(*) FROM portal_logs l JOIN anggota a ON l.anggota_id = a.id $where";
        
        paginatedResponse($query, $countQuery, $sqlParams, $page, $perPage);
        break;

    default:
        errorResponse('Log route not found', 404);
}
