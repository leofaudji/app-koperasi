<?php
require_once dirname(__DIR__) . '/api/config/env.php';
require_once dirname(__DIR__) . '/api/config/database.php';
require_once dirname(__DIR__) . '/minify_html.php';

$db = Database::getInstance();
$getSetting = function ($key, $default = '') use ($db) {
    $row = $db->fetch("SELECT setting_value FROM app_settings WHERE setting_key = ?", [$key]);
    return $row ? $row['setting_value'] : $default;
};

$pwaName = $getSetting('pwa_name', 'Portal Anggota');
$logoUrl = $getSetting('logo_url', '');
if ($logoUrl && !str_starts_with($logoUrl, 'http')) {
    $logoUrl = '../' . $logoUrl;
}

ob_start();
readfile(__DIR__ . '/index.html');
$html = ob_get_clean();

// Get latest version from changelog.md
$version = '1.0.0'; // Default
$changelogPath = __DIR__ . '/changelog.md';
if (file_exists($changelogPath)) {
    $changelogContent = file_get_contents($changelogPath);
    if (preg_match('/##\s*\[([\d.]+)\]/', $changelogContent, $matches)) {
        $version = $matches[1];
    }
}

// Inject dynamic data
$html = str_replace('{{PWA_NAME}}', $pwaName, $html);
$html = str_replace('{{LOGO_URL}}', $logoUrl, $html);
$html = str_replace('{{VERSION}}', $version, $html);

header('Content-Type: text/html; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
echo minify_html($html);
