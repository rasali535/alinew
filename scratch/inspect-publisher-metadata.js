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
  const profId = '6a82deac1a69158ef81cb2cd';
  const accId = '6a82df7277555aae018b92b4';

  console.log('=== 1. PROFILE DETAILS ===');
  const prof = await req(`profiles/${profId}`);
  console.log('Profile:', JSON.stringify(prof, null, 2));

  console.log('\n=== 2. ACCOUNTS DETAILS ===');
  const accs = await req(`accounts?profileId=${profId}`);
  console.log('Accounts:', JSON.stringify(accs, null, 2));

  console.log('\n=== 3. SINGLE ACCOUNT DETAILS ===');
  const singleAcc = await req(`accounts/${accId}`);
  console.log('Single Account:', JSON.stringify(singleAcc, null, 2));
})();
