<?php
// User Controller
authCheck();
$db = Database::getInstance();

switch ($method) {
    case 'GET':
        checkPermission('user.view');
        if ($id) {
            $data = $db->fetch(
                "SELECT u.id, u.username, u.nama_lengkap, u.email, u.role_id, u.anggota_id, u.is_active, u.last_login,
                        r.nama as role_nama, a.no_anggota, a.nama as anggota_nama
                 FROM users u 
                 JOIN roles r ON u.role_id = r.id 
                 LEFT JOIN anggota a ON u.anggota_id = a.id
                 WHERE u.id = ?",
            [$id]
            );
            if (!$data)
                errorResponse('User tidak ditemukan', 404);
            successResponse($data);
        }
        else {
            $search = $params['search'] ?? '';
            $page = $params['page'] ?? 1;
            $perPage = $params['per_page'] ?? PER_PAGE;

            $where = "WHERE 1=1";
            $binds = [];
            if ($search) {
                $where .= " AND (u.username LIKE ? OR u.nama_lengkap LIKE ?)";
                $binds[] = "%$search%";
                $binds[] = "%$search%";
            }

            paginatedResponse(
                "SELECT u.id, u.username, u.nama_lengkap, u.email, u.role_id, u.is_active, u.last_login,
                        r.nama as role_nama
                 FROM users u JOIN roles r ON u.role_id = r.id $where ORDER BY u.id",
                "SELECT COUNT(*) FROM users u $where",
                $binds, $page, $perPage
            );
        }
        break;

    case 'POST':
        checkPermission('user.create');
        $username = $params['username'] ?? '';
        $password = $params['password'] ?? '';
        $namaLengkap = $params['nama_lengkap'] ?? '';
        $roleId = $params['role_id'] ?? '';

        if (empty($username) || empty($password) || empty($namaLengkap) || empty($roleId)) {
            errorResponse('Username, password, nama lengkap dan role wajib diisi');
        }

        $exists = $db->count("SELECT COUNT(*) FROM users WHERE username = ?", [$username]);
        if ($exists)
            errorResponse('Username sudah digunakan');

        $id = $db->insert(
            "INSERT INTO users (username, password, nama_lengkap, email, role_id, anggota_id, is_active) VALUES (?,?,?,?,?,?,?)",
        [
            $username,
            password_hash($password, PASSWORD_DEFAULT),
            $namaLengkap,
            $params['email'] ?? null,
            $roleId,
            $params['anggota_id'] ?? null,
            $params['is_active'] ?? 1
        ]
        );

        successResponse(['id' => $id], 'User berhasil ditambahkan', 201);
        break;

    case 'PUT':
        checkPermission('user.edit');
        if (!$id)
            errorResponse('ID user diperlukan');

        $user = $db->fetch("SELECT id FROM users WHERE id = ?", [$id]);
        if (!$user)
            errorResponse('User tidak ditemukan', 404);

        $updateFields = "nama_lengkap=?, email=?, role_id=?, anggota_id=?, is_active=?";
        $updateParams = [
            $params['nama_lengkap'] ?? '',
            $params['email'] ?? null,
            $params['role_id'] ?? 1,
            $params['anggota_id'] ?? null,
            $params['is_active'] ?? 1,
            $id
        ];

        if (!empty($params['password'])) {
            $updateFields = "password=?, " . $updateFields;
            array_unshift($updateParams, password_hash($params['password'], PASSWORD_DEFAULT));
        }

        $db->execute("UPDATE users SET $updateFields WHERE id=?", $updateParams);
        successResponse(null, 'User berhasil diupdate');
        break;

    case 'DELETE':
        checkPermission('user.delete');
        if (!$id)
            errorResponse('ID user diperlukan');
        if ($id == 1)
            errorResponse('Admin utama tidak bisa dihapus');

        $db->execute("DELETE FROM users WHERE id = ?", [$id]);
        successResponse(null, 'User berhasil dihapus');
        break;

    default:
        errorResponse('Method not allowed', 405);
}
