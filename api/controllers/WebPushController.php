<?php
// Web Push Notifications Admin Controller
authCheck();
$db = Database::getInstance();
require_once __DIR__ . '/../config/WebPushHelper.php';

function parseUserAgentDevice($ua) {
    if (!$ua) return ['device' => 'Unknown', 'browser' => 'Unknown', 'icon' => 'ri-device-line'];
    
    $device = 'Desktop';
    $icon = 'ri-computer-line';
    if (preg_match('/android/i', $ua)) {
        $device = 'Android';
        $icon = 'ri-android-line';
    } elseif (preg_match('/iphone/i', $ua)) {
        $device = 'iPhone';
        $icon = 'ri-apple-line';
    } elseif (preg_match('/ipad/i', $ua)) {
        $device = 'iPad';
        $icon = 'ri-tablet-line';
    } elseif (preg_match('/macintosh|mac os x/i', $ua)) {
        $device = 'macOS';
        $icon = 'ri-finder-line';
    } elseif (preg_match('/windows/i', $ua)) {
        $device = 'Windows PC';
        $icon = 'ri-windows-line';
    } elseif (preg_match('/linux/i', $ua)) {
        $device = 'Linux';
        $icon = 'ri-ubuntu-line';
    }

    $browser = 'Browser';
    if (preg_match('/edg/i', $ua)) {
        $browser = 'Edge';
    } elseif (preg_match('/chrome/i', $ua)) {
        $browser = 'Chrome';
    } elseif (preg_match('/safari/i', $ua) && !preg_match('/chrome/i', $ua)) {
        $browser = 'Safari';
    } elseif (preg_match('/firefox/i', $ua)) {
        $browser = 'Firefox';
    }

    return [
        'device' => $device,
        'browser' => $browser,
        'label' => "$device • $browser",
        'icon' => $icon
    ];
}

switch ($method) {
    case 'GET':
        if ($id === 'stats') {
            checkPermission('dashboard.view');

            // 1. Device and Anggota stats
            $subStats = $db->fetch(
                "SELECT COUNT(*) as total_devices, COUNT(DISTINCT anggota_id) as total_anggota FROM push_subscriptions"
            );

            // 2. Today's stats
            $todayStats = $db->fetch(
                "SELECT COUNT(*) as count_logs, 
                        COALESCE(SUM(success_count), 0) as sent_today, 
                        COALESCE(SUM(failed_count), 0) as failed_today 
                 FROM push_logs 
                 WHERE DATE(created_at) = CURDATE()"
            );

            // 3. All-time stats
            $allTimeStats = $db->fetch(
                "SELECT COUNT(*) as total_logs, 
                        COALESCE(SUM(success_count), 0) as total_sent, 
                        COALESCE(SUM(failed_count), 0) as total_failed 
                 FROM push_logs"
            );

            // 4. By Type breakdown
            $byType = $db->fetchAll(
                "SELECT tipe, COUNT(*) as total_trx, COALESCE(SUM(success_count), 0) as sent
                 FROM push_logs 
                 GROUP BY tipe"
            );

            // 5. 7-day activity trend
            $trend = $db->fetchAll(
                "SELECT DATE(created_at) as tgl, COUNT(*) as logs, COALESCE(SUM(success_count), 0) as sent
                 FROM push_logs 
                 WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
                 GROUP BY DATE(created_at)
                 ORDER BY tgl ASC"
            );

            // 6. VAPID Configuration status
            $vapidPub = $db->fetch("SELECT setting_value FROM app_settings WHERE setting_key = 'vapid_public_key'")['setting_value'] ?? '';
            $vapidSubject = $db->fetch("SELECT setting_value FROM app_settings WHERE setting_key = 'vapid_subject'")['setting_value'] ?? '';

            successResponse([
                'subscriptions' => [
                    'total_devices' => (int) ($subStats['total_devices'] ?? 0),
                    'total_anggota' => (int) ($subStats['total_anggota'] ?? 0),
                ],
                'today' => [
                    'logs' => (int) ($todayStats['count_logs'] ?? 0),
                    'sent' => (int) ($todayStats['sent_today'] ?? 0),
                    'failed' => (int) ($todayStats['failed_today'] ?? 0),
                ],
                'all_time' => [
                    'total_logs' => (int) ($allTimeStats['total_logs'] ?? 0),
                    'total_sent' => (int) ($allTimeStats['total_sent'] ?? 0),
                    'total_failed' => (int) ($allTimeStats['total_failed'] ?? 0),
                ],
                'by_type' => $byType,
                'trend' => $trend,
                'vapid' => [
                    'is_ready' => !empty($vapidPub),
                    'public_key' => $vapidPub,
                    'subject' => $vapidSubject
                ]
            ]);
        }

        if ($id === 'subscriptions') {
            checkPermission('dashboard.view');

            $page = max(1, (int) ($params['page'] ?? 1));
            $limit = max(5, min(100, (int) ($params['limit'] ?? 15)));
            $offset = ($page - 1) * $limit;
            $search = trim($params['search'] ?? '');

            $where = "WHERE 1=1";
            $binds = [];

            if (!empty($search)) {
                $where .= " AND (a.nama LIKE ? OR a.no_anggota LIKE ? OR ps.user_agent LIKE ?)";
                $kw = "%$search%";
                $binds = array_merge($binds, [$kw, $kw, $kw]);
            }

            $countRow = $db->fetch(
                "SELECT COUNT(*) as total 
                 FROM push_subscriptions ps 
                 LEFT JOIN anggota a ON ps.anggota_id = a.id 
                 $where",
                $binds
            );
            $total = (int) ($countRow['total'] ?? 0);

            $rows = $db->fetchAll(
                "SELECT ps.id, ps.anggota_id, ps.user_agent, ps.endpoint, ps.created_at, ps.updated_at,
                        a.nama as anggota_nama, a.no_anggota, a.foto, a.status as anggota_status
                 FROM push_subscriptions ps
                 LEFT JOIN anggota a ON ps.anggota_id = a.id
                 $where
                 ORDER BY ps.updated_at DESC
                 LIMIT $limit OFFSET $offset",
                $binds
            );

            // Format rows
            $data = array_map(function($r) {
                $parsed = parseUserAgentDevice($r['user_agent'] ?? '');
                
                // Endpoint provider
                $provider = 'Google FCM';
                if (stripos($r['endpoint'], 'apple.com') !== false) {
                    $provider = 'Apple APNs';
                } elseif (stripos($r['endpoint'], 'windows.com') !== false || stripos($r['endpoint'], 'microsoft.com') !== false) {
                    $provider = 'Microsoft WNS';
                } elseif (stripos($r['endpoint'], 'mozilla.com') !== false) {
                    $provider = 'Mozilla AutoPush';
                }

                return [
                    'id' => (int) $r['id'],
                    'anggota_id' => (int) $r['anggota_id'],
                    'anggota_nama' => $r['anggota_nama'] ?: 'Tamu / Anonim',
                    'no_anggota' => $r['no_anggota'] ?: '-',
                    'anggota_status' => $r['anggota_status'] ?: 'aktif',
                    'device' => $parsed['device'],
                    'browser' => $parsed['browser'],
                    'device_label' => $parsed['label'],
                    'device_icon' => $parsed['icon'],
                    'provider' => $provider,
                    'endpoint_short' => substr($r['endpoint'], 0, 45) . '...',
                    'created_at' => $r['created_at'],
                    'updated_at' => $r['updated_at']
                ];
            }, $rows);

            successResponse([
                'data' => $data,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'total_pages' => ceil($total / $limit)
                ]
            ]);
        }

        if ($id === 'logs') {
            checkPermission('dashboard.view');

            $page = max(1, (int) ($params['page'] ?? 1));
            $limit = max(5, min(100, (int) ($params['limit'] ?? 15)));
            $offset = ($page - 1) * $limit;
            $search = trim($params['search'] ?? '');
            $tipe = trim($params['tipe'] ?? '');
            $status = trim($params['status'] ?? '');

            $where = "WHERE 1=1";
            $binds = [];

            if (!empty($search)) {
                $where .= " AND (l.title LIKE ? OR l.message LIKE ? OR a.nama LIKE ? OR a.no_anggota LIKE ?)";
                $kw = "%$search%";
                $binds = array_merge($binds, [$kw, $kw, $kw, $kw]);
            }

            if (!empty($tipe)) {
                $where .= " AND l.tipe = ?";
                $binds[] = $tipe;
            }

            if (!empty($status)) {
                $where .= " AND l.status = ?";
                $binds[] = $status;
            }

            $countRow = $db->fetch(
                "SELECT COUNT(*) as total 
                 FROM push_logs l 
                 LEFT JOIN anggota a ON l.anggota_id = a.id 
                 $where",
                $binds
            );
            $total = (int) ($countRow['total'] ?? 0);

            $rows = $db->fetchAll(
                "SELECT l.*, a.nama as anggota_nama, a.no_anggota, u.nama_lengkap as sender_nama
                 FROM push_logs l
                 LEFT JOIN anggota a ON l.anggota_id = a.id
                 LEFT JOIN users u ON l.created_by = u.id
                 $where
                 ORDER BY l.id DESC
                 LIMIT $limit OFFSET $offset",
                $binds
            );

            successResponse([
                'data' => $rows,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'total_pages' => ceil($total / $limit)
                ]
            ]);
        }

        if ($id === 'due-installments') {
            checkPermission('dashboard.view');

            $kategori = $_GET['kategori'] ?? 'all';
            $hasDevice = $_GET['has_device'] ?? 'all';
            $search = trim($_GET['search'] ?? '');
            $page = max(1, (int) ($_GET['page'] ?? 1));
            $limit = max(10, min(100, (int) ($_GET['limit'] ?? 20)));
            $offset = ($page - 1) * $limit;

            // 1. Overall stats per category across all unpaid installments
            $statsSql = "
                SELECT 
                    COUNT(*) as total_unpaid,
                    COALESCE(SUM(an.total), 0) as total_nominal,
                    COALESCE(SUM(CASE WHEN ps.device_count > 0 THEN 1 ELSE 0 END), 0) as total_with_device,

                    SUM(CASE WHEN DATEDIFF(an.tgl_jatuh_tempo, CURDATE()) BETWEEN 1 AND 5 THEN 1 ELSE 0 END) as h_min_5_count,
                    COALESCE(SUM(CASE WHEN DATEDIFF(an.tgl_jatuh_tempo, CURDATE()) BETWEEN 1 AND 5 THEN an.total ELSE 0 END), 0) as h_min_5_nominal,
                    SUM(CASE WHEN DATEDIFF(an.tgl_jatuh_tempo, CURDATE()) BETWEEN 1 AND 5 AND ps.device_count > 0 THEN 1 ELSE 0 END) as h_min_5_with_device,

                    SUM(CASE WHEN DATEDIFF(an.tgl_jatuh_tempo, CURDATE()) = 0 THEN 1 ELSE 0 END) as today_count,
                    COALESCE(SUM(CASE WHEN DATEDIFF(an.tgl_jatuh_tempo, CURDATE()) = 0 THEN an.total ELSE 0 END), 0) as today_nominal,
                    SUM(CASE WHEN DATEDIFF(an.tgl_jatuh_tempo, CURDATE()) = 0 AND ps.device_count > 0 THEN 1 ELSE 0 END) as today_with_device,

                    SUM(CASE WHEN DATEDIFF(CURDATE(), an.tgl_jatuh_tempo) BETWEEN 1 AND 7 THEN 1 ELSE 0 END) as late_7_count,
                    COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), an.tgl_jatuh_tempo) BETWEEN 1 AND 7 THEN an.total ELSE 0 END), 0) as late_7_nominal,
                    SUM(CASE WHEN DATEDIFF(CURDATE(), an.tgl_jatuh_tempo) BETWEEN 1 AND 7 AND ps.device_count > 0 THEN 1 ELSE 0 END) as late_7_with_device,

                    SUM(CASE WHEN DATEDIFF(CURDATE(), an.tgl_jatuh_tempo) BETWEEN 8 AND 30 THEN 1 ELSE 0 END) as late_30_count,
                    COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), an.tgl_jatuh_tempo) BETWEEN 8 AND 30 THEN an.total ELSE 0 END), 0) as late_30_nominal,
                    SUM(CASE WHEN DATEDIFF(CURDATE(), an.tgl_jatuh_tempo) BETWEEN 8 AND 30 AND ps.device_count > 0 THEN 1 ELSE 0 END) as late_30_with_device,

                    SUM(CASE WHEN DATEDIFF(CURDATE(), an.tgl_jatuh_tempo) > 30 THEN 1 ELSE 0 END) as late_over_30_count,
                    COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), an.tgl_jatuh_tempo) > 30 THEN an.total ELSE 0 END), 0) as late_over_30_nominal,
                    SUM(CASE WHEN DATEDIFF(CURDATE(), an.tgl_jatuh_tempo) > 30 AND ps.device_count > 0 THEN 1 ELSE 0 END) as late_over_30_with_device
                FROM angsuran an
                JOIN pinjaman p ON an.pinjaman_id = p.id
                LEFT JOIN (
                    SELECT anggota_id, COUNT(*) as device_count 
                    FROM push_subscriptions 
                    GROUP BY anggota_id
                ) ps ON p.anggota_id = ps.anggota_id
                WHERE an.status = 'belum'
            ";
            $categoryStats = $db->fetch($statsSql);

            // 2. Build where filter for list
            $where = "WHERE an.status = 'belum'";
            $binds = [];

            if ($kategori === 'h_min_5') {
                $where .= " AND DATEDIFF(an.tgl_jatuh_tempo, CURDATE()) BETWEEN 1 AND 5";
            } elseif ($kategori === 'today') {
                $where .= " AND DATEDIFF(an.tgl_jatuh_tempo, CURDATE()) = 0";
            } elseif ($kategori === 'late_7') {
                $where .= " AND DATEDIFF(CURDATE(), an.tgl_jatuh_tempo) BETWEEN 1 AND 7";
            } elseif ($kategori === 'late_30') {
                $where .= " AND DATEDIFF(CURDATE(), an.tgl_jatuh_tempo) BETWEEN 8 AND 30";
            } elseif ($kategori === 'late_over_30') {
                $where .= " AND DATEDIFF(CURDATE(), an.tgl_jatuh_tempo) > 30";
            }

            if ($hasDevice === 'yes') {
                $where .= " AND COALESCE(ps.device_count, 0) > 0";
            } elseif ($hasDevice === 'no') {
                $where .= " AND COALESCE(ps.device_count, 0) = 0";
            }

            if ($search !== '') {
                $where .= " AND (a.nama LIKE ? OR a.no_anggota LIKE ? OR p.no_pinjaman LIKE ? OR a.telepon LIKE ?)";
                $binds[] = "%$search%";
                $binds[] = "%$search%";
                $binds[] = "%$search%";
                $binds[] = "%$search%";
            }

            // Total count for current filter
            $countSql = "
                SELECT COUNT(*) as total 
                FROM angsuran an
                JOIN pinjaman p ON an.pinjaman_id = p.id
                JOIN anggota a ON p.anggota_id = a.id
                LEFT JOIN (
                    SELECT anggota_id, COUNT(*) as device_count 
                    FROM push_subscriptions 
                    GROUP BY anggota_id
                ) ps ON p.anggota_id = ps.anggota_id
                $where
            ";
            $total = (int) ($db->fetch($countSql, $binds)['total'] ?? 0);

            // Fetch list
            $listSql = "
                SELECT 
                    an.id, an.pinjaman_id, an.angsuran_ke, an.tgl_jatuh_tempo, an.pokok, an.bunga, an.denda, an.total,
                    DATEDIFF(an.tgl_jatuh_tempo, CURDATE()) as diff_days,
                    DATEDIFF(CURDATE(), an.tgl_jatuh_tempo) as overdue_days,
                    p.no_pinjaman, p.sisa_pinjaman, p.anggota_id,
                    a.nama as nama_anggota, a.no_anggota, a.telepon,
                    jp.nama as jenis_pinjaman,
                    COALESCE(ps.device_count, 0) as device_count,
                    (SELECT COUNT(*) FROM push_logs pl WHERE pl.anggota_id = p.anggota_id AND pl.tipe = 'tagihan' AND pl.status = 'success') as push_sent_count,
                    (SELECT MAX(pl.created_at) FROM push_logs pl WHERE pl.anggota_id = p.anggota_id AND pl.tipe = 'tagihan') as last_push_at
                FROM angsuran an
                JOIN pinjaman p ON an.pinjaman_id = p.id
                JOIN anggota a ON p.anggota_id = a.id
                JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
                LEFT JOIN (
                    SELECT anggota_id, COUNT(*) as device_count 
                    FROM push_subscriptions 
                    GROUP BY anggota_id
                ) ps ON p.anggota_id = ps.anggota_id
                $where
                ORDER BY an.tgl_jatuh_tempo ASC, an.id ASC
                LIMIT $limit OFFSET $offset
            ";
            $rows = $db->fetchAll($listSql, $binds);

            successResponse([
                'stats' => $categoryStats,
                'data' => $rows,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'total_pages' => ceil($total / $limit)
                ]
            ]);
        }

        errorResponse('Sub-resource tidak ditemukan', 404);
        break;

    case 'POST':
        if ($id === 'broadcast') {
            checkPermission('dashboard.view');

            $title = trim($params['title'] ?? '');
            $message = trim($params['message'] ?? '');
            $url = trim($params['url'] ?? '/portal/');

            if (empty($title) || empty($message)) {
                errorResponse('Judul dan Pesan notifikasi wajib diisi');
            }

            $res = WebPushHelper::getInstance()->sendBroadcast($title, $message, $url, [
                'tag' => 'broadcast_' . time(),
                'tipe' => 'broadcast'
            ]);

            logActivity('create', 'web_push_broadcast', null, null, [
                'title' => $title,
                'sent' => $res['sent'] ?? 0,
                'total' => $res['total'] ?? 0
            ]);

            successResponse($res, 'Pesan broadcast push notifikasi berhasil diproses');
        }

        if ($id === 'test-anggota') {
            checkPermission('dashboard.view');

            $anggotaId = (int) ($params['anggota_id'] ?? 0);
            if (!$anggotaId) {
                errorResponse('Anggota ID tidak valid');
            }

            $anggota = $db->fetch("SELECT id, nama FROM anggota WHERE id = ?", [$anggotaId]);
            if (!$anggota) {
                errorResponse('Anggota tidak ditemukan');
            }

            $title = trim($params['title'] ?? "Uji Coba Push Notifikasi 🚀");
            $message = trim($params['message'] ?? "Halo {$anggota['nama']}, koneksi Web Push browser Anda aktif dan berjalan dengan baik!");
            $url = trim($params['url'] ?? '/portal/#profil');

            $res = WebPushHelper::getInstance()->sendToAnggota($anggotaId, $title, $message, $url, [
                'tag' => 'test_' . time(),
                'tipe' => 'test'
            ]);

            if ($res['success']) {
                successResponse($res, "Notifikasi uji coba berhasil dikirim ke {$res['sent']} perangkat");
            } else {
                errorResponse($res['message'] ?? 'Gagal mengirim push notifikasi ke anggota');
            }
        }

        if ($id === 'broadcast-tagihan') {
            checkPermission('dashboard.view');

            $mode = $params['mode'] ?? 'selected'; // 'selected' or 'category'
            $kategori = $params['kategori'] ?? 'today';
            $angsuranIds = $params['angsuran_ids'] ?? [];
            $customTitle = trim($params['custom_title'] ?? '');
            $customMessage = trim($params['custom_message'] ?? '');
            $url = trim($params['url'] ?? '/portal/#pinjaman');
            $onlyWithDevices = !empty($params['only_with_devices']);

            if ($mode === 'category') {
                $where = "WHERE an.status = 'belum'";
                if ($kategori === 'h_min_5') {
                    $where .= " AND DATEDIFF(an.tgl_jatuh_tempo, CURDATE()) BETWEEN 1 AND 5";
                } elseif ($kategori === 'today') {
                    $where .= " AND DATEDIFF(an.tgl_jatuh_tempo, CURDATE()) = 0";
                } elseif ($kategori === 'late_7') {
                    $where .= " AND DATEDIFF(CURDATE(), an.tgl_jatuh_tempo) BETWEEN 1 AND 7";
                } elseif ($kategori === 'late_30') {
                    $where .= " AND DATEDIFF(CURDATE(), an.tgl_jatuh_tempo) BETWEEN 8 AND 30";
                } elseif ($kategori === 'late_over_30') {
                    $where .= " AND DATEDIFF(CURDATE(), an.tgl_jatuh_tempo) > 30";
                }

                if ($onlyWithDevices) {
                    $where .= " AND EXISTS (SELECT 1 FROM push_subscriptions ps WHERE ps.anggota_id = p.anggota_id)";
                }

                $targetRows = $db->fetchAll(
                    "SELECT an.id 
                     FROM angsuran an 
                     JOIN pinjaman p ON an.pinjaman_id = p.id 
                     $where 
                     ORDER BY an.tgl_jatuh_tempo ASC"
                );
                $angsuranIds = array_column($targetRows, 'id');
            }

            if (empty($angsuranIds)) {
                errorResponse('Tidak ada tagihan yang dipilih atau memenuhi kriteria');
            }

            $helper = WebPushHelper::getInstance();
            $sent = 0;
            $failed = 0;
            $noDevice = 0;
            $processed = 0;

            foreach ($angsuranIds as $aid) {
                $aid = (int) $aid;
                if (!$aid) continue;

                $r = $helper->sendDueInstallmentPush($aid, $customTitle, $customMessage, $url);
                $processed++;
                if (!empty($r['success'])) {
                    $sent += ($r['sent'] ?? 1);
                } elseif (($r['message'] ?? '') === 'Anggota has no push subscriptions') {
                    $noDevice++;
                } else {
                    $failed++;
                }
            }

            logActivity('create', 'web_push_due_broadcast', null, null, [
                'mode' => $mode,
                'kategori' => $kategori,
                'processed' => $processed,
                'sent' => $sent,
                'no_device' => $noDevice,
                'failed' => $failed
            ]);

            successResponse([
                'processed' => $processed,
                'sent' => $sent,
                'no_device' => $noDevice,
                'failed' => $failed
            ], "Broadcast tagihan selesai: $sent notifikasi berhasil terkirim ($noDevice belum ada perangkat, $failed gagal).");
        }

        errorResponse('Action tidak ditemukan', 404);
        break;

    case 'DELETE':
        checkPermission('dashboard.view');
        $subId = (int) $id;
        if (!$subId) {
            errorResponse('Subscription ID tidak valid');
        }

        $deleted = $db->execute("DELETE FROM push_subscriptions WHERE id = ?", [$subId]);
        if ($deleted) {
            successResponse(null, 'Device subscription berhasil dihapus');
        } else {
            errorResponse('Device subscription tidak ditemukan');
        }
        break;

    default:
        errorResponse('Metode tidak didukung', 405);
}
