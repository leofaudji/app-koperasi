<?php
// Kode Transaksi Simpanan Controller
authCheck();
$db = Database::getInstance();

switch ($method) {
    case 'GET':
        checkPermission('simpanan.view');
        if ($id) {
            $data = $db->fetch(
                "SELECT kt.*, ad.kode as akun_debit_kode, ad.nama as akun_debit_nama,
                        ak.kode as akun_kredit_kode, ak.nama as akun_kredit_nama
                 FROM kode_transaksi_simpanan kt
                 LEFT JOIN akun ad ON kt.akun_debit_id = ad.id
                 LEFT JOIN akun ak ON kt.akun_kredit_id = ak.id
                 WHERE kt.id = ?", [$id]
            );
            if (!$data)
                errorResponse('Kode transaksi tidak ditemukan', 404);
            successResponse($data);
        }
        else {
            $data = $db->fetchAll(
                "SELECT kt.*, ad.kode as akun_debit_kode, ad.nama as akun_debit_nama,
                        ak.kode as akun_kredit_kode, ak.nama as akun_kredit_nama
                 FROM kode_transaksi_simpanan kt
                 LEFT JOIN akun ad ON kt.akun_debit_id = ad.id
                 LEFT JOIN akun ak ON kt.akun_kredit_id = ak.id
                 ORDER BY kt.kode"
            );
            successResponse($data);
        }
        break;

    case 'POST':
        checkPermission('simpanan.setting');
        $kode = $params['kode'] ?? '';
        $nama = $params['nama'] ?? '';
        $dk = $params['dk'] ?? '';

        if (empty($kode) || empty($nama) || empty($dk)) {
            errorResponse('Kode, nama, dan D/K wajib diisi');
        }
        if (!in_array($dk, ['D', 'K'])) {
            errorResponse('D/K harus D (Debit) atau K (Kredit)');
        }

        $exists = $db->count("SELECT COUNT(*) FROM kode_transaksi_simpanan WHERE kode = ?", [$kode]);
        if ($exists)
            errorResponse('Kode sudah digunakan');

        $id = $db->insert(
            "INSERT INTO kode_transaksi_simpanan (kode, nama, dk, deskripsi, akun_debit_id, akun_kredit_id) VALUES (?,?,?,?,?,?)",
        [$kode, $nama, $dk, $params['deskripsi'] ?? '', $params['akun_debit_id'] ?: null, $params['akun_kredit_id'] ?: null]
        );
        successResponse(['id' => $id], 'Kode transaksi berhasil ditambahkan', 201);
        break;

    case 'PUT':
        checkPermission('simpanan.setting');
        if (!$id)
            errorResponse('ID diperlukan');

        $dk = $params['dk'] ?? '';
        if (!in_array($dk, ['D', 'K'])) {
            errorResponse('D/K harus D (Debit) atau K (Kredit)');
        }

        $db->execute(
            "UPDATE kode_transaksi_simpanan SET nama=?, dk=?, deskripsi=?, is_active=?, akun_debit_id=?, akun_kredit_id=? WHERE id=?",
        [$params['nama'] ?? '', $dk, $params['deskripsi'] ?? '', $params['is_active'] ?? 1, $params['akun_debit_id'] ?: null, $params['akun_kredit_id'] ?: null, $id]
        );
        successResponse(null, 'Kode transaksi berhasil diupdate');
        break;

    case 'DELETE':
        checkPermission('simpanan.setting');
        if (!$id)
            errorResponse('ID diperlukan');

        $used = $db->count("SELECT COUNT(*) FROM simpanan WHERE kode_transaksi_id = ?", [$id]);
        if ($used)
            errorResponse('Kode transaksi sudah digunakan dalam transaksi');

        $db->execute("DELETE FROM kode_transaksi_simpanan WHERE id = ?", [$id]);
        successResponse(null, 'Kode transaksi berhasil dihapus');
        break;

    default:
        errorResponse('Method not allowed', 405);
}
