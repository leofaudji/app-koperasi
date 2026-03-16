<?php
require 'api/config/database.php';
$db = Database::getInstance();
$tables = $db->fetchAll("SHOW TABLES");
foreach ($tables as $t) {
    echo array_values($t)[0] . "\n";
}
