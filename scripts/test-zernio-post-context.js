require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env.production' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

async function testPostContext() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const accountId = '6a82e16d4c62c3327d530062';
  const profileId = '6a82deac1a69158ef81cb2cd';
  const pageId = '477334159265235';

  const testCases = [
    {
      name: 'Test 1: profileId in query params (?profileId=...)',
      url: `${supabaseUrl}/functions/v1/zernio-bridge/posts?profileId=${profileId}`,
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      body: {
        content: 'Ralion OS Live Facebook Post Test',
        platforms: [{ platform: 'facebook', accountId }],
        publishNow: true,
      }
    },
    {
      name: 'Test 2: X-Profile-Id Header',
      url: `${supabaseUrl}/functions/v1/zernio-bridge/posts`,
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'X-Profile-Id': profileId,
      },
      body: {
        content: 'Ralion OS Live Facebook Post Test',
        platforms: [{ platform: 'facebook', accountId }],
        publishNow: true,
      }
    },
    {
      name: 'Test 3: profileId inside platform object',
      url: `${supabaseUrl}/functions/v1/zernio-bridge/posts`,
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      body: {
        content: 'Ralion OS Live Facebook Post Test',
        platforms: [{ platform: 'facebook', accountId, profileId }],
        publishNow: true,
      }
    },
    {
      name: 'Test 4: Zernio standard post schema with body / title / message',
      url: `${supabaseUrl}/functions/v1/zernio-bridge/posts`,
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      body: {
        message: 'Ralion OS Live Facebook Post Test',
        platforms: [{ platform: 'facebook', accountId }],
        publishNow: true,
      }
    },
    {
      name: 'Test 5: Zernio post with text field',
      url: `${supabaseUrl}/functions/v1/zernio-bridge/posts`,
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      body: {
        text: 'Ralion OS Live Facebook Post Test',
        platforms: [{ platform: 'facebook', accountId }],
        publishNow: true,
      }
    },
    {
      name: 'Test 6: platformSpecificData with pageId and accountId',
      url: `${supabaseUrl}/functions/v1/zernio-bridge/posts?profileId=${profileId}`,
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'X-Profile-Id': profileId,
      },
      body: {
        profileId,
        content: 'Ralion OS Live Facebook Post Test',
        platforms: [{ platform: 'facebook', accountId, platformSpecificData: { pageId } }],
        publishNow: true,
      }
    },
  ];

  for (const tc of testCases) {
    console.log(`\n=== ${tc.name} ===`);
    try {
      const res = await fetch(tc.url, {
        method: 'POST',
        headers: tc.headers,
        body: JSON.stringify(tc.body)
      });
      console.log('Status:', res.status, res.statusText);
      const text = await res.text();
      console.log('Response:', text);
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
}

testPostContext().catch(console.error);
