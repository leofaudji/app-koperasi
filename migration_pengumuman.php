<?php

require_once __DIR__ . '/api/config/database.php';

try {
    $db = Database::getInstance();

    // Create pengumuman table
    $sql = "CREATE TABLE IF NOT EXISTS pengumuman (
        id INT AUTO_INCREMENT PRIMARY KEY,
        judul VARCHAR(255) NOT NULL,
        konten TEXT NOT NULL,
        tipe ENUM('info', 'warning', 'promo') DEFAULT 'info',
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $db->execute($sql);
    echo "Tabel 'pengumuman' berhasil dibuat atau sudah ada.\n";

    // Add default permissions
    $perms = [
        ['pengumuman.view', 'Melihat Daftar Pengumuman'],
        ['pengumuman.create', 'Membuat Pengumuman'],
        ['pengumuman.update', 'Mengubah Pengumuman'],
        ['pengumuman.delete', 'Menghapus Pengumuman']
    ];

    foreach ($perms as $p) {
        $check = $db->fetch("SELECT id FROM permissions WHERE name = ?", [$p[0]]);
        if (!$check) {
            $permId = $db->insert("INSERT INTO permissions (name, description) VALUES (?, ?)", [$p[0], $p[1]]);
            // Assign to Super Admin
            $db->execute("INSERT INTO role_permissions (role_id, permission_id) VALUES (1, ?)", [$permId]);
        }
    }
    echo "Permissions 'Pengumuman' berhasil ditambahkan.\n";

    echo "\nMigrasi Pengumuman Sukses!\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
