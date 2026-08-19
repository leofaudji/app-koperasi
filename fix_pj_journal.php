<?php
/**
 * REFI FIX SCRIPT FOR PJ2026080008
 * Run this on the production server to balance the journal entry for PJ2026080008.
 */

require_once __DIR__ . '/api/config/env.php';
require_once __DIR__ . '/api/config/database.php';

$db = Database::getInstance();

$noBukti = 'PJ2026080008';
$jurnal = $db->fetch("SELECT * FROM jurnal WHERE no_bukti = ?", [$noBukti]);

if (!$jurnal) {
    echo "Journal $noBukti not found. No fix needed.\n";
    exit;
}

$db->beginTransaction();
try {
    // Find the journal detail row for Bank Jatim Bendahara 1 (kredit > 0)
    $bankDetail = $db->fetch("
        SELECT jd.* 
        FROM jurnal_detail jd
        JOIN akun a ON jd.akun_id = a.id
        WHERE jd.jurnal_id = ? AND a.nama LIKE '%Bank Jatim Bendahara 1%' AND jd.kredit > 0
    ", [$jurnal['id']]);

    if ($bankDetail) {
        $db->execute("UPDATE jurnal_detail SET kredit = 6397500.00 WHERE id = ?", [$bankDetail['id']]);
        echo "[OK] Updated Bank Jatim Bendahara 1 credit to 6,397,500.00\n";
        
        // Recalculate and update journal totals
        $totals = $db->fetch("SELECT SUM(debit) as deb, SUM(kredit) as kre FROM jurnal_detail WHERE jurnal_id = ?", [$jurnal['id']]);
        $db->execute("UPDATE jurnal SET total_debit = ?, total_kredit = ? WHERE id = ?", [$totals['deb'], $totals['kre'], $jurnal['id']]);
        echo "[OK] Recalculated journal totals. Debit: " . number_format($totals['deb']) . " | Kredit: " . number_format($totals['kre']) . "\n";
    } else {
        echo "Bank Jatim Bendahara 1 credit detail row not found.\n";
    }
    $db->commit();
} catch (Exception $e) {
    $db->rollBack();
    echo "ERROR: " . $e->getMessage() . "\n";
}
