<?php
// Role Controller
authCheck();
$db = Database::getInstance();

switch ($method) {
    case 'GET':
        checkPermission('role.view');

        // Special sub-routes
        if ($id === 'permissions') {
            $permissions = $db->fetchAll("SELECT * FROM permissions ORDER BY modul, kode");
            successResponse($permissions);
        }
        elseif ($id === 'menus') {
            $menus = $db->fetchAll(
                "SELECT m.id, m.nama, m.icon, m.url, m.parent_id, m.urutan, m.permission_id 
                 FROM menus m WHERE m.is_active = 1 ORDER BY m.urutan, m.id"
            );
            successResponse($menus);
        }
        elseif ($id) {
            $data = $db->fetch("SELECT * FROM roles WHERE id = ?", [$id]);
            if (!$data)
                errorResponse('Role tidak ditemukan', 404);

            // Get permissions
            $perms = $db->fetchAll(
                "SELECT p.* FROM permissions p
                 JOIN role_permissions rp ON p.id = rp.permission_id
                 WHERE rp.role_id = ?",
            [$id]
            );
            $data['permissions'] = $perms;
            successResponse($data);
        }
        else {
            $roles = $db->fetchAll("SELECT r.*, (SELECT COUNT(*) FROM users WHERE role_id = r.id) as user_count FROM roles r ORDER BY r.id");
            successResponse($roles);
        }
        break;

    case 'POST':
        checkPermission('role.manage');
        $nama = $params['nama'] ?? '';
        if (empty($nama))
            errorResponse('Nama role wajib diisi');

        $db->beginTransaction();
        try {
            $roleId = $db->insert(
                "INSERT INTO roles (nama, keterangan) VALUES (?, ?)",
            [$nama, $params['keterangan'] ?? '']
            );

            if (!empty($params['permissions'])) {
                foreach ($params['permissions'] as $permId) {
                    $db->execute(
                        "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
                    [$roleId, $permId]
                    );
                }
            }
            $db->commit();
            successResponse(['id' => $roleId], 'Role berhasil ditambahkan', 201);
        }
        catch (Exception $e) {
            $db->rollBack();
            errorResponse('Gagal menambahkan role: ' . $e->getMessage());
        }
        break;

    case 'PUT':
        checkPermission('role.manage');
        if (!$id)
            errorResponse('ID role diperlukan');
        if ($id == 1)
            errorResponse('Role admin tidak bisa diubah');

        $db->beginTransaction();
        try {
            $db->execute(
                "UPDATE roles SET nama=?, keterangan=? WHERE id=?",
            [$params['nama'] ?? '', $params['keterangan'] ?? '', $id]
            );

            // Update permissions
            $db->execute("DELETE FROM role_permissions WHERE role_id = ?", [$id]);
            if (!empty($params['permissions'])) {
                foreach ($params['permissions'] as $permId) {
                    $db->execute(
                        "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
                    [$id, $permId]
                    );
                }
            }
            $db->commit();
            
            // Clear RBAC caches via central helper
            clearCache(['rbac' => $id]);

            successResponse(null, 'Role berhasil diupdate');
        }
        catch (Exception $e) {
            $db->rollBack();
            errorResponse('Gagal mengupdate role: ' . $e->getMessage());
        }
        break;

    case 'DELETE':
        checkPermission('role.manage');
        if (!$id)
            errorResponse('ID role diperlukan');
        if ($id <= 3)
            errorResponse('Role default tidak bisa dihapus');

        $userCount = $db->count("SELECT COUNT(*) FROM users WHERE role_id = ?", [$id]);
        if ($userCount > 0)
            errorResponse('Role masih digunakan oleh user');

        $db->execute("DELETE FROM roles WHERE id = ?", [$id]);
        
        // Clear RBAC caches via central helper
        clearCache(['rbac' => $id]);

        successResponse(null, 'Role berhasil dihapus');
        break;

    default:
        errorResponse('Method not allowed', 405);
}
