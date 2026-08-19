<?php
// Application Configuration
define('APP_NAME', 'Koperasi Simpan Pinjam');
define('APP_VERSION', '2.1.9');
define('APP_URL', 'http://app-koperasi.test');

// Session
define('SESSION_NAME', 'koperasi_session');
define('SESSION_LIFETIME', 3600 * 8); // 8 hours

// Pagination
define('PER_PAGE', 15);

// Upload
define('UPLOAD_DIR', __DIR__ . '/../../uploads/');
define('MAX_UPLOAD_SIZE', 2 * 1024 * 1024); // 2MB

// Redis
define('REDIS_HOST', getenv('REDIS_HOST') ?: '127.0.0.1');
define('REDIS_PORT', getenv('REDIS_PORT') ?: 6379);
define('REDIS_PASS', getenv('REDIS_PASS') ?: null);
define('REDIS_DB', getenv('REDIS_DB') ?: 0);
define('REDIS_PREFIX', getenv('REDIS_PREFIX') ?: 'koperasi_');
