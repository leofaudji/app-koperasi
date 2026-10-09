<?php
/**
 * Cron Job: Send Web Push Reminders for Installments (H-3 and H-0)
 * Run daily at 08:00 AM via Windows Task Scheduler or Linux crontab:
 *   php cron_push_reminders.php
 * Or via web:
 *   GET /cron_push_reminders.php?token=secret123
 */

require_once __DIR__ . '/api/config/env.php';
require_once __DIR__ . '/api/config/database.php';
require_once __DIR__ . '/api/config/WebPushHelper.php';

// Auth check if invoked via browser
if (php_sapi_name() !== 'cli') {
    $expectedSecret = getenv('API_IMPORT_SECRET') ?: 'secret123';
    $givenToken = $_GET['token'] ?? '';
    if ($givenToken !== $expectedSecret) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Unauthorized cron access']);
        exit;
    }
    header('Content-Type: application/json');
}

$helper = WebPushHelper::getInstance();
$result = $helper->sendInstallmentReminders();

if (php_sapi_name() === 'cli') {
    echo "[" . date('Y-m-d H:i:s') . "] Installment reminders processed: {$result['processed']}\n";
} else {
    echo json_encode($result);
}
