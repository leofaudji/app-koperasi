<?php
require_once __DIR__ . '/../api/config/redis.php';
$redis = RedisManager::getInstance();
$redis->del('dashboard_stats_v19');
echo "Cache cleared!\n";
