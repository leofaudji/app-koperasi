<?php
// Agunan Controller — Manajemen Jaminan Pinjaman
authCheck();
checkPermission('agunan.view');

$db = Database::getInstance();

switch ($method) {

    // ── GET: List / Detail ───────────────────────────────────────
    case 'GET':
        if ($id && is_numeric($id)) {
            // Detail satu agunan
            $row = $db->fetch(
                "SELECT ag.*,
                        p.no_pinjaman, p.jumlah as jumlah_pinjaman, p.status as status_pinjaman,
                        a.nama as anggota_nama, a.no_anggota,
                        jp.nama as jenis_pinjaman,
                        uc.nama_lengkap as created_by_nama
                 FROM agunan ag
                 JOIN pinjaman p  ON ag.pinjaman_id = p.id
                 JOIN anggota a   ON p.anggota_id   = a.id
                 JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
                 LEFT JOIN users uc ON ag.created_by = uc.id
                 WHERE ag.id = ?",
                [$id]
            );
            if (!$row)
                errorResponse('Agunan tidak ditemukan', 404);
            successResponse($row);
        }

        // List dengan filter
        $search = $params['search'] ?? '';
        $status = $params['status'] ?? '';
        $tipe = $params['tipe'] ?? '';
        $pinjamanId = $params['pinjaman_id'] ?? '';
        $page = max(1, (int) ($params['page'] ?? 1));
        $perPage = (int) ($params['per_page'] ?? PER_PAGE);

        $where = "WHERE 1=1";
        $binds = [];

        if ($search) {
            $where .= " AND (a.nama LIKE ? OR a.no_anggota LIKE ? OR p.no_pinjaman LIKE ? OR ag.deskripsi LIKE ? OR ag.no_dokumen LIKE ?)";
            $like = "%$search%";
            $binds = array_merge($binds, [$like, $like, $like, $like, $like]);
        }
        if ($status) {
            $where .= " AND ag.status = ?";
            $binds[] = $status;
        }
        if ($tipe) {
            $where .= " AND ag.tipe_agunan = ?";
            $binds[] = $tipe;
        }
        if ($pinjamanId) {
            $where .= " AND ag.pinjaman_id = ?";
            $binds[] = $pinjamanId;
        }

        paginatedResponse(
            "SELECT ag.*,
                    p.no_pinjaman, p.jumlah as jumlah_pinjaman, p.status as status_pinjaman,
                    a.nama as anggota_nama, a.no_anggota,
                    jp.nama as jenis_pinjaman
             FROM agunan ag
             JOIN pinjaman p  ON ag.pinjaman_id = p.id
             JOIN anggota a   ON p.anggota_id   = a.id
             JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
             $where ORDER BY ag.status ASC, ag.created_at DESC",
            "SELECT COUNT(*) FROM agunan ag
             JOIN pinjaman p ON ag.pinjaman_id = p.id
             JOIN anggota a  ON p.anggota_id   = a.id
             $where",
            $binds,
            $page,
            $perPage
        );
        break;

    // ── POST: Tambah Agunan ──────────────────────────────────────
    case 'POST':
        checkPermission('agunan.manage');

        $pinjamanId = $params['pinjaman_id'] ?? '';
        $tipeAgunan = $params['tipe_agunan'] ?? 'Lainnya';
        $deskripsi = trim($params['deskripsi'] ?? '');
        $noDokumen = trim($params['no_dokumen'] ?? '');
        $pemilik = trim($params['pemilik'] ?? '');
        $nilaiTaksasi = (float) ($params['nilai_taksasi'] ?? 0);
        $tglTerima = $params['tgl_terima'] ?? date('Y-m-d');
        $keterangan = trim($params['keterangan'] ?? '');

        if (empty($pinjamanId) || empty($deskripsi)) {
            errorResponse('Pinjaman dan deskripsi agunan wajib diisi');
        }

        // Validasi pinjaman exist
        $pinjaman = $db->fetch("SELECT id, status FROM pinjaman WHERE id = ?", [$pinjamanId]);
        if (!$pinjaman)
            errorResponse('Pinjaman tidak ditemukan');

        $tipeAllowed = ['SHM', 'SHGB', 'BPKB', 'Deposito', 'Lainnya'];
        if (!in_array($tipeAgunan, $tipeAllowed)) {
            $tipeAgunan = 'Lainnya';
        }

        $newId = $db->insert(
            "INSERT INTO agunan
                (pinjaman_id, tipe_agunan, deskripsi, no_dokumen, pemilik, nilai_taksasi, tgl_terima, keterangan, status, created_by)
             VALUES (?,?,?,?,?,?,?,?,'aktif',?)",
            [
                $pinjamanId,
                $tipeAgunan,
                $deskripsi,
                $noDokumen ?: null,
                $pemilik ?: null,
                $nilaiTaksasi,
                $tglTerima,
                $keterangan ?: null,
                $_SESSION['user_id']
            ]
        );

        successResponse(['id' => $newId], 'Agunan berhasil ditambahkan', 201);
        break;

    // ── PUT: Edit / Tandai Dikembalikan ─────────────────────────
    case 'PUT':
        checkPermission('agunan.manage');
        if (!$id)
            errorResponse('ID agunan diperlukan');

        $agunan = $db->fetch("SELECT * FROM agunan WHERE id = ?", [$id]);
        if (!$agunan)
            errorResponse('Agunan tidak ditemukan', 404);

        // Action khusus: kembalikan
        if ($action === 'kembalikan') {
            if ($agunan['status'] === 'dikembalikan') {
                errorResponse('Agunan sudah dikembalikan sebelumnya');
            }
            $tglKembali = $params['tgl_kembali'] ?? date('Y-m-d');
            $db->execute(
                "UPDATE agunan SET status='dikembalikan', tgl_kembali=?, updated_by=?, updated_at=NOW() WHERE id=?",
                [$tglKembali, $_SESSION['user_id'], $id]
            );
            successResponse(null, 'Agunan berhasil ditandai dikembalikan');
        }

        // Edit biasa
        $tipeAgunan = $params['tipe_agunan'] ?? $agunan['tipe_agunan'];
        $deskripsi = trim($params['deskripsi'] ?? $agunan['deskripsi']);
        $noDokumen = trim($params['no_dokumen'] ?? ($agunan['no_dokumen'] ?? ''));
        $pemilik = trim($params['pemilik'] ?? ($agunan['pemilik'] ?? ''));
        $nilaiTaksasi = isset($params['nilai_taksasi']) ? (float) $params['nilai_taksasi'] : (float) $agunan['nilai_taksasi'];
        $tglTerima = $params['tgl_terima'] ?? $agunan['tgl_terima'];
        $keterangan = trim($params['keterangan'] ?? ($agunan['keterangan'] ?? ''));

        if (empty($deskripsi))
            errorResponse('Deskripsi agunan wajib diisi');

        $tipeAllowed = ['SHM', 'SHGB', 'BPKB', 'Deposito', 'Lainnya'];
        if (!in_array($tipeAgunan, $tipeAllowed))
            $tipeAgunan = 'Lainnya';

        $db->execute(
            "UPDATE agunan SET
                tipe_agunan=?, deskripsi=?, no_dokumen=?, pemilik=?,
                nilai_taksasi=?, tgl_terima=?, keterangan=?, updated_by=?, updated_at=NOW()
             WHERE id=?",
            [
                $tipeAgunan,
                $deskripsi,
                $noDokumen ?: null,
                $pemilik ?: null,
                $nilaiTaksasi,
                $tglTerima,
                $keterangan ?: null,
                $_SESSION['user_id'],
                $id
            ]
        );

        successResponse(null, 'Agunan berhasil diperbarui');
        break;

    // ── DELETE: Hapus Agunan ─────────────────────────────────────
    case 'DELETE':
        checkPermission('agunan.manage');
        if (!$id)
            errorResponse('ID agunan diperlukan');

        $agunan = $db->fetch("SELECT id FROM agunan WHERE id = ?", [$id]);
        if (!$agunan)
            errorResponse('Agunan tidak ditemukan', 404);

        $db->execute("DELETE FROM agunan WHERE id = ?", [$id]);
        successResponse(null, 'Agunan berhasil dihapus');
        break;

    default:
        errorResponse('Method not allowed', 405);
}
