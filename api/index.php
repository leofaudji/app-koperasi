<?php
// ============================================
// API ENTRY POINT & ROUTER
// ============================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load env, config & dependencies
require_once __DIR__ . '/config/env.php';
require_once __DIR__ . '/config/app.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/redis.php';
require_once __DIR__ . '/middleware/auth.php';
require_once __DIR__ . '/middleware/rbac.php';
require_once __DIR__ . '/middleware/csrf.php';

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_name(SESSION_NAME);
    ini_set('session.gc_maxlifetime', SESSION_LIFETIME);
    session_set_cookie_params(SESSION_LIFETIME);
    session_start();
}

// CSRF Protection — validate token on POST/PUT/DELETE
verifyCsrfToken();

// Get route and method
$route = isset($_GET['route']) ? trim($_GET['route'], '/') : '';
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input))
    $input = [];

// Merge GET, POST (FormData), and JSON input params
$params = array_merge($_GET, $_POST, $input);
unset($params['route']);

// Simple router
$segments = explode('/', $route);
$resource = $segments[0] ?? '';
$id = $segments[1] ?? null;
$action = $segments[2] ?? null;

// Helper functions
function jsonResponse($data, $code = 200)
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function successResponse($data = null, $message = 'Success', $code = 200)
{
    jsonResponse(['success' => true, 'message' => $message, 'data' => $data], $code);
}

function errorResponse($message = 'Error', $code = 400)
{
    jsonResponse(['success' => false, 'message' => $message], $code);
}

function paginatedResponse($query, $countQuery, $params, $page, $perPage)
{
    $db = Database::getInstance();
    $offset = ($page - 1) * $perPage;
    $total = $db->count($countQuery, $params);
    $data = $db->fetchAll($query . " LIMIT $perPage OFFSET $offset", $params);

    jsonResponse([
        'success' => true,
        'data' => $data,
        'pagination' => [
            'page' => (int) $page,
            'per_page' => (int) $perPage,
            'total' => (int) $total,
            'total_pages' => ceil($total / $perPage)
        ]
    ]);
}

function generateNo($prefix, $table, $column)
{
    $db = Database::getInstance();
    $year = date('Y');
    $month = date('m');
    $last = $db->fetch(
        "SELECT $column FROM $table WHERE $column LIKE ? ORDER BY id DESC LIMIT 1",
        ["$prefix$year$month%"]
    );
    if ($last) {
        $lastNum = (int) substr($last[$column], -4);
        $newNum = $lastNum + 1;
    } else {
        $newNum = 1;
    }
    return $prefix . $year . $month . str_pad($newNum, 4, '0', STR_PAD_LEFT);
}

function logActivity($action, $tableName, $recordId, $oldData = null, $newData = null)
{
    $db = Database::getInstance();
    $userId = $_SESSION['user_id'] ?? 0;
    if (!$userId)
        return;

    $db->execute(
        "INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
            $userId,
            $action,
            $tableName,
            $recordId,
            $oldData ? json_encode($oldData) : null,
            $newData ? json_encode($newData) : null,
            $_SERVER['REMOTE_ADDR'] ?? null,
            $_SERVER['HTTP_USER_AGENT'] ?? null
        ]
    );
}

function getIPLocation($ip)
{
    if (!$ip || $ip === '::1' || $ip === '127.0.0.1')
        return 'Localhost';

    try {
        $url = "http://ip-api.com/json/" . $ip . "?fields=status,message,country,regionName,city";
        $ctx = stream_context_create(['http' => ['timeout' => 2]]); // 2 seconds timeout
        $res = @file_get_contents($url, false, $ctx);
        if ($res) {
            $data = json_decode($res, true);
            if ($data && $data['status'] === 'success') {
                return $data['city'] . ', ' . $data['regionName'] . ', ' . $data['country'];
            }
        }
    } catch (Exception $e) {
    }
    return 'Unknown Location';
}

function logPortalActivity($activity, $anggotaId = null)
{
    $db = Database::getInstance();
    $anggotaId = $anggotaId ?: ($_SESSION['portal_anggota_id'] ?? 0);
    if (!$anggotaId)
        return;

    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $platform = 'Desktop';
    if (preg_match('/mobile/i', $ua))
        $platform = 'Mobile';
    if (preg_match('/android/i', $ua))
        $platform = 'Android';
    if (preg_match('/iphone|ipad/i', $ua))
        $platform = 'iOS';

    $os = 'Unknown OS';
    if (preg_match('/windows/i', $ua))
        $os = 'Windows';
    elseif (preg_match('/macintosh|mac os x/i', $ua))
        $os = 'MacOS';
    elseif (preg_match('/linux/i', $ua))
        $os = 'Linux';
    elseif (preg_match('/android/i', $ua))
        $os = 'Android';
    elseif (preg_match('/iphone|ipad/i', $ua))
        $os = 'iOS';

    $browser = 'Unknown';
    if (preg_match('/chrome/i', $ua))
        $browser = 'Chrome';
    elseif (preg_match('/firefox/i', $ua))
        $browser = 'Firefox';
    elseif (preg_match('/safari/i', $ua) && !preg_match('/chrome/i', $ua))
        $browser = 'Safari';
    elseif (preg_match('/edge/i', $ua))
        $browser = 'Edge';

    $ip = $_SERVER['REMOTE_ADDR'] ?? null;
    $location = getIPLocation($ip);

    // We store OS in platform column for now or we can use a new column if we want.
    // Let's use the 'platform' column to store 'Platform (OS)' to avoid schema changes.
    $displayPlatform = "$platform ($os)";

    $db->execute(
        "INSERT INTO portal_logs (anggota_id, activity, platform, browser, ip_address, location, user_agent) 
         VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
            $anggotaId,
            $activity,
            $displayPlatform,
            $browser,
            $ip,
            $location,
            $ua
        ]
    );
}

// Load controllers
$controllerPath = __DIR__ . '/controllers/';

try {
    switch ($resource) {
        case 'auth':
            require_once $controllerPath . 'AuthController.php';
            break;
        case 'public':
            require_once $controllerPath . 'PublicController.php';
            break;
        case 'users':
            require_once $controllerPath . 'UserController.php';
            break;
        case 'roles':
            require_once $controllerPath . 'RoleController.php';
            break;
        case 'menus':
            authCheck();
            successResponse(getUserMenus($_SESSION['role_id']));
            break;
        case 'anggota':
            require_once $controllerPath . 'AnggotaController.php';
            break;
        case 'jenis-simpanan':
            require_once $controllerPath . 'JenisSimpananController.php';
            break;
        case 'kode-transaksi':
            require_once $controllerPath . 'KodeTransaksiController.php';
            break;
        case 'simpanan':
            require_once $controllerPath . 'SimpananController.php';
            break;
        case 'jenis-pinjaman':
            require_once $controllerPath . 'JenisPinjamanController.php';
            break;
        case 'rekening-pinjaman':
        case 'pinjaman':
            require_once $controllerPath . 'PinjamanController.php';
            break;
        case 'angsuran':
            require_once $controllerPath . 'AngsuranController.php';
            break;
        case 'keuangan':
            require_once $controllerPath . 'KeuanganController.php';
            break;
        case 'portal':
            require_once $controllerPath . 'PortalController.php';
            break;
        case 'rekening-simpanan':
            require_once $controllerPath . 'RekeningSimpananController.php';
            break;
        case 'dashboard':
            require_once $controllerPath . 'DashboardController.php';
            break;
        case 'SHU':
        case 'shu':
            require_once $controllerPath . 'SHUController.php';
            break;
        case 'settings':
            require_once $controllerPath . 'SettingsController.php';
            break;
        case 'backup':
            require_once $controllerPath . 'BackupController.php';
            break;
        case 'agunan':
            require_once $controllerPath . 'AgunanController.php';
            break;
        case 'kesehatan':
            require_once $controllerPath . 'KesehatanController.php';
            break;
        case 'biaya-pinjaman':
            require_once $controllerPath . 'BiayaPinjamanController.php';
            break;
        case 'rat':
            require_once $controllerPath . 'RATController.php';
            break;
        case 'akhir-tahun':
            require_once $controllerPath . 'AkhirTahunController.php';
            break;
        case 'laporan-kolektibilitas':
            require_once $controllerPath . 'KolektibilitasController.php';
            break;
        case 'pengumuman':
            require_once $controllerPath . 'PengumumanController.php';
            break;
        case 'audit':
            require_once $controllerPath . 'AuditController.php';
            break;
        case 'log':
            require_once $controllerPath . 'LogController.php';
            break;
        default:
            errorResponse('Route not found', 404);
    }
} catch (PDOException $e) {
    errorResponse('Database error: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    errorResponse($e->getMessage(), 500);
}
