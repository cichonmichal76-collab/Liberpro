<?php
header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');

function text_length(string $value): int {
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function sanitize_header_value(string $value): string {
    $value = trim($value);
    $sanitized = preg_replace('/[\r\n<>"]+/', ' ', $value);
    return trim($sanitized ?? '');
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Niedozwolona metoda']);
    exit;
}

// Rate limiting via file-based token bucket (5 req / IP / 10 min)
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$ip_hash = md5($ip);
$rate_file = sys_get_temp_dir() . '/lp_rate_' . $ip_hash;
$now = time();
$limit = 5;
$window = 600; // 10 minutes

$data = ['start' => $now, 'count' => 0];
if (file_exists($rate_file)) {
    $stored = json_decode((string) file_get_contents($rate_file), true);
    if (is_array($stored) && isset($stored['start'], $stored['count'])) {
        $data = $stored;
    }
}

if ($now - $data['start'] < $window) {
    if ($data['count'] >= $limit) {
        http_response_code(429);
        echo json_encode(['success' => false, 'message' => 'Zbyt wiele zapytań. Spróbuj za chwilę lub zadzwoń: +48 517-765-128']);
        exit;
    }
    $data['count']++;
} else {
    $data = ['start' => $now, 'count' => 1];
}

file_put_contents($rate_file, json_encode($data));

// Parse input
$input = json_decode((string) file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

// Honeypot check
if (!empty($input['honeypot'])) {
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Wiadomość wysłana pomyślnie']);
    exit;
}

// Sanitize
$raw_name = trim((string) ($input['name'] ?? ''));
$raw_company = trim((string) ($input['company'] ?? ''));
$raw_email = trim((string) ($input['email'] ?? ''));
$raw_phone = trim((string) ($input['phone'] ?? ''));
$raw_service = trim((string) ($input['service'] ?? ''));
$raw_message = trim((string) ($input['message'] ?? ''));

$name = htmlspecialchars($raw_name, ENT_QUOTES, 'UTF-8');
$company = htmlspecialchars($raw_company, ENT_QUOTES, 'UTF-8');
$email = filter_var($raw_email, FILTER_SANITIZE_EMAIL);
$phone = htmlspecialchars($raw_phone, ENT_QUOTES, 'UTF-8');
$service = htmlspecialchars($raw_service, ENT_QUOTES, 'UTF-8');
$message = htmlspecialchars($raw_message, ENT_QUOTES, 'UTF-8');

$header_name = sanitize_header_value($raw_name);
$header_service = sanitize_header_value($raw_service ?: 'ogólne');

// Validation
if ($raw_name === '' || text_length($raw_name) < 2) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Podaj imię i nazwisko']);
    exit;
}

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Nieprawidłowy adres e-mail']);
    exit;
}

if ($raw_message === '' || text_length($raw_message) < 10) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Wiadomość jest za krótka']);
    exit;
}

if (text_length($raw_message) > 5000) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Wiadomość jest zbyt długa']);
    exit;
}

// Spam keyword check
$spam_keywords = ['viagra', 'casino', 'http://', 'https://', '<a href', 'click here'];
foreach ($spam_keywords as $kw) {
    if (stripos($raw_message, $kw) !== false) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Wiadomość zawiera niedozwolone treści']);
        exit;
    }
}

$to = 'kontakt@liberpro.pl';
$subject = mb_encode_mimeheader('Zapytanie ze strony: ' . $header_service . ' – ' . $header_name, 'UTF-8', 'Q');

$body = "Nowa wiadomość ze strony liberpro.pl\n";
$body .= str_repeat('—', 40) . "\n\n";
$body .= "Imię i nazwisko : $name\n";
if ($company) {
    $body .= "Firma           : $company\n";
}
$body .= "E-mail          : $email\n";
if ($phone) {
    $body .= "Telefon         : $phone\n";
}
if ($service) {
    $body .= "Usługa          : $service\n";
}
$body .= "\nWiadomość:\n$message\n";
$body .= "\n" . str_repeat('—', 40) . "\n";
$body .= "Data : " . date('d.m.Y H:i') . "\n";
$body .= "IP   : $ip\n";

$headers = "From: Liber Pro Formularz <formularz@liberpro.pl>\r\n";
$headers .= "Reply-To: $header_name <$email>\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
$headers .= "X-Priority: 1\r\n";

$sent = mail($to, $subject, $body, $headers);

if ($sent) {
    // Auto-reply
    $arSubject = mb_encode_mimeheader('Dziękujemy za wiadomość – Liber Pro Księgowość', 'UTF-8', 'Q');
    $arBody = "Dzień dobry $name,\n\n";
    $arBody .= "Dziękujemy za kontakt z Liber Pro Księgowość.\n";
    $arBody .= "Odezwiemy się do Ciebie w ciągu jednego dnia roboczego.\n\n";
    $arBody .= "Z poważaniem,\nLiber Pro Księgowość\n";
    $arBody .= "tel. +48 517-765-128 | kontakt@liberpro.pl | liberpro.pl\n";
    $arHeaders = "From: kontakt@liberpro.pl\r\n";
    $arHeaders .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $arHeaders .= "MIME-Version: 1.0\r\n";
    mail($email, $arSubject, $arBody, $arHeaders);

    echo json_encode(['success' => true, 'message' => 'Wiadomość wysłana pomyślnie']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Błąd wysyłki – spróbuj ponownie lub zadzwoń: +48 517-765-128']);
}
