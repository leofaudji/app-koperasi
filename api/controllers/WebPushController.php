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
