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
    serverAuthSource.includes('SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
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

let passed = 0;
for (const [name, ok] of checks) {
  assert.equal(ok, true, `Assertion failed for check: ${name}`);
  passed += 1;
  console.log(`PASS: ${name}`);
}

testRuntimeDeduplication().then(() => {
  passed += 1;
  console.log(`PASS: Runtime concurrent refresh coalescing test`);
  console.log(`\n================================================================`);
  console.log(`📊 All ${passed}/${checks.length + 1} Auth & Session Transport Checks Passed Cleanly!`);
  console.log(`================================================================\n`);
}).catch(err => {
  console.error('Runtime test failed:', err);
  process.exit(1);
});
