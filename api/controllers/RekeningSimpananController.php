<?php
// Rekening Simpanan Controller
authCheck();
$db = Database::getInstance();

switch ($method) {
    case 'GET':
        checkPermission('simpanan.view');
        if ($id && is_numeric($id)) {
            $data = $db->fetch(
                "SELECT rs.*, a.nama as anggota_nama, a.no_anggota, js.nama as jenis_simpanan_nama
                 FROM rekening_simpanan rs
                 JOIN anggota a ON rs.anggota_id = a.id
                 JOIN jenis_simpanan js ON rs.jenis_simpanan_id = js.id
                 WHERE rs.id = ?",
                [$id]
            );
            if (!$data)
                errorResponse('Rekening tidak ditemukan', 404);
            successResponse($data);
        } else {
            $anggotaId = $params['anggota_id'] ?? null;
            $where = "WHERE 1=1";
            $binds = [];
            if ($anggotaId) {
                $where .= " AND rs.anggota_id = ?";
                $binds[] = $anggotaId;
            }

            $search = $params['search'] ?? '';
            if ($search) {
                $where .= " AND (rs.no_rekening LIKE ? OR a.nama LIKE ? OR a.no_anggota LIKE ?)";
                $binds[] = "%$search%";
                $binds[] = "%$search%";
                $binds[] = "%$search%";
            }

            paginatedResponse(
                "SELECT rs.*, a.nama as anggota_nama, a.no_anggota, js.nama as jenis_simpanan_nama
                 FROM rekening_simpanan rs
                 JOIN anggota a ON rs.anggota_id = a.id
                 JOIN jenis_simpanan js ON rs.jenis_simpanan_id = js.id
                 $where ORDER BY rs.created_at DESC",
                "SELECT COUNT(*) FROM rekening_simpanan rs JOIN anggota a ON rs.anggota_id = a.id $where",
                $binds,
                $params['page'] ?? 1,
                $params['per_page'] ?? PER_PAGE
            );
        }
        break;

    case 'POST':
        checkPermission('simpanan.create');
        $anggotaId = $params['anggota_id'] ?? '';
        $jenisId = $params['jenis_simpanan_id'] ?? '';
        $tglBuka = $params['tgl_buka'] ?? date('Y-m-d');

        if (empty($anggotaId) || empty($jenisId)) {
            errorResponse('Anggota dan Jenis Simpanan wajib diisi');
        }

        $anggota = $db->fetch("SELECT id, no_anggota FROM anggota WHERE id = ?", [$anggotaId]);
        $jenis = $db->fetch("SELECT id, kode_numerik FROM jenis_simpanan WHERE id = ?", [$jenisId]);

        if (!$anggota || !$jenis)
            errorResponse('Data Anggota atau Jenis Simpanan tidak valid');

        // Generate No Rekening: YY.JS.AAAAAAA.NN
        $yy = date('y', strtotime($tglBuka));
        $js = str_pad($jenis['kode_numerik'] ?: '00', 2, '0', STR_PAD_LEFT);

        // Extract numeric part of AAAAAAA (from no_anggota AGT-0001 -> 0000001)
        preg_match('/\d+/', $anggota['no_anggota'], $matches);
        $aaaaaaa = str_pad($matches[0] ?? '0', 7, '0', STR_PAD_LEFT);

        // Get NN (sequence)
        $count = $db->count("SELECT COUNT(*) FROM rekening_simpanan WHERE anggota_id = ? AND jenis_simpanan_id = ?", [$anggotaId, $jenisId]);
        $nn = str_pad($count + 1, 2, '0', STR_PAD_LEFT);

        $noRekening = "$yy.$js.$aaaaaaa.$nn";

        $rsId = $db->insert(
            "INSERT INTO rekening_simpanan (no_rekening, anggota_id, jenis_simpanan_id, tgl_buka, status) VALUES (?,?,?,?,?)",
            [$noRekening, $anggotaId, $jenisId, $tglBuka, 'aktif']
        );

        successResponse(['id' => $rsId, 'no_rekening' => $noRekening], 'Pembukaan rekening berhasil', 201);
        break;

    case 'PUT':
        checkPermission('simpanan.setting');
        if (!$id)
            errorResponse('ID diperlukan');
        $db->execute("UPDATE rekening_simpanan SET status = ? WHERE id = ?", [$params['status'], $id]);
        successResponse(null, 'Status rekening berhasil diupdate');
        break;

    default:
        errorResponse('Method not allowed', 405);
}
