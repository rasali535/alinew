require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env.production' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

async function testPayloads() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const accountId = '6a82e16d4c62c3327d530062';
  const profileId = '6a82deac1a69158ef81cb2cd';
  const pageId = '477334159265235';

  const variants = [
    {
      name: 'Variant 1: platforms array with accountId',
      body: {
        content: 'Ralion OS Enterprise Live Facebook Integration Test 1',
        platforms: [{ platform: 'facebook', accountId }],
        publishNow: true,
      }
    },
    {
      name: 'Variant 2: platforms array with accountId and profileId',
      body: {
        profileId,
        content: 'Ralion OS Enterprise Live Facebook Integration Test 2',
        platforms: [{ platform: 'facebook', accountId }],
        publishNow: true,
      }
    },
    {
      name: 'Variant 3: accountIds array with profileId',
      body: {
        profileId,
        content: 'Ralion OS Enterprise Live Facebook Integration Test 3',
        accountIds: [accountId],
        publishNow: true,
      }
    },
    {
      name: 'Variant 4: accounts array with profileId',
      body: {
        profileId,
        content: 'Ralion OS Enterprise Live Facebook Integration Test 4',
        accounts: [accountId],
        publishNow: true,
      }
    },
    {
      name: 'Variant 5: accountIds array only',
      body: {
        content: 'Ralion OS Enterprise Live Facebook Integration Test 5',
        accountIds: [accountId],
        publishNow: true,
      }
    },
    {
      name: 'Variant 6: platforms with pageId',
      body: {
        content: 'Ralion OS Enterprise Live Facebook Integration Test 6',
        platforms: [{ platform: 'facebook', accountId, platformSpecificData: { pageId } }],
        publishNow: true,
      }
    },
  ];

  for (const v of variants) {
    console.log(`\n=== Testing ${v.name} ===`);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/zernio-bridge/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify(v.body)
      });
      console.log('Status:', res.status, res.statusText);
      const data = await res.text();
      console.log('Response:', data);
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
}

testPayloads().catch(console.error);
