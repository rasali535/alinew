<?php
// Ralion API Dynamic Reverse Proxy for Hostinger
// Proxies all /ralion/api/* and /api/* calls to Render dynamic Next.js backend

header_remove('X-Powered-By');

$backendUrl = getenv('RALION_UPSTREAM_URL') ?: 'https://ralion-dynamic-backend.onrender.com';

// 1. Determine target relative path
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$path = '';

if (isset($_GET['__proxy_path']) && !empty($_GET['__proxy_path'])) {
    $path = '/' . ltrim($_GET['__proxy_path'], '/');
} else {
    $uriParts = explode('?', $requestUri, 2);
    $pathOnly = $uriParts[0];
    if (strpos($pathOnly, '/ralion/api/') === 0) {
        $path = substr($pathOnly, 7); // strips '/ralion' -> '/api/...'
    } elseif (strpos($pathOnly, '/api/') === 0) {
        $path = $pathOnly;
    } else {
        $path = '/api/' . ltrim($pathOnly, '/');
    }
}

// 2. Handle CORS Preflight (OPTIONS)
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$origin = $_SERVER['HTTP_ORIGIN'] ?? 'https://rasalilabs.com';

// Allowed origin validation
$allowedOrigin = 'https://rasalilabs.com';
if (preg_match('/^https:\/\/(?:[a-zA-Z0-9-]+\.)*rasalilabs\.com$/', $origin) ||
    preg_match('/^https:\/\/(?:[a-zA-Z0-9-]+\.)*onrender\.com$/', $origin) ||
    preg_match('/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/', $origin)) {
    $allowedOrigin = $origin;
}

$allowedHeaders = "Content-Type, Authorization, Accept, X-Requested-With, apikey, x-api-key, x-client-info, Idempotency-Key, Origin, Cache-Control, Pragma, x-user-id, x-workspace-id, x-organization-id, x-tenant-id, x-tenant, x-workspace, x-org-id, x-admin-key, x-session-id, x-request-id, baggage, sentry-trace, cookie";
if (!empty($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
    $allowedHeaders .= ", " . $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'];
}

if ($method === 'OPTIONS') {
    header("Access-Control-Allow-Origin: $allowedOrigin");
    header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
    header("Access-Control-Allow-Headers: $allowedHeaders");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Max-Age: 86400");
    header("Vary: Origin, Access-Control-Request-Headers");
    http_response_code(204);
    exit;
}

// 3. Rebuild query string excluding __proxy_path
$queryParams = $_GET;
unset($queryParams['__proxy_path']);
$queryString = http_build_query($queryParams);
$targetUrl = rtrim($backendUrl, '/') . $path . ($queryString !== '' ? '?' . $queryString : '');

// 4. Prepare headers to forward
$forwardHeaders = [];
$ignoreHeaders = ['host', 'connection', 'content-length', 'transfer-encoding', 'accept-encoding'];

if (function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
        $lower = strtolower($name);
        if (!in_array($lower, $ignoreHeaders, true)) {
            $forwardHeaders[] = "$name: $value";
        }
    }
} else {
    foreach ($_SERVER as $key => $value) {
        if (strpos($key, 'HTTP_') === 0) {
            $name = str_replace('_', '-', substr($key, 5));
            $lower = strtolower($name);
            if (!in_array($lower, $ignoreHeaders, true)) {
                $forwardHeaders[] = "$name: $value";
            }
        }
    }
}

$forwardHeaders[] = 'X-Forwarded-Host: ' . ($_SERVER['HTTP_HOST'] ?? 'rasalilabs.com');
$forwardHeaders[] = 'X-Forwarded-Proto: https';
$forwardHeaders[] = 'Accept: application/json';

// 5. Read body if POST/PUT/PATCH
$body = file_get_contents('php://input');

// 6. Execute cURL to upstream
$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_HTTPHEADER, $forwardHeaders);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);

if ($method !== 'GET' && $method !== 'HEAD' && !empty($body)) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

// Capture response headers
$responseHeaders = [];
curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($curl, $header) use (&$responseHeaders) {
    $len = strlen($header);
    $trimmed = trim($header);
    if (empty($trimmed)) {
        return $len;
    }
    $lower = strtolower($trimmed);
    if (strpos($lower, 'transfer-encoding:') === 0 || strpos($lower, 'connection:') === 0) {
        return $len;
    }
    $responseHeaders[] = $trimmed;
    return $len;
});

$responseBody = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// Set default CORS
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Credentials: true");

if ($responseBody === false || ($httpCode === 0 && !empty($curlError))) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'BACKEND_UNAVAILABLE',
        'message' => 'The dynamic backend is currently warming up or unavailable. Please retry in a few moments.',
        'detail' => $curlError,
        'target' => $path
    ]);
    exit;
}

// Forward upstream response headers
foreach ($responseHeaders as $hdr) {
    header($hdr, false);
}

http_response_code($httpCode ?: 200);
echo $responseBody;
exit;
