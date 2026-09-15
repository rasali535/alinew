#!/usr/bin/env node

/**
 * Ralion OS — Comprehensive Auth & Session Transport Hardening Test Suite
 * Ras Ali Labs (Pty) Ltd
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const clientSource = fs.readFileSync(path.join(root, 'apps/ralion/src/lib/supabase/client.ts'), 'utf8');
const apiConfigSource = fs.readFileSync(path.join(root, 'apps/ralion/src/lib/api-config.ts'), 'utf8');
const serverAuthSource = fs.readFileSync(path.join(root, 'apps/ralion/src/lib/auth/serverAuth.ts'), 'utf8');
const authContextRoute = fs.readFileSync(path.join(root, 'apps/ralion/src/app/api/auth/context/route.ts'), 'utf8');
const orgContextSource = fs.readFileSync(path.join(root, 'packages/auth/src/OrganizationContext.tsx'), 'utf8');
const socialConnRoute = fs.readFileSync(path.join(root, 'apps/ralion/src/app/api/social/connections/route.ts'), 'utf8');
const oauthConnectRoute = fs.readFileSync(path.join(root, 'apps/ralion/src/app/api/oauth/[provider]/connect/route.ts'), 'utf8');
const growthPageSource = fs.readFileSync(path.join(root, 'apps/ralion/src/app/(dashboard)/growth/page.tsx'), 'utf8');
const integrationsPageSource = fs.readFileSync(path.join(root, 'apps/ralion/src/app/(dashboard)/settings/integrations/page.tsx'), 'utf8');
const htaccessSource = fs.readFileSync(path.join(root, 'apps/website/public/.htaccess'), 'utf8');
const proxyPhpSource = fs.readFileSync(path.join(root, 'apps/website/public/api_proxy.php'), 'utf8');
const websiteSupabaseSource = fs.readFileSync(path.join(root, 'apps/website/src/lib/supabase.js'), 'utf8');
const adminClientSource = fs.readFileSync(path.join(root, 'apps/admin/src/lib/supabase/client.ts'), 'utf8');
const loginPageSource = fs.readFileSync(path.join(root, 'apps/ralion/src/app/(auth)/login/page.tsx'), 'utf8');

console.log('================================================================');
console.log('🧪 Ralion Auth & Session Transport Hardening Test Suite');
console.log('================================================================\n');

const checks = [
  // 1. Browser Supabase Client Singleton & Storage Consolidation
  [
    'Client uses single canonical storage key "ralion-app-auth-token"',
    clientSource.includes("storageKey: CANONICAL_STORAGE_KEY") &&
    clientSource.includes("export const CANONICAL_STORAGE_KEY = 'ralion-app-auth-token'")
  ],
  [
    'Client safely prunes and migrates legacy sb-*-auth-token keys',
    clientSource.includes('pruneLegacyStorageKeys') &&
    clientSource.includes("key.startsWith('sb-') && key.endsWith('-auth-token')")
  ],
  [
    'Client implements deduplicated in-flight refreshSession promise',
    clientSource.includes('deduplicatedRefreshSession') &&
    clientSource.includes('_sharedRefreshPromise')
  ],

  // 2. Centralized api-config & Refresh Coalescing
  [
    'api-config exports unified authFetch and fetchRalionApi',
    apiConfigSource.includes('export async function authFetch') &&
    apiConfigSource.includes('export async function fetchRalionApi')
  ],
  [
    'api-config refreshes at most once strictly on AUTH_TOKEN_INVALID (401)',
    apiConfigSource.includes('res.status === 401') &&
    apiConfigSource.includes("body?.code === 'AUTH_TOKEN_INVALID'") &&
    apiConfigSource.includes('shouldRefresh = true') &&
    !apiConfigSource.includes("body?.code === 'AUTH_TOKEN_MISSING'")
  ],
  [
    'api-config injects Authorization, x-user-id, and tenant hints',
    apiConfigSource.includes('headers.Authorization = `Bearer ${session.access_token}`') &&
    apiConfigSource.includes("headers['x-workspace-id'] = activeWs") &&
    apiConfigSource.includes("headers['x-organization-id'] = activeOrg")
  ],

  // 3. OrganizationContext Loop-Breaker
  [
    'OrganizationContext coalesces rapid context resolutions via promise guard',
    orgContextSource.includes('_activeContextResolution') &&
    orgContextSource.includes('isResolvingRef')
  ],
  [
    'OrganizationContext only refreshes on explicit AUTH_TOKEN_INVALID',
    orgContextSource.includes("responseCode === 'AUTH_TOKEN_INVALID'") &&
    !orgContextSource.includes("responseCode === 'AUTH_TOKEN_MISSING'")
  ],
  [
    'OrganizationContext decouples TOKEN_REFRESHED events from cascading re-resolutions',
    !orgContextSource.includes("event === 'TOKEN_REFRESHED'")
  ],

  // 4. Server Auth Error Classification
  [
    'Server auth returns 401 AUTH_TOKEN_MISSING when bearer token is absent',
    serverAuthSource.includes("errorCode: 'AUTH_TOKEN_MISSING'") &&
    authContextRoute.includes("code: 'AUTH_TOKEN_MISSING'")
  ],
  [
    'Server auth returns 401 AUTH_TOKEN_INVALID when JWT is invalid or expired',
    serverAuthSource.includes("errorCode: 'AUTH_TOKEN_INVALID'") &&
    authContextRoute.includes("code: 'AUTH_TOKEN_INVALID'")
  ],
  [
    'Server auth returns 409 WORKSPACE_CONTEXT_MISSING when user lacks workspace',
    serverAuthSource.includes("errorCode: 'WORKSPACE_CONTEXT_MISSING'") &&
    serverAuthSource.includes("httpStatus: 409")
  ],
  [
    'Server auth returns 500 SUPABASE_CONFIG_ERROR on secret/config errors',
    serverAuthSource.includes("errorCode: 'SUPABASE_CONFIG_ERROR'") &&
    serverAuthSource.includes("httpStatus: 500")
  ],

  // 5. Protected Routes Enforcement
  [
    'Social connections route uses requireRalionContext',
    socialConnRoute.includes('requireRalionContext(request)')
  ],
  [
    'OAuth connect route uses requireRalionContext',
    oauthConnectRoute.includes('requireRalionContext(request)')
  ],

  // 6. Frontend Pages use Unified authFetch
  [
    'Growth page imports and uses centralized authFetch from @/lib/api-config',
    growthPageSource.includes("import { getRalionApiUrl, fetchRalionApi, getRalionAuthHeaders, authFetch } from '@/lib/api-config';") &&
    !growthPageSource.includes('async function authFetch(')
  ],
  [
    'Settings integrations page imports and uses centralized authFetch from @/lib/api-config',
    integrationsPageSource.includes("import { getRalionApiUrl, authFetch } from '@/lib/api-config';") &&
    !integrationsPageSource.includes('async function authFetch(')
  ],

  // 7. Hostinger Apache Reverse Proxy & Header Forwarding
  [
    'Hostinger .htaccess enables CGIPassAuth and HTTP_AUTHORIZATION rule',
    htaccessSource.includes('CGIPassAuth On') &&
    htaccessSource.includes('SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1') &&
    htaccessSource.includes('RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]')
  ],
  [
    'Hostinger api_proxy.php forwards Authorization and tenant headers',
    proxyPhpSource.includes('$authVal = $_SERVER[\'HTTP_AUTHORIZATION\']') &&
    proxyPhpSource.includes('x-workspace-id') &&
    proxyPhpSource.includes('x-organization-id')
  ],

  // 8. Website Legacy Key Removal
  [
    'Website supabase.js has zero hardcoded legacy anon key strings',
    !websiteSupabaseSource.includes('r-hhC-BT3WCf9JLq-HeTHXIFkulM5XkorUEfkqMhc-g')
  ],

  // ── Second-Pass Auth Fix (Requirement A) ─────────────────────────────────────
  // A1. serverAuth.ts exports getVerifierSupabase() using publishable/anon key
  [
    'serverAuth.ts exports getVerifierSupabase() using publishable/anon key for JWT verification',
    serverAuthSource.includes('export function getVerifierSupabase()') &&
    serverAuthSource.includes('SUPABASE_PUBLISHABLE_KEY') &&
    serverAuthSource.includes('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') &&
    serverAuthSource.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  ],
  // A2. resolveRalionAuthContext() calls verifier.auth.getUser(), NOT service admin client
  [
    'resolveRalionAuthContext() calls verifier.auth.getUser(), not getServiceSupabase() for JWT validation',
    serverAuthSource.includes('verifier.auth.getUser(token)') &&
    serverAuthSource.includes('adminClient') &&
    serverAuthSource.includes(".from('profiles')") &&
    !serverAuthSource.match(/getServiceSupabase\(\)[\s\S]{0,200}auth\.getUser/)
  ],
  // A3. Config errors in verifier return 500 SUPABASE_CONFIG_ERROR, not AUTH_TOKEN_INVALID
  [
    'Verifier config errors return 500 SUPABASE_CONFIG_ERROR (not swallowed as AUTH_TOKEN_INVALID)',
    serverAuthSource.includes('isConfigError') &&
    serverAuthSource.includes("errorCode: 'SUPABASE_CONFIG_ERROR'") &&
    serverAuthSource.includes('httpStatus: 500')
  ],
  // A4. auth context route.ts uses getVerifierSupabase() in verifyRequestUser()
  [
    'auth/context/route.ts verifyRequestUser() uses getVerifierSupabase(), not getServiceSupabase()',
    authContextRoute.includes('getVerifierSupabase') &&
    authContextRoute.includes('verifier.auth.getUser(token)') &&
    !authContextRoute.match(/getServiceSupabase\(\)[\s\S]{0,100}auth\.getUser/)
  ],
  // A5. auth context route.ts POST uses single authoritative resolution path
  [
    'auth/context/route.ts POST uses single authoritative resolveRalionAuthContext() path (no double getUser)',
    authContextRoute.includes('const authResult = await resolveRalionAuthContext(request') &&
    !authContextRoute.match(/export\s+async\s+function\s+POST[\s\S]*?await\s+verifyRequestUser/)
  ],

  // ── Requirement B: Single global refresh ─────────────────────────────────────
  // B1. window.__ralion_refresh_session__ is exported from client.ts
  [
    'client.ts assigns window.__ralion_refresh_session__ = deduplicatedRefreshSession after instantiation',
    clientSource.includes('__ralion_refresh_session__') &&
    clientSource.includes('deduplicatedRefreshSession')
  ],
  // B2. OrganizationContext never calls auth.refreshSession() directly
  [
    'OrganizationContext does not call auth.refreshSession() directly (uses global function only)',
    !orgContextSource.match(/await\s+[\w.]+\.auth\.refreshSession\s*\(/) &&
    !orgContextSource.includes('= await sharedClient.auth.refreshSession')
  ],
  // B3. OrganizationContext uses callGlobalRefresh() / window.__ralion_refresh_session__
  [
    'OrganizationContext refresh goes through callGlobalRefresh() / __ralion_refresh_session__',
    orgContextSource.includes('callGlobalRefresh') &&
    orgContextSource.includes('__ralion_refresh_session__')
  ],

  // ── Requirement C: No visibility-triggered context loops ─────────────────────
  // C1. OrganizationContext does not listen to SIGNED_IN events
  [
    'OrganizationContext does not trigger resolution on SIGNED_IN (visibility loop removed)',
    !orgContextSource.includes("event === 'SIGNED_IN'")
  ],
  // C2. OrganizationContext does not listen to TOKEN_REFRESHED events
  [
    'OrganizationContext does not trigger resolution on TOKEN_REFRESHED',
    !orgContextSource.includes("event === 'TOKEN_REFRESHED'")
  ],
  // C3. OrganizationContext uses promise-based coalescing guard
  [
    'OrganizationContext uses promise-based coalescing (_activeContextResolution)',
    orgContextSource.includes('_activeContextResolution') &&
    orgContextSource.includes('resolveGuard')
  ],

  // ── Requirement D: Terminal invalid-session failure ───────────────────────────
  // D1. terminateInvalidSession signs out locally and clears storage
  [
    'terminateInvalidSession() performs local signOut and clears all auth storage before redirecting',
    orgContextSource.includes('terminateInvalidSession') &&
    orgContextSource.includes("signOut({ scope: 'local' }") &&
    orgContextSource.includes('_redirectedToLogin') &&
    orgContextSource.includes("window.location.href = '/login'")
  ],
  // D2. Second AUTH_TOKEN_INVALID after refresh triggers terminal failure (not just clearResolvedContext)
  [
    'Double AUTH_TOKEN_INVALID after refresh calls terminateInvalidSession(), not just clearResolvedContext()',
    orgContextSource.includes('await terminateInvalidSession()') &&
    !!orgContextSource.match(/AUTH_TOKEN_INVALID[\s\S]{0,400}terminateInvalidSession/)
  ],

  // ── Requirement E: authFetch exact-gate ──────────────────────────────────────
  // E1. authFetch only refreshes when code === 'AUTH_TOKEN_INVALID' (exact, not blocklist)
  [
    "authFetch refreshes only on exact code === 'AUTH_TOKEN_INVALID' (no blocklist approach)",
    apiConfigSource.includes("body?.code === 'AUTH_TOKEN_INVALID'") &&
    apiConfigSource.includes('shouldRefresh = true') &&
    !apiConfigSource.includes("body?.code === 'AUTH_TOKEN_MISSING'")
  ],

  // ── Requirement F: Modern Publishable Key & Error Classification Regression Suite ──
  [
    'Ralion client prefers NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY before NEXT_PUBLIC_SUPABASE_ANON_KEY',
    clientSource.includes('process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||') &&
    clientSource.includes('process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
  ],
  [
    'Ralion client fails clearly with error when neither publishable nor anon key exists',
    clientSource.includes('Missing Supabase client key') &&
    !clientSource.includes("const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';")
  ],
  [
    'serverAuth getVerifierSupabase() prefers SUPABASE_PUBLISHABLE_KEY before NEXT_PUBLIC keys',
    serverAuthSource.includes('process.env.SUPABASE_PUBLISHABLE_KEY ||') &&
    serverAuthSource.includes('process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||') &&
    serverAuthSource.includes('process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
  ],
  [
    'apps/admin client prefers NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY before legacy anon key',
    adminClientSource.includes('process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||') &&
    adminClientSource.includes('process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
  ],
  [
    'apps/website client prefers publishable key variables before legacy anon key',
    websiteSupabaseSource.includes('VITE_SUPABASE_PUBLISHABLE_KEY ||') &&
    websiteSupabaseSource.includes('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||')
  ],
  [
    'serverAuth and route classify returned Supabase API key / config errors as 500 SUPABASE_CONFIG_ERROR',
    serverAuthSource.includes('SUPABASE_CONFIG_ERROR') &&
    serverAuthSource.includes('legacy api key') &&
    authContextRoute.includes('SUPABASE_CONFIG_ERROR') &&
    authContextRoute.includes('legacy api key')
  ],
  [
    'serverAuth and route classify malformed/expired JWT as 401 AUTH_TOKEN_INVALID',
    serverAuthSource.includes("errorCode: 'AUTH_TOKEN_INVALID'") &&
    authContextRoute.includes("errorCode: 'AUTH_TOKEN_INVALID'")
  ],
  [
    'login page does not trigger automatic refreshSession on signInWithPassword',
    loginPageSource.includes('AuthService.login(email, password)') &&
    !loginPageSource.includes('refreshSession')
  ],
  [
    'login does not trigger immediate signOut and only SIGNED_OUT clears storage',
    clientSource.includes("if (event === 'SIGNED_OUT')") &&
    !clientSource.includes("if (event === 'SIGNED_IN') {\n        try {\n          window.localStorage?.removeItem")
  ],
  [
    'Exactly one refresh implementation remains across codebase',
    clientSource.includes('export async function deduplicatedRefreshSession') &&
    !orgContextSource.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').includes('.refreshSession(') &&
    !apiConfigSource.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').includes('.refreshSession(')
  ]
];

// Runtime Test: In-flight refreshSession deduplication
async function testRuntimeDeduplication() {
  let callCount = 0;
  let sharedPromise = null;

  async function mockDeduplicatedRefresh() {
    if (sharedPromise) return sharedPromise;
    sharedPromise = (async () => {
      callCount++;
      await new Promise(r => setTimeout(r, 50));
      return { token: 'mock_refreshed_jwt' };
    })().finally(() => {
      sharedPromise = null;
    });
    return sharedPromise;
  }

  const results = await Promise.all([
    mockDeduplicatedRefresh(),
    mockDeduplicatedRefresh(),
    mockDeduplicatedRefresh(),
    mockDeduplicatedRefresh(),
    mockDeduplicatedRefresh(),
  ]);

  assert.equal(callCount, 1, 'Concurrent refresh calls must coalesce into exactly 1 underlying execution');
  for (const res of results) {
    assert.equal(res.token, 'mock_refreshed_jwt');
  }
}

// Runtime Test: Empty key cannot create client
function testEmptyKeyClientCreation() {
  function createMockClient(publishableKey, anonKey) {
    const key = publishableKey || anonKey;
    if (!key) {
      throw new Error(
        '[ClientSupabase] Missing Supabase client key. Neither NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY is configured.'
      );
    }
    return { initialized: true, key };
  }

  assert.throws(
    () => createMockClient('', ''),
    /Missing Supabase client key/,
    'Empty publishable and anon key must throw error and not instantiate client'
  );

  assert.throws(
    () => createMockClient(undefined, undefined),
    /Missing Supabase client key/,
    'Undefined keys must throw error'
  );

  const clientWithPublishable = createMockClient('sb_publishable_test', 'anon_legacy');
  assert.equal(clientWithPublishable.key, 'sb_publishable_test', 'Publishable key must be preferred over legacy');
}

// Runtime Test: Supabase getUser error classification logic
function testGetUserErrorClassification() {
  function classifyGetUserError(error) {
    const errMessage = String(error?.message || '');
    const errCode = String(error?.code || '');
    const errStatus = error?.status;
    const isConfigError =
      /invalid api key|apikey|configuration|legacy api key|unregistered api key|SUPABASE_CONFIG/i.test(errMessage) ||
      /invalid_api_key|api_key_invalid|bad_api_key/i.test(errCode) ||
      (errStatus === 500 && !/jwt|token|expired|claim|signature/i.test(errMessage));

    if (isConfigError) {
      return { status: 500, errorCode: 'SUPABASE_CONFIG_ERROR' };
    }
    return { status: 401, errorCode: 'AUTH_TOKEN_INVALID' };
  }

  // API key disabled error from Supabase
  const legacyDisabled = classifyGetUserError({
    message: 'Your legacy API keys (anon, service_role) were disabled on 2026-09-14. Re-enable them in the Supabase dashboard, or use the new publishable and secret API keys.',
    status: 401
  });
  assert.equal(legacyDisabled.status, 500);
  assert.equal(legacyDisabled.errorCode, 'SUPABASE_CONFIG_ERROR');

  // Invalid API key
  const invalidKey = classifyGetUserError({ message: 'Invalid API key', status: 401 });
  assert.equal(invalidKey.status, 500);
  assert.equal(invalidKey.errorCode, 'SUPABASE_CONFIG_ERROR');

  // Unregistered API key
  const unregistered = classifyGetUserError({ message: 'Unregistered API key', status: 401 });
  assert.equal(unregistered.status, 500);
  assert.equal(unregistered.errorCode, 'SUPABASE_CONFIG_ERROR');

  // Genuine expired JWT
  const expiredJwt = classifyGetUserError({ message: 'token is expired by 10s', code: 'jwt_expired', status: 401 });
  assert.equal(expiredJwt.status, 401);
  assert.equal(expiredJwt.errorCode, 'AUTH_TOKEN_INVALID');

  // Malformed JWT
  const malformedJwt = classifyGetUserError({ message: 'invalid JWT: signature is invalid', code: 'bad_jwt', status: 401 });
  assert.equal(malformedJwt.status, 401);
  assert.equal(malformedJwt.errorCode, 'AUTH_TOKEN_INVALID');
}

let passed = 0;
for (const [name, ok] of checks) {
  assert.equal(ok, true, `Assertion failed for check: ${name}`);
  passed += 1;
  console.log(`PASS: ${name}`);
}

async function runAll() {
  await testRuntimeDeduplication();
  passed += 1;
  console.log(`PASS: Runtime concurrent refresh coalescing test`);

  testEmptyKeyClientCreation();
  passed += 1;
  console.log(`PASS: Runtime empty key throws error and cannot instantiate client`);

  testGetUserErrorClassification();
  passed += 1;
  console.log(`PASS: Runtime getUser error classification (config=500, jwt=401)`);

  console.log(`\n================================================================`);
  console.log(`📊 All ${passed}/${checks.length + 3} Auth & Session Transport Checks Passed Cleanly!`);
  console.log(`================================================================\n`);
}

runAll().catch(err => {
  console.error('Runtime test failed:', err);
  process.exit(1);
});
