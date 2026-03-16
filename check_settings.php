<?php
require_once 'api/config/database.php';
$db = Database::getInstance();
$settings = $db->fetchAll("SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('website', 'logo_url')");
echo json_encode($settings);
