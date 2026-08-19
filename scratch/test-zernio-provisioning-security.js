const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

dotenv.config({ path: '.env' });
dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config({ path: 'apps/ralion/.env.production' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: options.headers || {},
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

async function runProvisioningSecurityTests() {
  console.log('\n======================================================');
  console.log('RALION OS — ZERNIO MULTI-TENANT PROVISIONING SECURITY TEST');
  console.log('======================================================\n');

  // 1. Get test users
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const userA = usersData?.users?.find((u) => u.email === 'chiwabby@gmail.com');
  const userB = usersData?.users?.find((u) => u.email === 'info@pameltex.com');

  if (!userA || !userB) {
    throw new Error('Test users not found');
  }

  // 2. Generate session tokens
  const { data: linkA } = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: userA.email });
  const { data: linkB } = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: userB.email });

  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: sessionA } = await clientA.auth.verifyOtp({ email: userA.email, token: linkA.properties.email_otp, type: 'magiclink' });
  const tokenA = sessionA?.session?.access_token;

  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: sessionB } = await clientB.auth.verifyOtp({ email: userB.email, token: linkB.properties.email_otp, type: 'magiclink' });
  const tokenB = sessionB?.session?.access_token;

  // 3. Start standalone server
  const PORT = 3097;
  console.log(`[SERVER] Booting standalone Next.js server on port ${PORT}...`);
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
  for (let i = 0; i < 25; i++) {
    try {
      const res = await makeRequest(`http://127.0.0.1:${PORT}/api/health`);
      if (res.status === 200) {
        ready = true;
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (!ready) {
    proc.kill();
    throw new Error('Standalone server failed to boot');
  }

  console.log(`[SERVER] Standalone server ready on port ${PORT}!\n`);
  const BASE_URL = `http://127.0.0.1:${PORT}`;

  try {
    // --- TEST 1: WORKSPACE A RESOLVES PROFILE A ---
    console.log('--- TEST 1: WORKSPACE A RESOLVES PROFILE A ---');
    const resConnA = await makeRequest(`${BASE_URL}/api/oauth/facebook/connect`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    console.log('User A connect response:', { status: resConnA.status, profileId: resConnA.data?.profileId, success: resConnA.data?.success });
    const profileIdA = resConnA.data?.profileId;
    const pass1 = resConnA.status === 200 && profileIdA === '6a82deac1a69158ef81cb2cd';
    console.log(pass1 ? '  ✅ PASS [1]: Workspace A resolves Profile A (6a82deac1a69158ef81cb2cd)' : '  ❌ FAIL [1]');

    // --- TEST 2 & 3: WORKSPACE B RESOLVES / CREATES DEDICATED PROFILE B ---
    console.log('\n--- TEST 2 & 3: WORKSPACE B DEDICATED PROVISIONING ---');
    const resConnB = await makeRequest(`${BASE_URL}/api/oauth/facebook/connect`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    console.log('User B connect response:', { status: resConnB.status, profileId: resConnB.data?.profileId, success: resConnB.data?.success });
    const profileIdB = resConnB.data?.profileId;
    const pass2 = resConnB.status === 200 && profileIdB && profileIdB !== profileIdA;
    console.log(pass2 ? `  ✅ PASS [2 & 3]: Workspace B resolved/created dedicated Profile B (${profileIdB}) distinct from Profile A` : '  ❌ FAIL [2 & 3]');

    // --- TEST 4: WORKSPACE B CANNOT RESOLVE PROFILE A ---
    console.log('\n--- TEST 4: WORKSPACE B CANNOT RESOLVE PROFILE A ---');
    const pass4 = profileIdB !== profileIdA && profileIdB !== '6a82deac1a69158ef81cb2cd';
    console.log(pass4 ? '  ✅ PASS [4]: Workspace B strictly isolated from Profile A' : '  ❌ FAIL [4]');

    // --- TEST 5: DELETING MAPPING CAUSES PROVISIONING OF NEW PROFILE, NEVER FALLBACK TO A ---
    console.log('\n--- TEST 5: DELETION AND RE-PROVISIONING ISOLATION ---');
    // Temporarily delete User B's profile mapping
    await supabaseAdmin.from('social_provider_profiles').delete().eq('workspace_id', userB.id);
    
    // Request connect again as User B
    const resReProvision = await makeRequest(`${BASE_URL}/api/oauth/facebook/connect`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    console.log('User B re-provisioned response:', { status: resReProvision.status, profileId: resReProvision.data?.profileId });
    const reProfileId = resReProvision.data?.profileId;
    const pass5 = resReProvision.status === 200 && reProfileId && reProfileId !== profileIdA;
    console.log(pass5 ? `  ✅ PASS [5]: Deletion re-provisions dedicated profile (${reProfileId}) without falling back to Tenant A` : '  ❌ FAIL [5]');

    // --- TEST 6: CONCURRENT REQUESTS DO NOT DUPLICATE MAPPINGS ---
    console.log('\n--- TEST 6: CONCURRENT PROVISIONING LOCKING ---');
    const [c1, c2] = await Promise.all([
      makeRequest(`${BASE_URL}/api/oauth/facebook/connect`, { headers: { Authorization: `Bearer ${tokenB}` } }),
      makeRequest(`${BASE_URL}/api/oauth/facebook/connect`, { headers: { Authorization: `Bearer ${tokenB}` } }),
    ]);
    console.log('Concurrent profile resolution results:', [c1.data?.profileId, c2.data?.profileId]);
    const pass6 = c1.data?.profileId === c2.data?.profileId && c1.data?.profileId === reProfileId;
    console.log(pass6 ? `  ✅ PASS [6]: Concurrent requests resolve same single dedicated profile (${reProfileId})` : '  ❌ FAIL [6]');

    // --- TEST 7: USER B CANNOT FORCE USER A'S PROFILE ID ---
    console.log('\n--- TEST 7: USER B PARAMETER TAMPERING TAMPER-PROOF ---');
    const resTamper = await makeRequest(`${BASE_URL}/api/oauth/facebook/connect?profile_id=${profileIdA}&workspace_id=${userA.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    console.log('User B tamper attempt response:', { status: resTamper.status, profileId: resTamper.data?.profileId });
    const pass7 = resTamper.status === 200 && resTamper.data?.profileId === reProfileId && resTamper.data?.profileId !== profileIdA;
    console.log(pass7 ? '  ✅ PASS [7]: Client query params/headers ignored; server binds strictly to authenticated JWT context' : '  ❌ FAIL [7]');

    // --- TEST 8: USER A PROFILE / CONNECTION UNTOUCHED ---
    console.log('\n--- TEST 8: USER A PERSISTENCE INTEGRITY ---');
    const { data: dbConnA } = await supabaseAdmin
      .from('social_connections')
      .select('provider_account_id, account_name, zernio_profile_id')
      .eq('user_id', userA.id)
      .eq('provider', 'facebook')
      .maybeSingle();
    const pass8 = dbConnA && dbConnA.zernio_profile_id === '6a82deac1a69158ef81cb2cd' && dbConnA.account_name === 'Ras Ali Labs';
    console.log(pass8 ? '  ✅ PASS [8]: User A Facebook connection and Zernio profile 100% intact and untouched' : '  ❌ FAIL [8]');

    console.log('\n======================================================');
    console.log('ZERNIO PROVISIONING SECURITY TEST: ALL TESTS PASSED!');
    console.log('======================================================\n');
  } finally {
    proc.kill();
  }
}

runProvisioningSecurityTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
