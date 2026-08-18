const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const PORT = 3096;
const SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjM5NDUsImV4cCI6MjA5ODM5OTk0NX0.9lW_vF_1bL-1b9oF6YfH6L_qF5zU6V_X1Y2Z3A4B5C6';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: {
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

async function runRegressionPass() {
  console.log('\n======================================================');
  console.log('RALION OS — MASTER FACEBOOK RESTORATION & AUTH REGRESSION TEST');
  console.log('======================================================\n');

  // 1. Fetch real JWT tokens for User A (Owner) and User B (Tenant)
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const userA = usersData?.users?.find(u => u.email === 'chiwabby@gmail.com');
  const userB = usersData?.users?.find(u => u.email === 'info@pameltex.com');

  if (!userA || !userB) {
    throw new Error('Test users not found in Supabase Auth.');
  }

  console.log(`[USER MATRIX] User A (Owner):  ${userA.email} (${userA.id})`);
  console.log(`[USER MATRIX] User B (Tenant): ${userB.email} (${userB.id})`);

  // Generate real session tokens
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

  console.log(`[AUTH] User A JWT obtained: ${Boolean(tokenUserA)}`);
  console.log(`[AUTH] User B JWT obtained: ${Boolean(tokenUserB)}`);

  // 2. Start standalone server
  console.log(`\n[SERVER] Booting standalone Next.js server on port ${PORT}...`);
  const standaloneDir = path.resolve(__dirname, '../apps/ralion/.next/standalone/apps/ralion');
  const proc = spawn('node', ['server.js'], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
    },
    stdio: 'inherit',
  });

  // Wait for server to boot with retry check
  let ready = false;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await request(`http://127.0.0.1:${PORT}/api/health`);
      if (res.status === 200) {
        ready = true;
        console.log(`[SERVER] Standalone server ready after ${i + 1}s!`);
        break;
      }
    } catch {}
  }

  if (!ready) {
    throw new Error('Standalone server failed to start within 20s.');
  }

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ PASS [${totalTests}]: ${message}`);
    } else {
      console.error(`  ❌ FAIL [${totalTests}]: ${message}`);
    }
  }

  try {
    console.log('\n--- 1. TEST A: UNAUTHENTICATED REQUESTS (NO TOKEN) → 401 UNAUTHORIZED ---');
    
    const unauthConn = await request(`http://127.0.0.1:${PORT}/api/social/connections`);
    assert(unauthConn.status === 401 && unauthConn.data.error === 'AUTHENTICATION_REQUIRED', `GET /api/social/connections without token returns 401 AUTHENTICATION_REQUIRED`);

    const unauthPosts = await request(`http://127.0.0.1:${PORT}/api/social/facebook/pages/default/posts`);
    assert(unauthPosts.status === 401 && unauthPosts.data.error === 'AUTHENTICATION_REQUIRED', `GET /api/social/facebook/pages/default/posts without token returns 401 AUTHENTICATION_REQUIRED`);

    const unauthComments = await request(`http://127.0.0.1:${PORT}/api/social/comments`);
    assert(unauthComments.status === 401 && unauthComments.data.error === 'AUTHENTICATION_REQUIRED', `GET /api/social/comments without token returns 401 AUTHENTICATION_REQUIRED`);

    const unauthInbox = await request(`http://127.0.0.1:${PORT}/api/social/inbox`);
    assert(unauthInbox.status === 401 && unauthInbox.data.error === 'AUTHENTICATION_REQUIRED', `GET /api/social/inbox without token returns 401 AUTHENTICATION_REQUIRED`);

    const unauthPub = await request(`http://127.0.0.1:${PORT}/api/social/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { content: 'Unauthenticated publish' },
    });
    assert(unauthPub.status === 401 && unauthPub.data.error === 'AUTHENTICATION_REQUIRED', `POST /api/social/publish without token returns 401 AUTHENTICATION_REQUIRED`);

    console.log('\n--- 2. TEST B: MALFORMED / INVALID JWT → 401 UNAUTHORIZED ---');

    const invalidConn = await request(`http://127.0.0.1:${PORT}/api/social/connections`, {
      headers: { Authorization: 'Bearer malformed_jwt_token_xyz_123' },
    });
    assert(invalidConn.status === 401 && invalidConn.data.error === 'AUTHENTICATION_REQUIRED', `Malformed JWT returns 401 AUTHENTICATION_REQUIRED`);

    const invalidPosts = await request(`http://127.0.0.1:${PORT}/api/social/facebook/pages/default/posts`, {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature' },
    });
    assert(invalidPosts.status === 401 && invalidPosts.data.error === 'AUTHENTICATION_REQUIRED', `Invalid signature JWT returns 401 AUTHENTICATION_REQUIRED`);

    console.log('\n--- 3. TEST C: AUTHENTICATED USER A (OWNER) DATA ACCESS → 200 OK & REAL FACEBOOK DATA ---');

    const connA = await request(`http://127.0.0.1:${PORT}/api/social/connections`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert(connA.status === 200 && connA.data.connections?.length === 1, `User A retrieves their Facebook connection (Count: ${connA.data.connections?.length}, Name: ${connA.data.connections?.[0]?.account_name})`);

    const postsDefaultA = await request(`http://127.0.0.1:${PORT}/api/social/facebook/pages/default/posts`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert(postsDefaultA.status === 200 && postsDefaultA.data.posts?.length > 0, `User A retrieves historical posts via 'default' pageId (Count: ${postsDefaultA.data.posts?.length})`);

    const postsDirectA = await request(`http://127.0.0.1:${PORT}/api/social/facebook/pages/477334159265235/posts`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert(postsDirectA.status === 200 && postsDirectA.data.posts?.length > 0, `User A retrieves historical posts via direct Facebook pageId '477334159265235' (Count: ${postsDirectA.data.posts?.length})`);

    const commentsA = await request(`http://127.0.0.1:${PORT}/api/social/comments`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert(commentsA.status === 200 && commentsA.data.comments?.length > 0, `User A retrieves comments (Count: ${commentsA.data.comments?.length})`);

    const inboxA = await request(`http://127.0.0.1:${PORT}/api/social/inbox?provider=facebook`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert(inboxA.status === 200 && Array.isArray(inboxA.data.conversations), `User A retrieves inbox conversations`);

    const analyticsA = await request(`http://127.0.0.1:${PORT}/api/social/facebook/pages/default/analytics`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert(analyticsA.status === 200 && analyticsA.data.analytics?.followers > 0, `User A retrieves Facebook Page analytics (Followers: ${analyticsA.data.analytics?.followers})`);

    const analyticsDirectA = await request(`http://127.0.0.1:${PORT}/api/social/facebook/pages/477334159265235/analytics`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    assert(analyticsDirectA.status === 200 && analyticsDirectA.data.analytics?.followers > 0, `User A retrieves direct pageId analytics (Followers: ${analyticsDirectA.data.analytics?.followers})`);

    console.log('\n--- 4. TEST D: AUTHENTICATED USER B (SEPARATE TENANT WITH NO CONNECTION) → 200 ZERO-STATE ---');

    const connB = await request(`http://127.0.0.1:${PORT}/api/social/connections`, {
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    assert(connB.status === 200 && connB.data.connections?.length === 0, `User B receives 200 OK with empty connections array (ZERO-STATE)`);

    const postsB = await request(`http://127.0.0.1:${PORT}/api/social/facebook/pages/default/posts`, {
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    assert(postsB.status === 200 && postsB.data.posts?.length === 0, `User B receives 200 OK with empty posts array (ZERO-STATE)`);

    const commentsB = await request(`http://127.0.0.1:${PORT}/api/social/comments`, {
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    assert(commentsB.status === 200 && commentsB.data.comments?.length === 0, `User B receives 200 OK with empty comments array (ZERO-STATE)`);

    const pubB = await request(`http://127.0.0.1:${PORT}/api/social/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserB}`,
      },
      body: {
        title: 'Unauthorized Post',
        content: 'Tenant B attempting to publish through Tenant A connection.',
        platforms: ['facebook'],
      },
    });
    assert(pubB.status === 422 || pubB.data?.overallStatus === 'FAILED', `User B publishing blocked with 422 FAILED status (${pubB.status})`);

    console.log('\n--- 5. TEST E: CROSS-TENANT UNAUTHORIZED RESOURCE ACCESS → 403 FORBIDDEN ---');

    const crossPosts = await request(`http://127.0.0.1:${PORT}/api/social/facebook/pages/477334159265235/posts`, {
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    assert(crossPosts.status === 403 && crossPosts.data.error === 'FORBIDDEN', `User B requesting User A's specific pageId returns 403 FORBIDDEN (${crossPosts.status})`);

    const crossAnalytics = await request(`http://127.0.0.1:${PORT}/api/social/facebook/pages/477334159265235/analytics`, {
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    assert(crossAnalytics.status === 403 && crossAnalytics.data.error === 'FORBIDDEN', `User B requesting User A's analytics returns 403 FORBIDDEN (${crossAnalytics.status})`);

    console.log('\n--- 6. TEST F: HEADER SPOOFING WITH USER B TOKEN → SCOPED STRICTLY TO USER B ---');

    const spoofConn = await request(`http://127.0.0.1:${PORT}/api/social/connections`, {
      headers: {
        Authorization: `Bearer ${tokenUserB}`,
        'x-user-id': userA.id,
        'x-workspace-id': userA.id,
      },
    });
    assert(spoofConn.status === 200 && spoofConn.data.connections?.length === 0, `User B spoofing User A headers returns 200 with 0 connections (Server authoritatively trusts only JWT)`);

    console.log(`\n======================================================`);
    console.log(`REGRESSION TEST COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log(`======================================================\n`);
  } finally {
    proc.kill();
  }
}

runRegressionPass().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
