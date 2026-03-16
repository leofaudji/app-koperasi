<?php
// Backup & Restore Controller
authCheck();
checkPermission('settings.edit');

$db = Database::getInstance();
$pdo = $db->getConnection();

switch ($method) {

    // ── GET: Backup database → download .sql ──────────────────────
    case 'GET':
        $dbName = 'db_koperasi';
        $filename = 'backup_' . $dbName . '_' . date('Ymd_His') . '.sql';

        // Switch header to plain text for download
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Pragma: no-cache');
        header('Expires: 0');
        // Remove previous JSON content-type set in index.php
        header_remove('Content-Type');
        header('Content-Type: application/octet-stream');

        $output = [];
        $output[] = "-- ============================================================";
        $output[] = "-- Backup Database: {$dbName}";
        $output[] = "-- Dibuat: " . date('Y-m-d H:i:s');
        $output[] = "-- Aplikasi: Koperasi Simpan Pinjam";
        $output[] = "-- ============================================================";
        $output[] = "";
        $output[] = "SET FOREIGN_KEY_CHECKS=0;";
        $output[] = "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';";
        $output[] = "SET NAMES utf8mb4;";
        $output[] = "";

        // Get all table names
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

        foreach ($tables as $table) {
            // CREATE TABLE statement
            $createStmt = $pdo->query("SHOW CREATE TABLE `{$table}`")->fetch(PDO::FETCH_NUM);
            $output[] = "-- ----------------------------------------------------------";
            $output[] = "-- Tabel: `{$table}`";
            $output[] = "-- ----------------------------------------------------------";
            $output[] = "DROP TABLE IF EXISTS `{$table}`;";
            $output[] = $createStmt[1] . ";";
            $output[] = "";

            // Data rows
            $rows = $pdo->query("SELECT * FROM `{$table}`")->fetchAll(PDO::FETCH_ASSOC);
            if (!empty($rows)) {
                $columns = array_keys($rows[0]);
                $colList = '`' . implode('`, `', $columns) . '`';

                foreach ($rows as $row) {
                    $values = array_map(function ($v) use ($pdo) {
                        if ($v === null)
                            return 'NULL';
                        return $pdo->quote($v);
                    }, array_values($row));

                    $output[] = "INSERT INTO `{$table}` ({$colList}) VALUES (" . implode(', ', $values) . ");";
                }
                $output[] = "";
            }
        }

        $output[] = "";
        $output[] = "SET FOREIGN_KEY_CHECKS=1;";

        echo implode("\n", $output);
        exit;

    // ── POST: Restore database dari file .sql upload ─────────────
    case 'POST':
        // Hanya superadmin
        checkPermission('settings.edit');

        if (empty($_FILES['sql_file'])) {
            errorResponse('File SQL tidak ditemukan dalam request');
        }

        $file = $_FILES['sql_file'];

        if ($file['error'] !== UPLOAD_ERR_OK) {
            errorResponse('Upload gagal, kode error: ' . $file['error']);
        }

        // Validasi ekstensi
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if ($ext !== 'sql') {
            errorResponse('Hanya file .sql yang diizinkan');
        }

        // Batas ukuran: 50 MB
        $maxSize = 50 * 1024 * 1024;
        if ($file['size'] > $maxSize) {
            errorResponse('Ukuran file melebihi batas 50 MB');
        }

        $sqlContent = file_get_contents($file['tmp_name']);
        if ($sqlContent === false || trim($sqlContent) === '') {
            errorResponse('File SQL kosong atau tidak dapat dibaca');
        }

        // Eksekusi SQL statement per statement
        try {
            $pdo->exec("SET FOREIGN_KEY_CHECKS=0");

            // Pisah per statement (sederhana: pisah di ";")
            // Hapus komentar -- ... dan /* ... */
            $sqlContent = preg_replace('/\/\*.*?\*\//s', '', $sqlContent);
            $lines = explode("\n", $sqlContent);
            $filtered = array_filter($lines, function ($line) {
                $trimmed = ltrim($line);
                return !(strpos($trimmed, '--') === 0 || $trimmed === '');
            });
            $cleanSql = implode("\n", $filtered);

            // Split by semicolon (careful with quoted semicolons — basic split sufficient for mysqldump output)
            $statements = array_filter(
                array_map('trim', explode(';', $cleanSql)),
                fn($s) => !empty($s)
            );

            $count = 0;
            foreach ($statements as $stmt) {
                if (trim($stmt) !== '') {
                    $pdo->exec($stmt);
                    $count++;
                }
            }

            $pdo->exec("SET FOREIGN_KEY_CHECKS=1");

            successResponse(['statements_executed' => $count], "Restore berhasil! {$count} statement dieksekusi.");
        } catch (PDOException $e) {
            $pdo->exec("SET FOREIGN_KEY_CHECKS=1");
            errorResponse('Restore gagal: ' . $e->getMessage());
        }
        break;

    default:
        errorResponse('Method not allowed', 405);
}
