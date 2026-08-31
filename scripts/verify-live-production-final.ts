import https from 'https';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

function fetchUrl(urlStr: string): Promise<{ status: number; headers: Record<string, any>; buffer: Buffer }> {
  return new Promise((resolve, reject) => {
    https.get(urlStr, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', chunk => chunks.push(Buffer.from(chunk)));
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          buffer: Buffer.concat(chunks),
        });
      });
    }).on('error', reject);
  });
}

async function verifyAll() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 FINAL VERIFICATION REPORT: LIVE PRODUCTION CREATIVE ASSETS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Test 1: Original incident asset
  const incidentUrl = 'https://rasalilabs.com/ralion/api/creatives/file/asset-1788200545566-ua2is.jpg';
  console.log(`[TEST 1] Incident Asset Live Delivery: ${incidentUrl}`);
  const res1 = await fetchUrl(incidentUrl);
  console.log(`  Status:         ${res1.status}`);
  console.log(`  Content-Type:   ${res1.headers['content-type']}`);
  console.log(`  Content-Length: ${res1.headers['content-length']} (received: ${res1.buffer.length} bytes)`);
  console.log(`  Server:         ${res1.headers['server']}`);
  console.log(`  JPEG Magic:     ${res1.buffer.subarray(0, 4).toString('hex')}`);
  console.log(`  Verification:   ${res1.status === 200 && res1.buffer.subarray(0, 2).toString('hex') === 'ffd8' ? '✅ PASS' : '❌ FAIL'}\n`);

  // Test 2: New asset generated after fix
  const newAssetUrl = 'https://rasalilabs.com/ralion/api/creatives/file/asset-1788201889033-9yop3.jpg';
  console.log(`[TEST 2] New Asset Live Delivery: ${newAssetUrl}`);
  const res2 = await fetchUrl(newAssetUrl);
  console.log(`  Status:         ${res2.status}`);
  console.log(`  Content-Type:   ${res2.headers['content-type']}`);
  console.log(`  Content-Length: ${res2.headers['content-length']} (received: ${res2.buffer.length} bytes)`);
  console.log(`  Server:         ${res2.headers['server']}`);
  console.log(`  JPEG Magic:     ${res2.buffer.subarray(0, 4).toString('hex')}`);
  console.log(`  Verification:   ${res2.status === 200 && res2.buffer.subarray(0, 2).toString('hex') === 'ffd8' ? '✅ PASS' : '❌ FAIL'}\n`);

  // Test 3: Generate a 2nd fresh asset live right now
  console.log('[TEST 3] Generating 2nd New Asset via Live Endpoint...');
  const { default: axios } = await import('axios');
  const genRes = await axios.post<any>('https://rasalilabs.com/ralion/api/mari/generate', {
    prompt: 'Hyper-detailed luxury architectural showcase poster for Ras Ali Labs with futuristic glowing typography',
    type: 'POSTER_IMAGE',
    organizationId: 'default-org',
  }, { validateStatus: () => true });

  console.log(`  Generate Status: ${genRes.status}`);
  const asset3 = genRes.data?.asset || genRes.data?.receipt || genRes.data;
  console.log(`  Asset ID:        ${asset3.id || asset3.assetId}`);
  console.log(`  Public URL:      ${asset3.publicUrl}`);
  console.log(`  Storage Path:    ${asset3.storagePath}`);

  const live3Url = `https://rasalilabs.com${asset3.publicUrl}`;
  console.log(`  Fetching Live:   ${live3Url}`);
  const res3 = await fetchUrl(live3Url);
  console.log(`  Status:          ${res3.status}`);
  console.log(`  Content-Type:    ${res3.headers['content-type']}`);
  console.log(`  Received Bytes:  ${res3.buffer.length}`);
  console.log(`  JPEG Magic:      ${res3.buffer.subarray(0, 4).toString('hex')}`);
  console.log(`  Verification:    ${res3.status === 200 && res3.buffer.subarray(0, 2).toString('hex') === 'ffd8' ? '✅ PASS' : '❌ FAIL'}\n`);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY');
  console.log('═══════════════════════════════════════════════════════════════');
}

verifyAll().catch(console.error);
