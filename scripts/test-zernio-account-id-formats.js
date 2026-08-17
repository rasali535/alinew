require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env.production' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

async function testIdFormats() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const testCases = [
    {
      name: 'Format A: accountId = _id (6a82e16d4c62c3327d530062)',
      platforms: [{ platform: 'facebook', accountId: '6a82e16d4c62c3327d530062' }]
    },
    {
      name: 'Format B: accountId = selectedPageId (477334159265235)',
      platforms: [{ platform: 'facebook', accountId: '477334159265235' }]
    },
    {
      name: 'Format C: accountId = platformUserId (28553459180928767:page:477334159265235)',
      platforms: [{ platform: 'facebook', accountId: '28553459180928767:page:477334159265235' }]
    },
    {
      name: 'Format D: accountId = userProfile.id (28553459180928767)',
      platforms: [{ platform: 'facebook', accountId: '28553459180928767' }]
    },
    {
      name: 'Format E: id = _id (6a82e16d4c62c3327d530062)',
      platforms: [{ platform: 'facebook', id: '6a82e16d4c62c3327d530062' }]
    },
    {
      name: 'Format F: platform only + profileId',
      profileId: '6a82deac1a69158ef81cb2cd',
      platforms: [{ platform: 'facebook' }]
    },
    {
      name: 'Format G: accountId = _id + profileId',
      profileId: '6a82deac1a69158ef81cb2cd',
      platforms: [{ platform: 'facebook', accountId: '6a82e16d4c62c3327d530062' }]
    },
  ];

  for (const tc of testCases) {
    console.log(`\n=== Testing ${tc.name} ===`);
    const payload = {
      content: 'Ralion OS Live Facebook Telemetry Test',
      platforms: tc.platforms,
      publishNow: true,
      ...(tc.profileId ? { profileId: tc.profileId } : {})
    };

    try {
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
      const data = await res.text();
      console.log('Response:', data);
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
}

testIdFormats().catch(console.error);
