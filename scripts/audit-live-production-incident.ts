import https from 'https';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

function checkUrl(urlStr: string): Promise<{ status: number; headers: Record<string, any>; body: string }> {
  return new Promise((resolve) => {
    https.get(urlStr, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          body: data,
        });
      });
    }).on('error', err => {
      resolve({
        status: 0,
        headers: {},
        body: err.message,
      });
    });
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 LIVE PRODUCTION INCIDENT AUDIT: asset-1788200545566-ua2is');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Check live URLs
  const urlA = 'https://rasalilabs.com/ralion/api/creatives/file/asset-1788200545566-ua2is.jpg';
  console.log(`[1] Testing Live URL: ${urlA}`);
  const resA = await checkUrl(urlA);
  console.log(`    HTTP Status:   ${resA.status}`);
  console.log(`    Content-Type:  ${resA.headers['content-type']}`);
  console.log(`    Server Header: ${resA.headers['server']}`);
  console.log(`    X-Asset-Src:   ${resA.headers['x-asset-source']}`);
  console.log(`    Body Snippet:  ${resA.body.substring(0, 300)}`);
  console.log('');

  const urlB = 'https://rasalilabs.com/api/creatives/file/asset-1788200545566-ua2is.jpg';
  console.log(`[2] Testing Non-basePath URL: ${urlB}`);
  const resB = await checkUrl(urlB);
  console.log(`    HTTP Status:   ${resB.status}`);
  console.log(`    Content-Type:  ${resB.headers['content-type']}`);
  console.log(`    Server Header: ${resB.headers['server']}`);
  console.log(`    Body Snippet:  ${resB.body.substring(0, 300)}`);
  console.log('');

  const urlC = 'https://rasalilabs.com/ralion/api/mari/generate';
  console.log(`[3] Testing Live Ralion API base: ${urlC}`);
  const resC = await checkUrl(urlC);
  console.log(`    HTTP Status:   ${resC.status}`);
  console.log(`    Content-Type:  ${resC.headers['content-type']}`);
  console.log(`    Server Header: ${resC.headers['server']}`);
  console.log(`    Body Snippet:  ${resC.body.substring(0, 300)}`);
  console.log('');

  // 2. Check Supabase Storage directly
  console.log('[4] Checking Supabase Storage bucket `creatives` directly...');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: listRoot, error: listErr } = await supabase.storage.from('creatives').list('', { search: 'ua2is' });
  console.log('    Root search error:', listErr?.message || 'none');
  console.log('    Root search matches:', listRoot?.map(f => ({ name: f.name, size: (f as any).metadata?.size || (f as any).size })));

  // Try direct download of asset-1788200545566-ua2is.jpg
  const { data: directBlob, error: directErr } = await supabase.storage.from('creatives').download('asset-1788200545566-ua2is.jpg');
  console.log('    Direct download error:', directErr?.message || 'none');
  if (directBlob) {
    const buf = Buffer.from(await directBlob.arrayBuffer());
    console.log(`    Direct download size: ${buf.length} bytes (Magic: ${buf.subarray(0, 4).toString('hex')})`);
  }

  // Also check all files in creatives bucket
  const { data: allFiles } = await supabase.storage.from('creatives').list('', { limit: 20 });
  console.log('    Recent 20 files in bucket `creatives`:', allFiles?.map(f => f.name));
}

main().catch(console.error);
