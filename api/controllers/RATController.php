<?php
// RAT Controller
// Hybrid Authentication (Admin & Portal Member)
$isAdmin = isset($_SESSION['user_id']);
$isPortal = isset($_SESSION['portal_anggota_id']);
if (!$isAdmin && !$isPortal) {
    errorResponse('Unauthorized. Silakan login terlebih dahulu.', 401);
}

// Helper to check permission for either admin or portal
function ratCheckPerm($perm)
{
    global $isAdmin, $isPortal;
    if ($isAdmin)
        return checkPermission($perm);
    if ($isPortal && (strpos($perm, 'view') !== false || strpos($perm, 'vote') !== false))
        return true;
    errorResponse('Forbidden. Fitur ini hanya untuk Admin.', 403);
}
$db = Database::getInstance();
$segments = explode('/', $route);
$subAction = $segments[3] ?? null;

switch ($method) {
    case 'GET':
        // Members need to view sessions and topics
        ratCheckPerm('rat.view');

        $status = $params['status'] ?? null;

        // Example: /api/rat/5/attendance
        if ($action === 'attendance' && is_numeric($id)) {
            $data = $db->fetchAll("
                SELECT ra.*, a.nama, a.no_anggota
                FROM rat_attendance ra
                JOIN anggota a ON ra.anggota_id = a.id
                WHERE ra.session_id = ?
                ORDER BY ra.waktu_hadir DESC", [$id]);
            successResponse($data);
        }

        // Example: /api/rat/sessions/5/documents
        if ($id === 'sessions' && is_numeric($action) && $subAction === 'documents') {
            ratCheckPerm('rat.view');
            $sessionId = $action;
            $docs = $db->fetchAll("SELECT * FROM rat_documents WHERE session_id = ? ORDER BY created_at DESC", [$sessionId]);
            successResponse($docs);
        }

        // Example: /api/rat/topics/5/live-results
        if ($id === 'topics' && is_numeric($action) && $subAction === 'live-results') {
            ratCheckPerm('rat.view');
            $topicId = $action;

            $topic = $db->fetch("SELECT * FROM rat_voting_topics WHERE id = ?", [$topicId]);
            if (!$topic)
                errorResponse('Topik tidak ditemukan');

            $options = $db->fetchAll("
                SELECT ro.*, a.nama as anggota_nama, a.no_anggota
                FROM rat_voting_options ro
                LEFT JOIN anggota a ON ro.anggota_id = a.id
                WHERE ro.topic_id = ?", [$topicId]);

            if ($topic['is_member_election']) {
                foreach ($options as &$opt) {
                    if ($opt['anggota_id']) {
                        $opt['label'] = $opt['anggota_nama'] . ' (' . $opt['no_anggota'] . ')';
                    }
                }
            }

            $votes = $db->fetchAll("
                SELECT option_id, COUNT(*) as total
                FROM rat_votes
                WHERE topic_id = ?
                GROUP BY option_id", [$topicId]);

            $resultMap = [];
            foreach ($votes as $v)
                $resultMap[$v['option_id']] = (int) $v['total'];

            foreach ($options as &$opt) {
                $opt['votes'] = $resultMap[$opt['id']] ?? 0;
            }

            $totalVotes = array_sum(array_column($options, 'votes'));
            $totalHadir = $db->count("SELECT COUNT(*) FROM rat_attendance WHERE session_id = ?", [$topic['session_id']]);

            successResponse([
                'topic' => $topic,
                'options' => $options,
                'total_votes' => $totalVotes,
                'total_hadir' => $totalHadir
            ]);
        }

        // Example: /api/rat/5/topics
        if ($action === 'topics' && is_numeric($id)) {
            $topics = $db->fetchAll("SELECT * FROM rat_voting_topics WHERE session_id = ? ORDER BY id ASC", [$id]);
            $isAnggota = $isPortal || ($_SESSION['role_id'] == 3);
            $anggotaId = $isPortal ? $_SESSION['portal_anggota_id'] : ($_SESSION['anggota_id'] ?? null);

            foreach ($topics as &$t) {
                // Modified to support member election labels
                $t['options'] = $db->fetchAll("
                    SELECT ro.*, a.nama as anggota_nama, a.no_anggota
                    FROM rat_voting_options ro
                    LEFT JOIN anggota a ON ro.anggota_id = a.id
                    WHERE ro.topic_id = ?", [$t['id']]);

                // Update label if it's a member election
                if ($t['is_member_election']) {
                    foreach ($t['options'] as &$opt) {
                        if ($opt['anggota_id']) {
                            $opt['label'] = $opt['anggota_nama'] . ' (' . $opt['no_anggota'] . ')';
                        }
                    }
                }

                // If member, check if already voted
                if ($isAnggota && $anggotaId) {
                    $hasVoted = $db->fetch("SELECT id FROM rat_votes WHERE topic_id = ? AND anggota_id = ?", [$t['id'], $anggotaId]);
                    $t['user_voted'] = !!$hasVoted;
                }

                // Results logic
                if ($t['status'] === 'tutup' || !$isAnggota) {
                    $votes = $db->fetchAll("
                        SELECT option_id, COUNT(*) as total
                        FROM rat_votes
                        WHERE topic_id = ?
                        GROUP BY option_id", [$t['id']]);

                    $resultMap = [];
                    foreach ($votes as $v)
                        $resultMap[$v['option_id']] = (int) $v['total'];

                    foreach ($t['options'] as &$opt) {
                        $opt['votes'] = $resultMap[$opt['id']] ?? 0;
                    }
                    $t['total_votes'] = array_sum(array_column($t['options'], 'votes'));
                } else {
                    // Hide results from members if still open
                    foreach ($t['options'] as &$opt)
                        $opt['votes'] = 0;
                    $t['total_votes'] = 0;
                }
            }
            successResponse($topics);
        }

        // Example: /api/rat/shu/simulation
        if ($id === 'shu' && $action === 'simulation') {
            $anggotaId = $isPortal ? $_SESSION['portal_anggota_id'] : ($_SESSION['anggota_id'] ?? null);
            if (!$anggotaId)
                errorResponse('Hanya anggota yang bisa melihat simulasi SHU');

            // 1. Get SHU settings
            $settings = $db->fetchAll("SELECT setting_key, setting_value FROM app_settings WHERE setting_group = 'keuangan'");
            $cfg = [];
            foreach ($settings as $s)
                $cfg[$s['setting_key']] = $s['setting_value'];

            $totalProfit = (float) ($cfg['shu_default_profit'] ?? 100000000);
            $persenModal = (float) ($cfg['shu_persen_modal'] ?? 40);
            $persenAnggota = (float) ($cfg['shu_persen_anggota'] ?? 40);

            $paguJasaModal = $totalProfit * ($persenModal / 100);
            $paguJasaAnggota = $totalProfit * ($persenAnggota / 100);

            // 2. Get Overall Cooperative Data for ratios
            $totalSimpananAll = (float) $db->fetch("
                SELECT IFNULL(SUM(CASE WHEN kts.dk = 'D' THEN s.jumlah ELSE -s.jumlah END), 0) as total
                FROM simpanan s
                JOIN kode_transaksi_simpanan kts ON s.kode_transaksi_id = kts.id
            ")['total'];

            $totalJasaAll = (float) $db->fetch("
                SELECT IFNULL(SUM(an.bunga), 0) as total
                FROM angsuran an
                WHERE an.status IN ('lunas', 'terlambat') AND YEAR(an.tgl_bayar) = YEAR(CURDATE())
            ")['total'];

            // 3. Get Member specific data
            $memberSimpananArr = $db->fetchAll("
                SELECT MONTH(s.tgl_transaksi) as bulan,
                       SUM(CASE WHEN kts.dk = 'D' THEN s.jumlah ELSE -s.jumlah END) as jumlah
                FROM simpanan s
                JOIN kode_transaksi_simpanan kts ON s.kode_transaksi_id = kts.id
                WHERE s.anggota_id = ? AND YEAR(s.tgl_transaksi) = YEAR(CURDATE())
                GROUP BY MONTH(s.tgl_transaksi)
            ", [$anggotaId]);

            $memberJasaArr = $db->fetchAll("
                SELECT MONTH(an.tgl_bayar) as bulan, SUM(an.bunga) as jumlah
                FROM angsuran an
                JOIN pinjaman p ON an.pinjaman_id = p.id
                WHERE p.anggota_id = ? AND an.status IN ('lunas', 'terlambat') AND YEAR(an.tgl_bayar) = YEAR(CURDATE())
                GROUP BY MONTH(an.tgl_bayar)
            ", [$anggotaId]);

            $monthlyData = [];
            $memberCurrentSimpanan = (float) $db->fetch("
                SELECT IFNULL(SUM(CASE WHEN kts.dk = 'D' THEN s.jumlah ELSE -s.jumlah END), 0) as total
                FROM simpanan s
                JOIN kode_transaksi_simpanan kts ON s.kode_transaksi_id = kts.id
                WHERE s.anggota_id = ?
            ", [$anggotaId])['total'];

            $cumulativeSHU = 0;
            $jasaLookup = array_column($memberJasaArr, 'jumlah', 'bulan');
            $simpananLookup = array_column($memberSimpananArr, 'jumlah', 'bulan');

            $currentBulan = (int) date('n');
            for ($m = 1; $m <= 12; $m++) {
                $monthlyJasa = (float) ($jasaLookup[$m] ?? 0);

                // Ratio calculation (simulated monthly portion)
                $portionModal = $totalSimpananAll > 0 ? ($memberCurrentSimpanan / $totalSimpananAll) * ($paguJasaModal / 12) : 0;
                $portionAnggota = $totalJasaAll > 0 ? ($monthlyJasa / $totalJasaAll) * $paguJasaAnggota : 0;

                $monthlySHU = $portionModal + $portionAnggota;
                $cumulativeSHU += $monthlySHU;

                $monthlyData[] = [
                    'bulan' => $m,
                    'label' => date('M', mktime(0, 0, 0, $m, 1)),
                    'shu' => round($cumulativeSHU),
                    'is_projection' => $m > $currentBulan
                ];
            }

            successResponse([
                'config' => [
                    'total_profit' => $totalProfit,
                    'persen_modal' => $persenModal,
                    'persen_anggota' => $persenAnggota
                ],
                'summary' => [
                    'estimasi_total' => round($cumulativeSHU),
                    'jasa_modal' => round($totalSimpananAll > 0 ? ($memberCurrentSimpanan / $totalSimpananAll) * $paguJasaModal : 0),
                    'jasa_pinjaman' => round($totalJasaAll > 0 ? (array_sum(array_column($memberJasaArr, 'jumlah')) / $totalJasaAll) * $paguJasaAnggota : 0)
                ],
                'chart' => $monthlyData
            ]);
        }

        if ($id && is_numeric($id)) {
            $data = $db->fetch("SELECT * FROM rat_sessions WHERE id = ?", [$id]);
            if (!$data)
                errorResponse('Sesi RAT tidak ditemukan', 404);

            // Add analytics data
            $data['total_anggota'] = $db->count("SELECT COUNT(*) FROM anggota");
            $data['total_hadir'] = $db->count("SELECT COUNT(*) FROM rat_attendance WHERE session_id = ?", [$id]);

            successResponse($data);
        } else {
            $page = $params['page'] ?? 1;
            $perPage = $params['per_page'] ?? PER_PAGE;

            $where = "WHERE 1=1";
            $binds = [];
            if ($status) {
                $where .= " AND status = ?";
                $binds[] = $status;
            }

            paginatedResponse(
                "SELECT * FROM rat_sessions $where ORDER BY tanggal DESC",
                "SELECT COUNT(*) FROM rat_sessions $where",
                $binds,
                $page,
                $perPage
            );
        }
        break;

    case 'POST':
        // Members actions
        // Example: /api/rat/attendance
        if ($id === 'attendance') {
            ratCheckPerm('rat.view');
            $sessionId = $params['session_id'] ?? 0;
            $token = $params['qr_token'] ?? '';
            $anggotaId = $isPortal ? $_SESSION['portal_anggota_id'] : ($_SESSION['anggota_id'] ?? null);

            if (!$anggotaId)
                errorResponse('Hanya anggota yang bisa melakukan presensi');

            $session = $db->fetch("SELECT status, qr_token FROM rat_sessions WHERE id = ?", [$sessionId]);
            if (!$session || $session['status'] !== 'aktif')
                errorResponse('Sesi RAT tidak aktif atau tidak ditemukan');
            if ($session['qr_token'] !== $token)
                errorResponse('Kode QR tidak valid atau sudah kadaluarsa');

            $db->execute("INSERT IGNORE INTO rat_attendance (session_id, anggota_id) VALUES (?, ?)", [$sessionId, $anggotaId]);
            successResponse(null, 'Kehadiran berhasil dicatat');
        }

        // Example: /api/rat/sessions/5/documents (Upload)
        if ($id === 'sessions' && is_numeric($action) && $subAction === 'documents') {
            if (!$isAdmin)
                errorResponse('Forbidden. Fitur ini hanya untuk Admin.', 403);
            $sessionId = $action;

            if (empty($_FILES['file']))
                errorResponse('Pilih file terlebih dahulu');
            $file = $_FILES['file'];
            $nama = $params['nama_dokumen'] ?? '';
            $kategori = $params['kategori'] ?? 'Lainnya';

            if (empty($nama))
                errorResponse('Nama dokumen wajib diisi');

            $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
            if (strtolower($ext) !== 'pdf')
                errorResponse('Hanya file PDF yang diperbolehkan');

            $filename = 'rat_' . $sessionId . '_' . time() . '_' . uniqid() . '.pdf';
            $dest = __DIR__ . '/../../uploads/rat/' . $filename;

            if (move_uploaded_file($file['tmp_name'], $dest)) {
                $db->insert("INSERT INTO rat_documents (session_id, nama_dokumen, kategori, file_path) VALUES (?, ?, ?, ?)", [
                    $sessionId,
                    $nama,
                    $kategori,
                    'uploads/rat/' . $filename
                ]);
                successResponse(null, 'Dokumen berhasil diunggah');
            } else {
                errorResponse('Gagal mengunggah file ke server');
            }
        }

        // Example: /api/rat/topics/5/vote
        if ($id === 'topics' && is_numeric($action) && $subAction === 'vote') {
            ratCheckPerm('rat.view');
            $topicId = $action;
            $optionId = $params['option_id'] ?? 0;
            $anggotaId = $isPortal ? $_SESSION['portal_anggota_id'] : ($_SESSION['anggota_id'] ?? null);

            if (!$anggotaId)
                errorResponse('Hanya anggota yang bisa memberikan suara');

            $topic = $db->fetch("SELECT status, session_id, is_member_election FROM rat_voting_topics WHERE id = ?", [$topicId]);
            if (!$topic)
                errorResponse('Topik tidak ditemukan');
            if ($topic['status'] !== 'buka')
                errorResponse('Voting untuk topik ini sedang ditutup');

            // Handle Member Election: Create option dynamically if it doesn't exist
            if ($topic['is_member_election']) {
                $candAnggotaId = $params['anggota_id'] ?? 0;
                if (!$candAnggotaId)
                    errorResponse('ID Anggota kandidat diperlukan');

                $opt = $db->fetch("SELECT id FROM rat_voting_options WHERE topic_id = ? AND anggota_id = ?", [$topicId, $candAnggotaId]);
                if (!$opt) {
                    $anggotaCand = $db->fetch("SELECT nama FROM anggota WHERE id = ?", [$candAnggotaId]);
                    if (!$anggotaCand)
                        errorResponse('Kandidat tidak ditemukan');

                    $optionId = $db->insert("INSERT INTO rat_voting_options (topic_id, label, anggota_id) VALUES (?, ?, ?)", [
                        $topicId,
                        $anggotaCand['nama'],
                        $candAnggotaId
                    ]);
                } else {
                    $optionId = $opt['id'];
                }
            }

            $isPresent = $db->count("SELECT COUNT(*) FROM rat_attendance WHERE session_id = ? AND anggota_id = ?", [$topic['session_id'], $anggotaId]);
            if (!$isPresent)
                errorResponse('Anda harus mengisi presensi kehadiran terlebih dahulu');

            try {
                $db->insert("INSERT INTO rat_votes (topic_id, option_id, anggota_id) VALUES (?, ?, ?)", [$topicId, $optionId, $anggotaId]);
                successResponse(null, 'Suara Anda berhasil dikirim');
            } catch (Exception $e) {
                errorResponse('Anda sudah memberikan suara untuk topik ini');
            }
        }

        // Add Instant SHU Execution
        if ($id === 'topics' && is_numeric($action) && $subAction === 'execute-shu') {
            if (!$isAdmin)
                errorResponse('Forbidden. Fitur ini hanya untuk Admin.', 403);
            ratCheckPerm('keuangan.laba_rugi'); // Need high financial perm
            $topicId = $action;

            $topic = $db->fetch("SELECT * FROM rat_voting_topics WHERE id = ?", [$topicId]);
            if (!$topic)
                errorResponse('Topik tidak ditemukan');
            if ($topic['status'] !== 'tutup')
                errorResponse('Eksekusi SHU hanya bisa dilakukan jika status voting sudah TUTUP');

            // Check if already executed
            $isExecuted = $db->fetch("SELECT id FROM rat_shu_executions WHERE topic_id = ?", [$topicId]);
            if ($isExecuted)
                errorResponse('SHU untuk topik RAT ini sudah pernah dieksekusi sebelumnya');

            // 1. Get SHU settings
            $settings = $db->fetchAll("SELECT setting_key, setting_value FROM app_settings WHERE setting_group = 'keuangan'");
            $cfg = [];
            foreach ($settings as $s)
                $cfg[$s['setting_key']] = $s['setting_value'];

            $tahun = date('Y') - 1; // RAT usually for previous year's book
            // Realistically we'd need admin input for Total Profit, 
            // but for instant RAT execution demo, let's assume a dummy/fixed profit if not set elsewhere, or extract from topic desc.
            // In a full implementation, Total Profit should be read from a locked financial period table.
            $totalProfit = (float) ($cfg['shu_default_profit'] ?? 100000000);
            $persenModal = (float) ($cfg['shu_persen_modal'] ?? 40);
            $persenAnggota = (float) ($cfg['shu_persen_anggota'] ?? 40);

            $paguJasaModal = $totalProfit * ($persenModal / 100);
            $paguJasaAnggota = $totalProfit * ($persenAnggota / 100);

            $db->beginTransaction();
            try {
                // Get all active members' base savings
                $modalData = $db->fetchAll("
                    SELECT a.id, 
                           IFNULL(SUM(CASE WHEN kts.dk = 'D' THEN s.jumlah ELSE -s.jumlah END), 0) as total_simpanan
                    FROM anggota a
                    LEFT JOIN simpanan s ON a.id = s.anggota_id
                    LEFT JOIN kode_transaksi_simpanan kts ON s.kode_transaksi_id = kts.id
                    WHERE a.status = 'aktif'
                    GROUP BY a.id
                ");

                // Get all members' loan interest paid
                $jasaData = $db->fetchAll("
                    SELECT p.anggota_id, SUM(an.bunga) as total_jasa
                    FROM angsuran an
                    JOIN pinjaman p ON an.pinjaman_id = p.id
                    WHERE an.status IN ('lunas', 'terlambat') AND YEAR(an.tgl_bayar) = ?
                    GROUP BY p.anggota_id
                ", [$tahun]);

                $jasaLookup = [];
                foreach ($jasaData as $jd)
                    $jasaLookup[$jd['anggota_id']] = (float) $jd['total_jasa'];

                $totalSimpananAll = array_sum(array_column($modalData, 'total_simpanan'));
                $totalJasaAll = array_sum(array_column($jasaData, 'total_jasa'));

                $totalDistributed = 0;
                $sukarelaJenis = $db->fetch("SELECT id FROM jenis_simpanan WHERE LOWER(nama) LIKE '%sukarela%' LIMIT 1");
                $kodeTransaksiIn = $db->fetch("SELECT id FROM kode_transaksi_simpanan WHERE dk = 'C' AND (LOWER(nama) LIKE '%shu%' OR LOWER(nama) LIKE '%setor%') LIMIT 1");

                if (!$sukarelaJenis || !$kodeTransaksiIn) {
                    throw new Exception("Master Data Jenis Simpanan Sukarela atau Kode Transaksi tidak lengkap untuk pembagian otomatis.");
                }

                $stmtInsertSimpanan = $db->getConnection()->prepare("
                    INSERT INTO simpanan (anggota_id, jenis_simpanan_id, kode_transaksi_id, jumlah, keterangan, tgl_transaksi, created_by)
                    VALUES (?, ?, ?, ?, ?, NOW(), ?)
                ");

                foreach ($modalData as $row) {
                    $anggotaId = $row['id'];
                    $simpanan = (float) $row['total_simpanan'];
                    $jasaPaid = $jasaLookup[$anggotaId] ?? 0;

                    $bagianModal = $totalSimpananAll > 0 ? ($simpanan / $totalSimpananAll) * $paguJasaModal : 0;
                    $bagianJasa = $totalJasaAll > 0 ? ($jasaPaid / $totalJasaAll) * $paguJasaAnggota : 0;

                    $totalSHU = round($bagianModal + $bagianJasa);

                    if ($totalSHU > 0) {
                        $stmtInsertSimpanan->execute([
                            $anggotaId,
                            $sukarelaJenis['id'],
                            $kodeTransaksiIn['id'],
                            $totalSHU,
                            "Distribusi Otomatis SHU $tahun via RAT",
                            $_SESSION['user_id']
                        ]);
                        $totalDistributed += $totalSHU;
                    }
                }

                // Log execution
                $executedBy = $isAdmin ? $_SESSION['user_id'] : 0; // Member can't execute this anyway, but for safety
                $db->insert("INSERT INTO rat_shu_executions (topic_id, session_id, tahun, total_distributed, executed_by) VALUES (?, ?, ?, ?, ?)", [
                    $topicId,
                    $topic['session_id'],
                    $tahun,
                    $totalDistributed,
                    $executedBy
                ]);

                $db->commit();
                successResponse(['distributed' => $totalDistributed], "Berhasil mengeksekusi dan mendistribusikan SHU sebesar Rp " . number_format($totalDistributed, 0, ',', '.') . " ke saldo anggota.");
            } catch (Exception $e) {
                $db->rollBack();
                errorResponse('Gagal mengeksekusi SHU: ' . $e->getMessage());
            }
        }

        // Admin actions
        if (!$isAdmin)
            errorResponse('Forbidden. Fitur ini hanya untuk Admin.', 403);
        ratCheckPerm('rat.manage');

        // Example: /api/rat (Create session)
        if (!$id && !$action) {
            $judul = $params['judul'] ?? '';
            $tanggal = $params['tanggal'] ?? '';
            if (empty($judul) || empty($tanggal))
                errorResponse('Judul dan Tanggal wajib diisi');

            $id = $db->insert(
                "INSERT INTO rat_sessions (judul, tanggal, lokasi, qr_token, status) VALUES (?, ?, ?, ?, 'persiapan')",
                [
                    $judul,
                    $tanggal,
                    $params['lokasi'] ?? null,
                    bin2hex(random_bytes(16)) // Initial QR token
                ]
            );
            successResponse(['id' => $id], 'Sesi RAT berhasil dibuat', 201);
        }

        // Logic for generating new token
        if ($id && $action === 'token') {
            $newToken = bin2hex(random_bytes(16));
            $db->execute("UPDATE rat_sessions SET qr_token = ? WHERE id = ?", [$newToken, $id]);
            successResponse(['qr_token' => $newToken], 'QR Token berhasil diperbarui');
        }

        // Logic for creating topic
        if ($id && $action === 'add-topic') {
            $judul = $params['judul'] ?? '';
            $isElection = $params['is_member_election'] ?? 0;
            if (empty($judul))
                errorResponse('Judul topik wajib diisi');

            $topicId = $db->insert(
                "INSERT INTO rat_voting_topics (session_id, judul, deskripsi, status, is_member_election) VALUES (?, ?, ?, 'draft', ?)",
                [$id, $judul, $params['deskripsi'] ?? null, $isElection]
            );

            // Options only for non-election topics
            if (!$isElection) {
                $options = $params['options'] ?? [];
                foreach ($options as $opt) {
                    if (is_string($opt) && !empty($opt)) {
                        $db->insert("INSERT INTO rat_voting_options (topic_id, label) VALUES (?, ?)", [$topicId, $opt]);
                    }
                }
            }
            successResponse(['id' => $topicId], 'Topik voting berhasil ditambahkan');
        }

        // Example: /api/rat/topic-status (Update topic status)
        if ($id === 'topic-status') {
            $topicId = $params['topic_id'] ?? 0;
            $status = $params['status'] ?? 'draft';
            $db->execute("UPDATE rat_voting_topics SET status = ? WHERE id = ?", [$status, $topicId]);
            successResponse(null, 'Status topik berhasil diperbarui');
        }

        break;

    case 'PUT':
        if (!$isAdmin)
            errorResponse('Forbidden. Fitur ini hanya untuk Admin.', 403);
        ratCheckPerm('rat.manage');
        if (!$id)
            errorResponse('ID Sesi diperlukan');

        $db->execute(
            "UPDATE rat_sessions SET judul=?, tanggal=?, lokasi=?, status=? WHERE id=?",
            [
                $params['judul'] ?? '',
                $params['tanggal'] ?? '',
                $params['lokasi'] ?? null,
                $params['status'] ?? 'persiapan',
                $id
            ]
        );
        successResponse(null, 'Sesi RAT berhasil diupdate');
        break;

    case 'DELETE':
        if (!$isAdmin)
            errorResponse('Forbidden. Fitur ini hanya untuk Admin.', 403);
        ratCheckPerm('rat.manage');
        if (!$id)
            errorResponse('ID Sesi diperlukan');

        if ($id === 'documents' && is_numeric($action)) {
            $doc = $db->fetch("SELECT * FROM rat_documents WHERE id = ?", [$action]);
            if (!$doc)
                errorResponse('Dokumen tidak ditemukan');

            $filePath = __DIR__ . '/../../' . $doc['file_path'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }

            $db->execute("DELETE FROM rat_documents WHERE id = ?", [$action]);
            successResponse(null, 'Dokumen berhasil dihapus');
        }

        $db->execute("DELETE FROM rat_sessions WHERE id = ?", [$id]);
        successResponse(null, 'Sesi RAT berhasil dihapus');
        break;

    default:
        errorResponse('Method not allowed', 405);
}
