<?php
/**
 * Kesehatan Koperasi Controller
 * Berdasarkan Permenkop UKM No. 9 Tahun 2020 jo. Permenkop UKM No. 2 Tahun 2024 & Permenkop UKM No. 8 Tahun 2023
 * 4 Aspek Pemeriksaan Kesehatan Koperasi (KKPKK - Kertas Kerja Pemeriksaan Kesehatan Koperasi):
 * 1. Tata Kelola (Bobot 30%)
 * 2. Profil Risiko (Bobot 15%)
 * 3. Kinerja Keuangan (Bobot 40%)
 * 4. Permodalan (Bobot 15%)
 */
authCheck();
checkPermission('keuangan.laba_rugi'); // permission laporan keuangan

if ($method !== 'GET') {
    errorResponse('Method not allowed', 405);
}

$tahun = $params['tahun'] ?? date('Y');
$forceRefresh = isset($params['refresh']) && ($params['refresh'] === '1' || $params['refresh'] === 'true');

require_once __DIR__ . '/../config/kesehatan_helper.php';
$responseData = getKesehatanKoperasiData($tahun, $forceRefresh);

successResponse($responseData);
