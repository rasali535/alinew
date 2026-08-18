const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

const SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjM5NDUsImV4cCI6MjA5ODM5OTk0NX0.r-hhC-BT3WCf9JLq-HeTHXIFkulM5XkorUEfkqMhc-g';

async function get(ep) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/zernio-bridge/${ep}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    }
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, text: text.slice(0, 80) };
  }
}

(async () => {
  const profId = '6a82deac1a69158ef81cb2cd';
  const accId = '6a82df7277555aae018b92b4';
  const postId = '6a84483a31fca2a5aa1ab635';
  const fbPostId = '477334159265235_1686609020137087';

  const candidates = [
    `inbox/comments?profileId=${profId}`,
    `inbox/comments?accountId=${accId}`,
    `social/comments?accountId=${accId}`,
    `posts/${postId}`,
    `analytics/posts/${postId}`,
    `analytics/posts/${fbPostId}`,
  ];

  for (const ep of candidates) {
    const res = await get(ep);
    console.log(`[${res.status}] GET /${ep}`);
    if (res.data) {
      console.log('  Keys:', Object.keys(res.data));
      console.log('  Sample:', JSON.stringify(res.data).slice(0, 300));
    }
  }
})();
