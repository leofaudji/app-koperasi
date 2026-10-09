<?php
/**
 * Migration: Create push_subscriptions table & initialize VAPID keys in app_settings
 */
require_once __DIR__ . '/api/config/env.php';
require_once __DIR__ . '/api/config/database.php';

$db = Database::getInstance();

echo "=== MIGRATION: WEB PUSH NOTIFICATIONS ===\n";

// 1. Create table push_subscriptions
$sqlTable = "CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `anggota_id` INT NOT NULL,
  `endpoint` TEXT NOT NULL,
  `p256dh` TEXT NOT NULL,
  `auth` VARCHAR(255) NOT NULL,
  `user_agent` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_anggota_id` (`anggota_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

$db->execute($sqlTable);
echo "1. Table `push_subscriptions` checked/created successfully.\n";

// 2. Check if VAPID keys already exist in app_settings
$pubRow = $db->fetch("SELECT setting_value FROM app_settings WHERE setting_key = 'vapid_public_key'");
$privRow = $db->fetch("SELECT setting_value FROM app_settings WHERE setting_key = 'vapid_private_key'");

function base64UrlEncode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

if (!$pubRow || !$privRow || empty($pubRow['setting_value']) || empty($privRow['setting_value'])) {
    echo "2. Generating new VAPID EC P-256 keypair...\n";
    
    $cnfCandidates = [
        'D:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/extras/ssl/openssl.cnf',
        'C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/extras/ssl/openssl.cnf'
    ];
    $cnfPath = null;
    foreach ($cnfCandidates as $c) {
        if (file_exists($c)) {
            $cnfPath = $c;
            putenv("OPENSSL_CONF=" . $c);
            break;
        }
    }

    $opt = [
        'curve_name' => 'prime256v1',
        'private_key_type' => OPENSSL_KEYTYPE_EC,
    ];
    if ($cnfPath) $opt['config'] = $cnfPath;

    $res = openssl_pkey_new($opt);
    if (!$res) {
        die("Error generating EC keypair: " . openssl_error_string() . "\n");
    }

    $details = openssl_pkey_get_details($res);
    $pubRaw = "\x04" . $details['ec']['x'] . $details['ec']['y'];
    $vapidPublicKey = base64UrlEncode($pubRaw);
    $vapidPrivateKey = base64UrlEncode($details['ec']['d']);

    // Save public key
    if ($pubRow) {
        $db->execute("UPDATE app_settings SET setting_value = ? WHERE setting_key = 'vapid_public_key'", [$vapidPublicKey]);
    } else {
        $db->execute("INSERT INTO app_settings (setting_key, setting_value) VALUES ('vapid_public_key', ?)", [$vapidPublicKey]);
    }

    // Save private key
    if ($privRow) {
        $db->execute("UPDATE app_settings SET setting_value = ? WHERE setting_key = 'vapid_private_key'", [$vapidPrivateKey]);
    } else {
        $db->execute("INSERT INTO app_settings (setting_key, setting_value) VALUES ('vapid_private_key', ?)", [$vapidPrivateKey]);
    }

    // Subject email/url
    $subRow = $db->fetch("SELECT setting_value FROM app_settings WHERE setting_key = 'vapid_subject'");
    if (!$subRow) {
        $db->execute("INSERT INTO app_settings (setting_key, setting_value) VALUES ('vapid_subject', 'mailto:admin@koperasi.com')");
    }

    echo "VAPID Public Key: " . $vapidPublicKey . "\n";
    echo "VAPID Private Key: (saved securely in app_settings)\n";
} else {
    echo "2. VAPID keys already exist in app_settings:\n";
    echo "Public Key: " . $pubRow['setting_value'] . "\n";
}

echo "=== MIGRATION COMPLETE ===\n";
