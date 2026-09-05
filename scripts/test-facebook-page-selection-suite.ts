import dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config({ path: '.env.local' });
dotenv.config();

import { FacebookPageManagementService } from '../apps/ralion/src/lib/services/social/facebookPageManagement.service';
import { MariFacebookGrowthService, MariPageContext } from '../apps/ralion/src/lib/services/social/mariFacebookGrowth.service';
import { metaAdapter } from '../apps/ralion/src/lib/services/social.service';

async function runFacebookPageSelectionSuite() {
  console.log('================================================================');
  console.log('🚀 RUNNING FACEBOOK MANAGED PAGE SELECTION & MARI GROWTH SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, description: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testId}: ${description}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testId}: ${description}`);
      failed++;
    }
  }

  // MG-FB-01: Meta OAuth scopes include page management scopes by default
  const defaultScopes = metaAdapter.scopes.facebook;
  const hasPageList = defaultScopes.includes('pages_show_list');
  const hasPagePosts = defaultScopes.includes('pages_manage_posts');
  const hasPageEngagement = defaultScopes.includes('pages_read_engagement');
  assert(
    hasPageList && hasPagePosts && hasPageEngagement,
    'MG-FB-01',
    `OAuth scopes include managed page permissions (${defaultScopes.join(', ')})`
  );

  // MG-FB-02: Entitlement resolution
  const ent = await FacebookPageManagementService.getOrganizationEntitlement('test-org-1');
  assert(
    ent.limit >= 1 && typeof ent.remaining === 'number' && ent.planName !== undefined,
    'MG-FB-02',
    `Entitlement resolved successfully (limit: ${ent.limit}, plan: ${ent.planName})`
  );

  // MG-FB-03: getActivePage returns null or valid PageDescriptor (never user profile ID as page)
  const activePage = await FacebookPageManagementService.getActivePage({
    organizationId: 'non-existent-tenant-xyz',
  });
  assert(
    activePage === null,
    'MG-FB-03',
    'getActivePage correctly returns null for tenant without connected Facebook Page'
  );

  // MG-FB-04: discoverAvailablePages handles empty state gracefully
  const discovery = await FacebookPageManagementService.discoverAvailablePages({
    organizationId: 'non-existent-tenant-xyz',
    userId: 'non-existent-user-xyz',
  });
  assert(
    Array.isArray(discovery.pages) && discovery.pages.length === 0,
    'MG-FB-04',
    'discoverAvailablePages returns empty pages array gracefully when no tokens exist'
  );

  // MG-FB-05: Page analytics empty state
  const analytics = await FacebookPageManagementService.getPageAnalytics({
    organizationId: 'non-existent-tenant-xyz',
    pageId: 'default',
  });
  assert(
    analytics.pageName === 'No Connected Page' && analytics.followers === 0 && analytics.totalPosts30d === 0,
    'MG-FB-05',
    'getPageAnalytics returns structured empty state when no page is bound'
  );

  // MG-FB-06: Mari 7-Day Growth Plan generation branded dynamically to page context
  const testContext: MariPageContext = {
    organizationId: 'test-org',
    pageId: 'page-123456789',
    pageName: 'SolarTech Solutions Botswana',
    followers: 2450,
    followerGrowth30d: 180,
    followerGrowthPercentage: 7.9,
    totalPosts30d: 14,
    engagementRate: 4.8,
    totalReach30d: 18900,
    totalImpressions30d: 32000,
    topContentType: 'CAROUSEL',
    postingFrequencyPerWeek: 3,
  };

  const plan = await MariFacebookGrowthService.generate7DayGrowthPlan({
    context: testContext,
    userId: 'test-user',
    focusObjective: 'Lead Generation',
  });

  assert(
    plan.days.length === 7 &&
    plan.pageName === 'SolarTech Solutions Botswana' &&
    plan.days[0].topic.length > 0 &&
    plan.days[0].suggestedCaption.length > 0,
    'MG-FB-06',
    `Mari 7-Day Growth Plan dynamically generated for "${plan.pageName}" with ${plan.days.length} days`
  );

  // MG-FB-07: Verify 7-day plan contains no hardcoded Ras Ali Labs when branding SolarTech Solutions
  const planJson = JSON.stringify(plan);
  const noHardcodedRasAliInBrandedPlan = !planJson.includes('Ras Ali Labs');
  assert(
    noHardcodedRasAliInBrandedPlan,
    'MG-FB-07',
    '7-Day Growth Plan contains no hardcoded platform brand when client page is SolarTech Solutions'
  );

  // MG-FB-08: Mari Strategic Growth Insights generation
  const insights = await MariFacebookGrowthService.generateGrowthInsights({
    context: testContext,
    userId: 'test-user',
  });
  assert(
    insights.score.total >= 0 &&
    insights.score.total <= 100 &&
    insights.insights.length >= 3,
    'MG-FB-08',
    `Mari Growth Insights generated with score: ${insights.score.total}/100 and ${insights.insights.length} strategic insights`
  );

  // MG-FB-09: Mari Dynamic Q&A Engine
  const askRes = await MariFacebookGrowthService.askMari({
    context: testContext,
    prompt: 'Why should we post more video content on SolarTech Solutions Botswana?',
    userId: 'test-user',
  });
  assert(
    askRes.answer.length > 50 &&
    askRes.recommendedAction.length > 0 &&
    askRes.suggestedPrompt.length > 0,
    'MG-FB-09',
    `Mari Q&A engine answered intelligently (Action: ${askRes.recommendedAction})`
  );

  // MG-FB-10: Token encryption/decryption roundtrip
  const { encryptToken, decryptToken } = await import('@ralion/integrations');
  const secretKey = 'super_secret_test_token_12345';
  const encrypted = encryptToken(secretKey);
  const decrypted = decryptToken(encrypted);
  assert(
    decrypted === secretKey && encrypted !== secretKey,
    'MG-FB-10',
    'Token encryption and decryption roundtrips correctly via AES-256-GCM vault'
  );

  console.log('\n================================================================');
  console.log(`🏁 SUITE COMPLETE: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFacebookPageSelectionSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
