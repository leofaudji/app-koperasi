<?php
// Search Controller - Global Search (Omni-Search) with Redis Optimization
authCheck();

$db = Database::getInstance();
$q = $params['q'] ?? '';

if (strlen($q) < 2) {
    successResponse([]);
}

// Optimization: Using Redis to cache search results for 5 minutes
$cacheKey = 'search_global_' . md5(strtolower(trim($q)));

$results = getCachedData($cacheKey, function() use ($db, $q) {
    $results = [];

    // 1. Search Members
    $members = $db->fetchAll(
        "SELECT id, no_anggota, nama, 'anggota' as type 
         FROM anggota 
         WHERE nama LIKE ? OR no_anggota LIKE ? 
         LIMIT 5", 
        ["%$q%", "%$q%"]
    );
    foreach ($members as $m) {
        $results[] = [
            'title' => $m['nama'],
            'subtitle' => $m['no_anggota'],
            'url' => "#/anggota/" . $m['id'],
            'icon' => 'ri-user-line',
            'type' => 'Anggota'
        ];
    }

    // 2. Search Menus
    $menus = $db->fetchAll(
        "SELECT nama, url, icon, 'menu' as type 
         FROM menus 
         WHERE nama LIKE ? AND url IS NOT NULL AND is_active = 1
         LIMIT 5", 
        ["%$q%"]
    );
    foreach ($menus as $m) {
        $results[] = [
            'title' => $m['nama'],
            'subtitle' => 'Navigasi Menu',
            'url' => $m['url'],
            'icon' => $m['icon'],
            'type' => 'Menu'
        ];
    }

    // 3. Search Transactions (Pinjaman by No Pinjaman)
    $pinjaman = $db->fetchAll(
        "SELECT id, no_pinjaman, 'pinjaman' as type 
         FROM pinjaman 
         WHERE no_pinjaman LIKE ? 
         LIMIT 3", 
        ["%$q%"]
    );
    foreach ($pinjaman as $p) {
        $results[] = [
            'title' => $p['no_pinjaman'],
            'subtitle' => 'Data Pinjaman',
            'url' => "#/pinjaman", 
            'icon' => 'ri-file-list-line',
            'type' => 'Transaksi'
        ];
    }

    return $results;
}, 300); // Cache for 5 minutes (300 seconds)

successResponse($results);
