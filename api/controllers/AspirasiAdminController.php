<?php
/**
 * AspirasiAdminController - Mengelola Laporan & Tindak Lanjut Aspirasi Anggota
 * Dewan Pengawas & Manajemen Koperasi
 */

class AspirasiAdminController
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    private function checkAccess()
    {
        authCheck();
        $roleId = $_SESSION['role_id'] ?? 0;
        $hasPerm = ($roleId == 1) 
            || (function_exists('hasPermission') && (hasPermission('aspirasi.view') || hasPermission('anggota.view') || hasPermission('dashboard.view')));
        if (!$hasPerm) {
            errorResponse('Akses ditolak. Anda tidak memiliki izin melihat laporan aspirasi.', 403);
        }
    }

    // [GET] /api/aspirasi
    public function index()
    {
        $this->checkAccess();

        $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? (int) $_GET['per_page'] : 15;
        $exportAll = isset($_GET['export']) && $_GET['export'] == '1';

        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $kategori = isset($_GET['kategori']) ? trim($_GET['kategori']) : '';
        $status = isset($_GET['status']) ? trim($_GET['status']) : '';
        $isAnonim = isset($_GET['is_anonim']) && $_GET['is_anonim'] !== '' ? (int) $_GET['is_anonim'] : null;
        $tglMulai = isset($_GET['tgl_mulai']) && $_GET['tgl_mulai'] !== '' ? trim($_GET['tgl_mulai']) : null;
        $tglSelesai = isset($_GET['tgl_selesai']) && $_GET['tgl_selesai'] !== '' ? trim($_GET['tgl_selesai']) : null;

        $where = ["1=1"];
        $params = [];

        if ($search !== '') {
            $where[] = "(pa.no_tiket LIKE ? OR pa.nama_pengirim LIKE ? OR pa.judul LIKE ? OR pa.pesan LIKE ? OR a.no_anggota LIKE ? OR a.nama LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        if ($kategori !== '' && $kategori !== 'all') {
            $where[] = "pa.kategori = ?";
            $params[] = $kategori;
        }

        if ($status !== '' && $status !== 'all') {
            $where[] = "pa.status = ?";
            $params[] = $status;
        }

        if ($isAnonim !== null) {
            $where[] = "pa.is_anonim = ?";
            $params[] = $isAnonim;
        }

        if ($tglMulai) {
            $where[] = "DATE(pa.created_at) >= ?";
            $params[] = $tglMulai;
        }

        if ($tglSelesai) {
            $where[] = "DATE(pa.created_at) <= ?";
            $params[] = $tglSelesai;
        }

        $whereClause = implode(" AND ", $where);

        // Agregat Statistik KPI
        $stats = [
            'total' => (int) $this->db->count("SELECT COUNT(*) FROM portal_aspirasi"),
            'terkirim' => (int) $this->db->count("SELECT COUNT(*) FROM portal_aspirasi WHERE status = 'terkirim'"),
            'ditinjau' => (int) $this->db->count("SELECT COUNT(*) FROM portal_aspirasi WHERE status = 'ditinjau'"),
            'dijawab' => (int) $this->db->count("SELECT COUNT(*) FROM portal_aspirasi WHERE status = 'dijawab'"),
            'anonim' => (int) $this->db->count("SELECT COUNT(*) FROM portal_aspirasi WHERE is_anonim = 1"),
            'terbuka' => (int) $this->db->count("SELECT COUNT(*) FROM portal_aspirasi WHERE is_anonim = 0"),
            'kategori' => [
                'pelayanan' => (int) $this->db->count("SELECT COUNT(*) FROM portal_aspirasi WHERE kategori = 'pelayanan'"),
                'keuangan' => (int) $this->db->count("SELECT COUNT(*) FROM portal_aspirasi WHERE kategori = 'keuangan'"),
                'pengawas' => (int) $this->db->count("SELECT COUNT(*) FROM portal_aspirasi WHERE kategori = 'pengawas'"),
                'usulan' => (int) $this->db->count("SELECT COUNT(*) FROM portal_aspirasi WHERE kategori = 'usulan'")
            ]
        ];

        // Total data sesuai filter
        $totalFiltered = (int) $this->db->count(
            "SELECT COUNT(*) FROM portal_aspirasi pa 
             LEFT JOIN anggota a ON pa.anggota_id = a.id 
             WHERE $whereClause",
            $params
        );

        $limitSql = "";
        if (!$exportAll && $perPage > 0) {
            $offset = ($page - 1) * $perPage;
            $limitSql = "LIMIT $perPage OFFSET $offset";
        }

        $sql = "SELECT pa.*, 
                       a.no_anggota, 
                       a.nama as nama_asli, 
                       a.telepon, 
                       a.email,
                       u.nama_lengkap as nama_penanggap
                FROM portal_aspirasi pa
                LEFT JOIN anggota a ON pa.anggota_id = a.id
                LEFT JOIN users u ON pa.ditanggapi_oleh = u.id
                WHERE $whereClause
                ORDER BY pa.id DESC
                $limitSql";

        $rows = $this->db->fetchAll($sql, $params);

        // Ambil info nama koperasi & pengawas dari settings
        $settRows = $this->db->fetchAll("SELECT setting_key, setting_value FROM app_settings");
        $sett = [];
        foreach ($settRows as $s) {
            $sett[$s['setting_key']] = $s['setting_value'];
        }

        $totalPages = ($perPage > 0 && !$exportAll) ? (int) ceil($totalFiltered / $perPage) : 1;

        successResponse([
            'items' => $rows,
            'stats' => $stats,
            'pagination' => [
                'total' => $totalFiltered,
                'page' => $page,
                'per_page' => $perPage,
                'total_pages' => $totalPages
            ],
            'koperasi' => [
                'nama' => $sett['app_name'] ?? 'Koperasi Simpan Pinjam',
                'badan_hukum' => $sett['badan_hukum'] ?? ($sett['no_badan_hukum'] ?? '-'),
                'pengawas' => $sett['pengawas_koperasi'] ?? ($sett['ketua_pengawas'] ?? 'Dewan Pengawas Koperasi')
            ]
        ]);
    }

    // [GET] /api/aspirasi/{id}
    public function show($id)
    {
        $this->checkAccess();

        $sql = "SELECT pa.*, 
                       a.no_anggota, 
                       a.nama as nama_asli, 
                       a.telepon, 
                       a.email, 
                       a.alamat,
                       u.nama_lengkap as nama_penanggap
                FROM portal_aspirasi pa
                LEFT JOIN anggota a ON pa.anggota_id = a.id
                LEFT JOIN users u ON pa.ditanggapi_oleh = u.id
                WHERE pa.id = ? LIMIT 1";

        $row = $this->db->fetch($sql, [$id]);
        if (!$row) {
            errorResponse('Data aspirasi tidak ditemukan', 404);
        }

        successResponse($row);
    }

    // [POST/PUT] Tanggapi / Tindak Lanjut Aspirasi
    public function tanggapi($id)
    {
        $this->checkAccess();

        $aspirasi = $this->db->fetch("SELECT * FROM portal_aspirasi WHERE id = ? LIMIT 1", [$id]);
        if (!$aspirasi) {
            errorResponse('Data aspirasi tidak ditemukan', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $status = trim($input['status'] ?? 'ditinjau');
        $tanggapan = trim($input['tanggapan'] ?? '');

        if (!in_array($status, ['terkirim', 'ditinjau', 'dijawab'])) {
            $status = 'ditinjau';
        }

        if ($status === 'dijawab' && empty($tanggapan)) {
            errorResponse('Silakan isi teks tanggapan resmi jika status diubah menjadi Dijawab.', 422);
        }

        $userId = $_SESSION['user_id'] ?? null;

        $this->db->execute(
            "UPDATE portal_aspirasi 
             SET status = ?, 
                 tanggapan = ?, 
                 tgl_tanggapan = NOW(), 
                 ditanggapi_oleh = ? 
             WHERE id = ?",
            [$status, $tanggapan ?: null, $userId, $id]
        );

        if (function_exists('logActivity')) {
            logActivity('tanggapi_aspirasi', 'portal_aspirasi', $id, $aspirasi, [
                'status' => $status,
                'tanggapan' => $tanggapan,
                'ditanggapi_oleh' => $userId
            ]);
        }

        $updated = $this->db->fetch("SELECT pa.*, u.nama_lengkap as nama_penanggap FROM portal_aspirasi pa LEFT JOIN users u ON pa.ditanggapi_oleh = u.id WHERE pa.id = ?", [$id]);

        successResponse($updated, 'Tanggapan resmi pengawas/manajemen berhasil disimpan.');
    }

    // [DELETE] Hapus Aspirasi
    public function destroy($id)
    {
        $this->checkAccess();
        if (($_SESSION['role_id'] ?? 0) != 1) {
            errorResponse('Hanya Superadmin yang berhak menghapus berkas aspirasi.', 403);
        }

        $row = $this->db->fetch("SELECT * FROM portal_aspirasi WHERE id = ?", [$id]);
        if (!$row) {
            errorResponse('Aspirasi tidak ditemukan', 404);
        }

        $this->db->execute("DELETE FROM portal_aspirasi WHERE id = ?", [$id]);

        if (function_exists('logActivity')) {
            logActivity('delete_aspirasi', 'portal_aspirasi', $id, $row, null);
        }

        successResponse(null, 'Aspirasi berhasil dihapus.');
    }
}

// Router dispatcher for AspirasiAdminController
$controller = new AspirasiAdminController();
$curId = $id ?? ($segments[1] ?? ($_GET['id'] ?? null));
$curAction = $action ?? ($segments[2] ?? null);
$curMethod = $method ?? $_SERVER['REQUEST_METHOD'];

if ($curMethod === 'GET') {
    if ($curId && is_numeric($curId)) {
        $controller->show($curId);
    } else {
        $controller->index();
    }
} elseif ($curMethod === 'POST') {
    if ($curId) {
        $controller->tanggapi($curId);
    } else {
        errorResponse('ID aspirasi diperlukan untuk menanggapi', 400);
    }
} elseif ($curMethod === 'PUT') {
    if ($curId) {
        $controller->tanggapi($curId);
    } else {
        errorResponse('ID aspirasi diperlukan', 400);
    }
} elseif ($curMethod === 'DELETE') {
    if ($curId) {
        $controller->destroy($curId);
    } else {
        errorResponse('ID aspirasi diperlukan', 400);
    }
} else {
    errorResponse('Method Not Allowed', 405);
}
