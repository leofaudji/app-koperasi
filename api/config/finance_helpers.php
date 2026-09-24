<?php
/**
 * Accounting & Finance Helpers for Loan & Repayment Journals
 */

if (!function_exists('getAkunProvisiByPinjaman')) {
    /**
     * Mendapatkan ID akun provisi berdasarkan kode / nama jenis pinjaman
     */
    function getAkunProvisiByPinjaman($db, $kodeJp = '', $namaJp = '') {
        $kodeJp = strtoupper(trim($kodeJp));
        $namaJp = strtolower(trim($namaJp));

        // 1. Pemetaan eksplisit berdasarkan kode jenis pinjaman
        $mapKode = [
            'PB1'  => '402', // Pendapatan Provisi Berjangka 1
            'PB2'  => '403', // Pendapatan Provisi Berjangka 2
            'PINS' => '404', // Pendapatan Provisi Insidental
            'PBRG' => '405', // Pendapatan Provisi Barang
        ];

        if (isset($mapKode[$kodeJp])) {
            $row = $db->fetch("SELECT id FROM akun WHERE kode = ? AND tipe = 'pendapatan' LIMIT 1", [$mapKode[$kodeJp]]);
            if ($row) return (int) $row['id'];
        }

        // 2. Pencarian cerdas berdasarkan kata kunci nama produk
        $keyword = '';
        if (strpos($namaJp, 'berjangka 1') !== false || strpos($namaJp, 'berjangka1') !== false) {
            $keyword = '%provisi%berjangka%1%';
        } elseif (strpos($namaJp, 'berjangka 2') !== false || strpos($namaJp, 'berjangka2') !== false) {
            $keyword = '%provisi%berjangka%2%';
        } elseif (strpos($namaJp, 'insidental') !== false) {
            $keyword = '%provisi%insidental%';
        } elseif (strpos($namaJp, 'barang') !== false) {
            $keyword = '%provisi%barang%';
        }

        if ($keyword) {
            $row = $db->fetch("SELECT id FROM akun WHERE tipe = 'pendapatan' AND nama LIKE ? LIMIT 1", [$keyword]);
            if ($row) return (int) $row['id'];
        }

        // 3. Fallback: akun provisi apapun
        $row = $db->fetch("SELECT id FROM akun WHERE tipe = 'pendapatan' AND nama LIKE '%provisi%' ORDER BY kode LIMIT 1");
        if ($row) return (int) $row['id'];

        // 4. Fallback terakhir: pendapatan lain-lain (409)
        $row = $db->fetch("SELECT id FROM akun WHERE kode = '409' OR (tipe = 'pendapatan' AND nama LIKE '%lain%') ORDER BY kode LIMIT 1");
        return $row ? (int) $row['id'] : null;
    }
}

if (!function_exists('getAkunBungaByPinjaman')) {
    /**
     * Mendapatkan ID akun pendapatan jasa/bunga berdasarkan kode / nama jenis pinjaman
     */
    function getAkunBungaByPinjaman($db, $kodeJp = '', $namaJp = '') {
        $kodeJp = strtoupper(trim($kodeJp));
        $namaJp = strtolower(trim($namaJp));

        // 1. Pemetaan eksplisit berdasarkan kode jenis pinjaman
        $mapKode = [
            'PB1'  => '400', // Pendapatan Jasa Berjangka 1
            'PB2'  => '401', // Pendapatan Jasa Berjangka 2
            'PINS' => '406', // Pendapatan Insidental
            'PBRG' => '410', // Pendapatan Barang
        ];

        if (isset($mapKode[$kodeJp])) {
            $row = $db->fetch("SELECT id FROM akun WHERE kode = ? AND tipe = 'pendapatan' LIMIT 1", [$mapKode[$kodeJp]]);
            if ($row) return (int) $row['id'];
        }

        // 2. Pencarian cerdas berdasarkan kata kunci nama produk
        $keyword = '';
        if (strpos($namaJp, 'berjangka 1') !== false || strpos($namaJp, 'berjangka1') !== false) {
            $keyword = '%jasa%berjangka%1%';
        } elseif (strpos($namaJp, 'berjangka 2') !== false || strpos($namaJp, 'berjangka2') !== false) {
            $keyword = '%jasa%berjangka%2%';
        } elseif (strpos($namaJp, 'insidental') !== false) {
            $keyword = '%pendapatan%insidental%';
        } elseif (strpos($namaJp, 'barang') !== false) {
            $keyword = '%pendapatan%barang%';
        }

        if ($keyword) {
            $row = $db->fetch("SELECT id FROM akun WHERE tipe = 'pendapatan' AND nama LIKE ? LIMIT 1", [$keyword]);
            if ($row) return (int) $row['id'];
        }

        // 3. Fallback: akun bunga/jasa (400 atau apapun dengan nama jasa/bunga)
        $row = $db->fetch("SELECT id FROM akun WHERE kode = '400' OR (tipe = 'pendapatan' AND (nama LIKE '%jasa%' OR nama LIKE '%bunga%')) ORDER BY kode LIMIT 1");
        if ($row) return (int) $row['id'];

        // 4. Fallback terakhir: pendapatan pertama
        $row = $db->fetch("SELECT id FROM akun WHERE tipe = 'pendapatan' ORDER BY kode LIMIT 1");
        return $row ? (int) $row['id'] : null;
    }
}

if (!function_exists('getAkunBiayaLainByNama')) {
    /**
     * Mendapatkan ID akun biaya pencairan non-provisi (administrasi, asuransi, materai, dll.)
     */
    function getAkunBiayaLainByNama($db, $namaBiaya = '', $jenisBiayaId = null) {
        // 1. Cek konfigurasi akun_id di jenis_biaya_pinjaman jika ada
        if ($jenisBiayaId) {
            $jbp = $db->fetch("SELECT akun_id FROM jenis_biaya_pinjaman WHERE id = ?", [$jenisBiayaId]);
            if (!empty($jbp['akun_id'])) {
                return (int) $jbp['akun_id'];
            }
        }

        $nama = strtolower(trim($namaBiaya));

        // 2. Cek apakah ada akun pendapatan dengan nama cocok
        if (strpos($nama, 'administrasi') !== false || strpos($nama, 'adm') !== false) {
            $row = $db->fetch("SELECT id FROM akun WHERE tipe = 'pendapatan' AND nama LIKE '%administrasi%' LIMIT 1");
            if ($row) return (int) $row['id'];
        }

        // 3. Default fallback ke akun Pendapatan lain-lain (kode 409)
        $row = $db->fetch("SELECT id FROM akun WHERE kode = '409' OR (tipe = 'pendapatan' AND nama LIKE '%lain%') LIMIT 1");
        if ($row) return (int) $row['id'];

        // 4. Fallback ke akun pendapatan apapun
        $row = $db->fetch("SELECT id FROM akun WHERE tipe = 'pendapatan' ORDER BY kode LIMIT 1");
        return $row ? (int) $row['id'] : null;
    }
}

if (!function_exists('getAccountingLockDate')) {
    /**
     * Mendapatkan tanggal batas kunci periode akuntansi (YYYY-MM-DD).
     * Jika ada, transaksi pada tanggal <= lock date tidak boleh diubah/ditambah.
     */
    function getAccountingLockDate($db) {
        $row = $db->fetch("SELECT setting_value FROM app_settings WHERE setting_key = 'accounting_locked_until' LIMIT 1");
        if ($row && !empty($row['setting_value'])) {
            $val = trim($row['setting_value']);
            if ($val !== '' && $val !== '0000-00-00') {
                return $val;
            }
        }
        return null;
    }
}

if (!function_exists('checkAccountingPeriodLock')) {
    /**
     * Memeriksa apakah tanggal transaksi berada dalam periode akuntansi yang terkunci (tutup buku).
     * Melempar Exception jika transaksi terkunci.
     *
     * @param object $db Database instance
     * @param string $tanggal YYYY-MM-DD
     * @param string $context Nama modul / aksi (opsional)
     * @throws Exception
     */
    function checkAccountingPeriodLock($db, $tanggal, $context = 'Transaksi') {
        if (empty($tanggal)) return;
        $lockDate = getAccountingLockDate($db);
        if (!$lockDate) return;

        $trxDate = substr(trim($tanggal), 0, 10);
        $lockDateStr = substr(trim($lockDate), 0, 10);

        if ($trxDate <= $lockDateStr) {
            $formattedLock = date('d/m/Y', strtotime($lockDateStr));
            $formattedTrx = date('d/m/Y', strtotime($trxDate));
            throw new Exception("Periode akuntansi s/d tanggal {$formattedLock} telah dikunci (tutup buku). {$context} pada tanggal {$formattedTrx} tidak dapat diproses atau diubah.");
        }
    }
}
