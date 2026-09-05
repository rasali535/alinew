async function verifyProduction() {
  console.log('================================================================');
  console.log('  RALION OS: Live Production Endpoints Verification');
  console.log('================================================================\n');

  const urls = [
    'https://rasalilabs.com/api/admin/metrics',
    'https://rasalilabs.com/api/admin/customers',
    'https://rasalilabs.com/api/admin/connected-users',
    'https://rasalilabs.com/api/admin/audit-logs',
    'https://rasalilabs.com/ralion/api/admin/metrics',
    'https://rasalilabs.com/ralion/api/admin/customers',
    'https://rasalilabs.com/ralion/api/admin/connected-users',
    'https://rasalilabs.com/ralion/api/admin/audit-logs',
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u, { headers: { 'Accept': 'application/json' } });
      const cType = res.headers.get('content-type') || '';
      const text = await res.text();
      const isJson = cType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[');
      const isHtml = text.trim().startsWith('<!doctype') || text.trim().startsWith('<html');

      console.log(`[HTTP ${res.status}] ${u}`);
      console.log(`  Content-Type: ${cType} | isJson: ${isJson} | isHtml: ${isHtml}`);
      if (isHtml) {
        console.error(`  ❌ ERROR: Received HTML response on API route!`);
      } else {
        console.log(`  ✅ Clean JSON response: ${text.substring(0, 100).replace(/\n/g, ' ')}...`);
      }
    } catch (e: any) {
      console.log(`  [EXCEPTION] ${u}: ${e.message}`);
    }
  }
}

verifyProduction().catch(console.error);
