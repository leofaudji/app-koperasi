<?php
require 'api/config/database.php';
$db = Database::getInstance();

try {
    // Let's check the schema of permissions table
    $schema = $db->fetchAll("DESCRIBE permissions;");
    echo "PERMISSIONS SCHEMA:\n";
    print_r($schema);

    // Fix the permissions
    $perms = [
        ['pengumuman.view', 'Melihat Daftar Pengumuman'],
        ['pengumuman.create', 'Membuat Pengumuman'],
        ['pengumuman.update', 'Mengubah Pengumuman'],
        ['pengumuman.delete', 'Menghapus Pengumuman']
    ];

    foreach ($perms as $p) {
        // use 'kode' instead of 'name' as seen from the error
        $check = $db->fetch("SELECT id FROM permissions WHERE kode = ?", [$p[0]]);
        if (!$check) {
            $permId = $db->insert("INSERT INTO permissions (kode, nama) VALUES (?, ?)", [$p[0], $p[1]]);
            $db->execute("INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (1, ?)", [$permId]);
            echo "Inserted $p[0] ($permId)\n";
        } else {
            $db->execute("INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (1, ?)", [$check['id']]);
            echo "Already exists $p[0] ({$check['id']})\n";
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
