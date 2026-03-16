<?php
// Jenis Simpanan Controller
authCheck();
$db = Database::getInstance();

switch ($method) {
    case 'GET':
        checkPermission('simpanan.view');
        if ($id) {
            $data = $db->fetch(
                "SELECT js.*, a.kode as akun_kode, a.nama as akun_nama
                 FROM jenis_simpanan js LEFT JOIN akun a ON js.akun_id = a.id
                 WHERE js.id = ?",
                [$id]
            );
            if (!$data)
                errorResponse('Jenis simpanan tidak ditemukan', 404);
            successResponse($data);
        } else {
            $data = $db->fetchAll(
                "SELECT js.*, a.kode as akun_kode, a.nama as akun_nama
                 FROM jenis_simpanan js LEFT JOIN akun a ON js.akun_id = a.id
                 ORDER BY js.kode"
            );
            successResponse($data);
        }
        break;

    case 'POST':
        checkPermission('simpanan.setting');
        $kode = $params['kode'] ?? '';
        $nama = $params['nama'] ?? '';
        if (empty($kode) || empty($nama))
            errorResponse('Kode dan nama wajib diisi');

        $exists = $db->count("SELECT COUNT(*) FROM jenis_simpanan WHERE kode = ?", [$kode]);
        if ($exists)
            errorResponse('Kode sudah digunakan');

        $id = $db->insert(
            "INSERT INTO jenis_simpanan (kode, kode_numerik, nama, bunga_persen, is_wajib, keterangan, akun_id) VALUES (?,?,?,?,?,?,?)",
            [$kode, $params['kode_numerik'] ?? '00', $nama, $params['bunga_persen'] ?? 0, $params['is_wajib'] ?? 0, $params['keterangan'] ?? '', $params['akun_id'] ?: null]
        );
        successResponse(['id' => $id], 'Jenis simpanan berhasil ditambahkan', 201);
        break;

    case 'PUT':
        checkPermission('simpanan.setting');
        if (!$id)
            errorResponse('ID diperlukan');

        $db->execute(
            "UPDATE jenis_simpanan SET nama=?, kode_numerik=?, bunga_persen=?, is_wajib=?, keterangan=?, is_active=?, akun_id=? WHERE id=?",
            [$params['nama'] ?? '', $params['kode_numerik'] ?? '00', $params['bunga_persen'] ?? 0, $params['is_wajib'] ?? 0, $params['keterangan'] ?? '', $params['is_active'] ?? 1, $params['akun_id'] ?: null, $id]
        );
        successResponse(null, 'Jenis simpanan berhasil diupdate');
        break;

    case 'DELETE':
        checkPermission('simpanan.setting');
        if (!$id)
            errorResponse('ID diperlukan');

        $used = $db->count("SELECT COUNT(*) FROM simpanan WHERE jenis_simpanan_id = ?", [$id]);
        if ($used)
            errorResponse('Jenis simpanan sudah digunakan dalam transaksi');

        $db->execute("DELETE FROM jenis_simpanan WHERE id = ?", [$id]);
        successResponse(null, 'Jenis simpanan berhasil dihapus');
        break;

    default:
        errorResponse('Method not allowed', 405);
}
