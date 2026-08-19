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

async function testProdScheduling() {
  console.log('\n======================================================');
  console.log('RALION OS — LIVE PRODUCTION SCHEDULING VERIFICATION');
  console.log('======================================================\n');

  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const userA = usersData?.users?.find(u => u.email === 'chiwabby@gmail.com');
  const userB = usersData?.users?.find(u => u.email === 'info@pameltex.com');

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

  const tokenA = sessionA?.session?.access_token;
  const tokenB = sessionB?.session?.access_token;

  // 1. Schedule a live Facebook post ~7 minutes in the future
  const schedTime = new Date(Date.now() + 7 * 60 * 1000).toISOString();
  const content = `🚀 Ralion OS Autonomous Cloud Scheduled Post — Live Verification [${Date.now()}]`;

  console.log(`[1/4] Scheduling Live Post on Production for: ${schedTime}`);
  const schedRes = await request(`${PROD_URL}/api/social/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: {
      title: 'Autonomous Production Broadcast',
      content,
      platforms: ['facebook'],
      scheduledFor: schedTime,
    },
  });

  console.log('  - Schedule Response:', {
    status: schedRes.status,
    overallStatus: schedRes.data?.overallStatus,
    postId: schedRes.data?.postId,
    platformResults: schedRes.data?.platformResults,
  });

  // 2. Query posts on production
  console.log('\n[2/4] Querying Live Posts on Production...');
  const postsRes = await request(`${PROD_URL}/api/social/facebook/pages/default/posts`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  console.log(`  - Posts Count: ${postsRes.data?.posts?.length || 0}`);
  const schedInFeed = postsRes.data?.posts?.find(p => p.body?.includes(content) || p.status === 'scheduled');
  console.log('  - Scheduled Post in Production Feed:', schedInFeed ? {
    id: schedInFeed.id,
    status: schedInFeed.status,
    scheduledFor: schedInFeed.scheduledFor,
    title: schedInFeed.title,
  } : 'None');

  // 3. User B Tenant Isolation on Production
  console.log('\n[3/4] Testing User B Isolation for Scheduled Posts on Production...');
  const bPosts = await request(`${PROD_URL}/api/social/facebook/pages/default/posts`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  console.log(`  - User B Posts: ${bPosts.data?.posts?.length || 0} (Expected: 0)`);

  const bSched = await request(`${PROD_URL}/api/social/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`,
    },
    body: {
      title: 'Tenant B Schedule',
      content: 'Unauthorized schedule attempt',
      platforms: ['facebook'],
      scheduledFor: schedTime,
    },
  });
  console.log(`  - User B Schedule Attempt: HTTP ${bSched.status} | overallStatus: ${bSched.data?.overallStatus} (Expected: 422 FAILED)`);

  // 4. Duplicate protection on Production
  console.log('\n[4/4] Testing Duplicate Conflict Protection on Production...');
  const dupRes = await request(`${PROD_URL}/api/social/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: {
      title: 'Autonomous Production Broadcast',
      content,
      platforms: ['facebook'],
      scheduledFor: schedTime,
    },
  });
  console.log(`  - Duplicate Schedule Attempt: HTTP ${dupRes.status} | conflict: ${dupRes.data?.conflict} (Expected: 409 Conflict)`);

  console.log('\n======================================================');
  console.log('LIVE PRODUCTION SCHEDULING VERIFICATION COMPLETE');
  console.log('======================================================\n');
}

testProdScheduling().catch(err => {
  console.error('Prod scheduling test error:', err);
});
