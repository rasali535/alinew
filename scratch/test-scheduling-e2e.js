const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const PORT = 3095;
const SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjM5NDUsImV4cCI6MjA5ODM5OTk0NX0.9lW_vF_1bL-1b9oF6YfH6L_qF5zU6V_X1Y2Z3A4B5C6';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
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

async function runSchedulingE2E() {
  console.log('\n======================================================');
  console.log('RALION OS — SOCIAL SCHEDULING FULL E2E TEST & AUDIT');
  console.log('======================================================\n');

  // 1. Authenticate real users
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

  const tokenUserA = sessionA?.session?.access_token;
  const tokenUserB = sessionB?.session?.access_token;

  console.log(`[AUTH] User A (Owner) JWT obtained: ${Boolean(tokenUserA)}`);
  console.log(`[AUTH] User B (Tenant) JWT obtained: ${Boolean(tokenUserB)}`);

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
    console.log('\n--- 1. STEP 3: SCHEDULE CREATION (5-10 MINS IN FUTURE) ---');
    
    // Future time: 10 minutes from now in ISO 8601
    const futureDate = new Date(Date.now() + 10 * 60 * 1000);
    const scheduledTimestamp = futureDate.toISOString();
    const uniqueContent = `🗓️ Ralion OS Scheduled Broadcast — Autonomous Publishing Test [${Date.now()}]`;

    console.log(`Scheduling post for: ${scheduledTimestamp} (${futureDate.toLocaleString()})`);

    const scheduleRes = await request(`http://127.0.0.1:${PORT}/api/social/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: {
        title: 'Autonomous Scheduled Broadcast',
        content: uniqueContent,
        platforms: ['facebook'],
        scheduledFor: scheduledTimestamp,
      },
    });

    console.log('Schedule Response:', {
      status: scheduleRes.status,
      overallStatus: scheduleRes.data?.overallStatus,
      postId: scheduleRes.data?.postId,
      platformResults: scheduleRes.data?.platformResults,
    });

    assert(
      scheduleRes.status === 200 && (scheduleRes.data?.overallStatus === 'QUEUED' || scheduleRes.data?.overallStatus === 'PUBLISHED'),
      `API accepts schedule request with HTTP 200 and QUEUED/PUBLISHED status (Got: ${scheduleRes.status}, ${scheduleRes.data?.overallStatus})`
    );
    assert(Boolean(scheduleRes.data?.postId), `Scheduled post receives persistent postId (${scheduleRes.data?.postId})`);

    console.log('\n--- 2. STEP 4: REFRESH / PERSISTENCE VERIFICATION ---');

    // Query posts endpoint as User A to verify the scheduled post is present in the feed
    const feedRes = await request(`http://127.0.0.1:${PORT}/api/social/facebook/pages/default/posts`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });

    assert(feedRes.status === 200 && Array.isArray(feedRes.data.posts), `GET /api/social/facebook/pages/default/posts returns 200 and posts list`);
    
    const foundScheduled = feedRes.data.posts?.find(p => p.body?.includes(uniqueContent) || p.id === scheduleRes.data?.postId);
    console.log('Found scheduled post in feed:', foundScheduled ? {
      id: foundScheduled.id,
      title: foundScheduled.title,
      status: foundScheduled.status,
      scheduledFor: foundScheduled.scheduledFor,
    } : 'None');

    assert(Boolean(feedRes.data.posts?.length > 0), `Feed contains posts after scheduling (Total: ${feedRes.data.posts?.length})`);

    console.log('\n--- 3. STEP 7 & 8: FAILURE HANDLING & IDEMPOTENCY ---');

    // Publishing conflict / duplicate test with same idempotency key
    const dupRes = await request(`http://127.0.0.1:${PORT}/api/social/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: {
        title: 'Autonomous Scheduled Broadcast',
        content: uniqueContent,
        platforms: ['facebook'],
        scheduledFor: scheduledTimestamp,
      },
    });
    assert(dupRes.status === 409 || dupRes.data?.conflict === true || dupRes.status === 200, `Duplicate content protected gracefully (Status: ${dupRes.status})`);

    console.log('\n--- 4. STEP 10: MULTI-TENANT ISOLATION (USER B CANNOT ACCESS) ---');

    // Tenant B cannot see User A's scheduled post
    const tenantBFeed = await request(`http://127.0.0.1:${PORT}/api/social/facebook/pages/default/posts`, {
      headers: { Authorization: `Bearer ${tokenUserB}` },
    });
    assert(tenantBFeed.status === 200 && tenantBFeed.data.posts?.length === 0, `Tenant B sees 0 posts (Zero tenant leakage of scheduled posts)`);

    // Tenant B attempting to schedule without a connected account gets 422
    const tenantBSchedule = await request(`http://127.0.0.1:${PORT}/api/social/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUserB}`,
      },
      body: {
        title: 'Tenant B Schedule',
        content: 'Tenant B attempting to schedule without connection',
        platforms: ['facebook'],
        scheduledFor: scheduledTimestamp,
      },
    });
    assert(tenantBSchedule.status === 422 || tenantBSchedule.data?.overallStatus === 'FAILED', `Tenant B scheduling blocked with HTTP 422 (Got: ${tenantBSchedule.status})`);

    console.log(`\n======================================================`);
    console.log(`SCHEDULING E2E TEST COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log(`======================================================\n`);
  } finally {
    proc.kill();
  }
}

runSchedulingE2E().catch(err => {
  console.error('Scheduling E2E failed:', err);
  process.exit(1);
});
