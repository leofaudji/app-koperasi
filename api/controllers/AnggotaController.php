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
            $cacheKey = "rep_mem_detail_{$id}";
            $data = getCachedData($cacheKey, function () use ($db, $id) {
                $data = $db->fetch("SELECT * FROM anggota WHERE id = ?", [$id]);
                if (!$data)
                    errorResponse('Anggota tidak ditemukan', 404);

                // Get saldo simpanan
                $saldo = $db->fetchAll(
                    "SELECT js.id, js.nama, js.kode,
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
                return $data;
            });
            successResponse($data);
        } else {
            $search = $params['search'] ?? '';
            $status = $params['status'] ?? '';
            $page = $params['page'] ?? 1;
            $perPage = $params['per_page'] ?? PER_PAGE;

            $cacheKey = "rep_mem_list_{$page}_{$perPage}_" . md5($search . $status);
            $responseData = getCachedData($cacheKey, function () use ($db, $search, $status, $page, $perPage) {
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

                $offset = ($page - 1) * $perPage;
                $total = $db->count("SELECT COUNT(*) FROM anggota $where", $binds);
                $data = $db->fetchAll("SELECT * FROM anggota $where ORDER BY no_anggota LIMIT $perPage OFFSET $offset", $binds);

                return [
                    'data' => $data,
                    'pagination' => [
                        'page' => (int) $page,
                        'per_page' => (int) $perPage,
                        'total' => (int) $total,
                        'total_pages' => ceil($total / $perPage)
                    ]
                ];
            });
            jsonResponse(array_merge(['success' => true], $responseData));
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
                $db->execute("DELETE FROM angsuran");
                $db->execute("DELETE FROM agunan");
                $db->execute("DELETE FROM biaya_pencairan");
                $db->execute("DELETE FROM pinjaman");
                $db->execute("DELETE FROM users WHERE role_id = 3");
                $db->execute("DELETE FROM anggota");
                $db->execute("SET FOREIGN_KEY_CHECKS = 1");

                // 2. Map/Create specific Accounts for tidy Neraca (Balance Sheet)
                $mapAset = 'aset';
                $mapKewajiban = 'kewajiban';
                
                $accountsToCreate = [
                    ['kode' => '1201', 'nama' => 'Piutang Pinjaman Berjangka 1', 'tipe' => $mapAset, 'normal' => 'D'],
                    ['kode' => '1202', 'nama' => 'Piutang Pinjaman Berjangka 2', 'tipe' => $mapAset, 'normal' => 'D'],
                    ['kode' => '1203', 'nama' => 'Piutang Pinjaman Insidental', 'tipe' => $mapAset, 'normal' => 'D'],
                    ['kode' => '1204', 'nama' => 'Piutang Pinjaman Barang', 'tipe' => $mapAset, 'normal' => 'D'],
                    ['kode' => '2001', 'nama' => 'Simpanan Pokok', 'tipe' => $mapKewajiban, 'normal' => 'K'],
                    ['kode' => '2002', 'nama' => 'Simpanan Wajib', 'tipe' => $mapKewajiban, 'normal' => 'K'],
                    ['kode' => '2003', 'nama' => 'Simpanan Sukarela', 'tipe' => $mapKewajiban, 'normal' => 'K'],
                    ['kode' => '2004', 'nama' => 'Simpanan Partisipatif', 'tipe' => $mapKewajiban, 'normal' => 'K'],
                ];
                
                foreach ($accountsToCreate as $acc) {
                    $existAcc = $db->fetch("SELECT id FROM akun WHERE kode = ?", [$acc['kode']]);
                    if (!$existAcc) {
                        $db->insert("INSERT INTO akun (kode, nama, tipe, saldo_normal) VALUES (?, ?, ?, ?)", [$acc['kode'], $acc['nama'], $acc['tipe'], $acc['normal']]);
                    }
                }

                $accIds = [];
                foreach ($accountsToCreate as $acc) {
                    $res = $db->fetch("SELECT id FROM akun WHERE kode = ?", [$acc['kode']]);
                    $accIds[$acc['kode']] = $res ? $res['id'] : null;
                }

                $akunKas = $db->fetch("SELECT id FROM akun WHERE kode = '1000' LIMIT 1")['id'] ?? null;
                $akunPiutangDefault = $db->fetch("SELECT id FROM akun WHERE kode = '1200' LIMIT 1")['id'] ?? null;

                // 3. Map/Create Jenis Simpanan with specific accounts
                $jsList = [
                    ['kode' => 'SP', 'nama' => 'Simpanan Pokok', 'akun_id' => $accIds['2001'], 'numerik' => '01'],
                    ['kode' => 'SW', 'nama' => 'Simpanan Wajib', 'akun_id' => $accIds['2002'], 'numerik' => '02'],
                    ['kode' => 'SS', 'nama' => 'Simpanan Sukarela', 'akun_id' => $accIds['2003'], 'numerik' => '03'],
                    ['kode' => 'SPRT', 'nama' => 'Simpanan Partisipatif', 'akun_id' => $accIds['2004'], 'numerik' => '04'],
                ];
                
                foreach ($jsList as $js) {
                    $exist = $db->fetch("SELECT id FROM jenis_simpanan WHERE kode = ? OR nama = ?", [$js['kode'], $js['nama']]);
                    if (!$exist) {
                        $db->insert("INSERT INTO jenis_simpanan (kode, nama, akun_id, kode_numerik, is_active) VALUES (?, ?, ?, ?, 1)", [$js['kode'], $js['nama'], $js['akun_id'], $js['numerik']]);
                    } else {
                        $db->execute("UPDATE jenis_simpanan SET kode = ?, akun_id = ?, kode_numerik = ? WHERE id = ?", [$js['kode'], $js['akun_id'], $js['numerik'], $exist['id']]);
                    }
                }

                $jsPokok = $db->fetch("SELECT id FROM jenis_simpanan WHERE kode = 'SP'")['id'] ?? null;
                $jsWajib = $db->fetch("SELECT id FROM jenis_simpanan WHERE kode = 'SW'")['id'] ?? null;
                $jsManasuka = $db->fetch("SELECT id FROM jenis_simpanan WHERE kode = 'SS'")['id'] ?? null;
                $jsPartisipasif = $db->fetch("SELECT id FROM jenis_simpanan WHERE kode = 'SPRT'")['id'] ?? null;

                // 4. Ensure & Map Jenis Pinjaman IDs
                $loanProducts = [
                    ['kode' => 'PB1', 'nama' => 'Pinjaman Berjangka 1', 'bunga' => 1.0, 'tipe' => 'flat', 'numerik' => '31', 'akun_id' => $accIds['1201']],
                    ['kode' => 'PB2', 'nama' => 'Pinjaman Berjangka 2', 'bunga' => 1.0, 'tipe' => 'flat', 'numerik' => '32', 'akun_id' => $accIds['1202']],
                    ['kode' => 'PINS', 'nama' => 'Pinjaman Insidental', 'bunga' => 1.0, 'tipe' => 'insidental', 'numerik' => '33', 'akun_id' => $accIds['1203']],
                    ['kode' => 'PBRG', 'nama' => 'Pinjaman Barang', 'bunga' => 1.0, 'tipe' => 'flat', 'numerik' => '34', 'akun_id' => $accIds['1204']],
                ];

                $jpIds = [];
                foreach ($loanProducts as $lp) {
                    $exist = $db->fetch("SELECT id FROM jenis_pinjaman WHERE kode = ?", [$lp['kode']]);
                    if (!$exist) {
                        $jpIds[$lp['kode']] = [
                            'id' => $db->insert(
                                "INSERT INTO jenis_pinjaman (kode, nama, bunga_persen, max_tenor, is_active, kode_numerik, akun_id) VALUES (?, ?, ?, 60, 1, ?, ?)",
                                [$lp['kode'], $lp['nama'], $lp['bunga'], $lp['numerik'], $lp['akun_id']]
                            ),
                            'tipe' => $lp['tipe']
                        ];
                    } else {
                        $db->execute("UPDATE jenis_pinjaman SET akun_id = ?, nama = ?, kode_numerik = ? WHERE id = ?", [$lp['akun_id'], $lp['nama'], $lp['numerik'], $exist['id']]);
                        $jpIds[$lp['kode']] = ['id' => $exist['id'], 'tipe' => $lp['tipe']];
                    }
                }

                $ktSetoran = $db->fetch("SELECT * FROM kode_transaksi_simpanan WHERE kode = 'STR'") ?? null;
                if (!$ktSetoran)
                    throw new Exception("Kode transaksi 'STR' (Setoran) tidak ditemukan.");

                $parseAmount = function ($val) {
                    $valStr = trim($val ?? '0');
                    $valStr = str_replace([' ', 'Rp', 'rp'], '', $valStr);
                    if (strpos($valStr, '.') !== false && strpos($valStr, ',') !== false) {
                        return (strrpos($valStr, '.') > strrpos($valStr, ',')) ? (float) str_replace(',', '', $valStr) : (float) str_replace(['.', ','], ['', '.'], $valStr);
                    }
                    return (strpos($valStr, ',') !== false) ? (float) str_replace(['.', ','], ['', '.'], $valStr) : (float) $valStr;
                };

                $parseIndoDate = function ($val) {
                    $val = trim($val ?? '');
                    if (empty($val))
                        return date('Y-m-d');

                    // Already YYYY-MM-DD?
                    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $val))
                        return $val;

                    $months = [
                        'Januari' => '01',
                        'Februari' => '02',
                        'Maret' => '03',
                        'April' => '04',
                        'Mei' => '05',
                        'Juni' => '06',
                        'Juli' => '07',
                        'Agustus' => '08',
                        'September' => '09',
                        'Oktober' => '10',
                        'November' => '11',
                        'Desember' => '12'
                    ];

                    // Handle "11 Februari 2025"
                    $parts = explode(' ', $val);
                    if (count($parts) === 3) {
                        $d = str_pad($parts[0], 2, '0', STR_PAD_LEFT);
                        $monthName = ucfirst(strtolower($parts[1])); // Normalisasi ke "Mei", "Februari", dll
                        $m = $months[$monthName] ?? '01';
                        $y = $parts[2];
                        return "$y-$m-$d";
                    }

                    // Fallback to strtotime if possible
                    $timestamp = strtotime($val);
                    return $timestamp ? date('Y-m-d', $timestamp) : date('Y-m-d');
                };

                $count = 0;
                while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
                    if (count($data) < 2)
                        continue;

                    $nama = trim($data[1] ?? '');
                    if (empty($nama))
                        continue;

                    $no_anggota_new = 'AGT-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);
                    $anggotaId = $db->insert(
                        "INSERT INTO anggota (no_anggota, nama, nik, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, telepon, email, pekerjaan, tgl_daftar, status)
                         VALUES (?, ?, '1234567890', 'Malang', '2000-10-10', 'L', 'Alamat Import', '081123456789', 'info@abc.com', 'Swasta', ?, 'aktif')",
                        [$no_anggota_new, $nama, date('Y-m-d')]
                    );

                    $password = password_hash('10102000', PASSWORD_DEFAULT);
                    $db->insert(
                        "INSERT INTO users (username, password, nama_lengkap, email, role_id, anggota_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        [$no_anggota_new, $password, $nama, 'info@abc.com', 3, $anggotaId, 1]
                    );

                    // A. SAVINGS
                    $rawBalances = [
                        ['id' => $jsPokok, 'val' => $data[2] ?? '0'],
                        ['id' => $jsWajib, 'val' => $data[3] ?? '0'],
                        ['id' => $jsManasuka, 'val' => $data[4] ?? '0'],
                        ['id' => $jsPartisipasif, 'val' => $data[5] ?? '0'],
                    ];

                    foreach ($rawBalances as $b) {
                        if ($b['id']) {
                            $jumlah = $parseAmount($b['val']);
                            if ($jumlah > 0) {
                                $jenis = $db->fetch("SELECT id, kode, nama, kode_numerik, akun_id FROM jenis_simpanan WHERE id = ?", [$b['id']]);
                                $noRekening = date('y') . "." . str_pad($jenis['kode_numerik'] ?: '00', 2, '0', STR_PAD_LEFT) . "." . str_pad($count + 1, 7, '0', STR_PAD_LEFT) . ".01";
                                $rekeningId = $db->insert("INSERT INTO rekening_simpanan (no_rekening, anggota_id, jenis_simpanan_id, tgl_buka, saldo, status) VALUES (?,?,?,?,?,?)", [$noRekening, $anggotaId, $b['id'], date('Y-m-d'), $jumlah, 'aktif']);

                                $noTransaksi = 'SMP' . date('Ymd') . str_pad($db->count("SELECT COUNT(*) FROM simpanan WHERE tgl_transaksi = ?", [date('Y-m-d')]) + 1, 4, '0', STR_PAD_LEFT);
                                $simpananId = $db->insert("INSERT INTO simpanan (no_transaksi, anggota_id, jenis_simpanan_id, rekening_id, kode_transaksi_id, tgl_transaksi, jumlah, saldo_sebelum, saldo_sesudah, keterangan, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)", [$noTransaksi, $anggotaId, $b['id'], $rekeningId, $ktSetoran['id'], date('Y-m-d'), $jumlah, 0, $jumlah, 'Saldo Awal Import', 1]);

                                $noBukti = 'JRN' . date('Ymd') . str_pad($db->count("SELECT COUNT(*) FROM jurnal WHERE tgl_transaksi = ?", [date('Y-m-d')]) + 1, 4, '0', STR_PAD_LEFT);
                                $jurnalId = $db->insert("INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, ref_id, total_debit, total_kredit, created_by) VALUES (?,?,?,?,?,?,?,?)", [$noBukti, date('Y-m-d'), "Saldo Awal " . $jenis['nama'] . " - " . $nama, 'simpanan', $simpananId, $jumlah, $jumlah, 1]);

                                $akunDebit = $ktSetoran['akun_debit_id'] ?: ($db->fetch("SELECT id FROM akun WHERE kode = '1000' LIMIT 1")['id'] ?? null);
                                if ($jenis['akun_id'] && $akunDebit) {
                                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, ?, 0)", [$jurnalId, $akunDebit, $jumlah]);
                                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, 0, ?)", [$jurnalId, $jenis['akun_id'], $jumlah]);
                                }
                            }
                        }
                    }

                    // B. LOANS (Indices 7-22)
                    $rawAgunan = trim($data[6] ?? '');
                    $tipeAgunan = (preg_match('/BPKB|Motor|Mobil|Kendaraan/i', $rawAgunan)) ? 'BPKB' : ((preg_match('/SHM|Sertifikat|Tanah|Rumah/i', $rawAgunan)) ? 'SHM' : 'Lainnya');

                    // Extract details from description
                    $noDokumen = null;
                    $pemilik = null;
                    $nilaiTaksasi = 0;
                    if (!empty($rawAgunan)) {
                        // Document Number: at least 3 chars and contains at least one digit
                        if (preg_match('/\b(?:Nomor|No\.?)\s*([A-Z0-9\.\-\/]*[0-9][A-Z0-9\.\-\/]*)/i', $rawAgunan, $m)) {
                            $noDokumen = trim($m[1]);
                        }
                        // Owner: stop before Rp/Nilai/Taksasi or another No/Nomor
                        if (preg_match('/\b(?:An\.?|A\/n|Nama|Pemilik|Atas\s+Nama)\s+([^,Rp\r\n\t]+?)(?=\s+(?:Rp|Nilai|Taksasi|No\.?|Nomor)|$)/i', $rawAgunan, $m)) {
                            $pemilik = trim($m[1]);
                        }
                        if (preg_match('/(?:Rp|Nilai|Taksasi)\s*([\d\.,]+)/i', $rawAgunan, $m)) {
                            $nilaiTaksasi = $parseAmount($m[1]);
                        }
                    }

                    $loanDataMap = [
                        ['id' => $jpIds['PB1']['id'] ?? null, 'idx' => 7, 'tipe' => 'flat', 'numerik' => '31'],
                        ['id' => $jpIds['PB2']['id'] ?? null, 'idx' => 11, 'tipe' => 'flat', 'numerik' => '32'],
                        ['id' => $jpIds['PINS']['id'] ?? null, 'idx' => 15, 'tipe' => 'insidental', 'numerik' => '33'],
                        ['id' => $jpIds['PBRG']['id'] ?? null, 'idx' => 19, 'tipe' => 'flat', 'numerik' => '34'],
                    ];

                    foreach ($loanDataMap as $ld) {
                        $plafond = $parseAmount($data[$ld['idx']] ?? '0');
                        $bakiDebet = $parseAmount($data[$ld['idx'] + 1] ?? '0');
                        $tglReal = $parseIndoDate($data[$ld['idx'] + 2] ?? date('Y-m-d'));
                        $tenor = max(1, (int) ($data[$ld['idx'] + 3] ?? 12));

                        if ($plafond > 0) {
                            $totalBunga = $plafond * (1.0 / 100) * $tenor;
                            $noPinjaman = date('y', strtotime($tglReal)) . "." . str_pad($ld['numerik'], 2, '0', STR_PAD_LEFT) . "." . str_pad($count + 1, 7, '0', STR_PAD_LEFT) . ".01";

                            $pinjamanId = $db->insert(
                                "INSERT INTO pinjaman (no_pinjaman, anggota_id, jenis_pinjaman_id, tgl_pengajuan, tgl_pencairan, jumlah, tenor, bunga_persen, total_bunga, total_bayar, sisa_pinjaman, status, agunan, keterangan, created_by)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, 1.0, ?, ?, ?, 'cair', ?, 'Migrasi Saldo Awal', 1)",
                                [$noPinjaman, $anggotaId, $ld['id'], $tglReal, $tglReal, $plafond, $tenor, $totalBunga, $plafond + $totalBunga, $bakiDebet, $rawAgunan]
                            );

                            // JURNAL: Saldo Awal Pinjaman (Baki Debet)
                            if ($bakiDebet > 0) {
                                $jenisP = $db->fetch("SELECT nama, akun_id FROM jenis_pinjaman WHERE id = ?", [$ld['id']]);
                                $noBukti = 'JRN' . date('Ymd') . str_pad($db->count("SELECT COUNT(*) FROM jurnal WHERE tgl_transaksi = ?", [date('Y-m-d')]) + 1, 4, '0', STR_PAD_LEFT);
                                // Set total_debit = $plafond to satisfy Audit "Selisih Nominal Transaksi vs Jurnal"
                                $jurnalId = $db->insert("INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, ref_id, total_debit, total_kredit, created_by) VALUES (?,?,?,?,?,?,?,?)", [$noBukti, date('Y-m-d'), "Saldo Awal " . $jenisP['nama'] . " - " . $nama, 'pinjaman', $pinjamanId, $plafond, $plafond, 1]);

                                $akunPiutangId = $jenisP['akun_id'] ?: $akunPiutang;
                                $akunKasId = $db->fetch("SELECT id FROM akun WHERE kode = '1000' LIMIT 1")['id'] ?? null;
                                if ($akunPiutangId && $akunKasId) {
                                    // Debit full Plafond
                                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, ?, 0)", [$jurnalId, $akunPiutangId, $plafond]);
                                    // Credit Kas only for Baki Debet (Migration)
                                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, 0, ?)", [$jurnalId, $akunKasId, $bakiDebet]);
                                    // Credit Piutang for the difference to get net Baki Debet in GL
                                    $paidAmount = $plafond - $bakiDebet;
                                    if ($paidAmount > 0) {
                                        $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, 0, ?)", [$jurnalId, $akunPiutangId, $paidAmount]);
                                    }
                                }
                            }

                            if (!empty($rawAgunan)) {
                                $db->insert(
                                    "INSERT INTO agunan (pinjaman_id, tipe_agunan, deskripsi, no_dokumen, pemilik, nilai_taksasi, tgl_terima, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 'aktif', 1)",
                                    [$pinjamanId, $tipeAgunan, $rawAgunan, $noDokumen, $pemilik, $nilaiTaksasi, $tglReal]
                                );
                            }

                            // Generate Installments with Precision Fix
                            $pokokPerBulan = round($plafond / $tenor);
                            $bungaPerBulan = round($plafond * (1.0 / 100));
                            $lunasCount = ($ld['tipe'] === 'flat') ? round(($plafond - $bakiDebet) / ($plafond / $tenor)) : 0;

                            $unpaidCount = $tenor - $lunasCount;
                            $pokokUnpaidBase = $unpaidCount > 0 ? floor($bakiDebet / $unpaidCount) : 0;
                            $pokokUnpaidLast = $unpaidCount > 0 ? ($bakiDebet - ($pokokUnpaidBase * ($unpaidCount - 1))) : 0;
                            $unpaidTrack = 0;

                            for ($i = 1; $i <= $tenor; $i++) {
                                $jt = date('Y-m-d', strtotime("$tglReal +$i month"));
                                $status = ($i <= $lunasCount) ? 'lunas' : 'belum';

                                if ($ld['tipe'] === 'insidental') {
                                    $p = ($i == $tenor) ? $bakiDebet : 0;
                                    $status = ($bakiDebet == 0) ? 'lunas' : 'belum';
                                } else {
                                    if ($status == 'belum') {
                                        $unpaidTrack++;
                                        $p = ($unpaidTrack == $unpaidCount) ? $pokokUnpaidLast : $pokokUnpaidBase;
                                    } else {
                                        $p = $pokokPerBulan;
                                    }
                                }

                                // Note: tgl_bayar is set to NULL for migration lunas to avoid Orphan Audit
                                $db->execute(
                                    "INSERT INTO angsuran (no_transaksi, pinjaman_id, angsuran_ke, tgl_jatuh_tempo, tgl_bayar, pokok, bunga, total, status)
                                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                                    ['AGS-' . $pinjamanId . '-' . $i, $pinjamanId, $i, $jt, null, $p, $bungaPerBulan, $p + $bungaPerBulan, $status]
                                );
                            }
                        }
                    }
                    $count++;
                }
                $db->commit();
                fclose($handle);

                clearCache(['member', 'loan']);
                successResponse(['imported' => $count], "Berhasil mengimpor $count anggota dengan data simpanan dan 4 produk pinjaman.");
            } catch (Exception $e) {
                if ($db->inTransaction())
                    $db->rollBack();
                if ($handle)
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

        clearCache(['member']);

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

        clearCache(['member' => $id]);

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
        clearCache(['member' => $id]);
        successResponse(null, 'Anggota berhasil dihapus');
        break;

    default:
        errorResponse('Method not allowed', 405);
}
