import axios from 'axios';

const apiProxyPhp = `<?php
// Ralion API Dynamic Reverse Proxy for Hostinger
// Proxies all /ralion/api/* and /api/* calls to Render dynamic backend

$backendUrl = 'https://ralion-dynamic-backend.onrender.com';

// 1. Determine relative path
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$path = '';

if (isset($_GET['__proxy_path'])) {
    $path = '/' . ltrim($_GET['__proxy_path'], '/');
} else {
    $uriParts = explode('?', $requestUri, 2);
    $pathOnly = $uriParts[0];
    if (strpos($pathOnly, '/ralion/api/') === 0) {
        $path = substr($pathOnly, 7);
    } elseif (strpos($pathOnly, '/api/') === 0) {
        $path = $pathOnly;
    } else {
        $path = '/api/' . ltrim($pathOnly, '/');
    }
}

// Rebuild query string excluding __proxy_path
$queryParams = $_GET;
unset($queryParams['__proxy_path']);
$queryString = http_build_query($queryParams);
$targetUrl = $backendUrl . $path . ($queryString !== '' ? '?' . $queryString : '');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// 2. Prepare headers to forward
$forwardHeaders = [];
$ignoreHeaders = ['host', 'connection', 'content-length', 'transfer-encoding', 'accept-encoding'];

if (function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
        $lower = strtolower($name);
        if (!in_array($lower, $ignoreHeaders)) {
            $forwardHeaders[] = "$name: $value";
        }
    }
}

$forwardHeaders[] = 'X-Forwarded-Host: ' . ($_SERVER['HTTP_HOST'] ?? 'rasalilabs.com');
$forwardHeaders[] = 'X-Forwarded-Proto: https';

// 3. Read body if POST/PUT/PATCH
$body = file_get_contents('php://input');

$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_HTTPHEADER, $forwardHeaders);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);

if ($method !== 'GET' && $method !== 'HEAD' && !empty($body)) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

// Forward response headers
curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($curl, $header) {
    $len = strlen($header);
    $trimmed = trim($header);
    if (empty($trimmed)) {
        return $len;
    }
    $lower = strtolower($trimmed);
    if (strpos($lower, 'transfer-encoding:') === 0 || strpos($lower, 'connection:') === 0) {
        return $len;
    }
    header($trimmed, false);
    return $len;
});

// Execute and stream directly
$success = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($success === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'PROXY_FETCH_ERROR',
        'message' => curl_error($ch),
        'target' => $targetUrl
    ]);
} else {
    http_response_code($httpCode);
}

curl_close($ch);
exit;
`;

const rootHtaccess = `DirectoryIndex index.html

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 1. Route all /ralion/api/* and /api/* to PHP proxy script
  RewriteRule ^ralion/api/(.*)$ /api_proxy.php?__proxy_path=api/$1 [QSA,L]
  RewriteRule ^api/(.*)$ /api_proxy.php?__proxy_path=api/$1 [QSA,L]

  # 2. Do NOT rewrite existing static assets (JS, CSS, images, fonts, binaries, maps) to index.html
  RewriteCond %{REQUEST_URI} !^/ralion/api/ [NC]
  RewriteCond %{REQUEST_URI} !^/api/ [NC]
  RewriteCond %{REQUEST_URI} \\.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff2?|ttf|eot|otf|wasm|json|map|exe|dmg|AppImage|deb|zip|tar\\.gz)$ [NC]
  RewriteRule ^ - [L]

  # 3. Ralion Next.js Sub-application (/ralion/...)
  RewriteCond %{REQUEST_URI} ^/ralion [NC]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ralion/?.*$ /ralion/index.html [L]

  # 4. Admin Next.js Sub-application (/admin/...)
  RewriteCond %{REQUEST_URI} ^/admin [NC]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^admin/?.*$ /admin/index.html [L]

  # 5. Root Marketing SPA Rewrite Rules
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

# Content-Type and Cache Headers
<IfModule mod_headers.c>
  <FilesMatch "\\.(exe|dmg|AppImage|deb|zip)$">
    Header set Content-Type "application/octet-stream"
    Header set Content-Disposition "attachment"
    Header set Cache-Control "public, max-age=31536000, immutable"
    SetEnv no-gzip 1
  </FilesMatch>
  <FilesMatch "\\.(js|mjs)$">
    Header set Content-Type "application/javascript; charset=utf-8"
  </FilesMatch>
  <FilesMatch "\\.css$">
    Header set Content-Type "text/css; charset=utf-8"
  </FilesMatch>
</IfModule>
`;

const ralionHtaccess = `DirectoryIndex index.html

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /ralion/

  # 1. API routes inside /ralion/
  RewriteRule ^api/(.*)$ /api_proxy.php?__proxy_path=api/$1 [QSA,L]

  # 2. Exclude static assets
  RewriteCond %{REQUEST_URI} !^/ralion/api/ [NC]
  RewriteCond %{REQUEST_FILENAME} -f
  RewriteRule ^ - [L]

  # 3. SPA Fallback for /ralion/*
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^.*$ /ralion/index.html [L]
</IfModule>
`;

async function uploadFile(tusUrl: string, authKey: string, restAuthKey: string, destPath: string, content: string | Buffer) {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
  const size = buf.length;
  const targetUrl = `${tusUrl}/${destPath}?override=true`;

  console.log(`Uploading ${destPath} (${size} bytes)...`);

  const postRes = await axios.post(targetUrl, null, {
    headers: {
      'X-Auth': authKey,
      'X-Auth-Rest': restAuthKey,
      'Tus-Resumable': '1.0.0',
      'Upload-Length': size.toString(),
      'Upload-Offset': '0',
    },
    validateStatus: () => true,
  });

  const patchRes = await axios.patch(targetUrl, buf, {
    headers: {
      'X-Auth': authKey,
      'X-Auth-Rest': restAuthKey,
      'Tus-Resumable': '1.0.0',
      'Content-Type': 'application/offset+octet-stream',
      'Upload-Offset': '0',
    },
    validateStatus: () => true,
  });

  if (patchRes.status === 204 || patchRes.status === 200) {
    console.log(`✅ Successfully uploaded ${destPath}`);
  } else {
    throw new Error(`Upload failed for ${destPath}: HTTP ${patchRes.status}`);
  }
}

async function run() {
  const tusUrl = 'https://srv1717-files.hstgr.io/rest/2c10b7925b8cf502/api/tus/public_html';
  const authKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxLCJsb2NhbGUiOiJlbl9VUyIsInZpZXdNb2RlIjoibGlzdCIsInNpbmdsZUNsaWNrIjpmYWxzZSwicmVkaXJlY3RBZnRlckNvcHlNb3ZlIjpmYWxzZSwicGVybSI6eyJhZG1pbiI6ZmFsc2UsImV4ZWN1dGUiOmZhbHNlLCJjcmVhdGUiOnRydWUsInJlbmFtZSI6dHJ1ZSwibW9kaWZ5Ijp0cnVlLCJkZWxldGUiOnRydWUsInNoYXJlIjpmYWxzZSwiZG93bmxvYWQiOnRydWV9LCJjb21tYW5kcyI6W10sImxvY2tQYXNzd29yZCI6dHJ1ZSwiaGlkZURvdGZpbGVzIjpmYWxzZSwiZGF0ZUZvcm1hdCI6ZmFsc2UsInVzZXJuYW1lIjoidTcyMzc3NDEwMCIsImFjZUVkaXRvclRoZW1lIjoiIn0sImlzcyI6IkZpbGUgQnJvd3NlciIsImV4cCI6MTc4ODIyMzI5NSwiaWF0IjoxNzg4MjAxNjk1fQ.2pq1Y_efMD6BOKnHeUt7wCoMytjf7Ffp_c8xVNxioyI';
  const restAuthKey = 'a033c36aeadbff39ace5cd23d68b7765ca11d567d09534b4c50470c05f18f37a-2c10b7925b8cf502';

  await uploadFile(tusUrl, authKey, restAuthKey, 'api_proxy.php', apiProxyPhp);
  await uploadFile(tusUrl, authKey, restAuthKey, 'ralion/api_proxy.php', apiProxyPhp);
  await uploadFile(tusUrl, authKey, restAuthKey, '.htaccess', rootHtaccess);
  await uploadFile(tusUrl, authKey, restAuthKey, 'ralion/.htaccess', ralionHtaccess);
}

run().catch(console.error);
