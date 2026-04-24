<?php
// Anggota Controller
// Hybrid Authentication (Admin & Portal Member)
$isAdmin = isset($_SESSION['user_id']);
$isPortal = isset($_SESSION['portal_anggota_id']);
if (!$isAdmin && !$isPortal) {
    errorResponse('Unauthorized. Silakan login terlebih dahulu.', 401);
}
$db = Database::getInstance();

switch ($method) {
    case 'GET':
        // Allow members to view the list (for election search)
        if ($isAdmin) {
            checkPermission('anggota.view');
        }
        if ($id) {
            $data = $db->fetch("SELECT * FROM anggota WHERE id = ?", [$id]);
            if (!$data)
                errorResponse('Anggota tidak ditemukan', 404);

            // Get saldo simpanan
            $saldo = $db->fetchAll(
                "SELECT js.nama, js.kode,
                    COALESCE(SUM(CASE WHEN kt.dk='D' THEN s.jumlah ELSE -s.jumlah END),0) as saldo
                 FROM jenis_simpanan js
                 LEFT JOIN simpanan s ON js.id = s.jenis_simpanan_id AND s.anggota_id = ?
                 LEFT JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                 GROUP BY js.id, js.nama, js.kode ORDER BY js.kode",
                [$id]
            );
            $data['saldo_simpanan'] = $saldo;

            // Get pinjaman aktif
            $pinjamanAktif = $db->fetchAll(
                "SELECT p.*, jp.nama as jenis_pinjaman FROM pinjaman p
                 JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
                 WHERE p.anggota_id = ? AND p.status IN ('disetujui','cair')
                 ORDER BY p.tgl_pengajuan DESC",
                [$id]
            );
            $data['pinjaman_aktif'] = $pinjamanAktif;

            successResponse($data);
        } else {
            $search = $params['search'] ?? '';
            $status = $params['status'] ?? '';
            $page = $params['page'] ?? 1;
            $perPage = $params['per_page'] ?? PER_PAGE;

            $where = "WHERE 1=1";
            $binds = [];

            if ($search) {
                $where .= " AND (nama LIKE ? OR no_anggota LIKE ? OR nik LIKE ?)";
                $binds[] = "%$search%";
                $binds[] = "%$search%";
                $binds[] = "%$search%";
            }
            if ($status) {
                $where .= " AND status = ?";
                $binds[] = $status;
            }

            paginatedResponse(
                "SELECT * FROM anggota $where ORDER BY no_anggota",
                "SELECT COUNT(*) FROM anggota $where",
                $binds,
                $page,
                $perPage
            );
        }
        break;

    case 'POST':
        if (!$isAdmin)
            errorResponse('Forbidden. Fitur ini hanya untuk Admin.', 403);

        // Check if this is an import action
        if ($id === 'import') {
            checkPermission('anggota.create');
            if (empty($_FILES['file']))
                errorResponse('Pilih file CSV terlebih dahulu');

            $file = $_FILES['file']['tmp_name'];
            $handle = fopen($file, "r");
            if (!$handle)
                errorResponse('Gagal membuka file CSV');

            // Skip header
            fgetcsv($handle, 1000, ",");

            $db->beginTransaction();
            try {
                // 1. Clear existing data as requested
                $db->execute("SET FOREIGN_KEY_CHECKS = 0");
                $db->execute("DELETE FROM jurnal_detail");
                $db->execute("DELETE FROM jurnal");
                $db->execute("DELETE FROM simpanan");
                $db->execute("DELETE FROM rekening_simpanan");
                $db->execute("DELETE FROM users WHERE role_id = 3");
                $db->execute("DELETE FROM anggota");
                $db->execute("SET FOREIGN_KEY_CHECKS = 1");

                // 2. Map Jenis Simpanan IDs
                $jsPokok = $db->fetch("SELECT id FROM jenis_simpanan WHERE kode = 'SP' OR nama LIKE '%Pokok%'")['id'] ?? null;
                $jsWajib = $db->fetch("SELECT id FROM jenis_simpanan WHERE kode = 'SW' OR nama LIKE '%Wajib%'")['id'] ?? null;
                $jsManasuka = $db->fetch("SELECT id FROM jenis_simpanan WHERE kode = 'SS' OR nama LIKE '%Manasuka%' OR nama LIKE '%Sukarela%'")['id'] ?? null;
                $jsPartisipasif = $db->fetch("SELECT id FROM jenis_simpanan WHERE nama LIKE '%Partisipatif%' OR nama LIKE '%Partisipatif%'")['id'] ?? null;

                $ktSetoran = $db->fetch("SELECT * FROM kode_transaksi_simpanan WHERE kode = 'STR'") ?? null;
                if (!$ktSetoran)
                    throw new Exception("Kode transaksi 'STR' (Setoran) tidak ditemukan.");

                $count = 0;
                while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
                    if (count($data) < 2)
                        continue;

                    $nama = trim($data[1] ?? '');
                    if (empty($nama))
                        continue;

                    // Generate NEW no_anggota
                    $no_anggota_new = 'AGT-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);

                    // Insert Anggota
                    $anggotaId = $db->insert(
                        "INSERT INTO anggota (no_anggota, nama, nik, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, telepon, email, pekerjaan, tgl_daftar, status)
                         VALUES (?, ?, '1234567890', 'Malang', '2000-10-10', 'L', 'Alamat Import', '081123456789', 'info@abc.com', 'Swasta', ?, 'aktif')",
                        [$no_anggota_new, $nama, date('Y-m-d')]
                    );

                    // Create Portal User
                    $password = password_hash('10102000', PASSWORD_DEFAULT);
                    $db->insert(
                        "INSERT INTO users (username, password, nama_lengkap, email, role_id, anggota_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        [$no_anggota_new, $password, $nama, 'info@abc.com', 3, $anggotaId, 1]
                    );

                    // Process Savings Balances
                    // Column mapping: 2:Pokok, 3:Wajib, 4:Manasuka, 5:Partisipasif
                    $rawBalances = [
                        ['id' => $jsPokok, 'val' => $data[2] ?? '0'],
                        ['id' => $jsWajib, 'val' => $data[3] ?? '0'],
                        ['id' => $jsManasuka, 'val' => $data[4] ?? '0'],
                        ['id' => $jsPartisipasif, 'val' => $data[5] ?? '0'],
                    ];

                    foreach ($rawBalances as $b) {
                        if ($b['id']) {
                            // Robust number parsing
                            $valStr = trim($b['val']);
                            $valStr = str_replace([' ', 'Rp', 'rp'], '', $valStr);

                            if (strpos($valStr, '.') !== false && strpos($valStr, ',') !== false) {
                                if (strrpos($valStr, '.') > strrpos($valStr, ',')) {
                                    $jumlah = (float) str_replace(',', '', $valStr);
                                } else {
                                    $jumlah = (float) str_replace(['.', ','], ['', '.'], $valStr);
                                }
                            } elseif (strpos($valStr, ',') !== false) {
                                $jumlah = (float) str_replace(['.', ','], ['', '.'], $valStr);
                            } else {
                                $jumlah = (float) $valStr;
                            }

                            if ($jumlah > 0) {
                                $jenisId = $b['id'];
                                $jenis = $db->fetch("SELECT id, kode, nama, kode_numerik, akun_id FROM jenis_simpanan WHERE id = ?", [$jenisId]);

                                // Generate No Rekening: YY.JS.AAAAAAA.NN
                                $yy = date('y');
                                $jsCode = str_pad($jenis['kode_numerik'] ?: '00', 2, '0', STR_PAD_LEFT);
                                $aaaaaaa = str_pad($count + 1, 7, '0', STR_PAD_LEFT);
                                $noRekening = "$yy.$jsCode.$aaaaaaa.01";

                                $rekeningId = $db->insert(
                                    "INSERT INTO rekening_simpanan (no_rekening, anggota_id, jenis_simpanan_id, tgl_buka, saldo, status) VALUES (?,?,?,?,?,?)",
                                    [$noRekening, $anggotaId, $jenisId, date('Y-m-d'), $jumlah, 'aktif']
                                );

                                // Create Transaction (Setoran Awal)
                                $noTransaksi = 'SMP' . date('Ymd') . str_pad($db->count("SELECT COUNT(*) FROM simpanan WHERE tgl_transaksi = ?", [date('Y-m-d')]) + 1, 4, '0', STR_PAD_LEFT);
                                $simpananId = $db->insert(
                                    "INSERT INTO simpanan (no_transaksi, anggota_id, jenis_simpanan_id, rekening_id, kode_transaksi_id, tgl_transaksi, jumlah, saldo_sebelum, saldo_sesudah, keterangan, created_by)
                                     VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                                    [$noTransaksi, $anggotaId, $jenisId, $rekeningId, $ktSetoran['id'], date('Y-m-d'), $jumlah, 0, $jumlah, 'Saldo Awal Import', $_SESSION['user_id'] ?? 1]
                                );

                                // Create Journal
                                $noBukti = 'JRN' . date('Ymd') . str_pad($db->count("SELECT COUNT(*) FROM jurnal WHERE tgl_transaksi = ?", [date('Y-m-d')]) + 1, 4, '0', STR_PAD_LEFT);
                                $keterangan = "Saldo Awal " . $jenis['nama'] . " - " . $nama;

                                $jurnalId = $db->insert(
                                    "INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, ref_id, total_debit, total_kredit, created_by)
                                     VALUES (?,?,?,?,?,?,?,?)",
                                    [$noBukti, date('Y-m-d'), $keterangan, 'simpanan', $simpananId, $jumlah, $jumlah, $_SESSION['user_id'] ?? 1]
                                );

                                $akunSimpanan = $jenis['akun_id'];
                                $akunDebit = $ktSetoran['akun_debit_id'];
                                if (!$akunDebit) {
                                    $kas = $db->fetch("SELECT id FROM akun WHERE kode = '1000' OR nama LIKE 'Kas%' LIMIT 1");
                                    if ($kas)
                                        $akunDebit = $kas['id'];
                                }

                                if ($akunSimpanan && $akunDebit) {
                                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, ?, 0)", [$jurnalId, $akunDebit, $jumlah]);
                                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, 0, ?)", [$jurnalId, $akunSimpanan, $jumlah]);
                                }
                            }
                        }
                    }

                    $count++;
                }
                $db->commit();
                fclose($handle);
                successResponse(['imported' => $count], "Berhasil mengimpor $count anggota, membuat rekening tabungan, dan mencatat saldo awal.");
            } catch (Exception $e) {
                $db->rollBack();
                fclose($handle);
                errorResponse('Gagal import: ' . $e->getMessage());
            }
            break;
        }

        checkPermission('anggota.create');
        $nama = $params['nama'] ?? '';
        if (empty($nama))
            errorResponse('Nama anggota wajib diisi');

        // Generate no_anggota
        $last = $db->fetch("SELECT no_anggota FROM anggota ORDER BY id DESC LIMIT 1");
        $lastNum = $last ? (int) substr($last['no_anggota'], 4) : 0;
        $noAnggota = 'AGT-' . str_pad($lastNum + 1, 4, '0', STR_PAD_LEFT);

        $id = $db->insert(
            "INSERT INTO anggota (no_anggota, nama, nik, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, telepon, email, pekerjaan, penghasilan_bulanan, tgl_daftar, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif')",
            [
                $noAnggota,
                $nama,
                $params['nik'] ?? null,
                $params['tempat_lahir'] ?? null,
                $params['tanggal_lahir'] ?? null,
                $params['jenis_kelamin'] ?? 'L',
                $params['alamat'] ?? null,
                $params['telepon'] ?? null,
                $params['email'] ?? null,
                $params['pekerjaan'] ?? null,
                $params['penghasilan_bulanan'] ?? 0,
                $params['tgl_daftar'] ?? date('Y-m-d')
            ]
        );

        // Otomatis buat User untuk Portal Anggota
        // Password default: ddmmyyyy dari tanggal_lahir
        $tglLahir = $params['tanggal_lahir'] ?? '';
        $rawPassword = $noAnggota; // Fallback jika tgl lahir kosong
        if (!empty($tglLahir)) {
            $rawPassword = date('dmY', strtotime($tglLahir));
        }

        $db->insert(
            "INSERT INTO users (username, password, nama_lengkap, email, role_id, anggota_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                $noAnggota,
                password_hash($rawPassword, PASSWORD_DEFAULT),
                $nama,
                $params['email'] ?? null,
                3, // Role Anggota
                $id,
                1
            ]
        );

        successResponse(['id' => $id, 'no_anggota' => $noAnggota], 'Anggota dan User Portal berhasil ditambahkan', 201);
        break;

    case 'PUT':
        if (!$isAdmin)
            errorResponse('Forbidden. Fitur ini hanya untuk Admin.', 403);
        checkPermission('anggota.edit');
        if (!$id)
            errorResponse('ID anggota diperlukan');

        $existing = $db->fetch("SELECT id FROM anggota WHERE id = ?", [$id]);
        if (!$existing)
            errorResponse('Anggota tidak ditemukan', 404);

        $db->execute(
            "UPDATE anggota SET nama=?, nik=?, tempat_lahir=?, tanggal_lahir=?, jenis_kelamin=?, alamat=?, telepon=?, email=?, pekerjaan=?, penghasilan_bulanan=?, status=? WHERE id=?",
            [
                $params['nama'] ?? '',
                $params['nik'] ?? null,
                $params['tempat_lahir'] ?? null,
                $params['tanggal_lahir'] ?? null,
                $params['jenis_kelamin'] ?? 'L',
                $params['alamat'] ?? null,
                $params['telepon'] ?? null,
                $params['email'] ?? null,
                $params['pekerjaan'] ?? null,
                $params['penghasilan_bulanan'] ?? 0,
                $params['status'] ?? 'aktif',
                $id
            ]
        );

        successResponse(null, 'Anggota berhasil diupdate');
        break;

    case 'DELETE':
        if (!$isAdmin)
            errorResponse('Forbidden. Fitur ini hanya untuk Admin.', 403);
        checkPermission('anggota.delete');
        if (!$id)
            errorResponse('ID anggota diperlukan');

        // Check if has transactions
        $hasTx = $db->count("SELECT COUNT(*) FROM simpanan WHERE anggota_id = ?", [$id]);
        $hasPj = $db->count("SELECT COUNT(*) FROM pinjaman WHERE anggota_id = ?", [$id]);

        if ($hasTx > 0 || $hasPj > 0) {
            errorResponse('Anggota memiliki transaksi, tidak bisa dihapus. Nonaktifkan saja.');
        }

        $db->execute("DELETE FROM anggota WHERE id = ?", [$id]);
        successResponse(null, 'Anggota berhasil dihapus');
        break;

    default:
        errorResponse('Method not allowed', 405);
}
