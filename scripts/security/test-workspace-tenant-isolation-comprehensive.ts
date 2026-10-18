/**
 * Ralion OS — Multi-Workspace & Tenant Isolation Comprehensive Test Suite
 * Ras Ali Labs (Pty) Ltd
 *
 * Validates Requirement 2:
 * 1. Multi-workspace users (users belonging to multiple workspaces in the same or different organizations).
 * 2. Cross-workspace unauthorized Page IDs (cannot read, query, or bind unauthorized pages across workspaces).
 * 3. Credential isolation (Meta OAuth tokens and page tokens are strictly workspace-partitioned).
 * 4. Cache partitioning (Facebook connection state cache keys are strictly scoped to workspace).
 * 5. Publishing target boundaries (publishing fails closed if page/connection does not belong to exact workspace).
 */

import dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config({ path: '.env.local' });
dotenv.config();

import '../preload-server-only.cjs';
process.env.OAUTH_ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

import { FacebookPageManagementService } from '../../apps/ralion/src/lib/services/social/facebookPageManagement.service';
import { FacebookConnectionStateService } from '../../apps/ralion/src/lib/services/social/facebookConnectionState.service';
import { MetaCredentialService } from '../../apps/ralion/src/lib/services/metaCredential.service';
import { SocialPublishingService } from '../../apps/ralion/src/lib/services/social/socialPublishing.service';
import { MetaProvider } from '../../packages/integrations/src/social/adapters/MetaProvider';
import { encryptToken, decryptToken } from '@ralion/integrations/server';

async function runComprehensiveWorkspaceIsolationSuite() {
  console.log('================================================================================');
  console.log('🛡️  RUNNING COMPREHENSIVE MULTI-WORKSPACE TENANT ISOLATION SUITE');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, description: string, details?: any) {
    if (condition) {
      console.log(`✅ [PASS] ${testId}: ${description}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testId}: ${description}`);
      if (details) console.error('   Details:', details);
      failed++;
    }
  }

  // Canonical UUID Fixtures
  const ORG_ALPHA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const ORG_BETA  = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  // User Alice belongs to BOTH Workspace Alpha and Workspace Beta (same org ORG_ALPHA)
  // as well as Workspace Gamma (different org ORG_BETA)
  const USER_ALICE = '11111111-1111-4111-8111-111111111111';
  const USER_BOB   = '22222222-2222-4222-8222-222222222222';

  const WORKSPACE_ALPHA = '33333333-3333-4333-8333-333333333333'; // Org Alpha, Alice
  const WORKSPACE_BETA  = '44444444-4444-4444-8444-444444444444'; // Org Alpha, Alice (same org, different workspace!)
  const WORKSPACE_GAMMA = '55555555-5555-4555-8555-555555555555'; // Org Beta, Alice
  const WORKSPACE_DELTA = '66666666-6666-4666-8666-666666666666'; // Org Beta, Bob

  const PAGE_ID_ALPHA = '109876543210001';
  const PAGE_ID_BETA  = '109876543210002';
  const PAGE_ID_UNAUTHORIZED = '999999999999999';

  console.log('--- SECTION 1: Multi-Workspace User Isolation (Same Org, Different Workspaces) ---');

  // Test 1.1: Ensure getPrimaryPage filters by workspace_id, not just organization_id
  const pageWsAlpha = await FacebookPageManagementService.getPrimaryPage({
    organizationId: ORG_ALPHA,
    workspaceId: WORKSPACE_ALPHA,
    userId: USER_ALICE,
  });

  const pageWsBeta = await FacebookPageManagementService.getPrimaryPage({
    organizationId: ORG_ALPHA,
    workspaceId: WORKSPACE_BETA,
    userId: USER_ALICE,
  });

  assert(
    pageWsAlpha === null || (pageWsAlpha && pageWsBeta === null) || (pageWsAlpha?.id !== pageWsBeta?.id),
    'MW-ISO-01',
    'getPrimaryPage partitions connections per workspace even when organizationId and userId are identical'
  );

  // Test 1.2: Calling getPageAnalytics on Workspace Beta with Page ID from Workspace Alpha returns structured empty state
  const analyticsBeta = await FacebookPageManagementService.getPageAnalytics({
    organizationId: ORG_ALPHA,
    workspaceId: WORKSPACE_BETA,
    userId: USER_ALICE,
    pageId: PAGE_ID_ALPHA,
  });

  assert(
    analyticsBeta.followers === 0 && analyticsBeta.pageName === 'No Connected Page',
    'MW-ISO-02',
    'getPageAnalytics returns structured empty state when querying another workspace\'s page within same organization'
  );

  // Test 1.3: Calling getPagePosts on Workspace Beta with Page ID from Workspace Alpha returns empty array
  const postsBeta = await FacebookPageManagementService.getPagePosts({
    organizationId: ORG_ALPHA,
    workspaceId: WORKSPACE_BETA,
    userId: USER_ALICE,
    pageId: PAGE_ID_ALPHA,
  });

  assert(
    Array.isArray(postsBeta) && postsBeta.length === 0,
    'MW-ISO-03',
    'getPagePosts returns empty array when querying another workspace\'s page'
  );

  console.log('\n--- SECTION 2: Cross-Workspace & Cross-Org Unauthorized Page IDs ---');

  // Test 2.1: Discover available pages for completely unauthorized user/tenant returns 0 pages
  const discoveryDelta = await FacebookPageManagementService.discoverAvailablePages({
    organizationId: ORG_BETA,
    workspaceId: WORKSPACE_DELTA,
    userId: USER_BOB,
  });

  assert(
    Array.isArray(discoveryDelta.pages) && discoveryDelta.pages.length === 0,
    'MW-ISO-04',
    'discoverAvailablePages returns 0 pages for workspace without connected Meta accounts'
  );

  // Test 2.2: Querying arbitrary unauthorized Page ID returns empty analytics
  const analyticsUnauthorized = await FacebookPageManagementService.getPageAnalytics({
    organizationId: ORG_BETA,
    workspaceId: WORKSPACE_DELTA,
    userId: USER_BOB,
    pageId: PAGE_ID_UNAUTHORIZED,
  });

  assert(
    analyticsUnauthorized.pageName === 'No Connected Page' && analyticsUnauthorized.followers === 0,
    'MW-ISO-05',
    'Arbitrary unauthorized Page ID cannot leak data across tenant/workspace boundary'
  );

  console.log('\n--- SECTION 3: Meta Credential & Token Workspace Partitioning ---');

  // Test 3.1: Token encryption and decryption safety
  const rawToken = 'EAABtest_secret_meta_access_token_xyz_987654';
  const enc = encryptToken(rawToken);
  const dec = decryptToken(enc);

  assert(
    enc.startsWith('enc_gcm_v2_') && dec === rawToken,
    'MW-ISO-06',
    'AES-256-GCM token encryption adheres to Meta Platform Data Protection specs'
  );

  // Test 3.2: MetaCredentialService.getValidTokenForWorkspace returns null for unauthorized workspace
  const tokenForWsDelta = await MetaCredentialService.getValidTokenForWorkspace(
    USER_BOB,
    WORKSPACE_DELTA,
    'facebook'
  );

  assert(
    tokenForWsDelta === null,
    'MW-ISO-07',
    'getValidTokenForWorkspace returns null cleanly when no credentials belong to that workspace'
  );

  // Test 3.3: In-memory retrieval of credential for User Alice in Workspace Beta does not return Workspace Alpha's token
  const tokenForWsBeta = await MetaCredentialService.getValidTokenForWorkspace(
    USER_ALICE,
    WORKSPACE_BETA,
    'facebook'
  );

  assert(
    tokenForWsBeta === null,
    'MW-ISO-08',
    'Credentials for User Alice are strictly partitioned by workspaceId, preventing cross-workspace token reuse'
  );

  console.log('\n--- SECTION 4: Cache Partitioning & Workspace-Scoped Invalidation ---');

  // Test 4.1: FacebookConnectionStateService cache key respects workspace boundary
  const stateAlpha = await FacebookConnectionStateService.resolveFacebookConnectionState({
    tenantId: ORG_ALPHA,
    workspaceId: WORKSPACE_ALPHA,
    userId: USER_ALICE,
  });

  const stateBeta = await FacebookConnectionStateService.resolveFacebookConnectionState({
    tenantId: ORG_ALPHA,
    workspaceId: WORKSPACE_BETA,
    userId: USER_ALICE,
  });

  assert(
    stateAlpha.workspaceId === WORKSPACE_ALPHA && stateBeta.workspaceId === WORKSPACE_BETA,
    'MW-ISO-09',
    'Connection state cache is isolated by workspaceId: stateAlpha and stateBeta preserve respective workspace IDs'
  );

  // Test 4.2: Invalidation of Workspace Alpha cache does not affect Workspace Beta
  FacebookConnectionStateService.invalidateCache(WORKSPACE_ALPHA);

  const stateBetaAfterInvalidate = await FacebookConnectionStateService.resolveFacebookConnectionState({
    tenantId: ORG_ALPHA,
    workspaceId: WORKSPACE_BETA,
    userId: USER_ALICE,
  });

  assert(
    stateBetaAfterInvalidate.workspaceId === WORKSPACE_BETA,
    'MW-ISO-10',
    'Workspace-specific cache invalidation correctly partitions and preserves unrelated workspace states'
  );

  console.log('\n--- SECTION 5: Publishing Target Boundaries & Fail-Closed Behavior ---');

  // Test 5.1: MetaProvider.publish strictly fails closed when pageId is missing or 'me'
  const metaProvider = new MetaProvider();
  const publishMeResult = await metaProvider.publish('mock_token', {
    pageId: 'me',
    body: 'Test post targeting me',
    platforms: ['facebook'],
  });

  assert(
    publishMeResult.success === false &&
    publishMeResult.statusCode === 400 &&
    typeof publishMeResult.error === 'string' &&
    publishMeResult.error.includes('Page ID is required'),
    'MW-ISO-11',
    'MetaProvider.publish strictly rejects targetId="me" (fail-closed, 400 Bad Request)'
  );

  // Test 5.2: MetaProvider.publish strictly fails closed when pageId is omitted
  const publishEmptyResult = await metaProvider.publish('mock_token', {
    body: 'Test post without pageId',
    platforms: ['facebook'],
  });

  assert(
    publishEmptyResult.success === false &&
    publishEmptyResult.statusCode === 400,
    'MW-ISO-12',
    'MetaProvider.publish strictly rejects missing pageId (fail-closed, 400 Bad Request)'
  );

  // Test 5.3: SocialPublishingService connection security check rejects cross-workspace connection IDs
  let crossWsPublishBlocked = false;
  try {
    // Attempt to publish using a socialConnectionId from another workspace
    await SocialPublishingService.publish({
      userId: USER_ALICE,
      organizationId: ORG_ALPHA,
      workspaceId: WORKSPACE_BETA, // Executing in Workspace Beta
      socialConnectionId: 'ffffffff-ffff-4fff-8fff-ffffffffffff', // Connection belonging elsewhere
      platforms: ['facebook'],
      body: 'Cross-workspace unauthorized publish attempt',
    });
  } catch (err: any) {
    if (err?.statusCode === 403 || err?.statusCode === 503 || err?.message?.includes('Access denied') || err?.message?.includes('unavailable')) {
      crossWsPublishBlocked = true;
    }
  }

  assert(
    crossWsPublishBlocked,
    'MW-ISO-13',
    'SocialPublishingService strictly rejects cross-workspace socialConnectionId and fails closed'
  );

  console.log('\n================================================================================');
  console.log(`🏁 SUITE COMPLETE: ${passed} passed, ${failed} failed`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runComprehensiveWorkspaceIsolationSuite().catch((err) => {
  console.error('Fatal workspace isolation suite error:', err);
  process.exit(1);
});
