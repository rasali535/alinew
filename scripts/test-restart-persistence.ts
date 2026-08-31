import http from 'http';

const assetUrl = 'http://localhost:6509/ralion/api/creatives/file/asset-1788199043147-ble6e.jpg';

console.log('Testing asset retrieval after full app restart from:', assetUrl);

const req = http.get(assetUrl, (res) => {
  const chunks: Buffer[] = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => {
    const buf = Buffer.concat(chunks);
    console.log('═══════════════════════════════════════════════');
    console.log('🔄 RESTART PERSISTENCE VERIFICATION RESULT');
    console.log('═══════════════════════════════════════════════');
    console.log('Status Code:   ', res.statusCode);
    console.log('Content-Type:  ', res.headers['content-type']);
    console.log('X-Asset-Source:', res.headers['x-asset-source']);
    console.log('X-Asset-Bucket:', res.headers['x-asset-bucket']);
    console.log('Bytes received:', buf.length);
    console.log('Is Valid JPEG: ', buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff);
    console.log('═══════════════════════════════════════════════\n');

    if (res.statusCode === 200 && buf.length > 1000) {
      console.log('✅ PASS: Asset survived app restart and was retrieved from Supabase Storage!');
      process.exit(0);
    } else {
      console.error('❌ FAIL: Asset could not be retrieved after restart.');
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
  process.exit(1);
});
