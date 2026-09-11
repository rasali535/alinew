import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve('apps/ralion/.env.local') });
dotenv.config({ path: path.resolve('apps/ralion/.env.production') });
dotenv.config({ path: path.resolve('apps/ralion/.env') });
dotenv.config({ path: path.resolve('.env') });

import { FacebookPageManagementService } from '../apps/ralion/src/lib/services/social/facebookPageManagement.service';
import { SocialAnalyticsService } from '../apps/ralion/src/lib/services/social/socialAnalytics.service';
import { getSocialConnectionCapabilities } from '../packages/integrations/src/index';

function assert(condition: boolean, testId: string, desc: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${testId}: ${desc}`);
    process.exit(1);
  } else {
    console.log(`✅ [PASS] ${testId}: ${desc}`);
  }
}

async function runPipelineIntegrityTests() {
  console.log('=================================================================');
  console.log('RALION OS — FACEBOOK DATA PIPELINE & ANALYTICS INTEGRITY SUITE');
  console.log('=================================================================\n');

  const CANONICAL_ORG_ID = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
  const CANONICAL_WORKSPACE_ID = '90c6fb79-ad3d-458f-b59b-696383aa6273';
  const CANONICAL_USER_ID = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
  const CANONICAL_PAGE_ID = '477334159265235';
  const CANONICAL_CONNECTION_ID = 'd937656d-3586-4d00-801b-67109a896bf3';

  // 1. Verify SocialAnalyticsService does NOT produce fabricated fallbacks
  console.log('--- Test 1: Fabricated Fallback Removal Verification ---');
  const emptyAnalytics = await SocialAnalyticsService.getAggregatedAnalytics(
    '00000000-0000-0000-0000-000000000000'
  );
  assert(
    emptyAnalytics.totals.reach === 0 &&
    emptyAnalytics.totals.impressions === 0 &&
    emptyAnalytics.totals.engagement === 0 &&
    emptyAnalytics.totals.followers === 0 &&
    emptyAnalytics.totals.postsPublished === 0,
    'FALLBACK-01',
    'SocialAnalyticsService returns genuine zero values when no data exists (no 42,800 or 18,450 fallbacks)'
  );

  // 2. Verify Cross-Workspace Isolation in Page Posts
  console.log('\n--- Test 2: Cross-Workspace Isolation Verification ---');
  const crossOrgPosts = await FacebookPageManagementService.getPagePosts({
    organizationId: '11111111-1111-1111-1111-111111111111',
    workspaceId: '99999999-9999-9999-9999-999999999999',
    userId: '11111111-1111-1111-1111-111111111111',
    pageId: CANONICAL_PAGE_ID,
  });
  assert(
    Array.isArray(crossOrgPosts) && crossOrgPosts.length === 0,
    'ISOLATION-01',
    'Cross-workspace or cross-org post query returns empty array, preventing data leakage'
  );

  // 3. Verify Cross-Workspace Isolation in Page Analytics
  const crossOrgAnalytics = await FacebookPageManagementService.getPageAnalytics({
    organizationId: '11111111-1111-1111-1111-111111111111',
    workspaceId: '99999999-9999-9999-9999-999999999999',
    userId: '11111111-1111-1111-1111-111111111111',
    pageId: CANONICAL_PAGE_ID,
  });
  assert(
    crossOrgAnalytics.followers === 0 &&
    crossOrgAnalytics.pageName === 'No Connected Page' &&
    crossOrgAnalytics.analyticsAvailable === false,
    'ISOLATION-02',
    'Cross-workspace analytics query returns empty unauthenticated state'
  );

  // 4. Verify Canonical Production Tenant Analytics Resolution
  console.log('\n--- Test 3: Canonical Production Tenant Analytics Resolution ---');
  const canonicalAnalytics = await FacebookPageManagementService.getPageAnalytics({
    organizationId: CANONICAL_ORG_ID,
    workspaceId: CANONICAL_WORKSPACE_ID,
    userId: CANONICAL_USER_ID,
    pageId: CANONICAL_PAGE_ID,
  });

  assert(
    canonicalAnalytics.pageId === CANONICAL_PAGE_ID,
    'CANONICAL-01',
    `Canonical page ID is preserved: ${canonicalAnalytics.pageId}`
  );
  assert(
    canonicalAnalytics.pageName === 'Ras Ali Labs',
    'CANONICAL-02',
    `Canonical page name is verified: ${canonicalAnalytics.pageName}`
  );
  assert(
    typeof canonicalAnalytics.followers === 'number' && canonicalAnalytics.followers >= 0,
    'CANONICAL-03',
    `Followers count is real numeric value: ${canonicalAnalytics.followers}`
  );
  assert(
    canonicalAnalytics.provenance === 'LIVE_META_GRAPH_API' || canonicalAnalytics.provenance === 'STORED_PROFILE',
    'CANONICAL-04',
    `Provenance is authoritative: ${canonicalAnalytics.provenance}`
  );

  // 5. Verify Canonical Production Tenant Posts Query
  console.log('\n--- Test 4: Canonical Production Tenant Posts Query ---');
  const canonicalPosts = await FacebookPageManagementService.getPagePosts({
    organizationId: CANONICAL_ORG_ID,
    workspaceId: CANONICAL_WORKSPACE_ID,
    userId: CANONICAL_USER_ID,
    pageId: CANONICAL_PAGE_ID,
  });

  assert(
    Array.isArray(canonicalPosts),
    'POSTS-01',
    `Canonical posts returned valid array: length = ${canonicalPosts.length}`
  );

  if (canonicalPosts.length > 0) {
    const firstPost = canonicalPosts[0];
    assert(
      typeof firstPost.id === 'string' && firstPost.id.length > 0,
      'POSTS-02',
      `Post ID present: ${firstPost.id}`
    );
    assert(
      firstPost.engagement !== undefined &&
      typeof firstPost.engagement.likes === 'number' &&
      typeof firstPost.engagement.comments === 'number' &&
      typeof firstPost.engagement.shares === 'number',
      'POSTS-03',
      `Post engagement fields are properly typed numbers: likes=${firstPost.engagement.likes}, comments=${firstPost.engagement.comments}, shares=${firstPost.engagement.shares}`
    );
  }

  // 6. Verify Personal Profile vs Page Capabilities
  console.log('\n--- Test 5: Personal Profile vs Facebook Page Capabilities ---');
  const personalProfileConn = {
    provider: 'facebook',
    account_type: 'FACEBOOK_PERSONAL_PROFILE',
    connection_status: 'connected',
    metadata: { isPersonalProfile: true },
  };
  const personalCaps = getSocialConnectionCapabilities(personalProfileConn as any);
  assert(
    personalCaps.isPersonalProfile === true && personalCaps.canReadPageAnalytics === false,
    'CAPS-01',
    'Personal profile connection correctly disables page analytics capability'
  );

  const pageConn = {
    provider: 'facebook',
    account_type: 'FACEBOOK_PAGE',
    connection_status: 'connected',
    metadata: { pageId: CANONICAL_PAGE_ID },
  };
  const pageCaps = getSocialConnectionCapabilities(pageConn as any);
  assert(
    pageCaps.isPersonalProfile === false,
    'CAPS-02',
    'Facebook Page connection correctly enables page capabilities'
  );

  console.log('\n=================================================================');
  console.log('ALL FACEBOOK DATA PIPELINE & INTEGRITY TESTS PASSED!');
  console.log('=================================================================');
}

runPipelineIntegrityTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
