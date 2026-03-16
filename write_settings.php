<?php
require_once 'api/config/database.php';
$db = Database::getInstance();
$settings = $db->fetchAll("SELECT setting_key, setting_label, setting_group FROM app_settings");
file_put_contents('settings_list.txt', print_r($settings, true));
