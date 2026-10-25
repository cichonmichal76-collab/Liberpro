<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, private');
header('X-Robots-Tag: noindex, nofollow');

function lp_reply(int $code, string $message, array $extra = []): void {
    http_response_code($code);
    echo json_encode(array_merge(['success' => $code < 400, 'message' => $message], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}
function lp_length(string $value): int {
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}
function lp_same_site(): bool {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') {
        return in_array($origin, ['https://www.liberpro.pl', 'https://liberpro.pl'], true);
    }
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    if ($referer !== '') {
        return parse_url($referer, PHP_URL_SCHEME) === 'https'
            && in_array(parse_url($referer, PHP_URL_HOST), ['www.liberpro.pl', 'liberpro.pl'], true);
    }
    return ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') !== 'cross-site';
}
function lp_session(): void {
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_name('LP_CONTACT');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/contact.php', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
    if (!session_start()) {
        lp_reply(503, 'Nie udało się uruchomić weryfikacji. Spróbuj ponownie lub skontaktuj się telefonicznie.');
    }
}
// One locked state file, outside public_html; stores hashes and timestamps only.
function lp_state(callable $action): array {
    $directory = sys_get_temp_dir() . '/liberpro-contact-guard-' . substr(hash('sha256', __DIR__), 0, 20);
    if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
        lp_reply(503, 'Formularz jest chwilowo niedostępny. Skontaktuj się telefonicznie.');
    }
    $file = $directory . '/limits.json';
    $handle = @fopen($file, 'c+');
    if (!$handle || !flock($handle, LOCK_EX)) {
        if ($handle) { fclose($handle); }
        lp_reply(503, 'Formularz jest chwilowo niedostępny. Spróbuj ponownie.');
    }
    @chmod($file, 0600);
    $raw = stream_get_contents($handle);
    $state = $raw === '' ? [] : json_decode((string) $raw, true);
    if (!is_array($state)) {
        flock($handle, LOCK_UN); fclose($handle);
        lp_reply(503, 'Formularz jest chwilowo niedostępny. Spróbuj ponownie.');
    }
    $now = time();
    foreach ($state as $key => $entry) {
        if (!is_array($entry) || ($entry['last'] ?? 0) < $now - 86400) { unset($state[$key]); }
    }
    $outcome = $action($state, $now);
    if (count($state) > 12000) { $state = array_slice($state, -12000, null, true); }
    $json = json_encode($state);
    rewind($handle);
    $written = $json !== false && ftruncate($handle, 0) && fwrite($handle, $json) === strlen($json) && fflush($handle);
    flock($handle, LOCK_UN); fclose($handle);
    if (!$written) { lp_reply(503, 'Formularz jest chwilowo niedostępny. Spróbuj ponownie.'); }
    return $outcome;
}
function lp_limit(array &$state, string $key, int $maximum, int $seconds, int $now): bool {
    $times = array_values(array_filter($state[$key]['times'] ?? [], static fn($t) => is_int($t) && $t > $now - $seconds));
    if (count($times) >= $maximum) { return false; }
    $times[] = $now;
    $state[$key] = ['times' => $times, 'last' => $now];
    return true;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$prepare = $method === 'GET' && ($_GET['action'] ?? '') === 'prepare';
if ($method !== 'POST' && !$prepare) {
    header('Allow: GET, POST');
    lp_reply(405, 'Niedozwolona metoda');
}
if (!lp_same_site()) { lp_reply(403, 'Otwórz formularz na stronie Liber Pro.'); }
$ipKey = hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
$attempt = lp_state(static function (array &$state, int $now) use ($ipKey, $prepare): array {
    return ['ok' => lp_limit($state, ($prepare ? 'prepare:' : 'attempt:') . $ipKey, $prepare ? 30 : 12, 600, $now)];
});
if (!$attempt['ok']) { header('Retry-After: 600'); lp_reply(429, 'Zbyt wiele prób. Odczekaj kilka minut lub skontaktuj się telefonicznie.'); }
lp_session();
if ($prepare) {
    $now = time();
    $proofs = $_SESSION['contact_proofs'] ?? [];
    foreach ($proofs as $key => $proof) {
        if (($proof['created'] ?? 0) < $now - 3600) { unset($proofs[$key]); }
    }
    $token = bin2hex(random_bytes(24));
    $left = random_int(2, 9); $right = random_int(2, 9);
    $proofs[$token] = ['created' => $now, 'answer' => (string) ($left + $right)];
    $_SESSION['contact_proofs'] = array_slice($proofs, -6, null, true);
    session_write_close();
    lp_reply(200, '', ['token' => $token, 'question' => $left . ' + ' . $right, 'minWait' => 2, 'expiresIn' => 3600, 'guardVersion' => 2]);
}
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 32768) { lp_reply(413, 'Wiadomość jest zbyt długa.'); }
$rawInput = file_get_contents('php://input', false, null, 0, 32769);
if ($rawInput === false || strlen($rawInput) > 32768) { lp_reply(413, 'Wiadomość jest zbyt długa.'); }
$input = json_decode($rawInput, true);
if (!is_array($input)) { lp_reply(400, 'Nieprawidłowe dane formularza.'); }
foreach (['name', 'company', 'email', 'phone', 'service', 'message', 'honeypot', 'verification_token', 'verification_answer'] as $field) {
    if (isset($input[$field]) && !is_string($input[$field])) { lp_reply(400, 'Nieprawidłowe dane formularza.'); }
}
if (!empty($input['honeypot'])) { lp_reply(400, 'Nie udało się zweryfikować formularza.'); }
$token = (string) ($input['verification_token'] ?? '');
$proof = $_SESSION['contact_proofs'][$token] ?? null;
unset($_SESSION['contact_proofs'][$token]); // A proof can be used for one attempt only.
session_write_close();
if (!is_array($proof) || !preg_match('/\A[a-f0-9]{48}\z/D', $token)
    || time() - (int) $proof['created'] < 2 || time() - (int) $proof['created'] > 3600
    || !hash_equals((string) $proof['answer'], trim((string) ($input['verification_answer'] ?? '')))) {
    lp_reply(403, 'Weryfikacja wygasła lub odpowiedź jest nieprawidłowa. Odśwież pytanie i spróbuj ponownie.', ['refreshVerification' => true]);
}
$values = [];
foreach (['name', 'company', 'email', 'phone', 'service', 'message'] as $field) { $values[$field] = trim($input[$field] ?? ''); }
if (lp_length($values['name']) < 2 || lp_length($values['name']) > 120 || preg_match('/[\r\n]/', $values['name'])) { lp_reply(400, 'Podaj poprawne imię i nazwisko.'); }
if (strlen($values['email']) > 254 || !filter_var($values['email'], FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $values['email'])) { lp_reply(400, 'Podaj poprawny adres e-mail.'); }
if (lp_length($values['company']) > 160 || lp_length($values['phone']) > 40 || lp_length($values['service']) > 120 || preg_match('/[\r\n]/', $values['service'])) { lp_reply(400, 'Jedno z pól jest zbyt długie lub nieprawidłowe.'); }
if (lp_length($values['message']) < 10 || lp_length($values['message']) > 5000) { lp_reply(400, 'Wiadomość powinna mieć od 10 do 5000 znaków.'); }
if (preg_match_all('~https?://~i', $values['message']) > 3 || preg_match('~<a\s+href|viagra|casino|click here~i', $values['message'])) { lp_reply(400, 'Wiadomość nie przeszła kontroli antyspamowej.'); }
$normal = preg_replace('/\s+/u', ' ', $values['message']);
if (!is_string($normal)) { lp_reply(400, 'Nieprawidłowe kodowanie wiadomości.'); }
$normal = function_exists('mb_strtolower') ? mb_strtolower($normal, 'UTF-8') : strtolower($normal);
$duplicateKey = 'duplicate:' . hash('sha256', $normal);
$emailKey = hash('sha256', strtolower($values['email']));
$reservation = lp_state(static function (array &$state, int $now) use ($duplicateKey, $ipKey, $emailKey): array {
    if (($state[$duplicateKey]['last'] ?? 0) > $now - 1800) { return ['ok' => false, 'duplicate' => true]; }
    $next = $state;
    foreach ([['send-ip-10m:' . $ipKey, 3, 600], ['send-ip-day:' . $ipKey, 12, 86400], ['send-email-day:' . $emailKey, 5, 86400], ['send-global-hour', 30, 3600], ['send-global-day', 150, 86400]] as $rule) {
        if (!lp_limit($next, $rule[0], $rule[1], $rule[2], $now)) { return ['ok' => false, 'duplicate' => false]; }
    }
    $next[$duplicateKey] = ['last' => $now]; $state = $next;
    return ['ok' => true, 'at' => $now];
});
if (!$reservation['ok']) { header('Retry-After: 600'); lp_reply(429, !empty($reservation['duplicate']) ? 'Taka wiadomość została już przekazana. Nie wysyłaj jej ponownie.' : 'Limit wiadomości został osiągnięty. Odczekaj lub skontaktuj się telefonicznie.'); }
$name = preg_replace('/[<>"\r\n]+/', ' ', $values['name']);
$service = preg_replace('/[<>"\r\n]+/', ' ', $values['service'] ?: 'ogólne');
$subjectText = 'Zapytanie ze strony: ' . $service . ' – ' . $name;
$subject = function_exists('mb_encode_mimeheader') ? mb_encode_mimeheader($subjectText, 'UTF-8', 'Q') : 'Liber Pro - zapytanie ze strony';
$body = "Nowa zweryfikowana wiadomość ze strony liberpro.pl\n\n";
foreach (['name' => 'Imię i nazwisko', 'company' => 'Firma', 'email' => 'E-mail', 'phone' => 'Telefon', 'service' => 'Usługa'] as $field => $label) {
    if ($values[$field] !== '') { $body .= $label . ': ' . $values[$field] . "\n"; }
}
$body .= "\nWiadomość:\n" . $values['message'] . "\n\nData: " . date('d.m.Y H:i') . "\n";
$headers = "From: Liber Pro Formularz <formularz@liberpro.pl>\r\n";
$headers .= 'Reply-To: ' . $name . ' <' . $values['email'] . ">\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\nMIME-Version: 1.0\r\nAuto-Submitted: auto-generated\r\nX-Auto-Response-Suppress: All\r\nX-LiberPro-Form: verified-v2\r\n";
if (!mail('kontakt@liberpro.pl', $subject, $body, $headers)) {
    lp_state(static function (array &$state, int $now) use ($duplicateKey, $reservation): array {
        if (($state[$duplicateKey]['last'] ?? 0) === $reservation['at']) { unset($state[$duplicateKey]); }
        return [];
    });
    lp_reply(500, 'Nie udało się wysłać wiadomości. Spróbuj ponownie lub zadzwoń: +48 517-765-128.');
}
// No autoresponder: an unverified email address must never receive automatic mail.
lp_reply(200, 'Wiadomość została wysłana. Dziękujemy za kontakt.');
