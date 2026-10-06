<?php
// Portal Controller (for member access)
// Portal uses its own session-based auth separate from admin
$db = Database::getInstance();

// Portal auth check
function portalAuthCheck()
{
    $id = $_SESSION['portal_anggota_id'] ?? null;
    if (!$id) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Sesi habis, silakan login kembali']);
        exit;
    }
    return $id;
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

        $pwaName = $db->fetch("SELECT setting_value FROM app_settings WHERE setting_key = 'pwa_name'")['setting_value'] ?? 'Portal Anggota Koperasi';
        $logoUrl = $db->fetch("SELECT setting_value FROM app_settings WHERE setting_key = 'logo_url'")['setting_value'] ?? '';

        $token = getCsrfToken();
        successResponse([
            'anggota' => [
                'id' => $user['anggota_id'],
                'nama' => $user['anggota_nama'],
                'no_anggota' => $user['no_anggota']
            ],
            'pwa_name' => $pwaName,
            'logo_url' => $logoUrl,
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

        // Fetch PWA branding from settings
        $branding = $db->fetchAll("SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('pwa_name', 'logo_url')");
        $settings = [];
        foreach ($branding as $b) {
            $settings[$b['setting_key']] = $b['setting_value'];
        }
        
        $pwaName = $settings['pwa_name'] ?? 'Portal Anggota Koperasi';
        $logoUrl = $settings['logo_url'] ?? '';

        $token = getCsrfToken();
        successResponse([
            'anggota' => $anggota,
            'pwa_name' => $pwaName,
            'logo_url' => $logoUrl,
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

        // Ambil info saldo simpanan sukarela anggota
        $jenisSS = $db->fetch("SELECT id, nama FROM jenis_simpanan WHERE kode = 'SS' OR LOWER(nama) LIKE '%sukarela%' LIMIT 1");
        $saldoSukarela = 0;
        $rekeningSS = null;
        if ($jenisSS) {
            $rekeningSS = $db->fetch(
                "SELECT id, no_rekening, saldo FROM rekening_simpanan WHERE anggota_id = ? AND jenis_simpanan_id = ? AND status = 'aktif' LIMIT 1",
                [$anggotaId, $jenisSS['id']]
            );
            if ($rekeningSS) {
                $saldoSukarela = (float) $rekeningSS['saldo'];
            } else {
                $sumSS = $db->fetch(
                    "SELECT COALESCE(SUM(CASE WHEN kt.dk = 'D' THEN s.jumlah ELSE -s.jumlah END), 0) as saldo
                     FROM simpanan s
                     JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                     WHERE s.anggota_id = ? AND s.jenis_simpanan_id = ?",
                    [$anggotaId, $jenisSS['id']]
                );
                $saldoSukarela = (float) ($sumSS['saldo'] ?? 0);
            }
        }

        $angsuranList = $db->fetchAll(
            "SELECT a.id, a.angsuran_ke, a.tgl_jatuh_tempo, a.tgl_bayar, a.pokok, a.bunga, a.denda, a.total, a.status,
                    pa.status as status_pengajuan, pa.id as pengajuan_id, pa.no_pengajuan, pa.tgl_pengajuan, pa.alasan_penolakan
             FROM angsuran a
             LEFT JOIN pengajuan_angsuran pa ON pa.angsuran_id = a.id AND pa.status = 'pending'
             WHERE a.pinjaman_id = ? ORDER BY a.angsuran_ke ASC",
            [$pinjamanId]
        );

        foreach ($angsuranList as &$item) {
            $item['saldo_sukarela'] = $saldoSukarela;
            $item['has_sukarela'] = ($rekeningSS !== null || $saldoSukarela > 0);
            $item['rekening_sukarela'] = $rekeningSS ? $rekeningSS['no_rekening'] : null;
        }
        unset($item);

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

    case 'tagihan-terdekat':
        $anggotaId = portalAuthCheck();

        // 1. Cari angsuran belum lunas terdekat (termasuk yang telah jatuh tempo/terlambat)
        $tagihan = $db->fetch(
            "SELECT a.id as angsuran_id, a.angsuran_ke, a.tgl_jatuh_tempo, 
                    a.pokok, a.bunga, a.denda, a.total, a.status as status_angsuran,
                    p.id as pinjaman_id, p.no_pinjaman, p.tenor, p.sisa_pinjaman,
                    jp.nama as jenis_pinjaman,
                    DATEDIFF(a.tgl_jatuh_tempo, CURDATE()) as hari_lagi
             FROM angsuran a
             JOIN pinjaman p ON a.pinjaman_id = p.id
             JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
             WHERE p.anggota_id = ?
               AND p.status = 'cair'
               AND a.status NOT IN ('lunas')
             ORDER BY a.tgl_jatuh_tempo ASC, a.id ASC
             LIMIT 1",
            [$anggotaId]
        );

        // 2. Data Simpanan Sukarela anggota untuk opsi autodebet / bayar langsung
        $sukarela = $db->fetch(
            "SELECT rs.id as rekening_id, rs.no_rekening, rs.saldo
             FROM rekening_simpanan rs
             JOIN jenis_simpanan js ON rs.jenis_simpanan_id = js.id
             WHERE rs.anggota_id = ? 
               AND rs.status = 'aktif'
               AND (js.kode = 'SS' OR LOWER(js.nama) LIKE '%sukarela%')
             ORDER BY rs.saldo DESC
             LIMIT 1",
            [$anggotaId]
        );

        $pendingPengajuan = null;
        if ($tagihan) {
            try {
                $pendingPengajuan = $db->fetch(
                    "SELECT id, no_pengajuan, status, tgl_pengajuan 
                     FROM pengajuan_angsuran 
                     WHERE angsuran_id = ? AND status = 'pending'
                     LIMIT 1",
                    [$tagihan['angsuran_id']]
                );
            } catch (Exception $e) {
                // Table might not exist yet if db migration hasn't been run
                $pendingPengajuan = null;
            }
        }

        // Cek apakah anggota memiliki pinjaman berstatus cair sama sekali
        $hasLoan = $db->fetch(
            "SELECT COUNT(*) as cnt FROM pinjaman WHERE anggota_id = ? AND status = 'cair'",
            [$anggotaId]
        );

        successResponse([
            'has_loan' => (int)($hasLoan['cnt'] ?? 0) > 0,
            'tagihan' => $tagihan ?: null,
            'sukarela' => $sukarela ?: null,
            'pending_pengajuan' => $pendingPengajuan ?: null
        ]);
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

        // 3. Pengajuan Angsuran Sukarela Status
        try {
            $recentPengajuan = $db->fetchAll(
                "SELECT pa.id, pa.no_pengajuan, pa.angsuran_ke, pa.total_bayar, pa.status, pa.tgl_pengajuan, pa.tgl_approval, pa.alasan_penolakan, p.no_pinjaman
                 FROM pengajuan_angsuran pa
                 JOIN pinjaman p ON pa.pinjaman_id = p.id
                 WHERE pa.anggota_id = ? AND pa.tgl_pengajuan >= DATE_SUB(NOW(), INTERVAL 14 DAY)
                 ORDER BY pa.id DESC",
                [$anggotaId]
            );

            foreach ($recentPengajuan as $pa) {
                $statusText = $pa['status'] === 'pending' ? 'Sedang Diverifikasi Bendahara' : ($pa['status'] === 'disetujui' ? 'Telah Disetujui & Lunas' : 'Ditolak: ' . ($pa['alasan_penolakan'] ?: '-'));
                $color = $pa['status'] === 'pending' ? 'text-amber-500' : ($pa['status'] === 'disetujui' ? 'text-emerald-500' : 'text-rose-500');
                $bg = $pa['status'] === 'pending' ? 'bg-amber-50' : ($pa['status'] === 'disetujui' ? 'bg-emerald-50' : 'bg-rose-50');
                $icon = $pa['status'] === 'pending' ? 'bi-clock-history' : ($pa['status'] === 'disetujui' ? 'bi-check-circle-fill' : 'bi-x-circle-fill');

                $notifications[] = [
                    'id' => 'pa_' . $pa['id'],
                    'type' => 'angsuran_sukarela',
                    'title' => 'Pengajuan Angsuran ke-' . $pa['angsuran_ke'],
                    'message' => $statusText,
                    'sub_message' => $pa['no_pinjaman'] . " (" . $pa['no_pengajuan'] . ") Rp " . number_format($pa['total_bayar'], 0, ',', '.'),
                    'date' => substr($pa['tgl_pengajuan'], 0, 10),
                    'icon' => $icon,
                    'color' => $color,
                    'bg' => $bg,
                    'raw_date' => $pa['tgl_approval'] ?: $pa['tgl_pengajuan']
                ];
            }
        } catch (Exception $e) {
            // Table might not exist yet if db migration hasn't been run
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

    case 'bayar-angsuran-sukarela':
        if ($method !== 'POST') {
            errorResponse('Method not allowed', 405);
        }
        $anggotaId = portalAuthCheck();
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $pinjamanId = (int) ($input['pinjaman_id'] ?? 0);
        $angsuranId = (int) ($input['angsuran_id'] ?? 0);

        if (!$pinjamanId || !$angsuranId) {
            errorResponse('Data pinjaman dan angsuran tidak lengkap', 400);
        }

        // Pastikan pinjaman milik anggota
        $pinjaman = $db->fetch(
            "SELECT p.id, p.no_pinjaman, p.status, p.sisa_pinjaman, a.nama as anggota_nama, a.no_anggota 
             FROM pinjaman p 
             JOIN anggota a ON p.anggota_id = a.id 
             WHERE p.id = ? AND p.anggota_id = ?",
            [$pinjamanId, $anggotaId]
        );
        if (!$pinjaman || $pinjaman['status'] !== 'cair') {
            errorResponse('Pinjaman tidak valid atau belum dicairkan', 400);
        }

        // Ambil data angsuran
        $angsuran = $db->fetch(
            "SELECT id, angsuran_ke, tgl_jatuh_tempo, pokok, bunga, denda, total, status 
             FROM angsuran 
             WHERE id = ? AND pinjaman_id = ?",
            [$angsuranId, $pinjamanId]
        );
        if (!$angsuran) {
            errorResponse('Data angsuran tidak ditemukan', 404);
        }
        if ($angsuran['status'] === 'lunas') {
            errorResponse('Angsuran ini sudah berstatus lunas', 400);
        }

        // Cek apakah sudah ada pengajuan pending untuk angsuran ini
        $existing = $db->fetch(
            "SELECT id, no_pengajuan FROM pengajuan_angsuran WHERE angsuran_id = ? AND status = 'pending'",
            [$angsuranId]
        );
        if ($existing) {
            errorResponse('Angsuran ini sudah diajukan sebelumnya dan sedang menunggu verifikasi Bendahara (' . $existing['no_pengajuan'] . ')', 400);
        }

        // Cek Saldo Simpanan Sukarela
        $jenisSS = $db->fetch("SELECT id, akun_id, nama FROM jenis_simpanan WHERE kode = 'SS' OR LOWER(nama) LIKE '%sukarela%' LIMIT 1");
        if (!$jenisSS) {
            errorResponse('Jenis Simpanan Sukarela belum terdaftar di sistem', 400);
        }

        $rekSS = $db->fetch(
            "SELECT id, no_rekening, saldo FROM rekening_simpanan WHERE anggota_id = ? AND jenis_simpanan_id = ? AND status = 'aktif' LIMIT 1",
            [$anggotaId, $jenisSS['id']]
        );

        $saldoSukarela = 0;
        if ($rekSS) {
            $saldoSukarela = (float) $rekSS['saldo'];
        } else {
            $sumSS = $db->fetch(
                "SELECT COALESCE(SUM(CASE WHEN kt.dk = 'D' THEN s.jumlah ELSE -s.jumlah END), 0) as saldo
                 FROM simpanan s
                 JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                 WHERE s.anggota_id = ? AND s.jenis_simpanan_id = ?",
                [$anggotaId, $jenisSS['id']]
            );
            $saldoSukarela = (float) ($sumSS['saldo'] ?? 0);
        }

        $totalBayar = (float) $angsuran['total'];
        if ($saldoSukarela < $totalBayar) {
            errorResponse(
                'Saldo Simpanan Sukarela tidak mencukupi. Saldo saat ini: Rp ' . 
                number_format($saldoSukarela, 0, ',', '.') . ', Total tagihan: Rp ' . 
                number_format($totalBayar, 0, ',', '.')
            );
        }

        // Generate No Pengajuan
        $noPengajuan = generateNo('PA', 'pengajuan_angsuran', 'no_pengajuan');

        $db->insert(
            "INSERT INTO pengajuan_angsuran 
             (no_pengajuan, pinjaman_id, angsuran_id, anggota_id, rekening_simpanan_id, angsuran_ke, pokok, bunga, denda, total_bayar, metode_pembayaran, status, catatan, tgl_pengajuan) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sukarela', 'pending', ?, NOW())",
            [
                $noPengajuan,
                $pinjamanId,
                $angsuranId,
                $anggotaId,
                $rekSS ? $rekSS['id'] : null,
                $angsuran['angsuran_ke'],
                $angsuran['pokok'],
                $angsuran['bunga'],
                $angsuran['denda'] ?? 0,
                $totalBayar,
                "Pengajuan bayar angsuran ke-{$angsuran['angsuran_ke']} via Simpanan Sukarela dari Mobile Portal"
            ]
        );

        logPortalActivity("Mengajukan bayar angsuran ke-{$angsuran['angsuran_ke']} pinjaman {$pinjaman['no_pinjaman']} via Sukarela ({$noPengajuan})");

        // Clear redis cache
        $redis = RedisManager::getInstance();
        $redis->delete("portal_loan_{$anggotaId}");
        $redis->delete("portal_notif_{$anggotaId}");

        successResponse([
            'no_pengajuan' => $noPengajuan,
            'angsuran_ke' => $angsuran['angsuran_ke'],
            'total_bayar' => $totalBayar
        ], 'Pengajuan pembayaran angsuran berhasil dikirim. Menunggu verifikasi Bendahara.');
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

    case 'transparansi-kesehatan':
        portalAuthCheck();
        $tahun = date('Y');

        require_once __DIR__ . '/../config/kesehatan_helper.php';
        $kesehatan = getKesehatanKoperasiData($tahun);

        $settRows = $db->fetchAll("SELECT setting_key, setting_value FROM app_settings");
        $sett = [];
        foreach ($settRows as $sr) {
            $sett[$sr['setting_key']] = $sr['setting_value'];
        }

        $predikat = $kesehatan['predikat'];
        $predikatKode = $kesehatan['predikat_kode'];
        $totalSkor = $kesehatan['total_skor'];

        // Klasifikasi style badge & theme berdasarkan predikat resmi
        $badgeClass = 'bg-emerald-500 text-white';
        $badgeLabel = '🟢 SEHAT';
        $bgGradient = 'from-emerald-600 via-teal-600 to-cyan-700';
        $badgeColor = 'bg-emerald-400 text-gray-900';
        $icon = 'bi-shield-check';

        if ($predikatKode === 'cukup') {
            $badgeClass = 'bg-blue-500 text-white';
            $badgeLabel = '🔵 CUKUP SEHAT';
            $bgGradient = 'from-blue-600 via-indigo-600 to-cyan-700';
            $badgeColor = 'bg-blue-400 text-gray-900';
            $icon = 'bi-shield-check';
        } elseif ($predikatKode === 'dalam_pengawasan') {
            $badgeClass = 'bg-amber-500 text-white';
            $badgeLabel = '🟡 DALAM PENGAWASAN';
            $bgGradient = 'from-amber-600 via-orange-600 to-yellow-700';
            $badgeColor = 'bg-amber-400 text-gray-900';
            $icon = 'bi-exclamation-triangle';
        } elseif ($predikatKode === 'pengawasan_khusus') {
            $badgeClass = 'bg-rose-500 text-white';
            $badgeLabel = '🔴 PENGAWASAN KHUSUS';
            $bgGradient = 'from-rose-600 via-red-600 to-pink-700';
            $badgeColor = 'bg-rose-400 text-white';
            $icon = 'bi-shield-exclamation';
        }

        // Format 4 Pilar sesuai output KKPKK
        $pilar = [];
        foreach ($kesehatan['aspek'] as $asp) {
            $statusDesc = '';
            if ($asp['no'] === 1) $statusDesc = $asp['skor'] >= 25 ? 'Tata Kelola Sangat Baik' : 'Tata Kelola Cukup';
            elseif ($asp['no'] === 2) $statusDesc = $asp['skor'] >= 12 ? 'Risiko Rendah (Sehat)' : 'Perlu Pengawasan Risiko';
            elseif ($asp['no'] === 3) $statusDesc = $asp['skor'] >= 30 ? 'Likuid & Efisien' : 'Evaluasi Efisiensi & Biaya';
            elseif ($asp['no'] === 4) $statusDesc = $asp['skor'] >= 12 ? 'Modal Mandiri Kuat' : 'Kecukupan Modal Terpantau';

            $pilar[] = [
                'no' => $asp['no'],
                'nama' => $asp['nama'],
                'bobot' => $asp['bobot'],
                'skor' => $asp['skor'],
                'status' => $statusDesc,
                'indikator' => $asp['indikator'] ?? []
            ];
        }

        $r = $kesehatan['ringkasan'];
        $nplRatio = $r['sisa_pinjaman'] > 0 ? round(($r['npl_nominal'] / $r['sisa_pinjaman']) * 100, 2) : 0;

        $result = [
            'tahun' => $tahun,
            'nama_koperasi' => $sett['app_name'] ?? 'Koperasi Simpan Pinjam',
            'no_badan_hukum' => $sett['badan_hukum'] ?? ($sett['no_badan_hukum'] ?? 'AHU-001248.AH.01.26.TAHUN 2024'),
            'nik_kemenkop' => $sett['nik_koperasi'] ?? ($sett['nik_kemenkop'] ?? '3204051002340001'),
            'kelompok_usaha' => 'KUK 2 (Koperasi Usaha Kecil)',
            'predikat' => $predikat,
            'predikat_kode' => $predikatKode,
            'badge_class' => $badgeClass,
            'badge_label' => $badgeLabel,
            'badge_color' => $badgeColor,
            'bg_gradient' => $bgGradient,
            'icon' => $icon,
            'skor_akhir' => $totalSkor,
            'regulasi' => $kesehatan['regulasi'],
            'pilar' => $pilar,
            'indikator_publik' => [
                'total_anggota' => $r['total_anggota'],
                'total_aset' => $r['total_aset'],
                'modal_sendiri' => $r['modal_sendiri'],
                'total_simpanan' => $r['total_simpanan'],
                'total_pinjaman' => $r['total_pinjaman'],
                'sisa_pinjaman' => $r['sisa_pinjaman'],
                'rasio_npl' => $nplRatio,
                'status_rat' => $kesehatan['aspek'][0]['indikator'][1]['nilai'] ?? 'Tertib Diselenggarakan'
            ]
        ];

        successResponse($result);
        break;

    case 'bantuan-info':
        portalAuthCheck();
        $settRows = $db->fetchAll("SELECT setting_key, setting_value FROM app_settings");
        $sett = [];
        foreach ($settRows as $sr) {
            $sett[$sr['setting_key']] = $sr['setting_value'];
        }

        $info = [
            'nama_koperasi' => $sett['app_name'] ?? 'Koperasi Simpan Pinjam',
            'alamat' => $sett['address'] ?? 'Kantor Pusat Koperasi, Jl. Koperasi No. 1',
            'wa_admin' => $sett['wa_admin'] ?? '6281234567890',
            'wa_pengawas' => $sett['wa_pengawas'] ?? '6281987654321',
            'email' => $sett['email'] ?? 'support@koperasi.id',
            'jam_operasional' => 'Senin – Jumat: 08.00 – 16.00 WIB | Sabtu: 08.00 – 12.00 WIB',
            'faqs' => [
                [
                    'q' => 'Bagaimana cara mengajukan pinjaman lewat portal?',
                    'a' => 'Buka tab Pinjaman atau Menu Cepat "Pinjam", lalu pilih "Ajukan Pinjaman Online". Isi plafon, tenor, keperluan, dan unggah foto dokumen jaminan. Pengajuan akan segera diproses oleh Bagian Kredit.'
                ],
                [
                    'q' => 'Apakah bisa membayar angsuran menggunakan saldo Simpanan Sukarela?',
                    'a' => 'Ya, sangat mudah! Jika Anda memiliki saldo di Simpanan Sukarela, tombol "Bayar via Sukarela" akan aktif pada kartu Tagihan Terdekat di Beranda atau di tab Pinjaman. Pembayaran diproses autodebet setelah disetujui Bendahara.'
                ],
                [
                    'q' => 'Kapan Sisa Hasil Usaha (SHU) dibagikan?',
                    'a' => 'SHU dibagikan setahun sekali setelah disahkannya Laporan Pertanggungjawaban (LPJ) Pengurus pada Rapat Anggota Tahunan (RAT). Besaran SHU dihitung berdasarkan simpanan pokok/wajib dan keaktifan jasa transaksi Anda.'
                ],
                [
                    'q' => 'Bagaimana jika saya ingin menarik saldo Simpanan Sukarela?',
                    'a' => 'Penarikan Simpanan Sukarela dapat dilakukan di kantor kas koperasi atau melalui pengajuan penarikan resmi dengan konfirmasi ke kasir/bendahara.'
                ],
                [
                    'q' => 'Apa peran Badan Pengawas Koperasi?',
                    'a' => 'Badan Pengawas bertugas mengawasi pelaksanaan kebijakan dan pengelolaan koperasi secara independen demi melindungi hak anggota. Anda dapat mengirimkan saran, kritik, atau pengaduan secara langsung ke Pengawas melalui menu Aspirasi Pengawas.'
                ]
            ]
        ];

        successResponse($info);
        break;

    case 'aspirasi':
        $anggotaId = portalAuthCheck();
        if ($method === 'GET') {
            $list = $db->fetchAll(
                "SELECT id, no_tiket, kategori, judul, pesan, is_anonim, status, tanggapan, tgl_tanggapan, created_at 
                 FROM portal_aspirasi 
                 WHERE anggota_id = ? 
                 ORDER BY id DESC",
                [$anggotaId]
            );
            successResponse($list);
        } elseif ($method === 'POST') {
            $kategori = trim($params['kategori'] ?? 'usulan');
            $judul = trim($params['judul'] ?? '');
            $pesan = trim($params['pesan'] ?? '');
            $isAnonim = !empty($params['is_anonim']) ? 1 : 0;

            if (empty($judul) || empty($pesan)) {
                errorResponse('Judul dan isi aspirasi/pengaduan wajib diisi.');
            }

            $user = $db->fetch("SELECT nama FROM anggota WHERE id = ?", [$anggotaId]);
            $namaPengirim = $isAnonim ? 'Anggota (Anonim)' : ($user['nama'] ?? 'Anggota');

            $noTiket = 'ASP-' . date('ymd') . '-' . str_pad((string)rand(100, 999), 3, '0', STR_PAD_LEFT);

            $db->execute(
                "INSERT INTO portal_aspirasi (no_tiket, anggota_id, nama_pengirim, kategori, judul, pesan, is_anonim, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'terkirim')",
                [$noTiket, $anggotaId, $namaPengirim, $kategori, $judul, $pesan, $isAnonim]
            );

            logPortalActivity("Kirim Aspirasi Pengawas ($noTiket)");
            successResponse(['no_tiket' => $noTiket], 'Aspirasi Anda berhasil dikirim ke Dewan Pengawas.');
        } else {
            errorResponse('Method not allowed', 405);
        }
        break;

    case 'retail-produk':
        portalAuthCheck();
        $kategori = $params['kategori'] ?? '';
        $query = "SELECT id, kode_produk, nama_produk, kategori, deskripsi, harga_umum, harga_anggota, stok, satuan, gambar 
                  FROM toko_produk 
                  WHERE is_active = 1";
        $p = [];
        if (!empty($kategori) && $kategori !== 'Semua') {
            $query .= " AND kategori = ?";
            $p[] = $kategori;
        }
        $query .= " ORDER BY id ASC";
        $produk = $db->fetchAll($query, $p);

        // Ambil daftar kategori unik
        $kategoriList = $db->fetchAll("SELECT DISTINCT kategori FROM toko_produk WHERE is_active = 1 ORDER BY kategori ASC");

        successResponse([
            'kategori' => array_merge(['Semua'], array_column($kategoriList, 'kategori')),
            'produk' => $produk
        ]);
        break;

    case 'retail-order':
        $anggotaId = portalAuthCheck();
        if ($method !== 'POST') {
            errorResponse('Method not allowed', 405);
        }

        $items = $params['items'] ?? [];
        $metode = $params['metode_pembayaran'] ?? 'sukarela';
        $catatan = trim($params['catatan'] ?? '');

        if (empty($items) || !is_array($items)) {
            errorResponse('Keranjang belanja kosong.');
        }

        // Validasi produk dan hitung total
        $totalNominal = 0;
        $orderItems = [];
        foreach ($items as $it) {
            $prodId = (int) ($it['produk_id'] ?? 0);
            $qty = (int) ($it['qty'] ?? 0);
            if ($prodId <= 0 || $qty <= 0) continue;

            $prod = $db->fetch("SELECT * FROM toko_produk WHERE id = ? AND is_active = 1", [$prodId]);
            if (!$prod) {
                errorResponse("Produk ID $prodId tidak ditemukan atau tidak aktif.");
            }
            if ($prod['stok'] < $qty) {
                errorResponse("Stok untuk produk '{$prod['nama_produk']}' tidak mencukupi (Tersisa {$prod['stok']}).");
            }

            $subtotal = $prod['harga_anggota'] * $qty;
            $totalNominal += $subtotal;
            $orderItems[] = [
                'produk_id' => $prod['id'],
                'nama_produk' => $prod['nama_produk'],
                'harga_satuan' => $prod['harga_anggota'],
                'qty' => $qty,
                'subtotal' => $subtotal
            ];
        }

        if (empty($orderItems)) {
            errorResponse('Item pesanan tidak valid.');
        }

        $rekSukarelaId = null;
        if ($metode === 'sukarela') {
            // Cek saldo Simpanan Sukarela anggota
            $sukarela = $db->fetch(
                "SELECT rs.id, rs.saldo 
                 FROM rekening_simpanan rs 
                 JOIN jenis_simpanan js ON rs.jenis_simpanan_id = js.id 
                 WHERE rs.anggota_id = ? AND rs.status = 'aktif' AND (js.kode = 'SS' OR LOWER(js.nama) LIKE '%sukarela%') 
                 ORDER BY rs.saldo DESC LIMIT 1",
                [$anggotaId]
            );

            if (!$sukarela || $sukarela['saldo'] < $totalNominal) {
                $saldoAda = $sukarela ? number_format($sukarela['saldo'], 0, ',', '.') : '0';
                $kurang = number_format($totalNominal, 0, ',', '.');
                errorResponse("Saldo Simpanan Sukarela Anda (Rp $saldoAda) tidak mencukupi total belanja Rp $kurang.");
            }
            $rekSukarelaId = $sukarela['id'];
        }

        $db->beginTransaction();
        try {
            $noPesanan = 'ORD-' . date('ymd') . '-' . str_pad((string)rand(100, 999), 3, '0', STR_PAD_LEFT);
            $pesananId = $db->insert(
                "INSERT INTO toko_pesanan (no_pesanan, anggota_id, total_nominal, metode_pembayaran, rekening_simpanan_id, status, catatan) 
                 VALUES (?, ?, ?, ?, ?, 'pending', ?)",
                [$noPesanan, $anggotaId, $totalNominal, $metode, $rekSukarelaId, $catatan]
            );

            foreach ($orderItems as $oi) {
                $db->execute(
                    "INSERT INTO toko_pesanan_detail (pesanan_id, produk_id, nama_produk, harga_satuan, qty, subtotal) 
                     VALUES (?, ?, ?, ?, ?, ?)",
                    [$pesananId, $oi['produk_id'], $oi['nama_produk'], $oi['harga_satuan'], $oi['qty'], $oi['subtotal']]
                );

                // Potong stok
                $db->execute("UPDATE toko_produk SET stok = stok - ? WHERE id = ?", [$oi['qty'], $oi['produk_id']]);
            }

            // Jika potong sukarela, update saldo
            if ($metode === 'sukarela' && $rekSukarelaId) {
                $db->execute("UPDATE rekening_simpanan SET saldo = saldo - ? WHERE id = ?", [$totalNominal, $rekSukarelaId]);
            }

            $db->commit();
            logPortalActivity("Belanja Toko Retail ($noPesanan)");
            successResponse(['no_pesanan' => $noPesanan, 'total' => $totalNominal], 'Pesanan Anda berhasil dibuat dan siap diproses!');
        } catch (Exception $e) {
            $db->rollBack();
            errorResponse('Gagal membuat pesanan: ' . $e->getMessage(), 500);
        }
        break;

    case 'retail-orders':
        $anggotaId = portalAuthCheck();
        $orders = $db->fetchAll(
            "SELECT id, no_pesanan, total_nominal, metode_pembayaran, status, catatan, tgl_pesanan 
             FROM toko_pesanan 
             WHERE anggota_id = ? 
             ORDER BY id DESC",
            [$anggotaId]
        );

        foreach ($orders as &$ord) {
            $ord['items'] = $db->fetchAll(
                "SELECT nama_produk, harga_satuan, qty, subtotal 
                 FROM toko_pesanan_detail 
                 WHERE pesanan_id = ?",
                [$ord['id']]
            );
        }
        unset($ord);

        successResponse($orders);
        break;

    default:
        errorResponse('Portal route tidak ditemukan', 404);
}

