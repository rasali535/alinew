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
  const commentPostId = '477334159265235_1197727297225914';
  const accId = '6a82df7277555aae018b92b4';

  const t1 = await req(`inbox/comments/${commentPostId}?accountId=${accId}`);
  console.log('1. /inbox/comments/:id?accountId=:', JSON.stringify(t1, null, 2));

  const t2 = await req(`inbox/comments/${commentPostId}/comments?accountId=${accId}`);
  console.log('2. /inbox/comments/:id/comments?accountId=:', JSON.stringify(t2, null, 2));
})();
