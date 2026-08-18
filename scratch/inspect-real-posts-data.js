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
  return res.json();
}

(async () => {
  console.log('=== 1. POSTS (includeExternal=true) ===');
  const postsData = await get('posts?profileId=6a82deac1a69158ef81cb2cd&includeExternal=true');
  console.log('Pagination:', postsData.pagination);
  if (postsData.posts) {
    postsData.posts.slice(0, 5).forEach((p, idx) => {
      console.log(`\nPost #${idx + 1}:`);
      console.log('  ID:', p._id || p.id);
      console.log('  Content:', (p.content || p.body || '').slice(0, 100));
      console.log('  PublishedAt:', p.publishedAt || p.createdAt);
      console.log('  Platforms:', JSON.stringify(p.platforms));
    });
  }

  console.log('\n=== 2. ANALYTICS ===');
  const analyticsData = await get('analytics?profileId=6a82deac1a69158ef81cb2cd');
  console.log('Overview:', JSON.stringify(analyticsData.overview, null, 2));
  console.log('Analytics Posts count:', analyticsData.posts?.length);
  if (analyticsData.posts) {
    analyticsData.posts.slice(0, 3).forEach((p, idx) => {
      console.log(`\nAnalytics Post #${idx + 1}:`);
      console.log('  PlatformPostId:', p.platformPostId);
      console.log('  Caption:', (p.caption || p.content || '').slice(0, 100));
      console.log('  Engagement:', p.engagement, p.likes, p.comments, p.shares, p.impressions);
      console.log('  Metrics:', JSON.stringify(p.metrics));
    });
  }

  console.log('\n=== 3. INBOX CONVERSATIONS ===');
  const inboxData = await get('inbox/conversations?profileId=6a82deac1a69158ef81cb2cd');
  console.log('Inbox Data:', JSON.stringify(inboxData, null, 2).slice(0, 1000));
})();
