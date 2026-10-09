<?php
require_once __DIR__ . '/api/config/database.php';
require_once __DIR__ . '/api/config/WebPushHelper.php';

$db = Database::getInstance()->getConnection();
$subs = $db->query("SELECT * FROM push_subscriptions")->fetchAll(PDO::FETCH_ASSOC);

$helper = WebPushHelper::getInstance();

foreach ($subs as $sub) {
    echo "Sub ID: {$sub['id']}, Anggota: {$sub['anggota_id']}\n";
    echo "Endpoint: {$sub['endpoint']}\n\n";

    $payloadJson = json_encode([
        'title' => 'Tes Antigravity ' . date('H:i:s'),
        'body'  => 'Uji coba penerimaan pesan di browser pada ' . date('d-m-Y H:i:s'),
        'url'   => '/portal/',
        'tag'   => 'test_' . time()
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    // Call reflection to inspect curl response headers
    $refMethod = new ReflectionMethod('WebPushHelper', 'encryptPayload');
    $refMethod->setAccessible(true);
    $encrypted = $refMethod->invoke($helper, $sub['p256dh'], $sub['auth'], $payloadJson);

    $parts = parse_url($sub['endpoint']);
    $origin = ($parts['scheme'] ?? 'https') . '://' . ($parts['host'] ?? '');

    $refJwt = new ReflectionMethod('WebPushHelper', 'createVapidJwt');
    $refJwt->setAccessible(true);
    $jwt = $refJwt->invoke($helper, $origin);

    $pubKey = $helper->getPublicKey();

    $headers = [
        'Content-Type: application/octet-stream',
        'Content-Encoding: aes128gcm',
        'TTL: 86400',
        'Urgency: high',
        'Authorization: vapid t=' . $jwt . ', k=' . $pubKey
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $sub['endpoint']);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $encrypted['body']);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true); // Get response headers!
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);

    $response = curl_exec($ch);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $respHeaders = substr($response, 0, $headerSize);
    $respBody = substr($response, $headerSize);
    curl_close($ch);

    echo "HTTP CODE: $httpCode\n";
    echo "RESPONSE HEADERS:\n$respHeaders\n";
    echo "RESPONSE BODY:\n$respBody\n";
}
