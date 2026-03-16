<?php

/**
 * PengumumanController - Mengelola Broadcast & Notifikasi
 */
class PengumumanController
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    // [GET] /api/pengumuman
    public function index()
    {
        authCheck(); // Requires login (admin)
        if (!checkPermission('pengumuman.view')) {
            errorResponse('Unauthorized', 403);
        }

        $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
        $perPage = isset($_GET['per_page']) ? (int) $_GET['per_page'] : 10;
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $tipe = isset($_GET['tipe']) ? trim($_GET['tipe']) : '';

        $query = "SELECT * FROM pengumuman WHERE 1=1";
        $countQuery = "SELECT COUNT(*) FROM pengumuman WHERE 1=1";
        $params = [];

        if ($search !== '') {
            $query .= " AND (judul LIKE ? OR konten LIKE ?)";
            $countQuery .= " AND (judul LIKE ? OR konten LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        if ($tipe !== '') {
            $query .= " AND tipe = ?";
            $countQuery .= " AND tipe = ?";
            $params[] = $tipe;
        }

        $query .= " ORDER BY id DESC";

        paginatedResponse($query, $countQuery, $params, $page, $perPage);
    }

    // [GET] /api/pengumuman/{id}
    public function show($id)
    {
        authCheck();
        if (!checkPermission('pengumuman.view')) {
            errorResponse('Unauthorized', 403);
        }

        $p = $this->db->fetch("SELECT * FROM pengumuman WHERE id = ?", [$id]);
        if (!$p)
            errorResponse('Pengumuman tidak ditemukan', 404);

        successResponse($p);
    }

    // [POST] /api/pengumuman
    public function store()
    {
        authCheck();
        if (!checkPermission('pengumuman.create')) {
            errorResponse('Unauthorized', 403);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $judul = trim($input['judul'] ?? '');
        $konten = trim($input['konten'] ?? '');
        $tipe = trim($input['tipe'] ?? 'info');
        $is_active = isset($input['is_active']) ? (int) $input['is_active'] : 1;

        if (empty($judul) || empty($konten)) {
            errorResponse('Judul dan Konten harus diisi');
        }

        try {
            $this->db->execute(
                "INSERT INTO pengumuman (judul, konten, tipe, is_active) VALUES (?, ?, ?, ?)",
                [$judul, $konten, $tipe, $is_active]
            );
            successResponse(null, 'Pengumuman berhasil dibuat');
        } catch (Exception $e) {
            errorResponse('Gagal membuat pengumuman: ' . $e->getMessage(), 500);
        }
    }

    // [PUT] /api/pengumuman/{id}
    public function update($id)
    {
        authCheck();
        if (!checkPermission('pengumuman.update')) {
            errorResponse('Unauthorized', 403);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $judul = trim($input['judul'] ?? '');
        $konten = trim($input['konten'] ?? '');
        $tipe = trim($input['tipe'] ?? 'info');
        $is_active = isset($input['is_active']) ? (int) $input['is_active'] : 1;

        if (empty($judul) || empty($konten)) {
            errorResponse('Judul dan Konten harus diisi');
        }

        $p = $this->db->fetch("SELECT id FROM pengumuman WHERE id = ?", [$id]);
        if (!$p)
            errorResponse('Pengumuman tidak ditemukan', 404);

        try {
            $this->db->execute(
                "UPDATE pengumuman SET judul = ?, konten = ?, tipe = ?, is_active = ? WHERE id = ?",
                [$judul, $konten, $tipe, $is_active, $id]
            );
            successResponse(null, 'Pengumuman berhasil diubah');
        } catch (Exception $e) {
            errorResponse('Gagal mengubah pengumuman: ' . $e->getMessage(), 500);
        }
    }

    // [DELETE] /api/pengumuman/{id}
    public function destroy($id)
    {
        authCheck();
        if (!checkPermission('pengumuman.delete')) {
            errorResponse('Unauthorized', 403);
        }

        $p = $this->db->fetch("SELECT id FROM pengumuman WHERE id = ?", [$id]);
        if (!$p)
            errorResponse('Pengumuman tidak ditemukan', 404);

        try {
            $this->db->execute("DELETE FROM pengumuman WHERE id = ?", [$id]);
            successResponse(null, 'Pengumuman berhasil dihapus');
        } catch (Exception $e) {
            errorResponse('Gagal menghapus pengumuman: ' . $e->getMessage(), 500);
        }
    }
}

// Router for PengumumanController
$action = $segments[2] ?? null;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $controller = new PengumumanController();
    if ($id) {
        $controller->show($id);
    } else {
        $controller->index();
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    (new PengumumanController())->store();
} elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    if ($id) {
        (new PengumumanController())->update($id);
    } else {
        errorResponse('ID required');
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    if ($id) {
        (new PengumumanController())->destroy($id);
    } else {
        errorResponse('ID required');
    }
} else {
    errorResponse('Method Not Allowed', 405);
}
