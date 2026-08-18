const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjM5NDUsImV4cCI6MjA5ODM5OTk0NX0.r-hhC-BT3WCf9JLq-HeTHXIFkulM5XkorUEfkqMhc-g';

async function req(endpoint) {
  const url = `${SUPABASE_URL}/functions/v1/zernio-bridge/${endpoint}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Ralion-OS-Social-Engine/2.4'
      }
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
  } catch (err) {
    return { status: 0, error: err.message };
  }
}

(async () => {
  console.log('=== PROBING LIVE ZERNIO BRIDGE VIA SUPABASE ===\n');

  // 1. Profiles
  const profiles = await req('profiles');
  console.log('1. GET /profiles:', profiles.status, JSON.stringify(profiles.data, null, 2));

  // 2. Accounts for Profile
  const accountsByProfile = await req('accounts?profileId=6a82deac1a69158ef81cb2cd');
  console.log('\n2. GET /accounts?profileId=6a82deac1a69158ef81cb2cd:', accountsByProfile.status, JSON.stringify(accountsByProfile.data, null, 2));

  // 3. Single Account
  const singleAcc = await req('accounts/6a82df7277555aae018b92b4');
  console.log('\n3. GET /accounts/6a82df7277555aae018b92b4:', singleAcc.status, JSON.stringify(singleAcc.data, null, 2));

  // 4. Posts endpoints
  const posts = await req('posts');
  console.log('\n4. GET /posts:', posts.status, JSON.stringify(posts.data, null, 2));

  const postsByProfile = await req('posts?profileId=6a82deac1a69158ef81cb2cd');
  console.log('\n4b. GET /posts?profileId=...:', postsByProfile.status, JSON.stringify(postsByProfile.data, null, 2));

  const postsByAccount = await req('posts?accountId=6a82df7277555aae018b92b4');
  console.log('\n4c. GET /posts?accountId=...:', postsByAccount.status, JSON.stringify(postsByAccount.data, null, 2));

  // 5. Test other possible read endpoints
  const testEndpoints = [
    'accounts/6a82df7277555aae018b92b4/feed',
    'accounts/6a82df7277555aae018b92b4/posts',
    'analytics/summary?profileId=6a82deac1a69158ef81cb2cd',
    'analytics/accounts/6a82df7277555aae018b92b4',
    'inbox/messages?profileId=6a82deac1a69158ef81cb2cd',
    'comments?accountId=6a82df7277555aae018b92b4',
    'comments?profileId=6a82deac1a69158ef81cb2cd',
    'pages/477334159265235/posts'
  ];

  for (const ep of testEndpoints) {
    const res = await req(ep);
    console.log(`\nProbe [${res.status}] GET /${ep}:`, typeof res.data === 'object' ? JSON.stringify(res.data, null, 2).slice(0, 500) : res.data);
  }
})();
