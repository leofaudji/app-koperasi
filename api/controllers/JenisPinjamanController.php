<?php
// Jenis Pinjaman Controller
authCheck();
$db = Database::getInstance();

switch ($method) {
    case 'GET':
        checkPermission('pinjaman.view');
        if ($id) {
            $data = $db->fetch(
                "SELECT jp.*, a.kode as akun_kode, a.nama as akun_nama 
                 FROM jenis_pinjaman jp 
                 LEFT JOIN akun a ON jp.akun_id = a.id 
                 WHERE jp.id = ?",
                [$id]
            );
            if (!$data)
                errorResponse('Jenis pinjaman tidak ditemukan', 404);
            successResponse($data);
        } else {
            $data = $db->fetchAll(
                "SELECT jp.*, a.kode as akun_kode, a.nama as akun_nama 
                 FROM jenis_pinjaman jp 
                 LEFT JOIN akun a ON jp.akun_id = a.id 
                 ORDER BY jp.kode"
            );
            successResponse($data);
        }
        break;

    case 'POST':
        checkPermission('pinjaman.setting');
        $kode = $params['kode'] ?? '';
        $nama = $params['nama'] ?? '';
        if (empty($kode) || empty($nama))
            errorResponse('Kode dan nama wajib diisi');

        $exists = $db->count("SELECT COUNT(*) FROM jenis_pinjaman WHERE kode = ?", [$kode]);
        if ($exists)
            errorResponse('Kode sudah digunakan');

        $id = $db->insert(
            "INSERT INTO jenis_pinjaman (kode, kode_numerik, nama, bunga_persen, max_tenor, max_jumlah, keterangan, akun_id) VALUES (?,?,?,?,?,?,?,?)",
            [$kode, $params['kode_numerik'] ?? '00', $nama, $params['bunga_persen'] ?? 0, $params['max_tenor'] ?? 12, $params['max_jumlah'] ?? 0, $params['keterangan'] ?? '', $params['akun_id'] ?: null]
        );
        successResponse(['id' => $id], 'Jenis pinjaman berhasil ditambahkan', 201);
        break;

    case 'PUT':
        checkPermission('pinjaman.setting');
        if (!$id)
            errorResponse('ID diperlukan');

        $db->execute(
            "UPDATE jenis_pinjaman SET nama=?, kode_numerik=?, bunga_persen=?, max_tenor=?, max_jumlah=?, keterangan=?, is_active=?, akun_id=? WHERE id=?",
            [$params['nama'] ?? '', $params['kode_numerik'] ?? '00', $params['bunga_persen'] ?? 0, $params['max_tenor'] ?? 12, $params['max_jumlah'] ?? 0, $params['keterangan'] ?? '', $params['is_active'] ?? 1, $params['akun_id'] ?: null, $id]
        );
        successResponse(null, 'Jenis pinjaman berhasil diupdate');
        break;

    case 'DELETE':
        checkPermission('pinjaman.setting');
        if (!$id)
            errorResponse('ID diperlukan');

        $used = $db->count("SELECT COUNT(*) FROM pinjaman WHERE jenis_pinjaman_id = ?", [$id]);
        if ($used)
            errorResponse('Jenis pinjaman sudah digunakan');

        $db->execute("DELETE FROM jenis_pinjaman WHERE id = ?", [$id]);
        successResponse(null, 'Jenis pinjaman berhasil dihapus');
        break;

    default:
        errorResponse('Method not allowed', 405);
}
