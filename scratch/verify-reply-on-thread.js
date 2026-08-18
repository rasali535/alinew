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
  const postId = '477334159265235_1686625193468803';
  const accId = '6a82df7277555aae018b92b4';

  console.log(`Re-fetching comments for post ${postId}...`);
  const comments = await req(`inbox/comments/${postId}?accountId=${accId}`);
  console.log('Comments thread with reply:', JSON.stringify(comments, null, 2));
})();
