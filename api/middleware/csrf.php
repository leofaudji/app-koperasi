<?php
// CSRF Middleware

/**
 * Generate a new CSRF token and store in session
 */
function generateCsrfToken()
{
    $token = bin2hex(random_bytes(32));
    $_SESSION['csrf_token'] = $token;
    return $token;
}

/**
 * Get the current CSRF token (or generate if none exists)
 */
function getCsrfToken()
{
    if (empty($_SESSION['csrf_token'])) {
        return generateCsrfToken();
    }
    return $_SESSION['csrf_token'];
}

/**
 * Validate CSRF token for state-changing requests (POST, PUT, DELETE)
 * Skips validation for login/logout endpoints
 */
function verifyCsrfToken()
{
    $method = $_SERVER['REQUEST_METHOD'];

    // Only validate on state-changing methods
    if (!in_array($method, ['POST', 'PUT', 'DELETE'])) {
        return true;
    }

    // Skip CSRF for login (no token yet) and OPTIONS
    $route = isset($_GET['route']) ? trim($_GET['route'], '/') : '';
    if (in_array($route, ['auth/login', 'auth/logout', 'portal/login', 'portal/logout'])) {
        return true;
    }

    // Get token from header
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';

    if (empty($token) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token tidak valid. Silakan refresh halaman.']);
        exit;
    }

    return true;
}
