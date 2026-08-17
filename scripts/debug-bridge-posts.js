require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env.production' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

async function testBridge() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Testing Edge Bridge at:', supabaseUrl);

  const payload = {
    content: 'Testing live post from Ralion OS to Ras Ali Labs Facebook Page',
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

  const res = await fetch(`${supabaseUrl}/functions/v1/zernio-bridge/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    },
    body: JSON.stringify(payload)
  });

  console.log('Status:', res.status, res.statusText);
  const text = await res.text();
  console.log('Response text:', text);
}

testBridge().catch(console.error);
