<?php
require_once 'api/config/database.php';
$db = Database::getInstance();
$res = $db->fetch("SELECT nama FROM anggota WHERE no_anggota = 'AGT-0001'");
echo "NAME: [" . $res['nama'] . "]\n";
echo "HEX: " . bin2hex($res['nama']) . "\n";
