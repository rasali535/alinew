import https from 'https';
import crypto from 'crypto';

https.get('https://rasalilabs.com/api_proxy.php?__proxy_path=api/creatives/file/asset-1788204148342-at8ey.jpg', (res) => {
  console.log('Status:', res.statusCode);
  console.log('Content-Type:', res.headers['content-type']);
  console.log('Content-Length:', res.headers['content-length']);
  console.log('Server:', res.headers['server']);
  console.log('All Headers:', JSON.stringify(res.headers, null, 2));
  const chunks: Buffer[] = [];
  res.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
  res.on('end', () => {
    const buf = Buffer.concat(chunks);
    console.log('Total Bytes received:', buf.length);
    console.log('Magic bytes (hex):', buf.slice(0, 4).toString('hex'));
    console.log('SHA256:', crypto.createHash('sha256').update(buf).digest('hex'));
    if (res.statusCode !== 200) {
      console.log('Body text:', buf.toString('utf-8'));
    }
  });
});
