const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const htaccess = fs.readFileSync(path.join(root, 'apps/ralion/public/.htaccess'), 'utf8');
const proxy = fs.readFileSync(path.join(root, 'apps/ralion/public/api_proxy.php'), 'utf8');

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
expect(proxy, "unset($queryParams['__proxy_path']);", 'internal proxy routing parameter is not forwarded upstream');

console.log('Ralion Hostinger API proxy contract: PASS');
