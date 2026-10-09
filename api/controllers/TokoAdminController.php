<?php
/**
 * TokoAdminController - Mengelola Pesanan Toko Koperasi dari Portal Anggota
 * Kasir, Pengurus, & Administrasi Koperasi
 */

class TokoAdminController
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
            || (function_exists('hasPermission') && (
                hasPermission('toko.view') || 
                hasPermission('simpanan.view') || 
                hasPermission('dashboard.view') || 
                hasPermission('anggota.view')
            ));
        if (!$hasPerm) {
            errorResponse('Akses ditolak. Anda tidak memiliki izin mengelola pesanan toko.', 403);
        }
    }

    // [GET] /api/toko-pesanan
    public function index()
    {
        $this->checkAccess();

        $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? (int) $_GET['per_page'] : 15;
        $exportAll = isset($_GET['export']) && $_GET['export'] == '1';

        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $status = isset($_GET['status']) ? trim($_GET['status']) : '';
        $metode = isset($_GET['metode']) ? trim($_GET['metode']) : '';
        $tglMulai = isset($_GET['tgl_mulai']) && $_GET['tgl_mulai'] !== '' ? trim($_GET['tgl_mulai']) : null;
        $tglSelesai = isset($_GET['tgl_selesai']) && $_GET['tgl_selesai'] !== '' ? trim($_GET['tgl_selesai']) : null;

        $where = ["1=1"];
        $params = [];

        if ($search !== '') {
            $where[] = "(tp.no_pesanan LIKE ? OR a.nama LIKE ? OR a.no_anggota LIKE ? OR a.telepon LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        if ($status !== '' && $status !== 'all') {
            $where[] = "tp.status = ?";
            $params[] = $status;
        }

        if ($metode !== '' && $metode !== 'all') {
            $where[] = "tp.metode_pembayaran = ?";
            $params[] = $metode;
        }

        if ($tglMulai) {
            $where[] = "DATE(tp.tgl_pesanan) >= ?";
            $params[] = $tglMulai;
        }

        if ($tglSelesai) {
            $where[] = "DATE(tp.tgl_pesanan) <= ?";
            $params[] = $tglSelesai;
        }

        $whereClause = implode(" AND ", $where);

        // KPI Summary Cards
        $stats = [
            'total' => (int) $this->db->count("SELECT COUNT(*) FROM toko_pesanan"),
            'pending' => (int) $this->db->count("SELECT COUNT(*) FROM toko_pesanan WHERE status = 'pending'"),
            'diproses' => (int) $this->db->count("SELECT COUNT(*) FROM toko_pesanan WHERE status = 'diproses'"),
            'siap_diambil' => (int) $this->db->count("SELECT COUNT(*) FROM toko_pesanan WHERE status = 'siap_diambil'"),
            'selesai' => (int) $this->db->count("SELECT COUNT(*) FROM toko_pesanan WHERE status = 'selesai'"),
            'dibatalkan' => (int) $this->db->count("SELECT COUNT(*) FROM toko_pesanan WHERE status = 'dibatalkan'"),
            'omset_selesai' => (float) ($this->db->fetch("SELECT COALESCE(SUM(total_nominal), 0) as omset FROM toko_pesanan WHERE status = 'selesai'")['omset'] ?? 0)
        ];

        // Total count for pagination
        $totalRows = (int) $this->db->count(
            "SELECT COUNT(DISTINCT tp.id) 
             FROM toko_pesanan tp 
             JOIN anggota a ON tp.anggota_id = a.id 
             WHERE $whereClause",
            $params
        );

        $limitClause = "";
        if (!$exportAll) {
            $offset = ($page - 1) * $perPage;
            $limitClause = "LIMIT $perPage OFFSET $offset";
        }

        $query = "SELECT tp.id, tp.no_pesanan, tp.anggota_id, tp.total_nominal, tp.metode_pembayaran, 
                         tp.rekening_simpanan_id, tp.status, tp.catatan, tp.tgl_pesanan, tp.tgl_selesai,
                         a.no_anggota, a.nama as nama_anggota, a.telepon as no_hp,
                         COUNT(tpd.id) as total_items,
                         GROUP_CONCAT(CONCAT(tpd.nama_produk, ' (', tpd.qty, ')') SEPARATOR ', ') as ringkasan_items
                  FROM toko_pesanan tp
                  JOIN anggota a ON tp.anggota_id = a.id
                  LEFT JOIN toko_pesanan_detail tpd ON tp.id = tpd.pesanan_id
                  WHERE $whereClause
                  GROUP BY tp.id
                  ORDER BY tp.id DESC
                  $limitClause";

        $rows = $this->db->fetchAll($query, $params);

        // Format data
        foreach ($rows as &$r) {
            $r['id'] = (int) $r['id'];
            $r['total_nominal'] = (float) $r['total_nominal'];
            $r['total_items'] = (int) $r['total_items'];
        }
        unset($r);

        // Koperasi Info
        $settRows = $this->db->fetchAll("SELECT setting_key, setting_value FROM app_settings");
        $sett = [];
        foreach ($settRows as $sr) {
            $sett[$sr['setting_key']] = $sr['setting_value'];
        }

        successResponse([
            'stats' => $stats,
            'koperasi' => [
                'nama' => $sett['app_name'] ?? 'Koperasi Simpan Pinjam',
                'alamat' => $sett['address'] ?? 'Kantor Pusat Koperasi',
                'telepon' => $sett['phone'] ?? '-'
            ],
            'pagination' => [
                'total' => $totalRows,
                'page' => $page,
                'per_page' => $perPage,
                'total_pages' => $exportAll ? 1 : ceil($totalRows / $perPage)
            ],
            'items' => $rows
        ]);
    }

    // [GET] /api/toko-pesanan/{id}
    public function show($id)
    {
        $this->checkAccess();

        $query = "SELECT tp.*, a.no_anggota, a.nama as nama_anggota, a.telepon as no_hp, a.alamat,
                         rs.no_rekening as nomor_rekening, rs.saldo as sisa_saldo_sukarela
                  FROM toko_pesanan tp
                  JOIN anggota a ON tp.anggota_id = a.id
                  LEFT JOIN rekening_simpanan rs ON tp.rekening_simpanan_id = rs.id
                  WHERE tp.id = ? LIMIT 1";

        $order = $this->db->fetch($query, [$id]);
        if (!$order) {
            errorResponse('Data pesanan tidak ditemukan', 404);
        }

        $order['id'] = (int) $order['id'];
        $order['total_nominal'] = (float) $order['total_nominal'];

        // Ambil item detail pesanan
        $items = $this->db->fetchAll(
            "SELECT tpd.id, tpd.produk_id, tpd.nama_produk, tpd.harga_satuan, tpd.qty, tpd.subtotal,
                    tp.satuan, tp.kode_produk, tp.gambar
             FROM toko_pesanan_detail tpd
             LEFT JOIN toko_produk tp ON tpd.produk_id = tp.id
             WHERE tpd.pesanan_id = ?
             ORDER BY tpd.id ASC",
            [$id]
        );

        foreach ($items as &$it) {
            $it['id'] = (int) $it['id'];
            $it['produk_id'] = (int) $it['produk_id'];
            $it['harga_satuan'] = (float) $it['harga_satuan'];
            $it['qty'] = (int) $it['qty'];
            $it['subtotal'] = (float) $it['subtotal'];
        }
        unset($it);

        $order['items'] = $items;

        successResponse($order);
    }

    // [POST/PUT] /api/toko-pesanan/{id}/status
    public function updateStatus($id)
    {
        $this->checkAccess();

        $order = $this->db->fetch("SELECT * FROM toko_pesanan WHERE id = ? LIMIT 1", [$id]);
        if (!$order) {
            errorResponse('Pesanan tidak ditemukan', 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $newStatus = trim($input['status'] ?? '');
        $alasan = trim($input['alasan'] ?? '');

        $validStatuses = ['pending', 'diproses', 'siap_diambil', 'selesai', 'dibatalkan'];
        if (!in_array($newStatus, $validStatuses)) {
            errorResponse('Status tidak valid. Pilihan: pending, diproses, siap_diambil, selesai, dibatalkan.');
        }

        if ($order['status'] === $newStatus) {
            successResponse(null, 'Status pesanan tidak berubah.');
        }

        $this->db->beginTransaction();
        try {
            $tglSelesai = ($newStatus === 'selesai') ? date('Y-m-d H:i:s') : $order['tgl_selesai'];

            // JIKA STATUS DIUBAH MENJADI DIBATALKAN: REFUND SALDO & KEMBALIKAN STOK
            if ($newStatus === 'dibatalkan' && $order['status'] !== 'dibatalkan') {
                // 1. Ambil detail produk untuk kembalikan stok
                $items = $this->db->fetchAll("SELECT produk_id, qty FROM toko_pesanan_detail WHERE pesanan_id = ?", [$id]);
                foreach ($items as $it) {
                    $this->db->execute(
                        "UPDATE toko_produk SET stok = stok + ? WHERE id = ?",
                        [$it['qty'], $it['produk_id']]
                    );
                }

                // 2. Refund Saldo Simpanan Sukarela jika dipotong sebelumnya
                if ($order['metode_pembayaran'] === 'sukarela' && !empty($order['rekening_simpanan_id'])) {
                    $this->db->execute(
                        "UPDATE rekening_simpanan SET saldo = saldo + ? WHERE id = ?",
                        [$order['total_nominal'], $order['rekening_simpanan_id']]
                    );
                }
            }

            // Catatan pembatalan jika ada
            $catatan = $order['catatan'];
            if ($newStatus === 'dibatalkan' && !empty($alasan)) {
                $catatan = ($catatan ? $catatan . ' | ' : '') . "[Batal: $alasan]";
            }

            $this->db->execute(
                "UPDATE toko_pesanan SET status = ?, tgl_selesai = ?, catatan = ? WHERE id = ?",
                [$newStatus, $tglSelesai, $catatan, $id]
            );

            if (function_exists('logActivity')) {
                logActivity('update', 'toko_pesanan', $id, [
                    'status_lama' => $order['status']
                ], [
                    'status_baru' => $newStatus,
                    'no_pesanan' => $order['no_pesanan'],
                    'alasan' => $alasan
                ]);
            }

            $this->db->commit();
            successResponse(['id' => $id, 'status' => $newStatus], "Status pesanan {$order['no_pesanan']} berhasil diubah menjadi: " . strtoupper($newStatus));
        } catch (Exception $e) {
            $this->db->rollBack();
            errorResponse('Gagal memperbarui status: ' . $e->getMessage(), 500);
        }
    }

    // [GET] /api/toko-pesanan/{id}/struk
    public function getStruk($id)
    {
        $this->checkAccess();

        $order = $this->db->fetch(
            "SELECT tp.*, a.no_anggota, a.nama as nama_anggota, a.telepon as no_hp 
             FROM toko_pesanan tp 
             JOIN anggota a ON tp.anggota_id = a.id 
             WHERE tp.id = ? LIMIT 1",
            [$id]
        );

        if (!$order) {
            errorResponse('Pesanan tidak ditemukan', 404);
        }

        $items = $this->db->fetchAll(
            "SELECT nama_produk, harga_satuan, qty, subtotal 
             FROM toko_pesanan_detail 
             WHERE pesanan_id = ?",
            [$id]
        );

        $settRows = $this->db->fetchAll("SELECT setting_key, setting_value FROM app_settings");
        $sett = [];
        foreach ($settRows as $sr) {
            $sett[$sr['setting_key']] = $sr['setting_value'];
        }

        successResponse([
            'order' => $order,
            'items' => $items,
            'koperasi' => [
                'nama' => $sett['app_name'] ?? 'KOPERASI SIMPAN PINJAM',
                'alamat' => $sett['address'] ?? 'Kantor Pusat Koperasi',
                'telepon' => $sett['phone'] ?? '-',
                'kasir' => $_SESSION['nama_lengkap'] ?? 'Petugas Kasir'
            ]
        ]);
    }
}

// Router dispatcher for TokoAdminController
$controller = new TokoAdminController();
$curId = $id ?? ($segments[1] ?? ($_GET['id'] ?? null));
$curAction = $action ?? ($segments[2] ?? null);
$curMethod = $method ?? $_SERVER['REQUEST_METHOD'];

if ($curMethod === 'GET') {
    if ($curAction === 'struk' && $curId) {
        $controller->getStruk((int) $curId);
    } elseif ($curId && is_numeric($curId)) {
        $controller->show((int) $curId);
    } else {
        $controller->index();
    }
} elseif ($curMethod === 'POST' || $curMethod === 'PUT') {
    if ($curId) {
        $controller->updateStatus((int) $curId);
    } else {
        errorResponse('ID pesanan diperlukan untuk mengubah status', 400);
    }
} else {
    errorResponse('Method not allowed', 405);
}
