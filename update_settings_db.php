<?php
require_once 'api/config/database.php';
$db = Database::getInstance();

// Add 'website' if not exists
$exists = $db->fetch("SELECT id FROM app_settings WHERE setting_key = 'website'");
if (!$exists) {
    $db->execute("INSERT INTO app_settings (setting_key, setting_value, setting_label, setting_group) VALUES (?, ?, ?, ?)", [
        'website',
        'www.koperasi-app.com',
        'Website',
        'umum'
    ]);
    echo "Added 'website' setting.\n";
} else {
    echo "'website' setting already exists.\n";
}

// Ensure 'logo_url' and 'favicon_url' have correct labels/groups if needed
$db->execute("UPDATE app_settings SET setting_label = 'URL Logo Utama', setting_group = 'tampilan' WHERE setting_key = 'logo_url'");
$db->execute("UPDATE app_settings SET setting_label = 'URL Favicon', setting_group = 'tampilan' WHERE setting_key = 'favicon_url'");

echo "Done.\n";
