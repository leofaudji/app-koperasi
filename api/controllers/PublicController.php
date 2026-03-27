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

        if ($id === 'anggota') {
            // Basic security check via secret key
            $secret = $_GET['secret'] ?? $_SERVER['HTTP_X_API_KEY'] ?? '';
            $expectedSecret = $_ENV['API_IMPORT_SECRET'] ?? 'koperasi-toko-secret';

            if ($secret !== $expectedSecret) {
                errorResponse('Unauthorized. Invalid API Secret.', 401);
            }

            $members = $db->fetchAll("SELECT id, no_anggota, nama, nik, alamat, telepon, email, status FROM anggota WHERE status = 'aktif' ORDER BY no_anggota");
            successResponse($members, 'Data anggota berhasil diambil untuk import.');
        }
        break;

    default:
        errorResponse('Method not allowed', 405);
}
