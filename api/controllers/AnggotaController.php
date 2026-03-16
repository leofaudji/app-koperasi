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

            $headers = fgetcsv($handle, 1000, ",");
            // Expecting headers, proceed to content

            $count = 0;
            $db->beginTransaction();
            try {
                while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
                    if (count($data) < 3)
                        continue; // Skip if mandatory cols missing (no, noanggota, nama)

                    $no_anggota_csv = trim($data[1] ?? '');
                    $nama = trim($data[2] ?? '');
                    $jk = strtoupper(trim($data[3] ?? 'L'));
                    if ($jk !== 'L' && $jk !== 'P')
                        $jk = 'L';

                    if (empty($nama))
                        continue;

                    // noanggota from CSV goes to no_anggota_lama
                    $noAnggotaLama = $no_anggota_csv;

                    /* Skip if no_anggota_lama already exists to prevent duplicate import */
                    if (!empty($noAnggotaLama) && $db->count("SELECT COUNT(*) FROM anggota WHERE no_anggota_lama = ?", [$noAnggotaLama])) {
                        continue;
                    }

                    /* Always generate NEW no_anggota using application format */
                    $last = $db->fetch("SELECT no_anggota FROM anggota ORDER BY id DESC LIMIT 1");
                    $lastNum = $last ? (int) substr($last['no_anggota'], 4) : 0;
                    $no_anggota_new = 'AGT-' . str_pad($lastNum + 1, 4, '0', STR_PAD_LEFT);

                    // Defaults as requested
                    $nik = '1234567890';
                    $tempatLahir = 'Malang';
                    $tglLahir = '2000-10-10';
                    $telepon = '081123456789';
                    $email = 'info@abc.com';
                    $pekerjaan = 'Swasta';
                    $gaji = 5000000;
                    $tglDaftar = '2026-03-01';
                    $alamat = 'Jl. Ikan Piranha Atas Blimbing Malang';

                    $anggotaId = $db->insert(
                        "INSERT INTO anggota (no_anggota, no_anggota_lama, nama, nik, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, telepon, email, pekerjaan, penghasilan_bulanan, tgl_daftar, status)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif')",
                        [$no_anggota_new, $noAnggotaLama, $nama, $nik, $tempatLahir, $tglLahir, $jk, $alamat, $telepon, $email, $pekerjaan, $gaji, $tglDaftar]
                    );

                    // Create Portal User using NEW no_anggota
                    $password = password_hash('10102000', PASSWORD_DEFAULT);
                    $db->insert(
                        "INSERT INTO users (username, password, nama_lengkap, email, role_id, anggota_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        [$no_anggota_new, $password, $nama, $email, 3, $anggotaId, 1]
                    );

                    $count++;
                }
                $db->commit();
                fclose($handle);
                successResponse(['imported' => $count], "Berhasil mengimpor $count anggota dan membuat akun portal.");
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
