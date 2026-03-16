<?php
// Public Controller for unauthenticated stats
$db = Database::getInstance();

switch ($method) {
    case 'GET':
        if ($id === 'stats') {
            $totalAnggota = $db->count("SELECT count(*) FROM anggota WHERE status = 'aktif'");
            successResponse([
                'total_anggota' => $totalAnggota
            ]);
        }
        break;

    default:
        errorResponse('Method not allowed', 405);
}
