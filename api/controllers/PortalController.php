<?php
// Portal Controller (for member access)
// Portal uses its own session-based auth separate from admin
$db = Database::getInstance();

// Portal auth check
function portalAuthCheck()
{
    if (!isset($_SESSION['portal_anggota_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Silakan login terlebih dahulu']);
        exit;
    }
    return $_SESSION['portal_anggota_id'];
}

switch ($id) {
    case 'login':
        if ($method !== 'POST')
            errorResponse('Method not allowed', 405);
        $noAnggota = $params['no_anggota'] ?? '';
        $password = $params['password'] ?? '';
        
        // Auto-format "7" or "0007" to "AGT-0007" and handle lowercase
        $noAnggota = trim($noAnggota);
        if (preg_match('/^\d+$/', $noAnggota)) {
            $noAnggota = 'AGT-' . str_pad($noAnggota, 4, '0', STR_PAD_LEFT);
        } else {
            $noAnggota = strtoupper($noAnggota);
        }

        if (empty($noAnggota) || empty($password))
            errorResponse('No. anggota dan password wajib diisi');

        // Authenticate against users table
        $user = $db->fetch(
            "SELECT u.id as user_id, u.password as user_password, u.anggota_id, 
                    a.no_anggota, a.nama as anggota_nama, a.status as anggota_status
             FROM users u
             JOIN anggota a ON u.anggota_id = a.id
             WHERE u.username = ? AND u.is_active = 1",
            [$noAnggota]
        );

        if (!$user) {
            // Cannot log to specific member as user not found
            errorResponse('No. anggota atau password salah', 401);
        }

        if (!password_verify($password, $user['user_password'])) {
            logPortalActivity('Gagal Login (Password Salah)', $user['anggota_id']);
            errorResponse('No. anggota atau password salah', 401);
        }

        if ($user['anggota_status'] !== 'aktif') {
            logPortalActivity('Gagal Login (Status Tidak Aktif)', $user['anggota_id']);
            errorResponse('Status anggota tidak aktif', 403);
        }

        $_SESSION['portal_user_id'] = $user['user_id'];
        $_SESSION['portal_anggota_id'] = $user['anggota_id'];
        $_SESSION['portal_anggota_nama'] = $user['anggota_nama'];
        $_SESSION['portal_no_anggota'] = $user['no_anggota'];

        logPortalActivity('Login ke Portal', $user['anggota_id']);

        $token = getCsrfToken();
        successResponse([
            'anggota' => [
                'id' => $user['anggota_id'],
                'nama' => $user['anggota_nama'],
                'no_anggota' => $user['no_anggota']
            ],
            'csrf_token' => $token
        ], 'Login berhasil');
        break;

    case 'logout':
        logPortalActivity('Logout dari Portal');
        unset($_SESSION['portal_anggota_id'], $_SESSION['portal_anggota_nama'], $_SESSION['portal_no_anggota']);
        successResponse(null, 'Logout berhasil');
        break;

    case 'pengumuman':
        portalAuthCheck();
        $redis = RedisManager::getInstance();
        $cacheKey = 'portal_pengumuman';
        $cached = $redis->get($cacheKey);
        if ($cached) {
            successResponse($cached);
        }

        $pengumuman = $db->fetchAll(
            "SELECT id, judul, konten, tipe, created_at 
             FROM pengumuman 
             WHERE is_active = 1 
             ORDER BY created_at DESC"
        );
        $redis->set($cacheKey, $pengumuman, 3600);
        successResponse($pengumuman);
        break;

    case 'me':
        $anggotaId = portalAuthCheck();
        $anggota = $db->fetch("SELECT id, no_anggota, nama, telepon, email, created_at FROM anggota WHERE id = ?", [$anggotaId]);
        if (!$anggota)
            errorResponse('Anggota tidak ditemukan');

        // Fetch PWA Name from settings
        $pwaName = $db->fetch("SELECT setting_value FROM app_settings WHERE setting_key = 'pwa_name'")['setting_value'] ?? 'Portal Anggota Koperasi';

        $token = getCsrfToken();
        successResponse([
            'anggota' => $anggota,
            'pwa_name' => $pwaName,
            'csrf_token' => $token
        ]);
        break;

    case 'saldo':
        $anggotaId = portalAuthCheck();
        $redis = RedisManager::getInstance();
        $cacheKey = "portal_saldo_{$anggotaId}";
        $cached = $redis->get($cacheKey);
        if ($cached) {
            successResponse($cached);
        }

        $saldo = $db->fetchAll(
            "SELECT js.id, js.nama, js.kode,
                COALESCE(rs.saldo, 0) as saldo,
                rs.no_rekening,
                rs.tgl_buka,
                rs.status as status_rekening
             FROM jenis_simpanan js
             LEFT JOIN rekening_simpanan rs ON js.id = rs.jenis_simpanan_id AND rs.anggota_id = ?
             WHERE js.is_active = 1
             ORDER BY js.kode",
            [$anggotaId]
        );
        logPortalActivity('Cek Saldo Simpanan');
        $redis->set($cacheKey, $saldo, 3600);
        successResponse($saldo);
        break;

    case 'mutasi':
        $anggotaId = portalAuthCheck();
        $dari = $params['dari'] ?? date('Y-m-01');
        $sampai = $params['sampai'] ?? date('Y-m-d');

        $data = $db->fetchAll(
            "SELECT s.no_transaksi, s.tgl_transaksi, js.nama as jenis_simpanan,
                    kt.nama as nama_transaksi, kt.kode as kode_transaksi, kt.dk,
                    s.jumlah, s.saldo_sesudah
             FROM simpanan s
             JOIN jenis_simpanan js ON s.jenis_simpanan_id = js.id
             JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
             WHERE s.anggota_id = ? AND s.tgl_transaksi BETWEEN ? AND ?
             ORDER BY s.tgl_transaksi DESC, s.id DESC
             LIMIT 50",
            [$anggotaId, $dari, $sampai]
        );
        logPortalActivity('Cek Mutasi Simpanan');
        successResponse($data);
        break;

    case 'pinjaman':
        $anggotaId = portalAuthCheck();
        $redis = RedisManager::getInstance();
        $cacheKey = "portal_loan_{$anggotaId}";
        $cached = $redis->get($cacheKey);
        if ($cached) {
            successResponse($cached);
        }

        $data = $db->fetchAll(
            "SELECT p.id, p.no_pinjaman, p.jumlah, p.tenor, p.bunga_persen, p.total_bayar,
                    p.sisa_pinjaman, p.status, p.tgl_pengajuan, p.tgl_pencairan, p.keterangan,
                    jp.nama as jenis_pinjaman
             FROM pinjaman p JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
             WHERE p.anggota_id = ? ORDER BY p.tgl_pengajuan DESC",
            [$anggotaId]
        );
        $redis->set($cacheKey, $data, 3600);
        successResponse($data);
        break;

    case 'angsuran':
        // GET /portal/angsuran?pinjaman_id=xxx
        $anggotaId = portalAuthCheck();
        $pinjamanId = $params['pinjaman_id'] ?? null;
        if (!$pinjamanId)
            errorResponse('pinjaman_id diperlukan', 400);
        // Pastikan pinjaman milik anggota ini
        $own = $db->fetch("SELECT id FROM pinjaman WHERE id = ? AND anggota_id = ?", [$pinjamanId, $anggotaId]);
        if (!$own)
            errorResponse('Akses ditolak', 403);
        $angsuranList = $db->fetchAll(
            "SELECT angsuran_ke, tgl_jatuh_tempo, tgl_bayar, pokok, bunga, denda, total, status
             FROM angsuran WHERE pinjaman_id = ? ORDER BY angsuran_ke ASC",
            [$pinjamanId]
        );
        successResponse($angsuranList);
        break;

    case 'angsuran-upcoming':
        // GET /portal/angsuran-upcoming — angsuran jatuh tempo dalam 7 hari ke depan
        $anggotaId = portalAuthCheck();
        $today = date('Y-m-d');
        $sevenDaysLater = date('Y-m-d', strtotime('+7 days'));
        $upcoming = $db->fetchAll(
            "SELECT a.angsuran_ke, a.tgl_jatuh_tempo, a.total, a.status, a.denda,
                    p.no_pinjaman, jp.nama as jenis_pinjaman,
                    DATEDIFF(a.tgl_jatuh_tempo, ?) as hari_lagi
             FROM angsuran a
             JOIN pinjaman p ON a.pinjaman_id = p.id
             JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
             WHERE p.anggota_id = ?
               AND a.status NOT IN ('lunas')
               AND a.tgl_jatuh_tempo BETWEEN ? AND ?
             ORDER BY a.tgl_jatuh_tempo ASC",
            [$today, $anggotaId, $today, $sevenDaysLater]
        );
        successResponse($upcoming);
        break;

    case 'notifications':
        $anggotaId = portalAuthCheck();
        $redis = RedisManager::getInstance();
        $cacheKey = "portal_notif_{$anggotaId}";
        $cached = $redis->get($cacheKey);
        if ($cached) {
            successResponse($cached);
        }

        $notifications = [];

        // 1. Upcoming Loan Installments (next 7 days)
        $upcoming = $db->fetchAll(
            "SELECT an.id, an.tgl_jatuh_tempo, an.total, jp.nama as jenis_pinjaman, p.no_pinjaman,
                    DATEDIFF(an.tgl_jatuh_tempo, CURDATE()) as hari_lagi
             FROM angsuran an
             JOIN pinjaman p ON an.pinjaman_id = p.id
             JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
             WHERE p.anggota_id = ? AND an.status = 'belum' 
             AND an.tgl_jatuh_tempo <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
             ORDER BY an.tgl_jatuh_tempo ASC",
            [$anggotaId]
        );

        foreach ($upcoming as $u) {
            $hariLagi = (int) $u['hari_lagi'];
            $msg = ($hariLagi == 0) ? "Angsuran jatuh tempo HARI INI!" : "Angsuran jatuh tempo dalam $hariLagi hari.";
            $notifications[] = [
                'id' => 'loan_' . $u['id'],
                'type' => 'loan',
                'title' => 'Tagihan Pinjaman',
                'message' => $msg,
                'sub_message' => $u['jenis_pinjaman'] . " (" . $u['no_pinjaman'] . ") Rp " . number_format($u['total'], 0, ',', '.'),
                'date' => $u['tgl_jatuh_tempo'],
                'icon' => 'bi-cash-stack',
                'color' => 'text-amber-500',
                'bg' => 'bg-amber-50',
                'raw_date' => $u['tgl_jatuh_tempo'] . ' 00:00:00'
            ];
        }

        // 2. Recent Savings (last 3 days)
        $recentSavings = $db->fetchAll(
            "SELECT s.id, s.tgl_transaksi, s.jumlah, js.nama as jenis_simpanan, kt.nama as nama_trx, s.created_at
             FROM simpanan s
             JOIN jenis_simpanan js ON s.jenis_simpanan_id = js.id
             JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
             WHERE s.anggota_id = ? AND s.tgl_transaksi >= DATE_SUB(CURDATE(), INTERVAL 3 DAY)
             AND kt.dk = 'D'
             ORDER BY s.tgl_transaksi DESC, s.id DESC",
            [$anggotaId]
        );

        foreach ($recentSavings as $s) {
            $notifications[] = [
                'id' => 'savings_' . $s['id'],
                'type' => 'savings',
                'title' => 'Uang Masuk',
                'message' => "Setoran " . $s['jenis_simpanan'] . " berhasil.",
                'sub_message' => "Rp " . number_format($s['jumlah'], 0, ',', '.') . " pada " . date('d/m/Y', strtotime($s['tgl_transaksi'])),
                'date' => $s['tgl_transaksi'],
                'icon' => 'bi-wallet2',
                'color' => 'text-emerald-500',
                'bg' => 'bg-emerald-50',
                'raw_date' => $s['created_at'] ?: ($s['tgl_transaksi'] . ' 00:00:00')
            ];
        }

        // Sort by date desc
        usort($notifications, function ($a, $b) {
            return strcmp($b['raw_date'], $a['raw_date']);
        });

        $redis->set($cacheKey, $notifications, 3600);
        successResponse($notifications);
        break;

    case 'mutasi-per-jenis':
        // GET /portal/mutasi-per-jenis?jenis_id=xxx&bulan=xx&tahun=xxxx&page=x
        $anggotaId = portalAuthCheck();
        $jenisId = $params['jenis_id'] ?? null;
        if (!$jenisId)
            errorResponse('jenis_id diperlukan', 400);

        $bulan = $params['bulan'] ?? null;
        $tahun = $params['tahun'] ?? null;
        $page = (int) ($params['page'] ?? 1);
        $limit = 20;
        $offset = ($page - 1) * $limit;

        $sql = "SELECT s.no_transaksi, s.tgl_transaksi, js.nama as jenis_simpanan,
                    kt.nama as nama_transaksi, kt.kode as kode_transaksi, kt.dk,
                    s.jumlah, s.saldo_sebelum, s.saldo_sesudah, s.keterangan
             FROM simpanan s
             JOIN jenis_simpanan js ON s.jenis_simpanan_id = js.id
             JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
             WHERE s.anggota_id = ? AND s.jenis_simpanan_id = ?";
        
        $sqlParams = [$anggotaId, $jenisId];

        if ($bulan && $bulan !== 'all') {
            $sql .= " AND MONTH(s.tgl_transaksi) = ?";
            $sqlParams[] = $bulan;
        }

        if ($tahun && $tahun !== 'all') {
            $sql .= " AND YEAR(s.tgl_transaksi) = ?";
            $sqlParams[] = $tahun;
        }

        $sql .= " ORDER BY s.tgl_transaksi DESC, s.id DESC LIMIT $limit OFFSET $offset";
        
        $data = $db->fetchAll($sql, $sqlParams);
        successResponse($data);
        break;

    case 'change-password':
        if ($method !== 'POST') {
            errorResponse('Method not allowed', 405);
        }
        $userId = $_SESSION['portal_user_id'] ?? null;
        if (!$userId)
            errorResponse('Silakan login terlebih dahulu', 401);

        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($input['old_password']) || empty($input['new_password'])) {
            errorResponse('Password lama dan baru wajib diisi.', 400);
        }

        // Verify old password from users table
        $user = $db->fetch("SELECT password FROM users WHERE id = ?", [$userId]);
        if (!$user || !password_verify($input['old_password'], $user['password'])) {
            errorResponse('Password saat ini salah.', 401);
        }

        if (strlen($input['new_password']) < 6) {
            errorResponse('Password baru minimal 6 karakter.', 400);
        }

        // Update password in users table
        $newPasswordHash = password_hash($input['new_password'], PASSWORD_DEFAULT);
        $db->execute("UPDATE users SET password = ? WHERE id = ?", [$newPasswordHash, $userId]);

        logPortalActivity('Mengubah Password Portal');

        successResponse(['message' => 'Password berhasil diubah']);
        break;

    case 'jenis-pinjaman':
        $anggotaId = portalAuthCheck();
        $jenis = $db->fetchAll(
            "SELECT id, nama, max_jumlah as maksimal_pinjaman, bunga_persen, max_tenor as tenor_maksimal, keterangan 
             FROM jenis_pinjaman WHERE is_active = 1"
        );
        successResponse($jenis);
        break;

    case 'simulate-loan':
        $anggotaId = portalAuthCheck();
        $input = json_decode(file_get_contents('php://input'), true);

        $jenisId = $input['jenis_pinjaman_id'];
        $jumlahStr = preg_replace('/[^0-9]/', '', $input['jumlah']);
        $jumlah = (float) $jumlahStr;
        $tenor = (int) $input['tenor'];

        if (!$jenisId || !$jumlah || !$tenor || $tenor < 1) {
            errorResponse('Data simulasi tidak lengkap.', 400);
        }

        // Check for active/pending loan OF THE SAME TYPE
        $existingLoan = $db->fetch(
            "SELECT no_pinjaman, jumlah, tenor, status, sisa_pinjaman 
             FROM pinjaman 
             WHERE anggota_id = ? AND jenis_pinjaman_id = ? AND status IN ('pending', 'cair')
             LIMIT 1",
            [$anggotaId, $jenisId]
        );

        if ($existingLoan) {
            successResponse([
                'has_existing' => true,
                'existing' => [
                    'no_pinjaman' => $existingLoan['no_pinjaman'],
                    'jumlah' => (float)$existingLoan['jumlah'],
                    'tenor' => (int)$existingLoan['tenor'],
                    'status' => $existingLoan['status'],
                    'sisa' => (float)$existingLoan['sisa_pinjaman']
                ]
            ], 'Anda sudah memiliki pinjaman aktif atau pengajuan pending untuk jenis ini.');
        }

        $jenisData = $db->fetch(
            "SELECT bunga_persen, max_jumlah as maksimal_pinjaman, max_tenor as tenor_maksimal 
             FROM jenis_pinjaman WHERE id = ?",
            [$jenisId]
        );

        // Kalkulasi Simulasi Angsuran Flat (Bunga per bulan dari DB)
        $persenBungaBulanan = (float) $jenisData['bunga_persen'];
        $pokokBulan = $jumlah / $tenor;
        $bungaBulan = $jumlah * ($persenBungaBulanan / 100); 

        $totalAngsuranBulan = $pokokBulan + $bungaBulan;
        $totalBungaAll = $bungaBulan * $tenor;
        $totalBayarAll = $jumlah + $totalBungaAll;

        successResponse([
            'estimasi_pokok' => round($pokokBulan),
            'estimasi_bunga' => round($bungaBulan),
            'estimasi_angsuran' => round($totalAngsuranBulan),
            'total_bunga' => round($totalBungaAll),
            'total_bayar' => round($totalBayarAll)
        ]);
        break;

    case 'submit-loan':
        if ($method !== 'POST') {
            errorResponse('Method not allowed', 405);
        }
        $anggotaId = portalAuthCheck();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];

        if (empty($input['jenis_pinjaman_id']) || empty($input['jumlah']) || empty($input['tenor'])) {
            errorResponse('Data pengajuan tidak lengkap.', 400);
        }

        $jenisId = $input['jenis_pinjaman_id'];
        $jumlahStr = preg_replace('/[^0-9]/', '', $input['jumlah']);
        $jumlah = (float) $jumlahStr;
        $tenor = (int) $input['tenor'];

        // Cek jika ada pinjaman aktif/pending dengan jenis yang sama
        $activeLoansCount = $db->fetch(
            "SELECT COUNT(*) as count FROM pinjaman WHERE anggota_id = ? AND jenis_pinjaman_id = ? AND status IN ('pending', 'cair')",
            [$anggotaId, $jenisId]
        )['count'];

        if ($activeLoansCount > 0) {
            errorResponse('Anda sudah memiliki pinjaman aktif atau pengajuan pending untuk jenis pinjaman ini.', 400);
        }

        $jenisId = $input['jenis_pinjaman_id'];
        $jumlahStr = preg_replace('/[^0-9]/', '', $input['jumlah']);
        $jumlah = (float) $jumlahStr;
        $tenor = (int) $input['tenor'];

        $jenisData = $db->fetch("SELECT kode_numerik, max_jumlah, max_tenor, bunga_persen FROM jenis_pinjaman WHERE id = ?", [$jenisId]);
        if (!$jenisData)
            errorResponse('Jenis pinjaman tidak valid.');

        // Generate No Pinjaman logic
        $yy = date('y');
        $jpNum = str_pad($jenisData['kode_numerik'] ?? '00', 2, '0', STR_PAD_LEFT);
        $m = $db->fetch("SELECT no_anggota FROM anggota WHERE id = ?", [$anggotaId]);
        preg_match('/\d+/', $m['no_anggota'], $matches);
        $aaaaaaa = str_pad($matches[0] ?? '0', 7, '0', STR_PAD_LEFT);
        $count = $db->count("SELECT COUNT(*) FROM pinjaman WHERE anggota_id = ? AND jenis_pinjaman_id = ?", [$anggotaId, $jenisId]);
        $nn = str_pad($count + 1, 2, '0', STR_PAD_LEFT);
        $noPinjaman = "$yy.$jpNum.$aaaaaaa.$nn";

        $bungaPersen = (float)$jenisData['bunga_persen'];
        $totalBunga = $jumlah * ($bungaPersen / 100) * $tenor;
        $totalBayar = $jumlah + $totalBunga;

        $db->execute(
            "INSERT INTO pinjaman (no_pinjaman, anggota_id, jenis_pinjaman_id, jumlah, tenor, bunga_persen, total_bunga, total_bayar, sisa_pinjaman, status, keterangan, tgl_pengajuan, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), NOW())",
            [$noPinjaman, $anggotaId, $jenisId, $jumlah, $tenor, $bungaPersen, $totalBunga, $totalBayar, $jumlah, 'pending', 'Pengajuan dari Mobile Portal']
        );

        logPortalActivity('Mengajukan Pinjaman: ' . $noPinjaman);
        
        // Clear portal cache for this member
        $redis = RedisManager::getInstance();
        $redis->delete("portal_loan_{$anggotaId}");
        $redis->delete("portal_notif_{$anggotaId}");

        successResponse(null, 'Pengajuan pinjaman berhasil dikirim!');
        break;

    case 'laporan-genggaman':
        $anggotaId = portalAuthCheck();
        $redis = RedisManager::getInstance();
        $cacheKey = "portal_genggaman_{$anggotaId}";
        $cached = $redis->get($cacheKey);
        if ($cached) {
            successResponse($cached);
        }

        // 1. Total Simpanan
        $simpananTotal = $db->fetch(
            "SELECT 
                COALESCE(SUM(CASE WHEN k.dk = 'D' THEN s.jumlah ELSE 0 END), 0) - 
                COALESCE(SUM(CASE WHEN k.dk = 'K' THEN s.jumlah ELSE 0 END), 0) as total 
             FROM simpanan s
             JOIN kode_transaksi_simpanan k ON s.kode_transaksi_id = k.id
             WHERE s.anggota_id = ?",
            [$anggotaId]
        )['total'] ?? 0;

        // 2. Total Kewajiban Pinjaman (Sisa Pokok + Sisa Bunga dari pinjaman aktif)
        // Hitung total pinjaman cair
        $kewajiban = $db->fetch(
            "SELECT 
                COALESCE(SUM(jumlah), 0) as total_pinjaman,
                COALESCE(SUM(total_bunga), 0) as total_bunga
             FROM pinjaman 
             WHERE anggota_id = ? AND status = 'cair'",
            [$anggotaId]
        );

        // Hitung total nilai yang sudah dibayar di angsuran
        $dibayar = $db->fetch(
            "SELECT 
                COALESCE(SUM(total), 0) as total_bayar
             FROM angsuran 
             WHERE pinjaman_id IN (SELECT id FROM pinjaman WHERE anggota_id = ? AND status = 'cair') AND status = 'lunas'",
            [$anggotaId]
        )['total_bayar'] ?? 0;

        $totalHutang = ($kewajiban['total_pinjaman'] + $kewajiban['total_bunga']) - $dibayar;
        if ($totalHutang < 0)
            $totalHutang = 0;

        // 3. Estimasi SHU (Contoh sederhana: total SHU yang sudah pernah diterima)
        // Jika tabel `shu_detail` belum terintegrasi utuh, ini opsional.
        $totalSHU = 0;
        try {
            $totalSHU = $db->fetch("SELECT COALESCE(SUM(total_shu_diterima), 0) as total FROM shu_detail WHERE anggota_id = ? AND status = 'proses'", [$anggotaId])['total'] ?? 0;
        } catch (Exception $e) { /* Abaikan jika tabel blm ada */
        }

        $response = [
            'total_aset' => (float) $simpananTotal + (float) $totalSHU,
            'rincian_aset' => [
                'simpanan' => (float) $simpananTotal,
                'shu' => (float) $totalSHU
            ],
            'total_kewajiban' => (float) $totalHutang,
            'last_sync' => date('Y-m-d H:i:s')
        ];

        $redis->set($cacheKey, $response, 3600);
        successResponse($response);
        break;

    default:
        errorResponse('Portal route tidak ditemukan', 404);
}
