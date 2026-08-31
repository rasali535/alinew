import https from 'https';

function check(urlStr: string): Promise<{ status: number; contentType?: string; headers: Record<string, any>; body: string }> {
  return new Promise((resolve) => {
    https.get(urlStr, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode || 0, contentType: res.headers['content-type'], headers: res.headers, body: data }));
    }).on('error', e => resolve({ status: 0, headers: {}, body: e.message }));
  });
}

async function run() {
  console.log('Testing Render backend:');
  
  const r1 = await check('https://ralion-dynamic-backend.onrender.com/api/creatives/file/asset-1788200545566-ua2is.jpg');
  console.log('[1] Render /api/creatives/file/asset-1788200545566-ua2is.jpg:');
  console.log(`    Status: ${r1.status}, Content-Type: ${r1.contentType}`);
  console.log(`    Headers:`, r1.headers);
  console.log(`    Body snippet: ${r1.body.substring(0, 300)}`);
  console.log('');

  const r2 = await check('https://ralion-dynamic-backend.onrender.com/ralion/api/creatives/file/asset-1788200545566-ua2is.jpg');
  console.log('[2] Render /ralion/api/creatives/file/asset-1788200545566-ua2is.jpg:');
  console.log(`    Status: ${r2.status}, Content-Type: ${r2.contentType}`);
  console.log(`    Body snippet: ${r2.body.substring(0, 300)}`);
}

run();
