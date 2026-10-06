<?php
/**
 * Shared Health & Compliance Helper
 * KKPKK Kemenkop UKM No. 9 Tahun 2020 jo. Permenkop UKM No. 2 Tahun 2024 & Permenkop UKM No. 8 Tahun 2023
 * Digunakan bersama oleh Admin (KesehatanController) dan Portal Anggota (PortalController)
 */

if (!function_exists('getKesehatanKoperasiData')) {
    function getKesehatanKoperasiData($tahun = null, $forceRefresh = false) {
        $tahun = $tahun ?: date('Y');
        $cacheKey = "rep_tks_{$tahun}";
        $redis = class_exists('RedisManager') ? RedisManager::getInstance() : null;

        if (!$forceRefresh && $redis) {
            $cached = $redis->get($cacheKey);
            if ($cached !== false && !empty($cached)) {
                return $cached;
            }
        }

        $db = Database::getInstance();
        $tglAkhir = "$tahun-12-31";
        $tglAwal = "$tahun-01-01";

        // ══════════════════════════════════════════════
        // A. DATA PROFIL KELEMBAGAAN & APP_SETTINGS
        // ══════════════════════════════════════════════
        $settRows = $db->fetchAll("SELECT setting_key, setting_value FROM app_settings");
        $sett = [];
        foreach ($settRows as $sr) {
            $sett[$sr['setting_key']] = $sr['setting_value'];
        }

        $totalAnggota = (int) $db->count("SELECT COUNT(*) FROM anggota WHERE status = 'aktif'");
        $anggotaPeminjam = (int) $db->count("SELECT COUNT(DISTINCT anggota_id) FROM pinjaman WHERE status IN ('cair','lunas')");
        $anggotaPenabung = (int) $db->count("SELECT COUNT(DISTINCT anggota_id) FROM simpanan");

        // Status Penyelenggaraan RAT / Tutup Buku
        $jurnalTutup = $db->fetch(
            "SELECT id, no_bukti, tgl_transaksi FROM jurnal WHERE ref_tipe = 'akhir_tahun' AND YEAR(tgl_transaksi) = ? LIMIT 1",
            [$tahun]
        );
        $sudahRat = !empty($jurnalTutup);

        // ══════════════════════════════════════════════
        // B. AMBIL DATA NERACA (Akun Aset, Kewajiban, Modal)
        // ══════════════════════════════════════════════
        $akunNeraca = $db->fetchAll(
            "SELECT ak.kode, ak.nama, ak.tipe, ak.kelompok, ak.saldo_normal,
                CASE WHEN ak.saldo_normal='D'
                    THEN COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN jd.debit ELSE 0 END),0) - COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN jd.kredit ELSE 0 END),0)
                    ELSE COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN jd.kredit ELSE 0 END),0) - COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN jd.debit ELSE 0 END),0)
                END as saldo
            FROM akun ak
            LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id
            LEFT JOIN jurnal j ON jd.jurnal_id = j.id AND j.tgl_transaksi <= ?
            WHERE ak.is_active = 1 AND ak.tipe IN ('aset','kewajiban','modal')
            GROUP BY ak.id ORDER BY ak.kode",
            [$tglAkhir]
        );

        $totalAset = 0;
        $totalKewajiban = 0;
        $totalModal = 0;
        $kasBank = 0;
        $piutangPinjaman = 0;
        $simpananPokokWajib = 0;
        $cadangan = 0;

        foreach ($akunNeraca as $a) {
            $saldo = (float) $a['saldo'];
            $tipe = $a['tipe'];
            $kode = (string) $a['kode'];
            $nama = strtolower((string) $a['nama']);

            if ($tipe === 'aset') {
                $totalAset += $saldo;
                if (in_array($kode, ['100', '101', '102', '103', '1000', '1100']) || strpos($nama, 'kas') !== false || strpos($nama, 'bank') !== false) {
                    $kasBank += $saldo;
                }
                if (in_array($kode, ['104', '105', '106', '107', '108', '1200', '190']) || strpos($nama, 'piutang') !== false) {
                    $piutangPinjaman += $saldo;
                }
            } elseif ($tipe === 'kewajiban') {
                $totalKewajiban += $saldo;
                if (in_array($kode, ['212', '213', '204', '205']) || (strpos($nama, 'simpanan pokok') !== false) || (strpos($nama, 'simpanan wajib') !== false)) {
                    $simpananPokokWajib += $saldo;
                }
            } elseif ($tipe === 'modal') {
                $totalModal += $saldo;
                if (strpos($nama, 'cadangan') !== false || in_array($kode, ['301', '302'])) {
                    $cadangan += $saldo;
                }
            }
        }

        // ══════════════════════════════════════════════
        // C. AMBIL DATA LABA RUGI (PENDAPATAN & BEBAN)
        // ══════════════════════════════════════════════
        $akunLR = $db->fetchAll(
            "SELECT ak.kode, ak.nama, ak.tipe, ak.kelompok, ak.saldo_normal,
                CASE WHEN ak.saldo_normal='D'
                    THEN COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN jd.debit ELSE 0 END),0) - COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN jd.kredit ELSE 0 END),0)
                    ELSE COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN jd.kredit ELSE 0 END),0) - COALESCE(SUM(CASE WHEN j.id IS NOT NULL THEN jd.debit ELSE 0 END),0)
                END as saldo
            FROM akun ak
            LEFT JOIN jurnal_detail jd ON ak.id = jd.akun_id
            LEFT JOIN jurnal j ON jd.jurnal_id = j.id AND j.tgl_transaksi BETWEEN ? AND ?
            WHERE ak.is_active = 1 AND ak.tipe IN ('pendapatan','beban')
            GROUP BY ak.id ORDER BY ak.kode",
            [$tglAwal, $tglAkhir]
        );

        $totalPendapatan = 0;
        $pendapatanOperasional = 0;
        $totalBeban = 0;
        $bebanOperasional = 0;

        foreach ($akunLR as $a) {
            $saldo = (float) $a['saldo'];
            $tipe = $a['tipe'];
            $kode = (string) $a['kode'];

            if ($tipe === 'pendapatan') {
                $totalPendapatan += $saldo;
                if (in_array($kode, ['400', '401', '402', '403', '404', '405', '406', '410'])) {
                    $pendapatanOperasional += $saldo;
                }
            } elseif ($tipe === 'beban') {
                $totalBeban += $saldo;
                if ($kode !== '507' && strpos(strtolower($a['nama']), 'pajak') === false) {
                    $bebanOperasional += $saldo;
                }
            }
        }

        $shu = $totalPendapatan - $totalBeban;

        // Modal Sendiri menurut SAK EP & Kemenkop UKM
        $modalSendiri = $totalModal + $simpananPokokWajib + $cadangan + $shu;
        if ($modalSendiri <= 0 && $simpananPokokWajib > 0) {
            $modalSendiri = $simpananPokokWajib + $cadangan;
        }

        // ══════════════════════════════════════════════
        // D. DATA OPERASIONAL SIMPAN PINJAM & RISIKO
        // ══════════════════════════════════════════════
        $totalSimpanan = (float) ($db->fetch(
            "SELECT COALESCE(SUM(CASE WHEN kt.dk='D' THEN s.jumlah ELSE -s.jumlah END),0) as total
            FROM simpanan s JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id"
        )['total'] ?? 0);

        $totalPinjaman = (float) ($db->fetch(
            "SELECT COALESCE(SUM(jumlah),0) as total FROM pinjaman WHERE status IN ('cair','lunas')"
        )['total'] ?? 0);

        $sisaPinjaman = (float) ($db->fetch(
            "SELECT COALESCE(SUM(sisa_pinjaman),0) as total FROM pinjaman WHERE status = 'cair'"
        )['total'] ?? 0);

        // NPL: Pinjaman bermasalah (>90 hari jatuh tempo)
        $pinjamanBermasalah = 0;
        try {
            $pinjamanBermasalah = (float) ($db->fetch(
                "SELECT COALESCE(SUM(p.sisa_pinjaman),0) as total
                FROM pinjaman p
                WHERE p.status = 'cair'
                AND EXISTS (
                    SELECT 1 FROM angsuran ag
                    WHERE ag.pinjaman_id = p.id AND ag.status IN ('terlambat','belum')
                    AND ag.tgl_jatuh_tempo < DATE_SUB(CURDATE(), INTERVAL 90 DAY)
                )"
            )['total'] ?? 0);
        } catch (\Throwable $e) {
            $pinjamanBermasalah = 0;
        }

        // Cadangan risiko
        $cadanganRisiko = (float) ($db->fetch(
            "SELECT COALESCE(SUM(CASE WHEN ak.saldo_normal='D' THEN jd.debit - jd.kredit ELSE jd.kredit - jd.debit END),0) as t
            FROM akun ak
            JOIN jurnal_detail jd ON ak.id = jd.akun_id
            JOIN jurnal j ON jd.jurnal_id = j.id AND j.tgl_transaksi <= ?
            WHERE (ak.kode = '204' OR LOWER(ak.nama) LIKE '%cadangan risiko%' OR LOWER(ak.nama) LIKE '%cadangan piutang%')",
            [$tglAkhir]
        )['t'] ?? 0);
        if ($cadanganRisiko <= 0) {
            $cadanganRisiko = max(0, $modalSendiri * 0.05);
        }

        // Helper functions
        $hitungSkor = function(float $nilai, array $ranges): float {
            foreach ($ranges as [$min, $max, $skor]) {
                if ($nilai >= $min && ($max === null || $nilai < $max)) return (float) $skor;
            }
            return 0.0;
        };
        $pct = function(float $a, float $b): float {
            return $b > 0 ? round($a / $b * 100, 2) : 0.0;
        };

        $aspek = [];

        // ══════════════════════════════════════════════════════════════
        // 1. TATA KELOLA (BOBOT: 30%) - KKPKK KEMENKOP UKM
        // ══════════════════════════════════════════════════════════════
        $legalitasValid = !empty($sett['badan_hukum']) && !empty($sett['nik_koperasi']);
        $skor1_1 = ($legalitasValid && $totalAnggota >= 20) ? 10.0 : ($totalAnggota >= 20 ? 8.0 : 6.0);
        $statusLegalitas = $legalitasValid ? "Legalitas & NIK Lengkap ({$totalAnggota} Anggota)" : "Terdaftar ({$totalAnggota} Anggota)";

        $pengurusLengkap = !empty($sett['ketua_koperasi']);
        $skor1_2 = ($sudahRat && $pengurusLengkap) ? 10.0 : ($pengurusLengkap ? 8.0 : 6.0);
        $statusRatDesc = $sudahRat ? "Sudah RAT / Tutup Buku (Pengurus Lengkap)" : "Pengurus Terstruktur (Menunggu RAT)";

        $auditSelisihCount = (int) $db->count("SELECT COUNT(*) FROM jurnal j WHERE (SELECT COALESCE(SUM(debit),0) FROM jurnal_detail WHERE jurnal_id=j.id) != (SELECT COALESCE(SUM(kredit),0) FROM jurnal_detail WHERE jurnal_id=j.id)");
        $skor1_3 = ($auditSelisihCount === 0 && $totalAset > 0) ? 10.0 : 7.0;
        $statusAkuntansi = ($auditSelisihCount === 0) ? "Patuh 100% SAK EP (Neraca Seimbang)" : "Evaluasi Rekonsiliasi Jurnal";

        $aspek[] = [
            'no' => 1,
            'nama' => 'Tata Kelola (Governance)',
            'bobot' => 30,
            'skor' => round($skor1_1 + $skor1_2 + $skor1_3, 2),
            'indikator' => [
                [
                    'nama' => 'Prinsip Koperasi & Kelembagaan',
                    'nilai' => $statusLegalitas,
                    'satuan' => '',
                    'bobot' => 10,
                    'skor' => $skor1_1,
                    'formula' => 'Kelengkapan Legalitas Badan Hukum, NIK Kemenkop, dan Keanggotaan Aktif'
                ],
                [
                    'nama' => 'Penyelenggaraan RAT & Pengelolaan Manajemen',
                    'nilai' => $statusRatDesc,
                    'satuan' => '',
                    'bobot' => 10,
                    'skor' => $skor1_2,
                    'formula' => 'Kepatuhan Penyelenggaraan RAT Tahunan & Struktur Organisasi Pengurus/Pengawas'
                ],
                [
                    'nama' => 'Kepatuhan Kebijakan Akuntansi SAK EP (Permenkop 2/2024)',
                    'nilai' => $statusAkuntansi,
                    'satuan' => '',
                    'bobot' => 10,
                    'skor' => $skor1_3,
                    'formula' => 'Penerapan SAK EP, Standarisasi COA, dan Rekonsiliasi Jurnal Seimbang'
                ]
            ]
        ];

        // ══════════════════════════════════════════════════════════════
        // 2. PROFIL RISIKO (BOBOT: 15%) - KKPKK KEMENKOP UKM
        // ══════════════════════════════════════════════════════════════
        $rasioNpl = $pct($pinjamanBermasalah, $sisaPinjaman ?: $totalPinjaman ?: 1);
        $skor2_1 = $hitungSkor($rasioNpl, [
            [0, 5, 6.0], [5, 10, 4.5], [10, 15, 3.0], [15, 20, 1.5], [20, null, 0.0]
        ]);
        $rasioKas = $pct($kasBank, $totalSimpanan ?: $totalKewajiban ?: 1);
        $skor2_2 = $hitungSkor($rasioKas, [
            [0, 5, 1.5], [5, 8, 3.0], [8, 10, 4.0], [10, null, 5.0]
        ]);
        $rasioCadangan = $pinjamanBermasalah > 0 ? $pct($cadanganRisiko, $pinjamanBermasalah) : 100.0;
        $skor2_3 = $hitungSkor($rasioCadangan, [
            [0, 40, 1.0], [40, 70, 2.5], [70, 100, 3.5], [100, null, 4.0]
        ]);

        $aspek[] = [
            'no' => 2,
            'nama' => 'Profil Risiko (Risk Profile)',
            'bobot' => 15,
            'skor' => round($skor2_1 + $skor2_2 + $skor2_3, 2),
            'indikator' => [
                [
                    'nama' => 'Risiko Pembiayaan (Rasio NPL)',
                    'nilai' => $rasioNpl,
                    'satuan' => '%',
                    'bobot' => 6,
                    'skor' => $skor2_1,
                    'formula' => 'Pinjaman Bermasalah / Total Baki Debet Pinjaman × 100%'
                ],
                [
                    'nama' => 'Risiko Likuiditas (Cash Ratio)',
                    'nilai' => $rasioKas,
                    'satuan' => '%',
                    'bobot' => 5,
                    'skor' => $skor2_2,
                    'formula' => 'Total Kas & Bank / Total Simpanan & Kewajiban Lancar × 100%'
                ],
                [
                    'nama' => 'Risiko Operasional & Kecukupan Cadangan Risiko',
                    'nilai' => $rasioCadangan,
                    'satuan' => '%',
                    'bobot' => 4,
                    'skor' => $skor2_3,
                    'formula' => 'Cadangan Risiko / Pinjaman Bermasalah × 100%'
                ]
            ]
        ];

        // ══════════════════════════════════════════════════════════════
        // 3. KINERJA KEUANGAN (BOBOT: 40%) - KKPKK KEMENKOP UKM
        // ══════════════════════════════════════════════════════════════
        $roa = $pct($shu, $totalAset ?: 1);
        $skor3_1 = $hitungSkor($roa, [
            [-999, 0, 0.0], [0, 1, 2.5], [1, 3, 5.0], [3, 5, 7.5], [5, 7, 8.5], [7, null, 10.0]
        ]);
        $roe = $pct($shu, $modalSendiri ?: 1);
        $skor3_2 = $hitungSkor($roe, [
            [-999, 0, 0.0], [0, 2, 2.5], [2, 5, 5.0], [5, 7, 7.5], [7, 10, 8.5], [10, null, 10.0]
        ]);
        $rasioBopo = $pct($totalBeban, $totalPendapatan ?: 1);
        $skor3_3 = $hitungSkor($rasioBopo, [
            [0, 80, 10.0], [80, 85, 8.5], [85, 90, 7.0], [90, 95, 5.0], [95, 100, 3.0], [100, null, 1.0]
        ]);
        $kemandirianOps = $pct($totalPendapatan, $totalBeban ?: 1);
        $skor3_4 = $hitungSkor($kemandirianOps, [
            [0, 100, 2.0], [100, 110, 5.0], [110, 125, 8.0], [125, null, 10.0]
        ]);

        $aspek[] = [
            'no' => 3,
            'nama' => 'Kinerja Keuangan (Financial Performance)',
            'bobot' => 40,
            'skor' => round($skor3_1 + $skor3_2 + $skor3_3 + $skor3_4, 2),
            'indikator' => [
                [
                    'nama' => 'Rentabilitas Aset (Return on Assets / ROA)',
                    'nilai' => $roa,
                    'satuan' => '%',
                    'bobot' => 10,
                    'skor' => $skor3_1,
                    'formula' => 'Sisa Hasil Usaha (SHU) / Total Aset × 100%'
                ],
                [
                    'nama' => 'Rentabilitas Modal Sendiri (Return on Equity / ROE)',
                    'nilai' => $roe,
                    'satuan' => '%',
                    'bobot' => 10,
                    'skor' => $skor3_2,
                    'formula' => 'Sisa Hasil Usaha (SHU) / Modal Sendiri × 100%'
                ],
                [
                    'nama' => 'Efisiensi Operasional (Rasio BOPO)',
                    'nilai' => $rasioBopo,
                    'satuan' => '%',
                    'bobot' => 10,
                    'skor' => $skor3_3,
                    'formula' => 'Total Beban Operasional / Total Pendapatan × 100%'
                ],
                [
                    'nama' => 'Kemandirian Operasional Koperasi',
                    'nilai' => $kemandirianOps,
                    'satuan' => '%',
                    'bobot' => 10,
                    'skor' => $skor3_4,
                    'formula' => 'Total Pendapatan Usaha / Total Beban × 100%'
                ]
            ]
        ];

        // ══════════════════════════════════════════════════════════════
        // 4. PERMODALAN (BOBOT: 15%) - KKPKK KEMENKOP UKM
        // ══════════════════════════════════════════════════════════════
        $atmr = $piutangPinjaman > 0 ? $piutangPinjaman : ($totalAset ?: 1);
        $car = $pct($modalSendiri, $atmr);
        $skor4_1 = $hitungSkor($car, [
            [0, 4, 1.0], [4, 6, 3.5], [6, 8, 6.0], [8, null, 8.0]
        ]);
        $rasioModalAset = $pct($modalSendiri, $totalAset ?: 1);
        $skor4_2 = $hitungSkor($rasioModalAset, [
            [0, 10, 1.5], [10, 15, 3.0], [15, 20, 4.5], [20, 25, 5.5], [25, null, 7.0]
        ]);

        $aspek[] = [
            'no' => 4,
            'nama' => 'Permodalan (Capital Adequacy)',
            'bobot' => 15,
            'skor' => round($skor4_1 + $skor4_2, 2),
            'indikator' => [
                [
                    'nama' => 'Rasio Kecukupan Modal (CAR)',
                    'nilai' => $car,
                    'satuan' => '%',
                    'bobot' => 8,
                    'skor' => $skor4_1,
                    'formula' => 'Modal Sendiri / Aktiva Tertimbang Menurut Risiko (ATMR) × 100%'
                ],
                [
                    'nama' => 'Rasio Modal Sendiri terhadap Total Aset',
                    'nilai' => $rasioModalAset,
                    'satuan' => '%',
                    'bobot' => 7,
                    'skor' => $skor4_2,
                    'formula' => 'Modal Sendiri / Total Aset × 100%'
                ]
            ]
        ];

        // ══════════════════════════════════════════════════════════════
        // E. SKOR TOTAL & PREDIKAT RESMI KEMENKOP UKM
        // ══════════════════════════════════════════════
        $totalSkor = array_sum(array_column($aspek, 'skor'));
        $totalSkor = min(100.0, max(0.0, round($totalSkor, 2)));

        if ($totalSkor >= 80.0) {
            $predikat = 'Sehat';
            $predikatKode = 'sehat';
        } elseif ($totalSkor >= 66.0) {
            $predikat = 'Cukup Sehat';
            $predikatKode = 'cukup';
        } elseif ($totalSkor >= 51.0) {
            $predikat = 'Dalam Pengawasan';
            $predikatKode = 'dalam_pengawasan';
        } else {
            $predikat = 'Dalam Pengawasan Khusus';
            $predikatKode = 'pengawasan_khusus';
        }

        $result = [
            'tahun' => $tahun,
            'regulasi' => 'Permenkop UKM No. 9 Tahun 2020 jo. Permenkop UKM No. 2 Tahun 2024 & Permenkop UKM No. 8 Tahun 2023',
            'standar' => 'Kertas Kerja Pemeriksaan Kesehatan Koperasi (KKPKK)',
            'total_skor' => $totalSkor,
            'total_bobot' => 100,
            'persentase' => $totalSkor,
            'predikat' => $predikat,
            'predikat_kode' => $predikatKode,
            'aspek' => $aspek,
            'ringkasan' => [
                'total_aset' => $totalAset,
                'total_kewajiban' => $totalKewajiban,
                'modal_sendiri' => $modalSendiri,
                'total_simpanan' => $totalSimpanan,
                'total_pinjaman' => $totalPinjaman,
                'sisa_pinjaman' => $sisaPinjaman,
                'npl_nominal' => $pinjamanBermasalah,
                'shu' => $shu,
                'total_pendapatan' => $totalPendapatan,
                'total_beban' => $totalBeban,
                'kas' => $kasBank,
                'total_anggota' => $totalAnggota
            ]
        ];

        if ($redis) {
            $redis->set($cacheKey, $result, 3600);
        }

        return $result;
    }
}
