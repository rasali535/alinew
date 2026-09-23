const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const htaccess = fs.readFileSync(path.join(root, 'apps/ralion/public/.htaccess'), 'utf8');
const proxy = fs.readFileSync(path.join(root, 'apps/ralion/public/api_proxy.php'), 'utf8');
const mergeBuilds = fs.readFileSync(path.join(root, 'scripts/merge-builds.js'), 'utf8');

function expect(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`[Ralion Hostinger proxy] Missing invariant: ${label}`);
}

function reject(source, needle, label) {
  if (source.includes(needle)) throw new Error(`[Ralion Hostinger proxy] Forbidden invariant: ${label}`);
}

expect(htaccess, 'RewriteBase /ralion/', 'Ralion sub-app rewrite base');
expect(htaccess, 'RewriteRule ^api/(.*)$ api_proxy.php?__proxy_path=api/$1 [QSA,L]', 'API traffic uses the proxy local to /ralion');
reject(htaccess, 'RewriteRule ^api/(.*)$ /api_proxy.php?__proxy_path=api/$1 [QSA,L]', 'Ralion must not depend on a root-level proxy file');
expect(proxy, "https://ralion-dynamic-backend.onrender.com", 'proxy targets the Ralion dynamic backend');
expect(proxy, "HTTP_AUTHORIZATION", 'proxy preserves Authorization under FastCGI');
expect(proxy, "REDIRECT_HTTP_AUTHORIZATION", 'proxy preserves redirected Authorization under FastCGI');
expect(proxy, "if (urldecode($key) === '__proxy_path') continue;", 'internal proxy routing parameter is not forwarded upstream');
expect(proxy, 'x-ralion-auth-token', 'proxy permits the mirrored Ralion auth token header');
expect(proxy, 'header("Access-Control-Allow-Origin: $allowedOrigin")', 'proxy returns only validated CORS origin');
expect(mergeBuilds, "const ralionProxySrc = path.join(rootDir, 'apps', 'ralion', 'public', 'api_proxy.php');", 'build packaging identifies the Ralion-specific proxy');
expect(mergeBuilds, "fs.copyFileSync(ralionProxySrc, path.join(ralionDir, 'api_proxy.php'));", 'build packaging preserves the Ralion-specific proxy');

console.log('Ralion Hostinger API proxy contract: PASS');
