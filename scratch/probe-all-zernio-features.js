const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

const SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjM5NDUsImV4cCI6MjA5ODM5OTk0NX0.r-hhC-BT3WCf9JLq-HeTHXIFkulM5XkorUEfkqMhc-g';

async function req(endpoint, method = 'GET', body = undefined) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/zernio-bridge/${endpoint}`, {
    method,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, text: text.slice(0, 100) };
  }
}

(async () => {
  console.log('=== EXPLORING ZERNIO POSTS & FEED ENDPOINTS ===\n');

  const tests = [
    // Post listings with various filters
    'posts?profileId=6a82deac1a69158ef81cb2cd&includeExternal=true',
    'posts?profileId=6a82deac1a69158ef81cb2cd&platform=facebook',
    'posts?profileId=6a82deac1a69158ef81cb2cd&status=published',
    'posts?accountId=6a82df7277555aae018b92b4&includeExternal=true',
    'posts?accountId=6a82df7277555aae018b92b4&status=published',
    'posts?accountId=6a82df7277555aae018b92b4',
    
    // Account specific feeds/posts
    'accounts/6a82df7277555aae018b92b4/sync-posts',
    'accounts/6a82df7277555aae018b92b4/sync',
    'accounts/6a82df7277555aae018b92b4/external-posts',
    'accounts/6a82df7277555aae018b92b4/history',
    'accounts/6a82df7277555aae018b92b4/messages',
    'accounts/6a82df7277555aae018b92b4/comments',
    
    // Inbox endpoints
    'inbox?profileId=6a82deac1a69158ef81cb2cd',
    'inbox/conversations?profileId=6a82deac1a69158ef81cb2cd',
    'inbox/messages?profileId=6a82deac1a69158ef81cb2cd',
    'inbox/messages?accountId=6a82df7277555aae018b92b4',
    
    // Analytics endpoints
    'analytics/summary?profileId=6a82deac1a69158ef81cb2cd',
    'analytics/posts?profileId=6a82deac1a69158ef81cb2cd',
    'analytics/posts?accountId=6a82df7277555aae018b92b4',
    'analytics?profileId=6a82deac1a69158ef81cb2cd',
    'analytics?accountId=6a82df7277555aae018b92b4',
    
    // Social / Comments
    'comments?accountId=6a82df7277555aae018b92b4',
    'comments?profileId=6a82deac1a69158ef81cb2cd',
  ];

  for (const ep of tests) {
    const res = await req(ep);
    console.log(`[${res.status}] GET /${ep}`);
    if (res.data) {
      const keys = Object.keys(res.data);
      console.log('  Keys:', keys);
      if (res.data.posts) console.log('  Posts count:', res.data.posts.length);
      if (res.data.messages) console.log('  Messages count:', res.data.messages.length);
      if (res.data.conversations) console.log('  Conversations count:', res.data.conversations.length);
      if (res.data.comments) console.log('  Comments count:', res.data.comments.length);
      if (res.data.error) console.log('  Error:', res.data.error);
    } else {
      console.log('  Text:', res.text);
    }
  }
})();
