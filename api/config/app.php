<?php
// Application Configuration
define('APP_NAME', 'Koperasi Simpan Pinjam');
define('APP_VERSION', '1.0.0');
define('APP_URL', 'http://app-koperasi.test');

// Session
define('SESSION_NAME', 'koperasi_session');
define('SESSION_LIFETIME', 3600 * 8); // 8 hours

// Pagination
define('PER_PAGE', 15);

// Upload
define('UPLOAD_DIR', __DIR__ . '/../../uploads/');
define('MAX_UPLOAD_SIZE', 2 * 1024 * 1024); // 2MB
