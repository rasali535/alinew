require('dotenv').config({ path: 'apps/ralion/.env.production' });
require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

async function debugRawZernio() {
  const apiKey = process.env.ZERNIO_API_KEY;
  console.log('Using ZERNIO_API_KEY:', apiKey ? apiKey.substring(0, 10) + '...' : 'NONE');

  const payload = {
    content: 'Test post from Ralion OS to Ras Ali Labs Facebook Page',
    platforms: [
      {
        platform: 'facebook',
        accountId: '6a82e16d4c62c3327d530062',
        platformSpecificData: {
          pageId: '477334159265235'
        }
      }
    ],
    publishNow: true
  };

  console.log('Sending payload to https://zernio.com/api/v1/posts:');
  console.log(JSON.stringify(payload, null, 2));

  const res = await fetch('https://zernio.com/api/v1/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'User-Agent': 'Ralion-OS-Social-Engine/2.4'
    },
    body: JSON.stringify(payload)
  });

  console.log('\nStatus:', res.status, res.statusText);
  const text = await res.text();
  console.log('Raw Response Body:', text);
}

debugRawZernio().catch(console.error);
