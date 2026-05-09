<?php
// Test SettingsController logic
require_once __DIR__ . '/api/config/env.php';
require_once __DIR__ . '/api/config/app.php';
require_once __DIR__ . '/api/config/database.php';
require_once __DIR__ . '/api/config/redis.php';
require_once __DIR__ . '/api/middleware/auth.php';

$method = 'GET';
$id = null;

echo "--- Testing Public GET /api/settings ---\n";
$_SESSION = []; // Simulate no login

// Mocking getCachedData to avoid Redis/Cache issues in test
function getCachedData($key, $callback, $ttl) {
    return $callback();
}

function successResponse($data) {
    echo "Success: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
}

function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

// Include the controller logic (manually since it has require_once and switches)
$db = Database::getInstance();
$isLoggedIn = isLoggedIn();

$query = "SELECT setting_key, setting_value, setting_label, setting_group FROM app_settings ORDER BY setting_group, id";
try {
    $rows = $db->fetchAll($query);
    $flat = [];
    $publicKeys = ['app_name', 'logo_url']; // simplified for test

    foreach ($rows as $r) {
        if (!$isLoggedIn && !in_array($r['setting_key'], $publicKeys)) {
            continue;
        }
        $flat[$r['setting_key']] = $r['setting_value'];
    }
    echo "Public Data: " . json_encode($flat) . "\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
