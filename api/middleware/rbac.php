<?php
// RBAC Middleware

function checkPermission($permissionCode)
{
    $session = authCheck();
    $db = Database::getInstance();

    // Admin bypass
    if ($session['role_id'] == 1)
        return true;

    $count = $db->count(
        "SELECT COUNT(*) FROM role_permissions rp 
         JOIN permissions p ON rp.permission_id = p.id 
         WHERE rp.role_id = ? AND p.kode = ?",
        [$session['role_id'], $permissionCode]
    );

    if ($count == 0) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Forbidden. Anda tidak memiliki akses untuk fitur ini.']);
        exit;
    }

    return true;
}

function getUserPermissions($roleId)
{
    $db = Database::getInstance();
    return $db->fetchAll(
        "SELECT p.kode FROM role_permissions rp 
         JOIN permissions p ON rp.permission_id = p.id 
         WHERE rp.role_id = ?",
        [$roleId]
    );
}

function getUserMenus($roleId)
{
    $jsonPath = __DIR__ . '/../config/menus.json';
    if (!file_exists($jsonPath))
        return [];

    $allMenus = json_decode(file_get_contents($jsonPath), true);
    if (!is_array($allMenus))
        return [];

    // Get permissions for current role
    $permissions = [];
    if ($roleId != 1) {
        $userPerms = getUserPermissions($roleId);
        $permissions = array_column($userPerms, 'kode');
    }

    // Helper function for recursive filtering
    $filter = function ($items) use (&$filter, $roleId, $permissions) {
        $result = [];
        foreach ($items as $m) {
            // Check permission for leaf nodes or parent nodes with direct perm
            $hasPerm = ($roleId == 1) || empty($m['perm']) || in_array($m['perm'], $permissions);

            if (!empty($m['children'])) {
                $visibleChildren = $filter($m['children']);
                if (!empty($visibleChildren)) {
                    $m['children'] = $visibleChildren;
                    $result[] = $m;
                }
            } elseif ($hasPerm) {
                $result[] = $m;
            }
        }
        return $result;
    };

    return $filter($allMenus);
}

// buildMenuTree is no longer needed as JSON is already structured
