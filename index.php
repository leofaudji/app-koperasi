<?php
require_once __DIR__ . '/minify_html.php';

// Get latest version from CHANGELOG.md
$version = '1.0.0';
$changelogPath = __DIR__ . '/CHANGELOG.md';
if (file_exists($changelogPath)) {
    $changelogContent = file_get_contents($changelogPath);
    // Matches ## [v1.6.1] or ## [1.6.1]
    if (preg_match('/##\s*\[v?([\d.]+)\]/', $changelogContent, $matches)) {
        $version = $matches[1];
    }
}

ob_start();
readfile(__DIR__ . '/index.html');
$html = ob_get_clean();

// Inject dynamic version
$html = str_replace('{{APP_VERSION}}', $version, $html);

header('Content-Type: text/html; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
echo minify_html($html);
