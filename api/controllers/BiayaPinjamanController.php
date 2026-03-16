<?php
// BiayaPinjamanController — Kelola jenis biaya pencairan pinjaman
authCheck();
$db = Database::getInstance();

switch ($method) {
    case 'GET':
        checkPermission('pinjaman.setting');
        if ($id && is_numeric($id)) {
            $data = $db->fetch("SELECT * FROM jenis_biaya_pinjaman WHERE id = ?", [$id]);
            if (!$data)
                errorResponse('Jenis biaya tidak ditemukan', 404);
            successResponse($data);
        }

        // Jika ada param ?jumlah=N, hitung nilai estimasi otomatis
        $jumlah = isset($params['jumlah']) ? (float) $params['jumlah'] : 0;
        $onlyActive = isset($params['active']) ? (int) $params['active'] : 1;

        $where = $onlyActive ? "WHERE is_active = 1" : "WHERE 1=1";
        $list = $db->fetchAll("SELECT * FROM jenis_biaya_pinjaman $where ORDER BY urutan, id");

        // Kalkulasi nilai estimasi jika jumlah pinjaman diketahui
        foreach ($list as &$b) {
            $b['nilai_estimasi'] = $b['tipe'] === 'persen'
                ? round($jumlah * ($b['nilai'] / 100), 0)
                : (float) $b['nilai'];
        }
        successResponse($list);
        break;

    case 'POST':
        checkPermission('pinjaman.setting');
        $nama = trim($params['nama'] ?? '');
        if (empty($nama))
            errorResponse('Nama biaya wajib diisi');

        $id = $db->insert(
            "INSERT INTO jenis_biaya_pinjaman (nama, tipe, nilai, is_wajib, is_active, urutan, akun_id) VALUES (?,?,?,?,?,?,?)",
            [
                $nama,
                $params['tipe'] ?? 'nominal',
                (float) ($params['nilai'] ?? 0),
                isset($params['is_wajib']) ? (int) $params['is_wajib'] : 0,
                1,
                (int) ($params['urutan'] ?? 0),
                $params['akun_id'] ?: null,
            ]
        );
        successResponse(['id' => $id], 'Jenis biaya berhasil ditambahkan', 201);
        break;

    case 'PUT':
        checkPermission('pinjaman.setting');
        if (!$id)
            errorResponse('ID diperlukan');

        $existing = $db->fetch("SELECT id FROM jenis_biaya_pinjaman WHERE id = ?", [$id]);
        if (!$existing)
            errorResponse('Jenis biaya tidak ditemukan', 404);

        // Toggle active jika action=toggle
        if ($action === 'toggle') {
            $db->execute("UPDATE jenis_biaya_pinjaman SET is_active = 1 - is_active WHERE id = ?", [$id]);
            successResponse(null, 'Status berhasil diubah');
        }

        $nama = trim($params['nama'] ?? '');
        if (empty($nama))
            errorResponse('Nama biaya wajib diisi');

        $db->execute(
            "UPDATE jenis_biaya_pinjaman SET nama=?, tipe=?, nilai=?, is_wajib=?, urutan=?, akun_id=? WHERE id=?",
            [
                $nama,
                $params['tipe'] ?? 'nominal',
                (float) ($params['nilai'] ?? 0),
                isset($params['is_wajib']) ? (int) $params['is_wajib'] : 0,
                (int) ($params['urutan'] ?? 0),
                $params['akun_id'] ?: null,
                $id,
            ]
        );
        successResponse(null, 'Jenis biaya berhasil diperbarui');
        break;

    case 'DELETE':
        checkPermission('pinjaman.setting');
        if (!$id)
            errorResponse('ID diperlukan');
        // Soft delete — non-aktifkan saja
        $db->execute("UPDATE jenis_biaya_pinjaman SET is_active = 0 WHERE id = ?", [$id]);
        successResponse(null, 'Jenis biaya berhasil dihapus');
        break;

    default:
        errorResponse('Method not allowed', 405);
}
