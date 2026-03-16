<?php
require_once dirname(__DIR__) . '/minify_html.php';

ob_start();
readfile(__DIR__ . '/index.html');
$html = ob_get_clean();

header('Content-Type: text/html; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
echo minify_html($html);
