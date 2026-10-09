<?php
/**
 * WebPushHelper - Native PHP 8.3 Web Push (RFC 8291 / RFC 8292 VAPID)
 * Handles EC P-256 payload encryption & cURL push delivery without external dependencies.
 */
require_once __DIR__ . '/database.php';

class WebPushHelper {
    private static $instance = null;
    private $db;
    private $vapidPublicKey;
    private $vapidPrivateKey;
    private $vapidSubject;

    private function __construct() {
        $this->db = Database::getInstance();
        $this->loadVapidKeys();
    }

    public static function getInstance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function loadVapidKeys() {
        $pub = $this->db->fetch("SELECT setting_value FROM app_settings WHERE setting_key = 'vapid_public_key'");
        $priv = $this->db->fetch("SELECT setting_value FROM app_settings WHERE setting_key = 'vapid_private_key'");
        $sub = $this->db->fetch("SELECT setting_value FROM app_settings WHERE setting_key = 'vapid_subject'");

        $this->vapidPublicKey = $pub ? $pub['setting_value'] : '';
        $this->vapidPrivateKey = $priv ? $priv['setting_value'] : '';
        $this->vapidSubject = $sub ? $sub['setting_value'] : 'mailto:admin@koperasi.com';
    }

    public function getPublicKey(): string {
        return $this->vapidPublicKey;
    }

    private function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    /**
     * Store or update device push subscription
     */
    public function subscribe(int $anggotaId, array $sub, string $userAgent = ''): bool {
        $endpoint = trim($sub['endpoint'] ?? '');
        $p256dh = trim($sub['keys']['p256dh'] ?? $sub['p256dh'] ?? '');
        $auth = trim($sub['keys']['auth'] ?? $sub['auth'] ?? '');

        if (!$endpoint || !$p256dh || !$auth) {
            return false;
        }

        // Check if endpoint exists
        $existing = $this->db->fetch("SELECT id FROM push_subscriptions WHERE endpoint = ?", [$endpoint]);
        if ($existing) {
            $this->db->execute(
                "UPDATE push_subscriptions SET anggota_id = ?, p256dh = ?, auth = ?, user_agent = ?, updated_at = NOW() WHERE id = ?",
                [$anggotaId, $p256dh, $auth, $userAgent, $existing['id']]
            );
        } else {
            $this->db->execute(
                "INSERT INTO push_subscriptions (anggota_id, endpoint, p256dh, auth, user_agent, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
                [$anggotaId, $endpoint, $p256dh, $auth, $userAgent]
            );
        }
        return true;
    }

    /**
     * Unsubscribe device endpoint
     */
    public function unsubscribe(string $endpoint): bool {
        return (bool) $this->db->execute("DELETE FROM push_subscriptions WHERE endpoint = ?", [$endpoint]);
    }

    /**
     * Convert DER signature to 64-byte raw (r || s) IEEE P1363
     */
    private function derToRawSignature(string $der): ?string {
        if (strlen($der) < 8 || ord($der[0]) !== 0x30) return null;
        $pos = 2;
        if (ord($der[1]) & 0x80) {
            $pos += (ord($der[1]) & 0x7f);
        }

        // Parse r
        if (ord($der[$pos++]) !== 0x02) return null;
        $rLen = ord($der[$pos++]);
        $r = substr($der, $pos, $rLen);
        $pos += $rLen;
        $r = ltrim($r, "\x00");
        $r = str_pad($r, 32, "\x00", STR_PAD_LEFT);

        // Parse s
        if (ord($der[$pos++]) !== 0x02) return null;
        $sLen = ord($der[$pos++]);
        $s = substr($der, $pos, $sLen);
        $s = ltrim($s, "\x00");
        $s = str_pad($s, 32, "\x00", STR_PAD_LEFT);

        return $r . $s;
    }

    /**
     * Create VAPID JWT token for RFC 8292
     */
    private function createVapidJwt(string $endpointOrigin): ?string {
        if (!$this->vapidPrivateKey) return null;

        $privRaw = $this->base64UrlDecode($this->vapidPrivateKey);
        $pubRaw = $this->base64UrlDecode($this->vapidPublicKey);

        // Reconstruct PKCS#8 EC PEM for OpenSSL 3
        $pkcs8Der = hex2bin('308187020100301306072a8648ce3d020106082a8648ce3d030107046d306b0201010420') . $privRaw . hex2bin('a144034200') . $pubRaw;
        $ecKeyPem = "-----BEGIN PRIVATE KEY-----\n" . chunk_split(base64_encode($pkcs8Der), 64, "\n") . "-----END PRIVATE KEY-----\n";

        $privKeyRes = openssl_pkey_get_private($ecKeyPem);
        if (!$privKeyRes) return null;

        $header = $this->base64UrlEncode(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
        $claims = $this->base64UrlEncode(json_encode([
            'aud' => $endpointOrigin,
            'exp' => time() + 43200, // 12 hours
            'sub' => $this->vapidSubject
        ]));

        $dataToSign = $header . '.' . $claims;
        $derSig = '';
        if (!openssl_sign($dataToSign, $derSig, $privKeyRes, OPENSSL_ALGO_SHA256)) {
            return null;
        }

        $rawSig = $this->derToRawSignature($derSig);
        if (!$rawSig || strlen($rawSig) !== 64) return null;

        return $dataToSign . '.' . $this->base64UrlEncode($rawSig);
    }

    /**
     * Get OpenSSL config file path on Windows
     */
    private function getOpenSslConf(): ?string {
        $cnfCandidates = [
            'D:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/extras/ssl/openssl.cnf',
            'C:/laragon/bin/php/php-8.3.30-Win32-vs16-x64/extras/ssl/openssl.cnf'
        ];
        foreach ($cnfCandidates as $c) {
            if (file_exists($c)) {
                putenv("OPENSSL_CONF=" . $c);
                return $c;
            }
        }
        return null;
    }

    /**
     * Encrypt payload using RFC 8291 (aes128gcm)
     */
    private function encryptPayload(string $clientPubB64, string $clientAuthB64, string $payload): ?array {
        $clientPubRaw = $this->base64UrlDecode($clientPubB64);
        $clientAuthRaw = $this->base64UrlDecode($clientAuthB64);

        if (strlen($clientPubRaw) !== 65 || strlen($clientAuthRaw) < 16) {
            return null;
        }

        $cnfPath = $this->getOpenSslConf();

        // Generate local ephemeral EC P-256 keypair
        $opt = ['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC];
        if ($cnfPath) $opt['config'] = $cnfPath;

        $localKey = openssl_pkey_new($opt);
        if (!$localKey) return null;

        $localDetails = openssl_pkey_get_details($localKey);
        $localPubRaw = "\x04" . $localDetails['ec']['x'] . $localDetails['ec']['y'];

        // Import client public key
        $clientPubKeyPem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode(
            hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200') . $clientPubRaw
        ), 64, "\n") . "-----END PUBLIC KEY-----\n";

        $clientPubKeyRes = openssl_pkey_get_public($clientPubKeyPem);
        if (!$clientPubKeyRes) return null;

        $sharedSecret = openssl_pkey_derive($clientPubKeyRes, $localKey, 256);
        if (!$sharedSecret) return null;

        // HKDF derivation
        $salt = random_bytes(16);
        $authInfo = "WebPush: info\0" . $clientPubRaw . $localPubRaw;
        $ikm = hash_hkdf('sha256', $sharedSecret, 32, $authInfo, $clientAuthRaw);

        $cekInfo = "Content-Encoding: aes128gcm\0";
        $cek = hash_hkdf('sha256', $ikm, 16, $cekInfo, $salt);

        $nonceInfo = "Content-Encoding: nonce\0";
        $nonce = hash_hkdf('sha256', $ikm, 12, $nonceInfo, $salt);

        // Record padding (delimiter \x02)
        $padded = $payload . "\x02";
        $tag = '';
        $ciphertext = openssl_encrypt($padded, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag);
        if ($ciphertext === false) return null;

        // Assemble RFC 8291 binary body
        $body = $salt . pack('N', 4096) . chr(strlen($localPubRaw)) . $localPubRaw . $ciphertext . $tag;

        return [
            'body' => $body,
            'localPub' => $localPubRaw
        ];
    }

    /**
     * Send push notification to a single subscription
     */
    public function sendToSubscription(array $sub, array $data): array {
        $endpoint = $sub['endpoint'] ?? '';
        $p256dh = $sub['p256dh'] ?? '';
        $auth = $sub['auth'] ?? '';

        if (!$endpoint || !$p256dh || !$auth) {
            return ['success' => false, 'error' => 'Missing subscription keys'];
        }

        $payloadJson = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $encrypted = $this->encryptPayload($p256dh, $auth, $payloadJson);
        if (!$encrypted) {
            return ['success' => false, 'error' => 'Failed to encrypt payload'];
        }

        // Parse origin from endpoint
        $parts = parse_url($endpoint);
        $origin = ($parts['scheme'] ?? 'https') . '://' . ($parts['host'] ?? '');

        $jwt = $this->createVapidJwt($origin);
        if (!$jwt) {
            return ['success' => false, 'error' => 'Failed to generate VAPID JWT'];
        }

        $headers = [
            'Content-Type: application/octet-stream',
            'Content-Encoding: aes128gcm',
            'TTL: 86400',
            'Urgency: high',
            'Authorization: vapid t=' . $jwt . ', k=' . $this->vapidPublicKey
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $endpoint);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $encrypted['body']);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        // HTTP/2 support if available
        if (defined('CURL_VERSION_HTTP2')) {
            curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_2_0);
        }

        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        // Handle expired subscription (404 Not Found or 410 Gone)
        if ($httpCode === 404 || $httpCode === 410) {
            $this->unsubscribe($endpoint);
            return ['success' => false, 'status' => 'expired', 'http_code' => $httpCode];
        }

        $isSuccess = ($httpCode >= 200 && $httpCode < 300);
        return [
            'success' => $isSuccess,
            'http_code' => $httpCode,
            'error' => $isSuccess ? null : ($curlError ?: "HTTP $httpCode response")
        ];
    }

    /**
     * Save push notification log into push_logs table
     */
    public function logPush(?int $anggotaId, string $tipe, string $title, string $message, string $url, int $totalDevices, int $successCount, int $failedCount, string $status, ?string $errorDetail = null): int {
        try {
            $userId = $_SESSION['user_id'] ?? null;
            return (int) $this->db->insert(
                "INSERT INTO push_logs (anggota_id, tipe, title, message, url, total_devices, success_count, failed_count, status, error_detail, created_by, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                [$anggotaId, $tipe, $title, $message, $url, $totalDevices, $successCount, $failedCount, $status, $errorDetail, $userId]
            );
        } catch (\Throwable $e) {
            error_log("Failed to insert push log: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Send push notification to all devices belonging to an Anggota
     */
    public function sendToAnggota(int $anggotaId, string $title, string $message, string $url = '/portal/', array $extra = []): array {
        $tipe = $extra['tipe'] ?? 'general';
        unset($extra['tipe']);

        $subs = $this->db->fetchAll("SELECT * FROM push_subscriptions WHERE anggota_id = ?", [$anggotaId]);
        if (empty($subs)) {
            $this->logPush($anggotaId, $tipe, $title, $message, $url, 0, 0, 0, 'no_device', 'Anggota belum mendaftarkan izin push');
            return ['success' => false, 'sent' => 0, 'total' => 0, 'message' => 'Anggota has no push subscriptions'];
        }

        $payload = array_merge([
            'title' => $title,
            'body' => $message,
            'url' => $url,
            'icon' => 'icons/icon-192.png',
            'badge' => 'icons/icon-192.png',
            'timestamp' => time() * 1000
        ], $extra);

        $sentCount = 0;
        $failedCount = 0;
        $lastError = null;

        foreach ($subs as $s) {
            $r = $this->sendToSubscription($s, $payload);
            if ($r['success']) {
                $sentCount++;
            } else {
                $failedCount++;
                if (!empty($r['error'])) $lastError = $r['error'];
            }
        }

        $status = ($sentCount > 0) ? ($failedCount > 0 ? 'partial' : 'success') : 'failed';
        $this->logPush($anggotaId, $tipe, $title, $message, $url, count($subs), $sentCount, $failedCount, $status, $lastError);

        return [
            'success' => ($sentCount > 0),
            'sent' => $sentCount,
            'failed' => $failedCount,
            'total' => count($subs)
        ];
    }

    /**
     * Send broadcast notification to all devices in the system
     */
    public function sendBroadcast(string $title, string $message, string $url = '/portal/', array $extra = []): array {
        $subs = $this->db->fetchAll("SELECT * FROM push_subscriptions");
        if (empty($subs)) {
            $this->logPush(null, 'broadcast', $title, $message, $url, 0, 0, 0, 'no_device', 'Belum ada perangkat terdaftar di sistem');
            return ['success' => false, 'sent' => 0, 'total' => 0, 'message' => 'No push subscriptions in system'];
        }

        $payload = array_merge([
            'title' => $title,
            'body' => $message,
            'url' => $url,
            'icon' => 'icons/icon-192.png',
            'badge' => 'icons/icon-192.png',
            'timestamp' => time() * 1000
        ], $extra);

        $sentCount = 0;
        $failedCount = 0;
        $lastError = null;

        foreach ($subs as $s) {
            $r = $this->sendToSubscription($s, $payload);
            if ($r['success']) {
                $sentCount++;
            } else {
                $failedCount++;
                if (!empty($r['error'])) $lastError = $r['error'];
            }
        }

        $status = ($sentCount > 0) ? ($failedCount > 0 ? 'partial' : 'success') : 'failed';
        $this->logPush(null, 'broadcast', $title, $message, $url, count($subs), $sentCount, $failedCount, $status, $lastError);

        return [
            'success' => ($sentCount > 0),
            'sent' => $sentCount,
            'failed' => $failedCount,
            'total' => count($subs)
        ];
    }

    /**
     * Trigger: Notify Anggota that their loan has been disbursed
     */
    public function notifyPinjamanCair(int $pinjamanId): array {
        $p = $this->db->fetch(
            "SELECT p.id, p.no_pinjaman, p.jumlah, p.anggota_id, a.nama as nama_anggota, jp.nama as jenis_pinjaman
             FROM pinjaman p
             JOIN anggota a ON p.anggota_id = a.id
             JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
             WHERE p.id = ?",
            [$pinjamanId]
        );

        if (!$p) return ['success' => false, 'message' => 'Pinjaman not found'];

        $title = "Kredit Dicairkan! 🎉";
        $jumlahFmt = "Rp " . number_format($p['jumlah'], 0, ',', '.');
        $msg = "Pinjaman {$p['jenis_pinjaman']} ({$p['no_pinjaman']}) sebesar {$jumlahFmt} telah dicairkan.";

        return $this->sendToAnggota((int) $p['anggota_id'], $title, $msg, '/portal/#pinjaman', [
            'tag' => 'pinjaman_cair_' . $p['id'],
            'tipe' => 'pinjaman'
        ]);
    }

    /**
     * Trigger: Notify Anggota of savings transaction (setoran, penarikan, dll)
     */
    public function notifySimpananTransaksi(int $simpananId): array {
        $trx = $this->db->fetch(
            "SELECT s.id, s.no_transaksi, s.jumlah, s.saldo_sesudah, s.tgl_transaksi, s.keterangan, s.anggota_id,
                    a.nama as nama_anggota, js.nama as jenis_simpanan, kt.nama as nama_transaksi, kt.dk
             FROM simpanan s
             JOIN anggota a ON s.anggota_id = a.id
             JOIN jenis_simpanan js ON s.jenis_simpanan_id = js.id
             LEFT JOIN kode_transaksi_simpanan kt ON s.kode_transaksi_id = kt.id
             WHERE s.id = ?",
            [$simpananId]
        );

        if (!$trx) return ['success' => false, 'message' => 'Transaksi simpanan not found'];

        $jumlahFmt = "Rp " . number_format($trx['jumlah'], 0, ',', '.');
        $saldoSesudahFmt = "Rp " . number_format($trx['saldo_sesudah'], 0, ',', '.');
        $namaTrx = $trx['nama_transaksi'] ?: 'Transaksi';
        $jenisSimpanan = $trx['jenis_simpanan'] ?: 'Simpanan';
        $dk = $trx['dk'] ?? 'D';
        $isReversal = (stripos($trx['keterangan'] ?? '', 'REVERSAL') !== false) || (stripos($trx['no_transaksi'] ?? '', 'REV') === 0);

        if ($isReversal) {
            $title = "Koreksi Saldo Simpanan 🔄";
            $msg = "Telah dilakukan koreksi pembukuan (reversal) pada {$jenisSimpanan} sebesar {$jumlahFmt}. Saldo akhir Anda kini: {$saldoSesudahFmt}.";
        } elseif ($dk === 'D') {
            $title = "Uang Masuk! 🪙";
            $msg = "Setoran {$jenisSimpanan} ({$namaTrx}) sebesar {$jumlahFmt} berhasil dibukukan. Saldo Anda kini {$saldoSesudahFmt}.";
        } else {
            $title = "Penarikan Simpanan 💸";
            $msg = "Penarikan {$jenisSimpanan} ({$namaTrx}) sebesar {$jumlahFmt} berhasil diproses. Sisa saldo Anda: {$saldoSesudahFmt}.";
        }

        return $this->sendToAnggota((int) $trx['anggota_id'], $title, $msg, '/portal/#simpanan', [
            'tag' => ($isReversal ? 'simpanan_rev_' : 'simpanan_trx_') . $trx['id'],
            'tipe' => $isReversal ? 'reversal' : 'simpanan'
        ]);
    }

    /**
     * Trigger: Notify Anggota of installment reversal / cancellation
     */
    public function notifyAngsuranReversal(int $angsuranId, ?array $angsuranData = null): array {
        if (!$angsuranData) {
            $angsuranData = $this->db->fetch("SELECT * FROM angsuran WHERE id = ?", [$angsuranId]);
        }
        if (!$angsuranData) return ['success' => false, 'message' => 'Angsuran not found'];

        $pinjamanId = (int) $angsuranData['pinjaman_id'];
        $p = $this->db->fetch(
            "SELECT p.id, p.no_pinjaman, p.sisa_pinjaman, p.anggota_id,
                    a.nama as nama_anggota, jp.nama as jenis_pinjaman
             FROM pinjaman p
             JOIN anggota a ON p.anggota_id = a.id
             JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
             WHERE p.id = ?",
            [$pinjamanId]
        );

        if (!$p) return ['success' => false, 'message' => 'Pinjaman not found'];

        $totalFmt = "Rp " . number_format($angsuranData['total'] ?? 0, 0, ',', '.');
        $sisaFmt = "Rp " . number_format(max(0, $p['sisa_pinjaman']), 0, ',', '.');
        $angsuranKe = (string) ($angsuranData['angsuran_ke'] ?? '');
        $angsuranKeLabel = ($angsuranKe === '0' || $angsuranKe === 'Manual') ? 'Pelunasan/Manual' : "ke-{$angsuranKe}";

        $title = "Koreksi/Reversal Angsuran 🔄";
        if (($angsuranData['metode_pembayaran'] ?? '') === 'sukarela') {
            $msg = "Pembayaran angsuran {$angsuranKeLabel} ({$p['jenis_pinjaman']} - {$p['no_pinjaman']}) sebesar {$totalFmt} telah dibatalkan (reversal). Dana telah dikembalikan ke Simpanan Sukarela. Sisa tagihan pinjaman: {$sisaFmt}.";
        } else {
            $msg = "Pembayaran angsuran {$angsuranKeLabel} ({$p['jenis_pinjaman']} - {$p['no_pinjaman']}) sebesar {$totalFmt} telah dibatalkan (reversal). Sisa tagihan pinjaman disesuaikan kembali menjadi {$sisaFmt}.";
        }

        return $this->sendToAnggota((int) $p['anggota_id'], $title, $msg, '/portal/#pinjaman', [
            'tag' => 'angsuran_rev_' . $angsuranId,
            'tipe' => 'reversal'
        ]);
    }

    /**
     * Trigger: Notify Anggota of loan disbursement reversal
     */
    public function notifyPinjamanReversal(int $pinjamanId, ?array $pinjamanData = null): array {
        if (!$pinjamanData) {
            $pinjamanData = $this->db->fetch(
                "SELECT p.id, p.no_pinjaman, p.jumlah, p.anggota_id, a.nama as nama_anggota, jp.nama as jenis_pinjaman
                 FROM pinjaman p
                 JOIN anggota a ON p.anggota_id = a.id
                 JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
                 WHERE p.id = ?",
                [$pinjamanId]
            );
        }
        if (!$pinjamanData) return ['success' => false, 'message' => 'Pinjaman not found'];

        $title = "Koreksi/Reversal Pinjaman 🔄";
        $jumlahFmt = "Rp " . number_format($pinjamanData['jumlah'] ?? 0, 0, ',', '.');
        $jenisPinjaman = $pinjamanData['jenis_pinjaman'] ?? 'Pinjaman';
        $msg = "Pencairan pinjaman {$jenisPinjaman} ({$pinjamanData['no_pinjaman']}) sebesar {$jumlahFmt} telah dibatalkan (reversal). Status pinjaman dikembalikan ke disetujui.";

        return $this->sendToAnggota((int) $pinjamanData['anggota_id'], $title, $msg, '/portal/#pinjaman', [
            'tag' => 'pinjaman_rev_' . $pinjamanId,
            'tipe' => 'reversal'
        ]);
    }

    /**
     * Trigger: Notify Anggota that installment payment has been recorded
     */
    public function notifyAngsuranBayar(int $angsuranId): array {
        $ang = $this->db->fetch(
            "SELECT an.id, an.no_transaksi, an.angsuran_ke, an.total, an.tgl_bayar, an.pokok, an.bunga, an.denda,
                    p.id as pinjaman_id, p.no_pinjaman, p.sisa_pinjaman, p.status as status_pinjaman, p.tenor,
                    p.anggota_id, a.nama as nama_anggota, jp.nama as jenis_pinjaman
             FROM angsuran an
             JOIN pinjaman p ON an.pinjaman_id = p.id
             JOIN anggota a ON p.anggota_id = a.id
             JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
             WHERE an.id = ?",
            [$angsuranId]
        );

        if (!$ang) return ['success' => false, 'message' => 'Angsuran not found'];

        $totalFmt = "Rp " . number_format($ang['total'], 0, ',', '.');
        $sisaFmt = "Rp " . number_format(max(0, $ang['sisa_pinjaman']), 0, ',', '.');
        $angsuranKe = (string) $ang['angsuran_ke'];
        $angsuranKeLabel = ($angsuranKe === '0' || $angsuranKe === 'Manual') ? 'Pelunasan/Manual' : "ke-{$angsuranKe}";
        $isLunas = ((float)$ang['sisa_pinjaman'] <= 0) || ($ang['status_pinjaman'] === 'lunas');

        if ($isLunas) {
            $title = "Pinjaman LUNAS! 🎉";
            $msg = "Pembayaran angsuran {$angsuranKeLabel} ({$ang['jenis_pinjaman']} - {$ang['no_pinjaman']}) sebesar {$totalFmt} berhasil diterima. Selamat, pinjaman Anda telah LUNAS!";
        } else {
            $title = "Angsuran Diterima! ✅";
            $msg = "Pembayaran angsuran {$angsuranKeLabel} ({$ang['jenis_pinjaman']}) sebesar {$totalFmt} berhasil dibukukan. Sisa pinjaman Anda: {$sisaFmt}.";
        }

        return $this->sendToAnggota((int) $ang['anggota_id'], $title, $msg, '/portal/#pinjaman', [
            'tag' => 'angsuran_pay_' . $ang['id'],
            'tipe' => 'angsuran'
        ]);
    }

    /**
     * Trigger: Send reminders for installments due today (H-0) or in 3 days (H-3)
     */
    public function sendInstallmentReminders(): array {
        $upcoming = $this->db->fetchAll(
            "SELECT an.id, an.tgl_jatuh_tempo, an.total, jp.nama as jenis_pinjaman, p.no_pinjaman, p.anggota_id,
                    DATEDIFF(an.tgl_jatuh_tempo, CURDATE()) as hari_lagi
             FROM angsuran an
             JOIN pinjaman p ON an.pinjaman_id = p.id
             JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
             WHERE an.status = 'belum' 
             AND (an.tgl_jatuh_tempo = CURDATE() OR an.tgl_jatuh_tempo = DATE_ADD(CURDATE(), INTERVAL 3 DAY))
             ORDER BY an.tgl_jatuh_tempo ASC"
        );

        $results = [];
        foreach ($upcoming as $u) {
            $hariLagi = (int) $u['hari_lagi'];
            $totalFmt = "Rp " . number_format($u['total'], 0, ',', '.');
            if ($hariLagi === 0) {
                $title = "Tagihan Jatuh Tempo HARI INI ⚠️";
                $msg = "Angsuran {$u['jenis_pinjaman']} ({$u['no_pinjaman']}) sebesar {$totalFmt} jatuh tempo hari ini. Segera lakukan pembayaran.";
            } else {
                $title = "Pengingat Tagihan Pinjaman 📅";
                $msg = "Angsuran {$u['jenis_pinjaman']} ({$u['no_pinjaman']}) sebesar {$totalFmt} akan jatuh tempo dalam {$hariLagi} hari.";
            }

            $res = $this->sendToAnggota((int) $u['anggota_id'], $title, $msg, '/portal/#pinjaman', [
                'tag' => 'bill_due_' . $u['id'],
                'tipe' => 'tagihan'
            ]);
            $results[] = [
                'angsuran_id' => $u['id'],
                'anggota_id' => $u['anggota_id'],
                'result' => $res
            ];
        }

        return [
            'success' => true,
            'processed' => count($upcoming),
            'details' => $results
        ];
    }

    /**
     * Send targeted push notification for a specific due / overdue installment
     */
    public function sendDueInstallmentPush(int $angsuranId, ?string $customTitle = null, ?string $customMessage = null, string $url = '/portal/#pinjaman'): array {
        $ang = $this->db->fetch(
            "SELECT an.id, an.no_transaksi, an.angsuran_ke, an.total, an.pokok, an.bunga, an.denda, an.tgl_jatuh_tempo,
                    DATEDIFF(an.tgl_jatuh_tempo, CURDATE()) as diff_days,
                    p.id as pinjaman_id, p.no_pinjaman, p.sisa_pinjaman, p.tenor,
                    p.anggota_id, a.nama as nama_anggota, a.no_anggota, jp.nama as jenis_pinjaman
             FROM angsuran an
             JOIN pinjaman p ON an.pinjaman_id = p.id
             JOIN anggota a ON p.anggota_id = a.id
             JOIN jenis_pinjaman jp ON p.jenis_pinjaman_id = jp.id
             WHERE an.id = ?",
            [$angsuranId]
        );

        if (!$ang) return ['success' => false, 'message' => 'Angsuran not found'];

        $diff = (int) $ang['diff_days'];
        $absDays = abs($diff);
        $totalFmt = "Rp " . number_format($ang['total'], 0, ',', '.');
        $angsuranKe = (string) $ang['angsuran_ke'];
        $angsuranKeLabel = ($angsuranKe === '0' || $angsuranKe === 'Manual') ? 'Pelunasan/Manual' : "ke-{$angsuranKe}";
        $tglJatuhTempoFmt = date('d/m/Y', strtotime($ang['tgl_jatuh_tempo']));

        // Default template based on due category
        if ($diff > 0) {
            $defTitle = "Pengingat Tagihan Pinjaman 📅";
            $defMsg = "Halo {$ang['nama_anggota']}, angsuran {$angsuranKeLabel} ({$ang['jenis_pinjaman']}) sebesar {$totalFmt} akan jatuh tempo dalam {$diff} hari ({$tglJatuhTempoFmt}). Mohon siapkan dana Anda.";
        } elseif ($diff === 0) {
            $defTitle = "Tagihan Jatuh Tempo HARI INI ⚠️";
            $defMsg = "Halo {$ang['nama_anggota']}, angsuran {$angsuranKeLabel} ({$ang['jenis_pinjaman']}) sebesar {$totalFmt} jatuh tempo HARI INI. Segera lakukan pembayaran untuk menghindari denda.";
        } elseif ($absDays <= 7) {
            $defTitle = "Peringatan Keterlambatan Angsuran ⏳";
            $defMsg = "Halo {$ang['nama_anggota']}, angsuran {$angsuranKeLabel} ({$ang['jenis_pinjaman']}) sebesar {$totalFmt} telah melewati jatuh tempo {$absDays} hari. Denda harian mulai berjalan, mohon segera selesaikan pembayaran.";
        } elseif ($absDays <= 30) {
            $defTitle = "Pemberitahuan Tunggakan Angsuran (SP 1) 🚨";
            $defMsg = "PENTING: Tagihan angsuran {$angsuranKeLabel} ({$ang['jenis_pinjaman']} - {$ang['no_pinjaman']}) sebesar {$totalFmt} telah menunggak {$absDays} hari. Mohon segera lunasi pembayaran atau hubungi kantor koperasi.";
        } else {
            $defTitle = "Peringatan Keras Menunggak Pinjaman 🛑";
            $defMsg = "PERINGATAN: Pinjaman Anda ({$ang['jenis_pinjaman']} - {$ang['no_pinjaman']}) telah menunggak {$absDays} hari. Segera selesaikan kewajiban Anda atau hubungi pengurus koperasi untuk restrukturisasi.";
        }

        $title = !empty(trim($customTitle ?? '')) ? trim($customTitle) : $defTitle;
        $msg = !empty(trim($customMessage ?? '')) ? trim($customMessage) : $defMsg;

        // Replace template variables
        $replacements = [
            '{nama}' => $ang['nama_anggota'],
            '{no_anggota}' => $ang['no_anggota'],
            '{angsuran_ke}' => $angsuranKeLabel,
            '{jenis_pinjaman}' => $ang['jenis_pinjaman'],
            '{no_pinjaman}' => $ang['no_pinjaman'],
            '{total}' => $totalFmt,
            '{jatuh_tempo}' => $tglJatuhTempoFmt,
            '{hari}' => (string) $absDays
        ];
        $title = str_replace(array_keys($replacements), array_values($replacements), $title);
        $msg = str_replace(array_keys($replacements), array_values($replacements), $msg);

        return $this->sendToAnggota((int) $ang['anggota_id'], $title, $msg, $url, [
            'tag' => 'bill_due_' . $ang['id'] . '_' . time(),
            'tipe' => 'tagihan'
        ]);
    }
}
