<?php
// Auth Controller
$db = Database::getInstance();

switch ($method) {
    case 'POST':
        if ($id === 'login') {
            $username = $params['username'] ?? '';
            $password = $params['password'] ?? '';

            if (empty($username) || empty($password)) {
                errorResponse('Username dan password wajib diisi');
            }

            $user = $db->fetch(
                "SELECT u.*, r.nama as role_nama FROM users u 
                 JOIN roles r ON u.role_id = r.id 
                 WHERE u.username = ? AND u.is_active = 1",
            [$username]
            );

            if (!$user || !password_verify($password, $user['password'])) {
                errorResponse('Username atau password salah', 401);
            }

            // Set session
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['nama_lengkap'] = $user['nama_lengkap'];
            $_SESSION['role_id'] = $user['role_id'];
            $_SESSION['role_nama'] = $user['role_nama'];
            $_SESSION['anggota_id'] = $user['anggota_id'];

            // Update last login
            $db->execute("UPDATE users SET last_login = NOW() WHERE id = ?", [$user['id']]);

            // Get menus
            $menus = getUserMenus($user['role_id']);
            $permissions = getUserPermissions($user['role_id']);

            successResponse([
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'nama_lengkap' => $user['nama_lengkap'],
                    'email' => $user['email'],
                    'role' => $user['role_nama'],
                    'role_id' => $user['role_id'],
                    'anggota_id' => $user['anggota_id'],
                ],
                'menus' => $menus,
                'permissions' => array_column($permissions, 'kode'),
                'csrf_token' => generateCsrfToken()
            ], 'Login berhasil');

        }
        elseif ($id === 'logout') {
            session_destroy();
            successResponse(null, 'Logout berhasil');
        }
        break;

    case 'GET':
        if ($id === 'me') {
            $session = authCheck();
            $user = $db->fetch(
                "SELECT u.id, u.username, u.nama_lengkap, u.email, u.role_id, u.anggota_id, r.nama as role_nama 
                 FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?",
            [$session['user_id']]
            );
            $menus = getUserMenus($user['role_id']);
            $permissions = getUserPermissions($user['role_id']);

            successResponse([
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'nama_lengkap' => $user['nama_lengkap'],
                    'email' => $user['email'],
                    'role' => $user['role_nama'],
                    'role_id' => $user['role_id'],
                    'anggota_id' => $user['anggota_id'],
                ],
                'menus' => $menus,
                'permissions' => array_column($permissions, 'kode'),
                'csrf_token' => getCsrfToken()
            ]);
        }
        break;

    default:
        errorResponse('Method not allowed', 405);
}
