<?php
// Settings Controller
$db = Database::getInstance();

switch ($method) {
    case 'GET':
        // Any user can read basic settings, but only logged-in users get everything
        $isLoggedIn = isLoggedIn();
        $cacheKey = $isLoggedIn ? 'app_settings_flat' : 'app_settings_public';
        
        $flat = getCachedData($cacheKey, function() use ($db, $isLoggedIn) {
            $query = "SELECT setting_key, setting_value, setting_label, setting_group FROM app_settings ORDER BY setting_group, id";
            $rows = $db->fetchAll($query);
            $flat = [];
            
            // Define keys that are safe for unauthenticated users
            $publicKeys = [
                'app_name', 'alamat', 'telepon', 'email', 'website', 'logo_url',
                'pwa_name', 'pwa_short_name', 'pwa_description', 'pwa_theme_color'
            ];

            foreach ($rows as $r) {
                // If not logged in, skip sensitive or non-essential keys
                if (!$isLoggedIn && !in_array($r['setting_key'], $publicKeys)) {
                    continue;
                }

                $flat[$r['setting_key']] = [
                    'value' => $r['setting_value'],
                    'label' => $r['setting_label'],
                    'group' => $r['setting_group'],
                ];
            }
            return $flat;
        }, 86400);
        
        successResponse($flat);
        break;

    case 'POST':
    case 'PUT':
        // Only admins / superadmin can write
        checkPermission('settings.edit');

        // Expect a JSON map of key->value
        $updates = $params; // merged GET + JSON body
        unset($updates['route']); // remove routing artefacts

        if (empty($updates)) {
            errorResponse('Tidak ada data yang dikirim');
        }

        // Handle File Upload if exists
        if (!empty($_FILES['logo_file'])) {
            $file = $_FILES['logo_file'];
            $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
            if (in_array(strtolower($ext), ['png', 'jpg', 'jpeg', 'webp', 'svg'])) {
                $filename = 'logo_' . time() . '.' . $ext;
                $dest = __DIR__ . '/../../uploads/branding/' . $filename;

                // Create directory if not exists
                if (!is_dir(dirname($dest))) {
                    mkdir(dirname($dest), 0755, true);
                }

                if (move_uploaded_file($file['tmp_name'], $dest)) {
                    $logoPath = 'uploads/branding/' . $filename;
                    $db->execute("UPDATE app_settings SET setting_value = ? WHERE setting_key = 'logo_url'", [$logoPath]);
                }
            }
        }

        foreach ($updates as $key => $value) {
            // Only update keys that already exist (no arbitrary injection)
            $exists = $db->fetch("SELECT id FROM app_settings WHERE setting_key = ?", [$key]);
            if ($exists) {
                $db->execute("UPDATE app_settings SET setting_value = ? WHERE setting_key = ?", [$value, $key]);
            }
        }

        // Re-generate manifest.json after updates
        regenerateManifest($db);
        
        // Clear settings cache
        clearCache(['settings']);

        successResponse(null, 'Pengaturan berhasil disimpan');
        break;

    default:
        errorResponse('Method not allowed', 405);
}

// --------------------------------------------------
function regenerateManifest($db)
{
    $get = function ($key, $default = '') use ($db) {
        $row = $db->fetch("SELECT setting_value FROM app_settings WHERE setting_key = ?", [$key]);
        return $row ? $row['setting_value'] : $default;
    };

    $manifest = [
        'name' => $get('pwa_name', 'Portal Anggota Koperasi'),
        'short_name' => $get('pwa_short_name', 'Koperasi'),
        'start_url' => '/portal/',
        'scope' => '/portal/',
        'display' => 'standalone',
        'display_override' => ['fullscreen', 'standalone'],
        'background_color' => '#F8FAFC',
        'theme_color' => $get('pwa_theme_color', '#4F46E5'),
        'description' => $get('pwa_description', 'Portal anggota koperasi simpan pinjam'),
        'icons' => [
            ['src' => 'icons/icon-192.png', 'sizes' => '192x192', 'type' => 'image/png'],
            ['src' => 'icons/icon-512.png', 'sizes' => '512x512', 'type' => 'image/png'],
        ],
    ];

    $logoUrl = $get('logo_url');
    if ($logoUrl) {
        $manifest['icons'][] = ['src' => $logoUrl, 'sizes' => 'any', 'purpose' => 'any maskable'];
    }

    $manifestPath = dirname(__DIR__, 2) . '/portal/manifest.json';
    file_put_contents($manifestPath, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}
