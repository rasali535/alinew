import https from 'https';

function check(path: string): Promise<{ status: number; contentType?: string; body: string }> {
  return new Promise((resolve) => {
    https.get(`https://rasalilabs.com${path}`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode || 0, contentType: res.headers['content-type'], body: data }));
    }).on('error', e => resolve({ status: 0, body: e.message }));
  });
}

async function run() {
  console.log('Testing URL routing on rasalilabs.com:');
  
  // 1. Without .jpg extension
  const withoutExt = await check('/ralion/api/creatives/file/asset-1788200545566-ua2is');
  console.log('[1] /ralion/api/creatives/file/asset-1788200545566-ua2is (no .jpg):');
  console.log(`    Status: ${withoutExt.status}, Content-Type: ${withoutExt.contentType}`);
  console.log(`    Body snippet: ${withoutExt.body.substring(0, 300)}`);
  console.log('');

  // 2. Asset metadata route
  const metaRoute = await check('/ralion/api/creatives/asset-1788200545566-ua2is');
  console.log('[2] /ralion/api/creatives/asset-1788200545566-ua2is:');
  console.log(`    Status: ${metaRoute.status}, Content-Type: ${metaRoute.contentType}`);
  console.log(`    Body snippet: ${metaRoute.body.substring(0, 300)}`);
  console.log('');

  // 3. Billing route or other API route
  const billingRoute = await check('/ralion/api/billing/subscription');
  console.log('[3] /ralion/api/billing/subscription:');
  console.log(`    Status: ${billingRoute.status}, Content-Type: ${billingRoute.contentType}`);
  console.log(`    Body snippet: ${billingRoute.body.substring(0, 300)}`);
}

run();
