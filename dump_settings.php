<?php
require_once __DIR__ . '/api/config/database.php';
$db = Database::getInstance();
$rows = $db->fetchAll("SELECT setting_key, setting_value FROM app_settings");
echo json_encode($rows, JSON_PRETTY_PRINT);
