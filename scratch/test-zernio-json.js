const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

const SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjM5NDUsImV4cCI6MjA5ODM5OTk0NX0.r-hhC-BT3WCf9JLq-HeTHXIFkulM5XkorUEfkqMhc-g';

async function testEndpoint(endpoint) {
  const url = `${SUPABASE_URL}/functions/v1/zernio-bridge/${endpoint}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      }
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text.slice(0, 100); }
    console.log(`\n--- [${res.status}] GET /${endpoint} ---`);
    if (typeof data === 'object') {
      console.log(JSON.stringify(data, null, 2).slice(0, 1200));
    } else {
      console.log(data);
    }
  } catch (err) {
    console.log(`ERROR /${endpoint}:`, err.message);
  }
}

(async () => {
  await testEndpoint('profiles');
  await testEndpoint('accounts?profileId=6a82deac1a69158ef81cb2cd');
  await testEndpoint('accounts/6a82df7277555aae018b92b4');
  await testEndpoint('posts');
  await testEndpoint('posts?profileId=6a82deac1a69158ef81cb2cd');
  await testEndpoint('analytics/summary?profileId=6a82deac1a69158ef81cb2cd');
})();
