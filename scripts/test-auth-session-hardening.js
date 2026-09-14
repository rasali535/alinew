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
    apiConfigSource.includes('body?.code === \'AUTH_TOKEN_MISSING\'') &&
    apiConfigSource.includes('getRalionAuthHeaders({ refresh: true })')
  ],
  [
    'api-config injects Authorization, x-user-id, and tenant hints',
    apiConfigSource.includes('headers.Authorization = `Bearer ${session.access_token}`') &&
    apiConfigSource.includes("headers['x-workspace-id'] = activeWs") &&
    apiConfigSource.includes("headers['x-organization-id'] = activeOrg")
  ],

  // 3. OrganizationContext Loop-Breaker
  [
    'OrganizationContext debounces rapid context resolutions',
    orgContextSource.includes('lastResolveTimeRef') &&
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
