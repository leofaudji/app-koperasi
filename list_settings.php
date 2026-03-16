<?php
require_once 'api/config/database.php';
$db = Database::getInstance();
$settings = $db->fetchAll("SELECT * FROM app_settings");
echo json_encode($settings, JSON_PRETTY_PRINT);
