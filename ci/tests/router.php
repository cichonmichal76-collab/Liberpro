<?php
// Isolated CI-only router. Not part of the website deployment manifest.
declare(strict_types=1);
if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)) { http_response_code(403); exit; }
if (parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) === '/fixture') {
    session_name('LP_CONTACT'); session_start();
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $token = bin2hex(random_bytes(24));
    $_SESSION['contact_proofs'][$token] = ['created' => time() - (int)($input['age'] ?? 3), 'answer' => '7'];
    session_write_close(); header('Content-Type: application/json');
    echo json_encode(['token' => $token, 'answer' => '7']); exit;
}
if (parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) !== '/contact.php') { http_response_code(404); exit; }
$ip = $_SERVER['HTTP_X_CI_IP'] ?? '192.0.2.1';
if (!preg_match('/\A192\.0\.2\.[0-9]{1,3}\z/', $ip)) { http_response_code(403); exit; }
$_SERVER['REMOTE_ADDR'] = $ip;
require rtrim(getenv('CI_SITE_DIR'), '/\\') . '/contact.php';
