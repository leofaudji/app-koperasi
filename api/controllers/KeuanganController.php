<?php
// Keuangan Controller
authCheck();
$db = Database::getInstance();
$redis = RedisManager::getInstance();

function normalizeKelompokAkun($tipe, $kode = '', $nama = '', $kelompok = '') {
    $kelompok = trim((string) ($kelompok ?: ''));
    if ($kelompok !== '') return $kelompok;

    $text = strtolower(($kode ?: '') . ' ' . ($nama ?: ''));

    if ($tipe === 'aset') {
        if (preg_match('/(penyertaan|investasi|saham|surat berharga|modal jangka panjang|sekuritas)/', $text)) {
            return 'Penyertaan Modal Jangka Panjang';
        }
        if (preg_match('/(tanah|bangunan|gedung|kendaraan|mobil|motor|peralatan|mesin|inventaris|aktiva tetap|furniture|perlengkapan|aset tetap|kenderaan)/', $text)) {
            return 'Aktiva Tetap';
        }
        return 'Aktiva Lancar';
    }

    if ($tipe === 'kewajiban') {
        if (preg_match('/(jangka panjang|pinjaman|obligasi|leasing|hipotek|kewajiban jangka panjang|utang jangka panjang)/', $text)) {
            return 'Jangka Panjang';
        }
        return 'Jangka Pendek';
    }

    if ($tipe === 'modal') return 'Modal';
    if (in_array($tipe, ['pendapatan', 'beban'])) return 'Laba/Rugi';
    return null;
}

switch ($id) {
    case 'import-saldo-awal':
        checkPermission('keuangan.jurnal');
        if ($method !== 'POST') {
            errorResponse('Method not allowed', 405);
        }

        if (empty($_FILES['file'])) {
            errorResponse('Pilih file CSV terlebih dahulu');
        }

        $tgl = $params['tgl_transaksi'] ?? date('Y-01-01');

        $file = $_FILES['file']['tmp_name'];
        $handle = fopen($file, "r");
        if (!$handle) {
            errorResponse('Gagal membuka file CSV');
        }

        // Read headers
        $headers = fgetcsv($handle, 1000, ",");
        if (!$headers) {
            fclose($handle);
            errorResponse('File CSV kosong atau tidak valid');
        }

        // Auto detect delimiter (comma or semicolon)
        if (count($headers) === 1 && strpos($headers[0], ';') !== false) {
            rewind($handle);
            $headers = fgetcsv($handle, 1000, ";");
            $delimiter = ";";
        } else {
            $delimiter = ",";
        }

        $noIdx = -1;
        $ketIdx = -1;
        $saldoIdx = -1;
        $kelompokIdx = -1;

        foreach ($headers as $idx => $header) {
            $headerClean = strtolower(trim($header));
            if ($headerClean === 'no' || $headerClean === 'kode' || $headerClean === 'nomor' || $headerClean === 'no_akun') {
                $noIdx = $idx;
            } elseif ($headerClean === 'keterangan' || $headerClean === 'nama' || $headerClean === 'nama_akun') {
                $ketIdx = $idx;
            } elseif ($headerClean === 'saldo' || $headerClean === 'nominal' || $headerClean === 'saldo_awal') {
                $saldoIdx = $idx;
            } elseif ($headerClean === 'kelompok' || $headerClean === 'group' || $headerClean === 'group_akun' || $headerClean === 'kelompok_akun') {
                $kelompokIdx = $idx;
            }
        }

        // Fallbacks
        if ($noIdx === -1) $noIdx = 0;
        if ($ketIdx === -1) $ketIdx = 1;
        if ($saldoIdx === -1) $saldoIdx = 2;

        $tipeLaporan = $params['tipe_laporan'] ?? 'neraca'; // 'neraca' or 'labarugi'
        if ($tipeLaporan === 'neraca') {
            $typesToClear = ['aset', 'kewajiban', 'modal'];
            $refTipe = 'saldo_awal_neraca';
            $keteranganJurnal = 'Saldo Awal Neraca dari Import CSV';
        } else {
            $typesToClear = ['pendapatan', 'beban'];
            $refTipe = 'saldo_awal_labarugi';
            $keteranganJurnal = 'Saldo Awal Laba Rugi dari Import CSV';
        }

        $db->beginTransaction();
        try {
            // Delete existing journals, details, and COA accounts of the specified types
            $db->execute("SET FOREIGN_KEY_CHECKS = 0");
            
            // Delete details associated with these types
            $db->execute(
                "DELETE FROM jurnal_detail WHERE akun_id IN (SELECT id FROM akun WHERE tipe IN (" . implode(',', array_map(fn($t) => "'$t'", $typesToClear)) . "))"
            );
            
            // Delete previous saldo awal journal of this specific type
            $db->execute("DELETE FROM jurnal WHERE ref_tipe = ?", [$refTipe]);
            
            // Delete accounts of these types
            $db->execute(
                "DELETE FROM akun WHERE tipe IN (" . implode(',', array_map(fn($t) => "'$t'", $typesToClear)) . ")"
            );
            
            // Clean up any empty journals (except the other saldo awal type)
            $otherRefTipe = ($refTipe === 'saldo_awal_neraca') ? 'saldo_awal_labarugi' : 'saldo_awal_neraca';
            $db->execute(
                "DELETE FROM jurnal WHERE id NOT IN (SELECT DISTINCT jurnal_id FROM jurnal_detail) AND ref_tipe != ?",
                [$otherRefTipe]
            );
            
            $db->execute("SET FOREIGN_KEY_CHECKS = 1");

            $jDetails = [];
            $countAccountsCreated = 0;
            $countAccountsUsed = 0;

            while (($row = fgetcsv($handle, 1000, $delimiter)) !== false) {
                // Skip empty rows or incomplete columns
                if (empty($row) || count($row) <= max($noIdx, $ketIdx, $saldoIdx)) {
                    continue;
                }

                $no = trim($row[$noIdx]);
                $keterangan = trim($row[$ketIdx]);
                $saldoStr = trim($row[$saldoIdx]);
                $kelompok = $kelompokIdx !== -1 && isset($row[$kelompokIdx]) ? trim($row[$kelompokIdx]) : '';

                if ($no === '' || strtolower($no) === 'no' || strtolower($no) === 'kode') {
                    continue; // Skip headers or empty code
                }

                // Clean and parse Saldo
                $cleanSaldo = preg_replace('/[^\d,\.-]/', '', $saldoStr);
                if (strpos($cleanSaldo, ',') !== false && strpos($cleanSaldo, '.') !== false) {
                    if (strrpos($cleanSaldo, ',') > strrpos($cleanSaldo, '.')) {
                        $cleanSaldo = str_replace('.', '', $cleanSaldo);
                        $cleanSaldo = str_replace(',', '.', $cleanSaldo);
                    } else {
                        $cleanSaldo = str_replace(',', '', $cleanSaldo);
                    }
                } elseif (strpos($cleanSaldo, ',') !== false) {
                    $parts = explode(',', $cleanSaldo);
                    if (count($parts) === 2 && strlen($parts[1]) === 2) {
                        $cleanSaldo = str_replace(',', '.', $cleanSaldo);
                    } else {
                        $cleanSaldo = str_replace(',', '', $cleanSaldo);
                    }
                }
                $saldo = (float)$cleanSaldo;

                // Determine Account Type & Normal Balance
                $num = (int)$no;
                $tipe = '';
                $saldoNormal = '';

                if ($num >= 100 && $num <= 199) {
                    $tipe = 'aset';
                    $saldoNormal = 'D';
                } elseif ($num >= 200 && $num <= 299) {
                    $tipe = 'kewajiban';
                    $saldoNormal = 'K';
                } elseif ($num >= 300 && $num <= 399) {
                    $tipe = 'modal';
                    $saldoNormal = 'K';
                } elseif ($num >= 400 && $num <= 499) {
                    $tipe = 'pendapatan';
                    $saldoNormal = 'K';
                } elseif ($num >= 500 && $num <= 599) {
                    $tipe = 'beban';
                    $saldoNormal = 'D';
                } else {
                    // Fallback to first character
                    $firstChar = substr((string)$no, 0, 1);
                    if ($firstChar === '1') {
                        $tipe = 'aset';
                        $saldoNormal = 'D';
                    } elseif ($firstChar === '2') {
                        $tipe = 'kewajiban';
                        $saldoNormal = 'K';
                    } elseif ($firstChar === '3') {
                        $tipe = 'modal';
                        $saldoNormal = 'K';
                    } elseif ($firstChar === '4') {
                        $tipe = 'pendapatan';
                        $saldoNormal = 'K';
                    } elseif ($firstChar === '5') {
                        $tipe = 'beban';
                        $saldoNormal = 'D';
                    }
                }

                if (empty($tipe)) {
                    throw new Exception("Kode akun '$no' tidak valid. Harus diawali dengan angka 1-5 (atau range 100-599).");
                }

                // Validate account type matches selected report type
                if (!in_array($tipe, $typesToClear)) {
                    throw new Exception("Kode akun '$no' ({$tipe}) tidak sesuai dengan tipe laporan yang dipilih (" . implode(', ', $typesToClear) . ").");
                }

                // Check/Create Account
                $akun = $db->fetch("SELECT id FROM akun WHERE kode = ?", [$no]);
                if (!$akun) {
                    $kelompokFinal = normalizeKelompokAkun($tipe, $no, $keterangan, $kelompok);
                    $akunId = $db->insert(
                        "INSERT INTO akun (kode, nama, tipe, saldo_normal, level, kelompok) VALUES (?, ?, ?, ?, 1, ?)",
                        [$no, $keterangan, $tipe, $saldoNormal, $kelompokFinal]
                    );
                    $countAccountsCreated++;
                } else {
                    $akunId = $akun['id'];
                    $kelompokFinal = normalizeKelompokAkun($tipe, $no, $keterangan, $kelompok);
                    $db->execute("UPDATE akun SET nama = ?, tipe = ?, saldo_normal = ?, kelompok = ? WHERE id = ?", [$keterangan, $tipe, $saldoNormal, $kelompokFinal, $akunId]);
                }
                $countAccountsUsed++;

                // Debit & Kredit rules
                $debit = 0;
                $kredit = 0;
                if ($saldoNormal === 'D') {
                    if ($saldo >= 0) {
                        $debit = $saldo;
                    } else {
                        $kredit = abs($saldo);
                    }
                } else {
                    if ($saldo >= 0) {
                        $kredit = $saldo;
                    } else {
                        $debit = abs($saldo);
                    }
                }

                if ($debit > 0 || $kredit > 0) {
                    $jDetails[] = [
                        'akun_id' => $akunId,
                        'debit' => $debit,
                        'kredit' => $kredit,
                        'keterangan' => 'Saldo Awal ' . $keterangan
                    ];
                }
            }
            fclose($handle);

            if (empty($jDetails)) {
                throw new Exception("Tidak ada saldo akun yang diimport.");
            }

            // Calculate totals and balance
            $totalDebit = array_sum(array_column($jDetails, 'debit'));
            $totalKredit = array_sum(array_column($jDetails, 'kredit'));
            $diff = $totalDebit - $totalKredit;

            $messageAddon = '';
            if (abs($diff) > 0.01) {
                // Need a balancing entry on account 3999
                $akunBal = $db->fetch("SELECT id FROM akun WHERE kode = '3999'");
                if (!$akunBal) {
                    $akunBalId = $db->insert(
                        "INSERT INTO akun (kode, nama, tipe, saldo_normal, level) VALUES ('3999', 'Selisih Saldo Awal', 'modal', 'K', 1)"
                    );
                } else {
                    $akunBalId = $akunBal['id'];
                }

                $balDebit = 0;
                $balKredit = 0;
                if ($diff > 0) {
                    // Debit is larger, we need Credit on 3999
                    $balKredit = $diff;
                } else {
                    // Credit is larger, we need Debit on 3999
                    $balDebit = abs($diff);
                }

                $jDetails[] = [
                    'akun_id' => $akunBalId,
                    'debit' => $balDebit,
                    'kredit' => $balKredit,
                    'keterangan' => 'Penyeimbang Selisih Saldo Awal'
                ];

                $totalDebit += $balDebit;
                $totalKredit += $balKredit;
                $messageAddon = " (Ditambahkan penyesuaian selisih sebesar " . formatIDR(abs($diff)) . " pada akun Selisih Saldo Awal [3999])";
            }

            // Insert Journal
            $noBukti = generateNo('JRN', 'jurnal', 'no_bukti');
            $jurnalId = $db->insert(
                "INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, total_debit, total_kredit, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                [$noBukti, $tgl, $keteranganJurnal, $refTipe, $totalDebit, $totalKredit, $_SESSION['user_id']]
            );

            foreach ($jDetails as $det) {
                $db->execute(
                    "INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit, keterangan) VALUES (?, ?, ?, ?, ?)",
                    [$jurnalId, $det['akun_id'], $det['debit'], $det['kredit'], $det['keterangan']]
                );
            }

            // Sync master data accounts with the new COA IDs
            // 1. Update jenis_simpanan
            $allJS = $db->fetchAll("SELECT id, kode, nama FROM jenis_simpanan");
            foreach ($allJS as $js) {
                $jsCode = $js['kode'];
                $jsName = strtolower($js['nama']);
                
                $matchedAkun = null;
                if ($jsCode === 'SP') {
                    $matchedAkun = $db->fetch("SELECT id FROM akun WHERE kode = '2001' OR (nama LIKE '%pokok%' AND tipe = 'kewajiban') LIMIT 1");
                } elseif ($jsCode === 'SW') {
                    $matchedAkun = $db->fetch("SELECT id FROM akun WHERE kode = '2002' OR (nama LIKE '%wajib%' AND tipe = 'kewajiban') LIMIT 1");
                } elseif ($jsCode === 'SS') {
                    $matchedAkun = $db->fetch("SELECT id FROM akun WHERE kode = '2003' OR (nama LIKE '%sukarela%' AND tipe = 'kewajiban') LIMIT 1");
                } elseif ($jsCode === 'SPRT') {
                    $matchedAkun = $db->fetch("SELECT id FROM akun WHERE kode = '2004' OR ((nama LIKE '%partisipatif%' OR nama LIKE '%partisipasi%') AND tipe = 'kewajiban') LIMIT 1");
                }
                
                if (!$matchedAkun) {
                    if (strpos($jsName, 'pokok') !== false) {
                        $matchedAkun = $db->fetch("SELECT id FROM akun WHERE nama LIKE '%pokok%' AND tipe = 'kewajiban' LIMIT 1");
                    } elseif (strpos($jsName, 'wajib') !== false) {
                        $matchedAkun = $db->fetch("SELECT id FROM akun WHERE nama LIKE '%wajib%' AND tipe = 'kewajiban' LIMIT 1");
                    } elseif (strpos($jsName, 'sukarela') !== false) {
                        $matchedAkun = $db->fetch("SELECT id FROM akun WHERE nama LIKE '%sukarela%' AND tipe = 'kewajiban' LIMIT 1");
                    } elseif (strpos($jsName, 'partisipatif') !== false || strpos($jsName, 'partisipasi') !== false) {
                        $matchedAkun = $db->fetch("SELECT id FROM akun WHERE (nama LIKE '%partisipatif%' OR nama LIKE '%partisipasi%') AND tipe = 'kewajiban' LIMIT 1");
                    }
                }
                
                if (!$matchedAkun) {
                    $matchedAkun = $db->fetch("SELECT id FROM akun WHERE tipe = 'kewajiban' ORDER BY kode LIMIT 1");
                }
                
                if ($matchedAkun) {
                    $db->execute("UPDATE jenis_simpanan SET akun_id = ? WHERE id = ?", [$matchedAkun['id'], $js['id']]);
                }
            }

            // 2. Update jenis_pinjaman
            $allJP = $db->fetchAll("SELECT id, kode, nama FROM jenis_pinjaman");
            foreach ($allJP as $jp) {
                $jpName = strtolower($jp['nama']);
                $matchedAkun = null;
                
                $codeMap = [
                    'PR' => '1200', 'PB1' => '1201', 'PB2' => '1202', 'PINS' => '1203', 'PBRG' => '1204'
                ];
                if (isset($codeMap[$jp['kode']])) {
                    $matchedAkun = $db->fetch("SELECT id FROM akun WHERE kode = ? AND tipe = 'aset'", [$codeMap[$jp['kode']]]);
                }
                
                if (!$matchedAkun) {
                    $searchWord = '';
                    if (strpos($jpName, 'reguler') !== false) $searchWord = 'reguler';
                    elseif (strpos($jpName, 'darurat') !== false) $searchWord = 'darurat';
                    elseif (strpos($jpName, 'konsumtif') !== false) $searchWord = 'konsumtif';
                    elseif (strpos($jpName, 'berjangka 1') !== false || strpos($jpName, 'berjangka1') !== false) $searchWord = 'berjangka';
                    elseif (strpos($jpName, 'insidental') !== false) $searchWord = 'insidental';
                    elseif (strpos($jpName, 'barang') !== false) $searchWord = 'barang';
                    
                    if ($searchWord) {
                        $matchedAkun = $db->fetch("SELECT id FROM akun WHERE nama LIKE ? AND tipe = 'aset' LIMIT 1", ["%{$searchWord}%"]);
                    }
                }
                
                if (!$matchedAkun) {
                    $matchedAkun = $db->fetch("SELECT id FROM akun WHERE (kode LIKE '12%' OR nama LIKE '%piutang%') AND tipe = 'aset' ORDER BY kode LIMIT 1");
                }
                
                if ($matchedAkun) {
                    $db->execute("UPDATE jenis_pinjaman SET akun_id = ? WHERE id = ?", [$matchedAkun['id'], $jp['id']]);
                }
            }

            // 3. Update kode_transaksi_simpanan
            $akunKas = $db->fetch("SELECT id FROM akun WHERE kode = '1000' OR (nama LIKE '%kas%' AND tipe = 'aset') ORDER BY kode LIMIT 1")['id'] ?? null;
            $akunSimpanan = $db->fetch("SELECT id FROM akun WHERE kode = '2000' OR (nama LIKE '%simpanan%' AND tipe = 'kewajiban') ORDER BY kode LIMIT 1")['id'] ?? null;
            $akunBebanBunga = $db->fetch("SELECT id FROM akun WHERE kode = '5000' OR (nama LIKE '%beban bunga%' AND tipe = 'beban') ORDER BY kode LIMIT 1")['id'] ?? null;
            $akunHutangPajak = $db->fetch("SELECT id FROM akun WHERE kode = '2200' OR (nama LIKE '%pajak%' AND tipe = 'kewajiban') ORDER BY kode LIMIT 1")['id'] ?? null;
            $akunPendapatanAdmin = $db->fetch("SELECT id FROM akun WHERE kode = '4100' OR (nama LIKE '%administrasi%' AND tipe = 'pendapatan') ORDER BY kode LIMIT 1")['id'] ?? null;

            $allKT = $db->fetchAll("SELECT id, kode FROM kode_transaksi_simpanan");
            foreach ($allKT as $kt) {
                $debId = null;
                $kredId = null;
                
                switch ($kt['kode']) {
                    case 'STR':
                        $debId = $akunKas;
                        $kredId = $akunSimpanan;
                        break;
                    case 'TRK':
                        $debId = $akunSimpanan;
                        $kredId = $akunKas;
                        break;
                    case 'BNG':
                        $debId = $akunBebanBunga;
                        $kredId = $akunSimpanan;
                        break;
                    case 'PJK':
                        $debId = $akunSimpanan;
                        $kredId = $akunHutangPajak;
                        break;
                    case 'ADM':
                        $debId = $akunSimpanan;
                        $kredId = $akunPendapatanAdmin;
                        break;
                    case 'TRF':
                        $debId = $akunSimpanan;
                        $kredId = $akunSimpanan;
                        break;
                    case 'TRO':
                        $debId = $akunSimpanan;
                        $kredId = $akunSimpanan;
                        break;
                    case 'KRD':
                        $debId = $akunSimpanan;
                        $kredId = $akunSimpanan;
                        break;
                    case 'KRK':
                        $debId = $akunSimpanan;
                        $kredId = $akunSimpanan;
                        break;
                }
                
                $db->execute("UPDATE kode_transaksi_simpanan SET akun_debit_id = ?, akun_kredit_id = ? WHERE id = ?", [$debId, $kredId, $kt['id']]);
            }

            $db->commit();
            clearCache(['finance', 'coa', 'audit']);

            successResponse([
                'created_accounts' => $countAccountsCreated,
                'used_accounts' => $countAccountsUsed,
                'total_debit' => $totalDebit,
                'total_kredit' => $totalKredit
            ], "Berhasil mengimpor $countAccountsUsed akun dan saldo awal. Pembuatan akun baru: $countAccountsCreated.$messageAddon");

        } catch (Exception $e) {
            $db->rollBack();
            if (isset($handle) && is_resource($handle)) {
                fclose($handle);
            }
            errorResponse('Gagal import saldo awal: ' . $e->getMessage());
        }
        break;

    case 'jurnal':
        checkPermission('keuangan.jurnal');
        if ($method === 'GET') {
            $dari = $params['dari'] ?? date('Y-m-01');
            $sampai = $params['sampai'] ?? date('Y-m-d');
            $page = $params['page'] ?? 1;
            $perPage = $params['per_page'] ?? PER_PAGE;

            $where = "WHERE j.tgl_transaksi BETWEEN ? AND ?";
            $binds = [$dari, $sampai];

            if (!empty($params['search'])) {
                $where .= " AND (j.no_bukti LIKE ? OR j.keterangan LIKE ?)";
                $binds[] = "%{$params['search']}%";
                $binds[] = "%{$params['search']}%";
            }

            $offset = ($page - 1) * $perPage;
            $total = $db->count("SELECT COUNT(*) FROM jurnal j $where", $binds);

            $jurnals = $db->fetchAll(
                "SELECT j.*, u.nama_lengkap as created_by_nama
                 FROM jurnal j LEFT JOIN users u ON j.created_by = u.id
                 $where ORDER BY j.tgl_transaksi DESC, j.id DESC
                 LIMIT $perPage OFFSET $offset",
                $binds
            );

            // Get details for each jurnal
            foreach ($jurnals as &$jurnal) {
                $jurnal['details'] = $db->fetchAll(
                    "SELECT jd.*, ak.kode as akun_kode, ak.nama as akun_nama
                     FROM jurnal_detail jd JOIN akun ak ON jd.akun_id = ak.id
                     WHERE jd.jurnal_id = ? ORDER BY jd.debit DESC",
                    [$jurnal['id']]
                );
            }

            jsonResponse([
                'success' => true,
                'data' => $jurnals,
                'pagination' => [
                    'page' => (int) $page,
                    'per_page' => (int) $perPage,
                    'total' => (int) $total,
                    'total_pages' => ceil($total / $perPage)
                ]
            ]);
        } elseif ($method === 'POST') {
            // Manual journal entry
            $tgl = $params['tgl_transaksi'] ?? date('Y-m-d');
            $keterangan = $params['keterangan'] ?? '';
            $details = $params['details'] ?? [];

            if (empty($details))
                errorResponse('Detail jurnal wajib diisi');

            $totalDebit = array_sum(array_column($details, 'debit'));
            $totalKredit = array_sum(array_column($details, 'kredit'));

            if (abs($totalDebit - $totalKredit) > 0.01) {
                errorResponse('Total debit harus sama dengan total kredit');
            }

            $db->beginTransaction();
            try {
                $noBukti = generateNo('JRN', 'jurnal', 'no_bukti');
                $jurnalId = $db->insert(
                    "INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, total_debit, total_kredit, created_by)
                     VALUES (?,?,?,'manual',?,?,?)",
                    [$noBukti, $tgl, $keterangan, $totalDebit, $totalKredit, $_SESSION['user_id']]
                );

                foreach ($details as $detail) {
                    $db->execute(
                        "INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit, keterangan) VALUES (?,?,?,?,?)",
                        [$jurnalId, $detail['akun_id'], $detail['debit'] ?? 0, $detail['kredit'] ?? 0, $detail['keterangan'] ?? '']
                    );
                }

                $db->commit();
                // Clear all related caches via central helper
                clearCache(['finance', 'audit']);

                successResponse(['id' => $jurnalId, 'no_bukti' => $noBukti], 'Jurnal berhasil dibuat', 201);
            } catch (Exception $e) {
                $db->rollBack();
                errorResponse('Gagal membuat jurnal: ' . $e->getMessage());
            }
        } elseif ($method === 'POST' && $action === 'reverse') {
            // Reversal of journal
            $targetId = $params['id'] ?? null;
            if (!$targetId)
                errorResponse('ID Jurnal diperlukan');

            $original = $db->fetch("SELECT * FROM jurnal WHERE id = ?", [$targetId]);
            if (!$original)
                errorResponse('Jurnal tidak ditemukan');

            // Check if already reversed
            $exists = $db->fetch("SELECT id FROM jurnal WHERE ref_tipe = 'reversal' AND ref_id = ?", [$targetId]);
            if ($exists)
                errorResponse('Jurnal ini sudah pernah direversal');

            $details = $db->fetchAll("SELECT * FROM jurnal_detail WHERE jurnal_id = ?", [$targetId]);

            $db->beginTransaction();
            try {
                $noBukti = generateNo('REV', 'jurnal', 'no_bukti');
                $tgl = date('Y-m-d');
                $keterangan = "[REVERSAL] " . $original['no_bukti'] . " - " . $original['keterangan'];

                $revId = $db->insert(
                    "INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, ref_id, total_debit, total_kredit, created_by)
                     VALUES (?,?,?, 'reversal', ?, ?, ?, ?)",
                    [$noBukti, $tgl, $keterangan, $targetId, $original['total_debit'], $original['total_kredit'], $_SESSION['user_id']]
                );

                foreach ($details as $detail) {
                    // Swap Debit & Kredit
                    $db->execute(
                        "INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit, keterangan) VALUES (?,?,?,?,?)",
                        [$revId, $detail['akun_id'], $detail['kredit'], $detail['debit'], $detail['keterangan']]
                    );
                }

                $db->commit();
                clearCache(['finance', 'audit']);
                successResponse(['id' => $revId, 'no_bukti' => $noBukti], 'Jurnal reversal berhasil dibuat');
            } catch (Exception $e) {
                $db->rollBack();
                errorResponse('Gagal melakukan reversal: ' . $e->getMessage());
            }
        }
        break;

    case 'jasa-partisipatif':
        checkPermission('keuangan.jurnal');
        if ($method === 'GET') {
            $bulan = $params['bulan'] ?? date('m');
            $tahun = $params['tahun'] ?? date('Y');
            
            // Ambil persentase dari settings (default 15% jika belum diset)
            $setting = $db->fetch("SELECT setting_value FROM app_settings WHERE setting_key = 'persen_jasa_partisipatif'");
            $pct = $setting ? (float)$setting['setting_value'] : 15.0;
            
            // Ambil data bunga yang dibayarkan anggota pada periode tsb
            $allBunga = $db->fetchAll("
                SELECT a.id as anggota_id, a.nama as anggota_nama, a.no_anggota,
                       SUM(an.bunga) as total_bunga_bayar,
                       ROUND(SUM(an.bunga) * (? / 100), 0) as nilai_partisipatif
                FROM angsuran an
                JOIN pinjaman p ON an.pinjaman_id = p.id
                JOIN anggota a ON p.anggota_id = a.id
                WHERE an.status IN ('lunas', 'terlambat') 
                  AND MONTH(an.tgl_bayar) = ? AND YEAR(an.tgl_bayar) = ?
                GROUP BY a.id, a.nama, a.no_anggota
                HAVING nilai_partisipatif > 0
            ", [$pct, $bulan, $tahun]);

            // Filter: Hilangkan yang sudah pernah diposting untuk periode ini
            $searchPeriod = str_pad($bulan, 2, '0', STR_PAD_LEFT) . "-" . $tahun;
            $searchKey = "%Posting Jasa Partisipatif%Periode $searchPeriod%";

            $alreadyPosted = $db->fetchAll(
                "SELECT s.anggota_id, 
                        SUM(CASE WHEN kt.dk = 'D' THEN s.jumlah ELSE -s.jumlah END) as total_posted 
                 FROM simpanan s
                 JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                 WHERE s.keterangan LIKE ? GROUP BY s.anggota_id",
                [$searchKey]
            );
            
            $postedMap = [];
            foreach($alreadyPosted as $p) $postedMap[$p['anggota_id']] = (float)$p['total_posted'];

            $details = array_map(function($row) use ($postedMap) {
                $postedVal = $postedMap[$row['anggota_id']] ?? 0;
                $row['sudah_diposting'] = $postedVal;
                $row['sisa_posting'] = max(0, $row['nilai_partisipatif'] - $postedVal);
                return $row;
            }, $allBunga);
            
            // Tambahan: Ringkasan status 12 bulan untuk tahun tersebut
            $targets = $db->fetchAll("
                SELECT MONTH(an.tgl_bayar) as bulan, ROUND(SUM(an.bunga) * (? / 100), 0) as nilai
                FROM angsuran an
                JOIN pinjaman p ON an.pinjaman_id = p.id
                WHERE an.status IN ('lunas', 'terlambat') AND YEAR(an.tgl_bayar) = ?
                GROUP BY MONTH(an.tgl_bayar)
            ", [$pct, $tahun]);
            
            $realisasi = $db->fetchAll("
                SELECT s.keterangan, SUM(CASE WHEN kt.dk = 'D' THEN s.jumlah ELSE -s.jumlah END) as total
                FROM simpanan s
                JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                WHERE s.keterangan LIKE ? AND s.keterangan LIKE ?
                GROUP BY s.keterangan
            ", ["%Posting Jasa Partisipatif%", "%-$tahun%"]);

            $monthlySummary = [];
            foreach($targets as $t) {
                $m = (int)$t['bulan'];
                $monthlySummary[$m] = ['target' => (float)$t['nilai'], 'posted' => 0];
            }
            foreach($realisasi as $r) {
                if (preg_match('/Periode (\d{2})-\d{4}/', $r['keterangan'], $matches)) {
                    $m = (int)$matches[1];
                    if (!isset($monthlySummary[$m])) $monthlySummary[$m] = ['target' => 0, 'posted' => 0];
                    $monthlySummary[$m]['posted'] += (float)$r['total'];
                }
            }

            successResponse([
                'bulan' => $bulan,
                'tahun' => $tahun,
                'persen' => $pct,
                'details' => $details,
                'monthly_summary' => $monthlySummary,
                // Gunakan query yang lebih sederhana untuk deteksi keberadaan data
                'already_posted' => (int) $db->fetch(
                    "SELECT COUNT(*) FROM simpanan s 
                     WHERE s.keterangan LIKE ? AND NOT EXISTS (
                        SELECT 1 FROM simpanan s2 WHERE s2.keterangan LIKE CONCAT('%REVERSAL OF ', s.no_transaksi, '%')
                     )", 
                    [$searchKey]
                )['COUNT(*)']
            ]);
        } elseif ($method === 'POST') {
            $bulan = $params['bulan'] ?? '';
            $tahun = $params['tahun'] ?? '';
            $selectedIds = $params['selected_ids'] ?? []; // Daftar ID yang dipilih
            if (!$bulan || !$tahun) errorResponse('Bulan dan Tahun diperlukan');

            $setting = $db->fetch("SELECT setting_value FROM app_settings WHERE setting_key = 'persen_jasa_partisipatif'");
            $pct = $setting ? (float)$setting['setting_value'] : 15.0;

            // Validasi Master Data (Simpanan Partisipatif & Kode Transaksi)
            $js = $db->fetch("SELECT id, nama, akun_id, kode_numerik FROM jenis_simpanan WHERE kode = 'SPRT' LIMIT 1");
            if (!$js) errorResponse('Jenis Simpanan Partisipatif (SPRT) tidak ditemukan. Pastikan kode SPRT sudah ada.');
            
            $kt = $db->fetch("SELECT id FROM kode_transaksi_simpanan WHERE kode = 'STR' LIMIT 1");
            if (!$kt) errorResponse('Kode transaksi setoran (STR) tidak ditemukan.');

            $searchPeriod = str_pad($bulan, 2, '0', STR_PAD_LEFT) . "-" . $tahun;

            // Ambil data bunga potensial yang belum diposting
            $allBunga = $db->fetchAll("
                SELECT a.id as anggota_id, a.nama as anggota_nama, a.no_anggota,
                       SUM(an.bunga) as total_bunga,
                       ROUND(SUM(an.bunga) * (? / 100), 0) as potential_nilai
                FROM angsuran an
                JOIN pinjaman p ON an.pinjaman_id = p.id
                JOIN anggota a ON p.anggota_id = a.id
                WHERE an.status IN ('lunas', 'terlambat')
                  AND MONTH(an.tgl_bayar) = ? AND YEAR(an.tgl_bayar) = ?
                GROUP BY a.id, a.nama, a.no_anggota
                HAVING potential_nilai > 0
            ", [$pct, $bulan, $tahun]);

            // Cek yang sudah diposting agar tidak ganda
            $posted = $db->fetchAll(
                "SELECT s.anggota_id, 
                        SUM(CASE WHEN kt.dk = 'D' THEN s.jumlah ELSE -s.jumlah END) as total_posted 
                 FROM simpanan s
                 JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
                 WHERE s.keterangan LIKE ? GROUP BY s.anggota_id", 
                ["%Posting Jasa Partisipatif%Periode $searchPeriod%"]
            );
            $postedMap = [];
            foreach($posted as $p) $postedMap[$p['anggota_id']] = (float)$p['total_posted'];

            $data = [];
            foreach($allBunga as $row) {
                $postedVal = $postedMap[$row['anggota_id']] ?? 0;
                $diff = $row['potential_nilai'] - $postedVal;
                
                // Jika ada filter selectedIds, hanya masukkan yang ada di daftar
                $isIncluded = empty($selectedIds) || in_array($row['anggota_id'], $selectedIds);
                
                if ($diff > 1 && $isIncluded) {
                    $row['nilai'] = $diff;
                    $data[] = $row;
                }
            }

            if (empty($data)) errorResponse('Data sudah diposting atau tidak ada data bunga baru untuk diproses.');

            $db->beginTransaction();
            try {
                $tgl = date('Y-m-d');
                $count = 0;
                $totalPosted = 0;
                
                foreach ($data as $row) {
                    // 1. Cek atau Buat Rekening Simpanan Partisipatif jika belum punya
                    $rek = $db->fetch("SELECT id, saldo FROM rekening_simpanan WHERE anggota_id=? AND jenis_simpanan_id=? LIMIT 1", [$row['anggota_id'], $js['id']]);
                    if (!$rek) {
                        preg_match('/\d+/', $row['no_anggota'], $matches);
                        $aaaaaaa = str_pad($matches[0] ?? '0', 7, '0', STR_PAD_LEFT);
                        $noRek = date('y') . "." . str_pad($js['kode_numerik'] ?: '04', 2, '0', STR_PAD_LEFT) . "." . $aaaaaaa . ".01";
                        $rekeningId = $db->insert("INSERT INTO rekening_simpanan (no_rekening, anggota_id, jenis_simpanan_id, tgl_buka, status, saldo) VALUES (?,?,?,?,'aktif',0)", [$noRek, $row['anggota_id'], $js['id'], $tgl]);
                        $saldoSblm = 0;
                    } else {
                        $rekeningId = $rek['id'];
                        $saldoSblm = (float)$rek['saldo'];
                    }

                    $jumlah = (float)$row['nilai'];
                    $saldoSsdh = $saldoSblm + $jumlah;

                    $paddedBulan = str_pad($bulan, 2, '0', STR_PAD_LEFT);
                    // 2. Input Transaksi Simpanan
                    $noTrx = generateNo('SMP', 'simpanan', 'no_transaksi');
                    $simpananId = $db->insert("INSERT INTO simpanan (no_transaksi, anggota_id, jenis_simpanan_id, rekening_id, kode_transaksi_id, tgl_transaksi, jumlah, saldo_sebelum, saldo_sesudah, keterangan, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)", [$noTrx, $row['anggota_id'], $js['id'], $rekeningId, $kt['id'], $tgl, $jumlah, $saldoSblm, $saldoSsdh, "Posting Jasa Partisipatif ($pct%) Periode $paddedBulan-$tahun", $_SESSION['user_id']]);
                    
                    // 3. Update Saldo Rekening
                    $db->execute("UPDATE rekening_simpanan SET saldo = ? WHERE id = ?", [$saldoSsdh, $rekeningId]);

                    // 4. Jurnal Otomatis (D: Pendapatan Bunga, K: Simpanan Partisipatif)
                    $noBukti = generateNo('JRN', 'jurnal', 'no_bukti');
                    $jId = $db->insert("INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, ref_id, total_debit, total_kredit, created_by) VALUES (?,?,?, 'simpanan', ?, ?, ?, ?)", [$noBukti, $tgl, "Posting Jasa Partisipatif - ".$row['anggota_nama']." ($paddedBulan-$tahun)", $simpananId, $jumlah, $jumlah, $_SESSION['user_id']]);
                    
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, (SELECT id FROM akun WHERE kode='4000' LIMIT 1), ?, 0)", [$jId, $jumlah]);
                    $db->execute("INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit) VALUES (?, ?, 0, ?)", [$jId, $js['akun_id'], $jumlah]);

                    $totalPosted += $jumlah;
                    $count++;
                }
                $db->commit();
                clearCache(['saving', 'finance', 'audit']);
                successResponse(['count' => $count, 'total' => $totalPosted], "Berhasil memposting jasa partisipatif untuk $count anggota.");
            } catch (Exception $e) { $db->rollBack(); errorResponse($e->getMessage()); }
        }
        elseif ($method === 'DELETE') {
            $bulan = $params['bulan'] ?? '';
            $tahun = $params['tahun'] ?? '';
            if (!$bulan || !$tahun) errorResponse('Bulan dan Tahun diperlukan untuk pembatalan');

            $paddedBulan = str_pad($bulan, 2, '0', STR_PAD_LEFT);
            $searchDesc = "Posting Jasa Partisipatif%Periode $paddedBulan-$tahun";

            // Cari transaksi simpanan yang sesuai dan belum pernah direversal sebelumnya
            $toReverse = $db->fetchAll(
                "SELECT s.* FROM simpanan s 
                 WHERE s.keterangan LIKE ? AND NOT EXISTS (
                    SELECT 1 FROM simpanan s2 WHERE s2.keterangan LIKE CONCAT('%REVERSAL OF ', s.no_transaksi, '%')
                 )",
                [$searchDesc]
            );

            if (empty($toReverse)) errorResponse('Tidak ditemukan data posting yang dapat dibatalkan untuk periode ini.');

            $db->beginTransaction();
            try {
                $count = 0;
                foreach ($toReverse as $row) {
                    // Ambil saldo terbaru rekening untuk perhitungan saldo_sesudah
                    $rek = $db->fetch("SELECT saldo FROM rekening_simpanan WHERE id = ?", [$row['rekening_id']]);
                    $saldoSblm = (float)($rek['saldo'] ?? 0);
                    $jumlah = (float)$row['jumlah'];
                    
                    // Reversal (D -> K): Saldo berkurang
                    $saldoSsdh = $saldoSblm - $jumlah;
                    $ktRev = $db->fetch("SELECT id FROM kode_transaksi_simpanan WHERE kode = 'KRK' LIMIT 1")['id'] ?? $row['kode_transaksi_id'];

                    $noTrx = generateNo('REV', 'simpanan', 'no_transaksi');
                    $db->insert(
                        "INSERT INTO simpanan (no_transaksi, anggota_id, jenis_simpanan_id, rekening_id, kode_transaksi_id, tgl_transaksi, jumlah, saldo_sebelum, saldo_sesudah, keterangan, created_by)
                         VALUES (?,?,?,?,?,CURDATE(),?,?,?,?,?)",
                        [$noTrx, $row['anggota_id'], $row['jenis_simpanan_id'], $row['rekening_id'], $ktRev, $jumlah, $saldoSblm, $saldoSsdh, "REVERSAL OF {$row['no_transaksi']}: {$row['keterangan']}", $_SESSION['user_id']]
                    );

                    $db->execute("UPDATE rekening_simpanan SET saldo = ? WHERE id = ?", [$saldoSsdh, $row['rekening_id']]);

                    // Reversal Jurnal Keuangan
                    $oldJurnal = $db->fetch("SELECT id, no_bukti, keterangan FROM jurnal WHERE ref_tipe='simpanan' AND ref_id=?", [$row['id']]);
                    if ($oldJurnal) {
                        $noBukti = generateNo('REV', 'jurnal', 'no_bukti');
                        $jurnalId = $db->insert(
                            "INSERT INTO jurnal (no_bukti, tgl_transaksi, keterangan, ref_tipe, ref_id, total_debit, total_kredit, created_by)
                             VALUES (?,CURDATE(),?, 'reversal', ?, ?, ?, ?)",
                            [$noBukti, "[REVERSAL] " . $oldJurnal['keterangan'], $oldJurnal['id'], $jumlah, $jumlah, $_SESSION['user_id']]
                        );
                        
                        $oldDetails = $db->fetchAll("SELECT * FROM jurnal_detail WHERE jurnal_id = ?", [$oldJurnal['id']]);
                        foreach ($oldDetails as $od) {
                            // Swap Debit ke Kredit dan sebaliknya
                            $db->execute(
                                "INSERT INTO jurnal_detail (jurnal_id, akun_id, debit, kredit, keterangan) VALUES (?,?,?,?,?)",
                                [$jurnalId, $od['akun_id'], $od['kredit'], $od['debit'], $od['keterangan']]
                            );
                        }
                    }
                    $count++;
                }
                $db->commit();
                clearCache(['saving', 'finance', 'audit']);
                successResponse(['count' => $count], "Berhasil membatalkan $count transaksi posting jasa partisipatif.");
            } catch (Exception $e) { $db->rollBack(); errorResponse($e->getMessage()); }
        }
        break;

    case 'buku-besar':
        checkPermission('keuangan.buku_besar');
        $akunId = $action ?? ($params['akun_id'] ?? '');
        $dari = $params['dari'] ?? date('Y-m-01');
        $sampai = $params['sampai'] ?? date('Y-m-d');

        $cacheKey = "rep_bukubesar_{$akunId}_{$dari}_{$sampai}";
        $responseData = getCachedData($cacheKey, function() use ($db, $akunId, $dari, $sampai) {
            if (empty($akunId)) {
                // List all accounts with saldo
                return $db->fetchAll(
                    "SELECT ak.*, 
                        COALESCE(SUM(jd.debit),0) as total_debit,
                        COALESCE(SUM(jd.kredit),0) as total_kredit,
                        CASE WHEN ak.saldo_normal='D' 
                            THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0)
                            ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0)
                        END as saldo
                    FROM akun ak
                    LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id
                    LEFT JOIN jurnal j ON jd.jurnal_id = j.id AND j.tgl_transaksi BETWEEN ? AND ?
                    WHERE ak.is_active = 1
                    GROUP BY ak.id ORDER BY ak.kode",
                    [$dari, $sampai]
                );
            } else {
                $akun = $db->fetch("SELECT * FROM akun WHERE id = ?", [$akunId]);
                if (!$akun)
                    errorResponse('Akun tidak ditemukan', 404);

                $details = $db->fetchAll(
                    "SELECT j.tgl_transaksi, j.no_bukti, j.keterangan, jd.debit, jd.kredit
                    FROM jurnal_detail jd
                    JOIN jurnal j ON jd.jurnal_id = j.id
                    WHERE jd.akun_id = ? AND j.tgl_transaksi BETWEEN ? AND ?
                    ORDER BY j.tgl_transaksi, j.id",
                    [$akunId, $dari, $sampai]
                );

                // Calculate running balance
                $saldo = 0;
                foreach ($details as &$row) {
                    if ($akun['saldo_normal'] === 'D') {
                        $saldo += $row['debit'] - $row['kredit'];
                    } else {
                        $saldo += $row['kredit'] - $row['debit'];
                    }
                    $row['saldo'] = $saldo;
                }

                return ['akun' => $akun, 'details' => $details, 'saldo_akhir' => $saldo];
            }
        });

        successResponse($responseData);
        break;

    case 'neraca':
        checkPermission('keuangan.neraca');
        $tgl = $params['tanggal'] ?? date('Y-m-d');
        $mode = $params['mode'] ?? 'sesudah';
        $modeFilter = ($mode === 'sebelum') ? "AND j.ref_tipe != 'akhir_tahun'" : '';

        $cacheKey = "rep_neraca_{$tgl}_{$mode}";
        $responseData = getCachedData($cacheKey, function() use ($db, $tgl, $mode, $modeFilter) {
            $akuns = $db->fetchAll(
                "SELECT ak.kode, ak.nama, ak.tipe, ak.saldo_normal, ak.kelompok,
                    CASE WHEN ak.saldo_normal='D' 
                        THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0)
                        ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0)
                    END as saldo
                FROM akun ak
                LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id
                LEFT JOIN jurnal j ON jd.jurnal_id = j.id AND j.tgl_transaksi <= ? $modeFilter
                WHERE ak.is_active = 1 AND ak.tipe IN ('aset','kewajiban','modal')
                GROUP BY ak.id ORDER BY ak.kode",
                [$tgl]
            );

            $aset = array_filter($akuns, fn($a) => $a['tipe'] === 'aset');
            $kewajiban = array_filter($akuns, fn($a) => $a['tipe'] === 'kewajiban');
            $modal = array_filter($akuns, fn($a) => $a['tipe'] === 'modal');

            $totalAset = array_sum(array_column(array_values($aset), 'saldo'));
            $totalKewajiban = array_sum(array_column(array_values($kewajiban), 'saldo'));
            $totalModal = array_sum(array_column(array_values($modal), 'saldo'));

            // ── Laba/Rugi Berjalan: 1 Januari s/d tanggal neraca ──
            $tahunNeraca = date('Y', strtotime($tgl));
            $tglAwalTahun = $tahunNeraca . '-01-01';

            $lrAkuns = $db->fetchAll(
                "SELECT ak.tipe, ak.saldo_normal,
                    CASE WHEN ak.saldo_normal='D'
                        THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0)
                        ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0)
                    END as saldo
                FROM akun ak
                LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id
                LEFT JOIN jurnal j ON jd.jurnal_id = j.id
                    AND j.tgl_transaksi BETWEEN ? AND ? $modeFilter
                WHERE ak.is_active = 1 AND ak.tipe IN ('pendapatan','beban')
                GROUP BY ak.id",
                [$tglAwalTahun, $tgl]
            );

            $totalPendapatan = 0;
            $totalBeban = 0;
            foreach ($lrAkuns as $lr) {
                if ($lr['tipe'] === 'pendapatan')
                    $totalPendapatan += (float) $lr['saldo'];
                if ($lr['tipe'] === 'beban')
                    $totalBeban += (float) $lr['saldo'];
            }
            $labaRugiBerjalan = $totalPendapatan - $totalBeban;

            return [
                'tanggal' => $tgl,
                'mode' => $mode,
                'aset' => array_values($aset),
                'kewajiban' => array_values($kewajiban),
                'modal' => array_values($modal),
                'total_aset' => $totalAset,
                'total_kewajiban' => $totalKewajiban,
                'total_modal' => $totalModal,
                'laba_rugi_berjalan' => $labaRugiBerjalan,
                'periode_lr' => ['dari' => $tglAwalTahun, 'sampai' => $tgl],
                'total_pasiva' => $totalKewajiban + $totalModal + $labaRugiBerjalan
            ];
        });

        successResponse($responseData);
        break;

    case 'laba-rugi':
        checkPermission('keuangan.laba_rugi');
        $dari = $params['dari'] ?? date('Y-01-01');
        $sampai = $params['sampai'] ?? date('Y-m-d');
        $mode = $params['mode'] ?? 'sesudah'; // 'sebelum' | 'sesudah'
        $modeFilter = ($mode === 'sebelum') ? "AND j.ref_tipe != 'akhir_tahun'" : '';

        $cacheKey = "rep_labarugi_{$dari}_{$sampai}_{$mode}";
        $responseData = getCachedData($cacheKey, function() use ($db, $dari, $sampai, $mode, $modeFilter) {
            $akuns = $db->fetchAll(
                "SELECT ak.id, ak.kode, ak.nama, ak.tipe, ak.saldo_normal, ak.kelompok_beban,
                    CASE WHEN ak.saldo_normal='D' 
                        THEN COALESCE(SUM(jd.debit),0) - COALESCE(SUM(jd.kredit),0)
                        ELSE COALESCE(SUM(jd.kredit),0) - COALESCE(SUM(jd.debit),0)
                    END as saldo
                FROM akun ak
                LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id
                LEFT JOIN jurnal j ON jd.jurnal_id = j.id AND j.tgl_transaksi BETWEEN ? AND ? $modeFilter
                WHERE ak.is_active = 1 AND ak.tipe IN ('pendapatan','beban')
                GROUP BY ak.id ORDER BY ak.kode",
                [$dari, $sampai]
            );

            $pendapatan = array_filter($akuns, fn($a) => $a['tipe'] === 'pendapatan');
            
            // Group beban by kelompok_beban
            $beban_operasional = [];
            $beban_pajak = [];
            foreach ($akuns as $a) {
                if ($a['tipe'] === 'beban') {
                    if ($a['kelompok_beban'] === 'Pajak') {
                        $beban_pajak[] = $a;
                    } else {
                        $beban_operasional[] = $a;
                    }
                }
            }

            $totalPendapatan = array_sum(array_column(array_values($pendapatan), 'saldo'));
            $totalBebanOp = array_sum(array_column($beban_operasional, 'saldo'));
            $totalBebanPajak = array_sum(array_column($beban_pajak, 'saldo'));
            $totalBeban = $totalBebanOp + $totalBebanPajak;

            $labaKotor = $totalPendapatan - $totalBebanOp;
            $labaSebelumPajak = $labaKotor - 0; // Currently no other deductions between gross and before tax
            $labaSetelahPajak = $labaSebelumPajak - $totalBebanPajak;

            return [
                'periode' => ['dari' => $dari, 'sampai' => $sampai],
                'mode' => $mode,
                'pendapatan' => array_values($pendapatan),
                'beban_operasional' => array_values($beban_operasional),
                'beban_pajak' => array_values($beban_pajak),
                'total_pendapatan' => $totalPendapatan,
                'total_beban_operasional' => $totalBebanOp,
                'total_beban_pajak' => $totalBebanPajak,
                'total_beban' => $totalBeban,
                'laba_kotor' => $labaKotor,
                'laba_sebelum_pajak' => $labaSebelumPajak,
                'laba_setelah_pajak' => $labaSetelahPajak,
                'laba_rugi' => $labaSetelahPajak
            ];
        });

        successResponse($responseData);
        break;

    case 'akun':
        checkPermission('keuangan.akun');
        if ($method === 'GET') {
            if ($action) {
                $cacheKey = "rep_coa_{$action}";
                $data = getCachedData($cacheKey, function() use ($db, $action) {
                    $row = $db->fetch("SELECT * FROM akun WHERE id = ?", [$action]);
                    if (!$row) errorResponse('Akun tidak ditemukan', 404);
                    return $row;
                });
                successResponse($data);
            } else {
                $cacheKey = "rep_coa_list";
                $data = getCachedData($cacheKey, function() use ($db) {
                    return $db->fetchAll("SELECT * FROM akun ORDER BY kode");
                });
                successResponse($data);
            }
        } elseif ($method === 'POST') {
            $kode = $params['kode'] ?? '';
            $nama = $params['nama'] ?? '';
            $tipe = $params['tipe'] ?? '';
            if (empty($kode) || empty($nama) || empty($tipe))
                errorResponse('Kode, nama, dan tipe wajib diisi');

            $exists = $db->count("SELECT COUNT(*) FROM akun WHERE kode = ?", [$kode]);
            if ($exists)
                errorResponse('Kode akun sudah digunakan');

            $saldoNormal = in_array($tipe, ['aset', 'beban']) ? 'D' : 'K';
            $kelompok = normalizeKelompokAkun($tipe, $kode, $nama, $params['kelompok'] ?? '');
            $newId = $db->insert(
                "INSERT INTO akun (kode, nama, tipe, saldo_normal, kelompok) VALUES (?,?,?,?,?)",
                [$kode, $nama, $tipe, $params['saldo_normal'] ?? $saldoNormal, $kelompok]
            );
            clearCache(['coa']);
            successResponse(['id' => $newId], 'Akun berhasil ditambahkan', 201);
        } elseif ($method === 'PUT') {
            if (!$action)
                errorResponse('ID akun diperlukan');
            $tipe = $params['tipe'] ?? 'aset';
            $kelompok = normalizeKelompokAkun($tipe, $params['kode'] ?? '', $params['nama'] ?? '', $params['kelompok'] ?? '');
            $db->execute(
                "UPDATE akun SET nama=?, tipe=?, saldo_normal=?, kelompok=?, is_active=? WHERE id=?",
                [$params['nama'] ?? '', $tipe, $params['saldo_normal'] ?? 'D', $kelompok, $params['is_active'] ?? 1, $action]
            );
            clearCache(['coa' => $action]);
            successResponse(null, 'Akun berhasil diupdate');
        } elseif ($method === 'DELETE') {
            if (!$action)
                errorResponse('ID akun diperlukan');
            $used = $db->count("SELECT COUNT(*) FROM jurnal_detail WHERE akun_id = ?", [$action]);
            if ($used)
                errorResponse('Akun sudah digunakan dalam jurnal');
            $db->execute("DELETE FROM akun WHERE id = ?", [$action]);
            clearCache(['coa' => $action]);
            successResponse(null, 'Akun berhasil dihapus');
        }
        break;

    default:
        errorResponse('Route keuangan tidak ditemukan', 404);
}
