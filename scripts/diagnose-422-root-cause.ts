import { createClient } from '@supabase/supabase-js';
import https from 'https';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

function fetchUrl(url: string, headers: Record<string, string> = {}): Promise<{
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
  sha256: string;
}> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        const hash = crypto.createHash('sha256').update(body).digest('hex');
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body,
          sha256: hash,
        });
      });
    });
    req.on('error', reject);
  });
}

async function runAudit() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('🔍 STEP 1 & 2: TRACE ASSET & VERIFY SUPABASE DIRECTLY');
  console.log('════════════════════════════════════════════════════════════════════');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

  const supabase = createClient(supabaseUrl, serviceKey);

  const assetBase = 'asset-1788204148342-at8ey';
  const jpgName = `${assetBase}.jpg`;
  const metaName = `${assetBase}.meta.json`;

  console.log(`Checking Supabase bucket "creatives" for ${jpgName} and ${metaName}...`);

  // Download metadata
  const { data: metaData, error: metaErr } = await supabase.storage
    .from('creatives')
    .download(metaName);

  if (metaErr) {
    console.log(`Metadata download error for ${metaName}:`, metaErr.message);
  } else if (metaData) {
    const text = await metaData.text();
    console.log(`Metadata content:`, text);
  }

  // Download jpg
  const { data: jpgData, error: jpgErr } = await supabase.storage
    .from('creatives')
    .download(jpgName);

  let supabaseSha256 = '';
  if (jpgErr) {
    console.log(`❌ SUPABASE JPG DOWNLOAD ERROR:`, jpgErr.message);
  } else if (jpgData) {
    const arrayBuf = await jpgData.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    supabaseSha256 = crypto.createHash('sha256').update(buf).digest('hex');
    console.log(`✅ Supabase download success:`);
    console.log(`   Bytes: ${buf.length}`);
    console.log(`   MIME: ${jpgData.type}`);
    console.log(`   Magic Bytes (hex): ${buf.slice(0, 4).toString('hex')}`);
    console.log(`   SHA256: ${supabaseSha256}`);
  }

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log('🔍 STEP 3: TEST RENDER DIRECTLY');
  console.log('════════════════════════════════════════════════════════════════════');

  const renderUrl = `https://ralion-dynamic-backend.onrender.com/api/creatives/file/${jpgName}`;
  console.log(`Requesting ${renderUrl}...`);
  try {
    const renderRes = await fetchUrl(renderUrl);
    console.log(`Render HTTP Status: ${renderRes.statusCode}`);
    console.log(`Render Content-Type: ${renderRes.headers['content-type']}`);
    console.log(`Render Content-Length: ${renderRes.headers['content-length']}`);
    console.log(`Render Body Bytes: ${renderRes.body.length}`);
    console.log(`Render SHA256: ${renderRes.sha256}`);
    console.log(`Render Headers:`, JSON.stringify(renderRes.headers, null, 2));
    if (renderRes.statusCode !== 200) {
      console.log(`Render Body Preview (first 500 bytes):`, renderRes.body.slice(0, 500).toString('utf-8'));
    }
  } catch (err: any) {
    console.log(`Render request failed:`, err.message);
  }

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log('🔍 STEP 4 & 5: TEST HOSTINGER LIVE URL & DIRECT PROXY');
  console.log('════════════════════════════════════════════════════════════════════');

  const liveUrl = `https://rasalilabs.com/ralion/api/creatives/file/${jpgName}`;
  console.log(`Requesting live URL: ${liveUrl}...`);
  try {
    const liveRes = await fetchUrl(liveUrl);
    console.log(`Live HTTP Status: ${liveRes.statusCode}`);
    console.log(`Live Content-Type: ${liveRes.headers['content-type']}`);
    console.log(`Live Content-Length: ${liveRes.headers['content-length']}`);
    console.log(`Live Body Bytes: ${liveRes.body.length}`);
    console.log(`Live SHA256: ${liveRes.sha256}`);
    console.log(`Live Headers:`, JSON.stringify(liveRes.headers, null, 2));
    console.log(`Live Body Preview (first 500 bytes as text):`, liveRes.body.slice(0, 500).toString('utf-8'));
    console.log(`Live Body Preview (first 16 bytes as hex):`, liveRes.body.slice(0, 16).toString('hex'));
  } catch (err: any) {
    console.log(`Live request failed:`, err.message);
  }

  const directProxyUrl = `https://rasalilabs.com/api_proxy.php?path=api/creatives/file/${jpgName}`;
  console.log(`\nRequesting direct PHP proxy URL: ${directProxyUrl}...`);
  try {
    const proxyRes = await fetchUrl(directProxyUrl);
    console.log(`Proxy HTTP Status: ${proxyRes.statusCode}`);
    console.log(`Proxy Content-Type: ${proxyRes.headers['content-type']}`);
    console.log(`Proxy Content-Length: ${proxyRes.headers['content-length']}`);
    console.log(`Proxy Body Bytes: ${proxyRes.body.length}`);
    console.log(`Proxy SHA256: ${proxyRes.sha256}`);
    console.log(`Proxy Headers:`, JSON.stringify(proxyRes.headers, null, 2));
    if (proxyRes.statusCode !== 200) {
      console.log(`Proxy Body Preview (first 500 bytes):`, proxyRes.body.slice(0, 500).toString('utf-8'));
    }
  } catch (err: any) {
    console.log(`Direct proxy request failed:`, err.message);
  }
}

runAudit().catch(console.error);
