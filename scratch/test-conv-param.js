const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

const SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjM5NDUsImV4cCI6MjA5ODM5OTk0NX0.r-hhC-BT3WCf9JLq-HeTHXIFkulM5XkorUEfkqMhc-g';

async function req(ep) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/zernio-bridge/${ep}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    }
  });
  return res.json();
}

(async () => {
  const d = await req('inbox/conversations/38095895593357719');
  console.log('Error payload:', JSON.stringify(d, null, 2));

  // Let's also check if accountId parameter is required
  const d2 = await req('inbox/conversations/38095895593357719?accountId=6a82df7277555aae018b92b4');
  console.log('With accountId:', JSON.stringify(d2, null, 2));

  const d3 = await req('inbox/conversations/38095895593357719?profileId=6a82deac1a69158ef81cb2cd');
  console.log('With profileId:', JSON.stringify(d3, null, 2));
})();
