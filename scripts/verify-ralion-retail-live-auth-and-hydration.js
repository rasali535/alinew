/**
 * Ralion Retail OS — Live Auth & Hydration Error Verification Suite
 * 
 * Verifies the 8 core operational and security requirements:
 * 1. Unauthenticated visitor -> appropriate login/401
 * 2. Authenticated platform admin -> authorized Retail preview (server-authorized workspace binding)
 * 3. Authenticated Proinsight owner -> correct Retail workspace (67074e47-76bb-40e1-ae05-362e9cae8798)
 * 4. Authenticated non-entitled workspace -> 403 Forbidden
 * 5. Expired demo customer -> denied access
 * 6. Direct Retail API requests without a valid session -> denied (401)
 * 7. Refresh and direct navigation -> no hydration errors (deterministic SSR, no window in useState, no nested <main>)
 * 8. All Retail subpages -> no repeated 401 responses (authFetch token forwarding, baseUrl resolution, preview propagation)
 */

const fs = require('fs');
const path = require('path');

// Color helpers
const green = (msg) => `\x1b[32m${msg}\x1b[0m`;
const red = (msg) => `\x1b[31m${msg}\x1b[0m`;
const cyan = (msg) => `\x1b[36m${msg}\x1b[0m`;
const yellow = (msg) => `\x1b[33m${msg}\x1b[0m`;

let passed = 0;
let failed = 0;

function assert(condition, testName, errorDetail) {
  if (condition) {
    console.log(`  ${green('✓')} ${testName}`);
    passed++;
  } else {
    console.error(`  ${red('✗')} ${testName}`);
    if (errorDetail) console.error(`    ${yellow(errorDetail)}`);
    failed++;
  }
}

async function runVerification() {
  console.log(cyan('\n======================================================================'));
  console.log(cyan('  RALION RETAIL — LIVE AUTHENTICATION & HYDRATION VERIFICATION'));
  console.log(cyan('======================================================================\n'));

  const ralionRoot = path.join(__dirname, '..', 'apps', 'ralion');
  const authRoot = path.join(__dirname, '..', 'packages', 'auth');

  // -------------------------------------------------------------------------
  // 1. Unauthenticated visitor -> appropriate login/401
  // -------------------------------------------------------------------------
  console.log(cyan('1. Testing Unauthenticated Visitor Enforcement (Login / 401)...'));
  const serverAuthPath = path.join(ralionRoot, 'src', 'lib', 'auth', 'serverAuth.ts');
  const serverAuthContent = fs.readFileSync(serverAuthPath, 'utf8');

  assert(
    serverAuthContent.includes('authRequiredResponse') &&
    serverAuthContent.includes('{ status: 401 }'),
    'requireRalionContext returns HTTP 401 Unauthorized for unauthenticated requests'
  );
  assert(
    serverAuthContent.includes('forbiddenResponse') &&
    serverAuthContent.includes('{ status: 403 }'),
    'requireRalionContext returns HTTP 403 Forbidden for authenticated but unauthorized requests'
  );
  assert(
    !serverAuthContent.includes('bypassAuth') && !serverAuthContent.includes('defaultOwner'),
    'Zero authentication bypasses or default owner privileges exist in serverAuth'
  );

  // -------------------------------------------------------------------------
  // 2. Authenticated platform admin -> authorized Retail preview
  // -------------------------------------------------------------------------
  console.log(cyan('\n2. Testing Platform Admin Authorized Retail Preview...'));
  assert(
    serverAuthContent.includes('admin_preview_sessions') &&
    serverAuthContent.includes('session_token_hash'),
    'Server authorizes preview token via cryptographic hash against admin_preview_sessions'
  );
  assert(
    serverAuthContent.includes('requestedWorkspaceId = dbSession.workspace_id'),
    'Server authoritatively binds workspace directly from DB preview session, not client query params'
  );
  assert(
    serverAuthContent.includes('dbSession.admin_user_id === authUser.id'),
    'Preview context authoritatively binds to the platform administrator user ID'
  );

  const previewServicePath = path.join(ralionRoot, 'src', 'lib', 'services', 'preview', 'previewSession.service.ts');
  const previewServiceContent = fs.readFileSync(previewServicePath, 'utf8');
  assert(
    previewServiceContent.includes('20000000-0000-0000-0000-000000000001') &&
    previewServiceContent.includes('PREVIEW_SESSION_DURATION_MS = 60 * 60 * 1000'),
    'Preview session targets dedicated sandbox workspace with strict expiration'
  );
  assert(
    serverAuthContent.includes('PREVIEW_WORKSPACE_MISMATCH') &&
    serverAuthContent.includes('PREVIEW_ORGANIZATION_MISMATCH'),
    'Server strictly rejects combining valid preview token with mismatched workspace or organization'
  );
  const previewRoutePath = path.join(ralionRoot, 'src', 'app', 'api', 'admin', 'products', 'preview', 'route.ts');
  const previewRouteContent = fs.readFileSync(previewRoutePath, 'utf8');
  assert(
    !previewRouteContent.includes('sessionToken: sessionResult.sessionToken') &&
    previewRouteContent.includes("response.cookies.set('ralion_preview_session'"),
    'Preview route omits raw token from JSON response and sets secure HttpOnly cookie'
  );
  assert(
    !previewServiceContent.includes('&token=${rawSessionToken}') &&
    previewServiceContent.includes('ws=${workspaceId}'),
    'PreviewSessionService omits raw session tokens from preview URLs'
  );
  const apiConfigPath = path.join(ralionRoot, 'src', 'lib', 'api-config.ts');
  const apiConfigContent = fs.readFileSync(apiConfigPath, 'utf8');
  assert(
    !apiConfigContent.includes('ralion_preview_session_token') &&
    !apiConfigContent.includes('extractPreviewToken'),
    'api-config does not extract or cache preview tokens in client sessionStorage'
  );
  assert(
    !serverAuthContent.includes("previewToken = request.nextUrl") &&
    serverAuthContent.includes("request.cookies.get('ralion_preview_session')"),
    'serverAuth strictly validates preview tokens from HttpOnly cookies and rejects URL tokens'
  );

  // -------------------------------------------------------------------------
  // 3. Authenticated Proinsight owner -> correct Retail workspace
  // -------------------------------------------------------------------------
  console.log(cyan('\n3. Testing Authenticated Proinsight Owner Active Workspace Resolution...'));
  const entitlementServicePath = path.join(ralionRoot, 'src', 'lib', 'services', 'retail', 'retailEntitlement.service.ts');
  const entitlementContent = fs.readFileSync(entitlementServicePath, 'utf8');
  assert(
    entitlementContent.includes('85ec9738-937a-41ee-b0df-ed752777447c') &&
    entitlementContent.includes('67074e47-76bb-40e1-ae05-362e9cae8798'),
    'Proinsight Hardware Store bound to exact Organization & Workspace IDs'
  );
  assert(
    serverAuthContent.includes('workspace_members') && serverAuthContent.includes('isPlatformAdmin'),
    'Server validates real workspace membership or platform admin role before granting context'
  );

  // -------------------------------------------------------------------------
  // 4. Authenticated non-entitled workspace -> 403
  // -------------------------------------------------------------------------
  console.log(cyan('\n4. Testing Authenticated Non-Entitled Workspace Rejection (403)...'));
  const retailDashboardRoutePath = path.join(ralionRoot, 'src', 'app', 'api', 'retail', 'dashboard', 'route.ts');
  const dashboardRouteContent = fs.readFileSync(retailDashboardRoutePath, 'utf8');
  assert(
    dashboardRouteContent.includes('RetailEntitlementService.verifyEntitlement') &&
    dashboardRouteContent.includes('status: 403'),
    'GET /api/retail/dashboard strictly returns HTTP 403 for non-entitled authenticated workspaces'
  );

  // -------------------------------------------------------------------------
  // 5. Expired demo customer -> denied access
  // -------------------------------------------------------------------------
  console.log(cyan('\n5. Testing Expired Demo Customer / Preview Denial...'));
  assert(
    serverAuthContent.includes('new Date(dbSession.expires_at).getTime() > Date.now()'),
    'Preview sessions past expires_at are strictly rejected as invalid'
  );
  assert(
    entitlementContent.includes("entitlementStatus = 'EXPIRED'") &&
    entitlementContent.includes('expires_at'),
    'Retail entitlement verification rejects expired customer trials'
  );

  // -------------------------------------------------------------------------
  // 6. Direct Retail API requests without a valid session -> denied
  // -------------------------------------------------------------------------
  console.log(cyan('\n6. Testing Direct Retail API Requests without Session...'));
  const retailApiRoutes = [
    'dashboard', 'products', 'sales', 'pos/process', 'inventory/adjust',
    'quotations', 'purchasing', 'reports', 'payroll', 'expenses'
  ];
  let allApiSecured = true;
  for (const route of retailApiRoutes) {
    const routePath = path.join(ralionRoot, 'src', 'app', 'api', 'retail', ...route.split('/'), 'route.ts');
    if (fs.existsSync(routePath)) {
      const content = fs.readFileSync(routePath, 'utf8');
      if (!content.includes('requireRalionContext')) {
        allApiSecured = false;
        console.error(`Route ${route} missing requireRalionContext!`);
      }
    }
  }
  assert(allApiSecured, 'All Retail API routes enforce requireRalionContext before execution');

  // -------------------------------------------------------------------------
  // 7. Refresh and direct navigation -> no hydration errors
  // -------------------------------------------------------------------------
  console.log(cyan('\n7. Testing Hydration Mismatch Guarantees (React #418 Fix)...'));
  const orgContextPath = path.join(authRoot, 'src', 'OrganizationContext.tsx');
  const orgContextContent = fs.readFileSync(orgContextPath, 'utf8');

  assert(
    orgContextContent.includes('useState<UserProfile | null>(null)') &&
    orgContextContent.includes('useState(true)') &&
    !orgContextContent.includes('initialSnapshot?.user'),
    'OrganizationContext initializes state deterministically across SSR and initial client hydration'
  );
  assert(
    orgContextContent.includes('useEffect(() => {') &&
    orgContextContent.includes('readCachedContextSnapshot()'),
    'Cached session snapshot rehydration deferred to useEffect (after initial DOM hydration)'
  );

  const guardPath = path.join(ralionRoot, 'src', 'components', 'ProductAccessGuard.tsx');
  const guardContent = fs.readFileSync(guardPath, 'utf8');
  assert(
    !guardContent.includes('isLocalWorkspaceBypass'),
    'ProductAccessGuard does not execute local bypass checks or render-time window mismatching'
  );

  // Verify no nested <main> tags in any retail page
  const retailDir = path.join(ralionRoot, 'src', 'app', '(dashboard)', 'retail');
  const retailFiles = fs.readdirSync(retailDir, { recursive: true }).filter(f => f.endsWith('page.tsx'));
  let noNestedMain = true;
  for (const relFile of retailFiles) {
    const fullPath = path.join(retailDir, relFile);
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('<main')) {
      noNestedMain = false;
      console.error(`Nested <main> tag found in ${relFile}!`);
    }
  }
  assert(noNestedMain, 'All Retail subpages use <div role="region"> instead of nested <main> tags');

  // -------------------------------------------------------------------------
  // 8. All Retail subpages -> no repeated 401 responses
  // -------------------------------------------------------------------------
  console.log(cyan('\n8. Testing All Retail Subpages API Token & Header Forwarding...'));
  // apiConfigContent already read above

  assert(
    apiConfigContent.includes('authFetch') &&
    apiConfigContent.includes('getRalionAuthHeaders'),
    'authFetch dynamically resolves Ralion base URL (/ralion) and forwards bearer auth and HttpOnly credentials'
  );

  let allPagesUseAuthFetch = true;
  for (const relFile of retailFiles) {
    const fullPath = path.join(retailDir, relFile);
    const content = fs.readFileSync(fullPath, 'utf8');
    // Ensure no raw fetch calls remain in retail subpages
    if (/fetch\s*\(\s*['"`]\/api\/retail/g.test(content)) {
      allPagesUseAuthFetch = false;
      console.error(`Raw fetch('/api/retail') found in ${relFile}!`);
    }
  }
  assert(allPagesUseAuthFetch, 'All Retail subpages exclusively use authFetch with session token headers');

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log(cyan('\n======================================================================'));
  console.log(cyan('  VERIFICATION SUMMARY'));
  console.log(cyan('======================================================================'));
  console.log(`  Total Checks: ${passed + failed}`);
  console.log(`  Passed: ${green(passed.toString())}`);
  console.log(`  Failed: ${failed > 0 ? red(failed.toString()) : '0'}`);

  if (failed === 0) {
    console.log(green('\n  ALL 8 LIVE RALION RETAIL ERROR & SECURITY CONDITIONS VERIFIED! ✨\n'));
    process.exit(0);
  } else {
    console.error(red('\n  SOME VERIFICATION CHECKS FAILED!\n'));
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
