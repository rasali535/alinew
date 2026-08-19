const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const PROD_URL = 'https://ralion-dynamic-backend.onrender.com';
const SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjM5NDUsImV4cCI6MjA5ODM5OTk0NX0.9lW_vF_1bL-1b9oF6YfH6L_qF5zU6V_X1Y2Z3A4B5C6';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: 443,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: {
          Origin: 'https://rasalilabs.com',
          Connection: 'close',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, rawData: body });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function smokeTest() {
  console.log('\n================================================================');
  console.log('RALION OS — LIVE PRODUCTION SMOKE TEST (RENDER BACKEND)');
  console.log('================================================================\n');

  // 1. Health check & Render status
  console.log('[1/7] Testing Live Production Health Endpoint...');
  const health = await request(`${PROD_URL}/api/health`);
  console.log(`Health Status: HTTP ${health.status}`, health.data);
  console.log(`CORS Access-Control-Allow-Origin: ${health.headers['access-control-allow-origin']}`);

  // 2. Fetch real tokens for User A (Owner) and User B (Tenant)
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const userA = usersData?.users?.find((u) => u.email === 'chiwabby@gmail.com');
  const userB = usersData?.users?.find((u) => u.email === 'info@pameltex.com');

  const { data: linkA } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: userA.email,
  });
  const { data: linkB } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: userB.email,
  });

  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: sessionA } = await clientA.auth.verifyOtp({
    email: userA.email,
    token: linkA.properties.email_otp,
    type: 'magiclink',
  });

  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: sessionB } = await clientB.auth.verifyOtp({
    email: userB.email,
    token: linkB.properties.email_otp,
    type: 'magiclink',
  });

  const tokenUserA = sessionA?.session?.access_token;
  const tokenUserB = sessionB?.session?.access_token;

  console.log(`\n[2/7] Authenticated Sessions:`);
  console.log(`User A (chiwabby@gmail.com): JWT present (${Boolean(tokenUserA)})`);
  console.log(`User B (info@pameltex.com): JWT present (${Boolean(tokenUserB)})`);

  // 3. User A Live Production Tests
  console.log('\n[3/7] Testing User A (Owner) on Live Production Backend...');

  const connA = await request(`${PROD_URL}/api/social/connections`, {
    headers: { Authorization: `Bearer ${tokenUserA}` },
  });
  console.log(`  - Connections: HTTP ${connA.status} | Total: ${connA.data.connections?.length}`);
  if (connA.data.connections?.length > 0) {
    console.log(`    Account Name: ${connA.data.connections[0].account_name} | Provider: ${connA.data.connections[0].provider}`);
  }

  const postsA = await request(`${PROD_URL}/api/social/facebook/pages/default/posts`, {
    headers: { Authorization: `Bearer ${tokenUserA}` },
  });
  console.log(`  - Posts: HTTP ${postsA.status} | Total Posts: ${postsA.data.posts?.length || postsA.data.total}`);
  if (postsA.data.posts?.length > 0) {
    console.log(`    Sample Post 1: "${postsA.data.posts[0].body?.slice(0, 60)}..." (Likes: ${postsA.data.posts[0].engagement?.likes})`);
  }

  const commentsA = await request(`${PROD_URL}/api/social/comments`, {
    headers: { Authorization: `Bearer ${tokenUserA}` },
  });
  console.log(`  - Comments: HTTP ${commentsA.status} | Total Comments: ${commentsA.data.comments?.length || commentsA.data.total}`);

  const inboxA = await request(`${PROD_URL}/api/social/inbox?provider=facebook`, {
    headers: { Authorization: `Bearer ${tokenUserA}` },
  });
  console.log(`  - Inbox: HTTP ${inboxA.status} | Total Conversations: ${inboxA.data.conversations?.length || 0}`);

  const analyticsA = await request(`${PROD_URL}/api/social/facebook/pages/default/analytics`, {
    headers: { Authorization: `Bearer ${tokenUserA}` },
  });
  console.log(`  - Analytics: HTTP ${analyticsA.status} | Followers: ${analyticsA.data.analytics?.followers || 0} | Engagement Rate: ${analyticsA.data.analytics?.engagementRate}%`);

  // 4. Live Publishing Test from Ralion -> Render -> Zernio -> Facebook
  console.log('\n[4/7] Testing Live Facebook Publishing on Production...');
  const publishContent = `🚀 Ralion OS Smoke Test — Production Verification [${new Date().toLocaleTimeString('en-US')}]`;
  const pubRes = await request(`${PROD_URL}/api/social/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenUserA}`,
    },
    body: {
      title: 'Smoke Test Post',
      content: publishContent,
      platforms: ['facebook'],
    },
  });
  console.log(`  - Publish Status: HTTP ${pubRes.status}`, {
    overallStatus: pubRes.data.overallStatus,
    success: pubRes.data.success,
    postId: pubRes.data.postId,
    platformResults: pubRes.data.platformResults,
  });

  // 5. Live Comment Reply Test
  if (commentsA.data.comments?.length > 0) {
    console.log('\n[5/7] Testing Live Facebook Comment Reply on Production...');
    const targetComment = commentsA.data.comments[0];
    const replyRes = await request(`${PROD_URL}/api/social/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: {
        commentId: targetComment.id,
        postId: targetComment.postId || targetComment.id.split('_')[0],
        replyText: `Thank you from Ralion OS! [Automated Smoke Test Verification]`,
        authorName: 'Ras Ali Labs',
      },
    });
    console.log(`  - Reply Status: HTTP ${replyRes.status}`, {
      success: replyRes.data.success,
      replyId: replyRes.data.replyId,
      message: replyRes.data.message,
    });
  }

  // 6. User B Multi-Tenant Isolation on Production
  console.log('\n[6/7] Testing User B (Separate Tenant) Zero Data Leakage on Production...');
  const connB = await request(`${PROD_URL}/api/social/connections`, {
    headers: { Authorization: `Bearer ${tokenUserB}` },
  });
  console.log(`  - User B Connections: HTTP ${connB.status} | Total: ${connB.data.connections?.length || 0} (Expected: 0)`);

  const postsB = await request(`${PROD_URL}/api/social/facebook/pages/default/posts`, {
    headers: { Authorization: `Bearer ${tokenUserB}` },
  });
  console.log(`  - User B Posts: HTTP ${postsB.status} | Total: ${postsB.data.posts?.length || 0} (Expected: 0)`);

  const crossPosts = await request(`${PROD_URL}/api/social/facebook/pages/477334159265235/posts`, {
    headers: { Authorization: `Bearer ${tokenUserB}` },
  });
  console.log(`  - User B requesting User A pageId: HTTP ${crossPosts.status} | Error: ${crossPosts.data.error} (Expected: 403 FORBIDDEN)`);

  // 7. Unauthenticated Requests on Production
  console.log('\n[7/7] Testing Unauthenticated Access on Production...');
  const unauthConn = await request(`${PROD_URL}/api/social/connections`);
  console.log(`  - Unauth Connections: HTTP ${unauthConn.status} | Error: ${unauthConn.data.error} (Expected: 401 AUTHENTICATION_REQUIRED)`);

  console.log('\n================================================================');
  console.log('LIVE PRODUCTION SMOKE TEST COMPLETE');
  console.log('================================================================\n');
}

smokeTest().catch((err) => {
  console.error('Smoke test error:', err);
});
