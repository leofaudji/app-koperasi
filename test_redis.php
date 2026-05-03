<?php
require_once __DIR__ . '/api/config/env.php';
require_once __DIR__ . '/api/config/app.php';
require_once __DIR__ . '/api/config/redis.php';

$redis = RedisManager::getInstance();

echo "Checking Redis connection...\n";
if ($redis->isConnected()) {
    echo "CONNECTED!\n";
    
    $testKey = 'test_connection';
    $testVal = 'OK_' . time();
    
    $redis->set($testKey, $testVal, 60);
    $retrieved = $redis->get($testKey);
    
    echo "Test Key: $testKey\n";
    echo "Set Value: $testVal\n";
    echo "Retrieved: $retrieved\n";
    
    if ($testVal === $retrieved) {
        echo "SUCCESS: Redis is working perfectly.\n";
    } else {
        echo "ERROR: Value mismatch.\n";
    }
} else {
    echo "FAILED: Could not connect to Redis. Make sure Redis is running and the PHP extension is enabled.\n";
}
