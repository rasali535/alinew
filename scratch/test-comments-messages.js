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
    return { status: res.status, text: text.slice(0, 100) };
  }
}

(async () => {
  console.log('=== CHECKING CONVERSATION MESSAGES & POST COMMENTS ===\n');

  // 1. Check conversation messages
  const convId = '38095895593357719';
  const convEndpoints = [
    `inbox/conversations/${convId}`,
    `inbox/conversations/${convId}/messages`,
    `inbox/messages?conversationId=${convId}`,
    `inbox/messages?participantId=${convId}`
  ];

  for (const ep of convEndpoints) {
    const res = await get(ep);
    console.log(`[${res.status}] GET /${ep}:`, typeof res.data === 'object' ? Object.keys(res.data) : res.text);
    if (res.data && res.data.messages) console.log('  Messages length:', res.data.messages.length);
    if (res.data && res.data.data) console.log('  Data sample:', JSON.stringify(res.data.data).slice(0, 200));
  }

  // 2. Check comments on a post
  const postId = '6a84483a31fca2a5aa1ab635';
  const platformPostId = '477334159265235_1686609020137087';
  const commentEndpoints = [
    `posts/${postId}/comments`,
    `posts/${platformPostId}/comments`,
    `comments?postId=${postId}`,
    `comments?platformPostId=${platformPostId}`,
    `comments?profileId=6a82deac1a69158ef81cb2cd&postId=${postId}`
  ];

  for (const ep of commentEndpoints) {
    const res = await get(ep);
    console.log(`[${res.status}] GET /${ep}:`, typeof res.data === 'object' ? Object.keys(res.data) : res.text);
  }
})();
