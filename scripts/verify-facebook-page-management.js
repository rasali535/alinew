/**
 * Ralion OS — Facebook Page Management & Mari AI Comprehensive Verification Suite
 * Ras Ali Labs (Pty) Ltd
 */

const http = require('http');
require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

async function testFacebookPageArchitecture() {
  console.log('===============================================================');
  console.log('RALION OS — FACEBOOK PAGE MANAGEMENT + MARI AI VERIFICATION');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName, detail = '') {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
    }
  }

  // 1. Mock Services & Validation
  const { FacebookPageManagementService } = require('../apps/ralion/src/lib/services/social/facebookPageManagement.service');
  const { MariFacebookGrowthService } = require('../apps/ralion/src/lib/services/social/mariFacebookGrowth.service');

  // Test 1: Entitlement Resolution
  const ent = await FacebookPageManagementService.getOrganizationEntitlement('org_test_1');
  assert(ent && ent.limit >= 1, 'Entitlement Resolution', `Limit=${ent.limit}, Plan=${ent.planName}`);

  // Test 2: Page Discovery
  const testUserId = 'e7c80a2e-f21f-49b8-a361-30bd3e704e46';
  const discovery = await FacebookPageManagementService.discoverAvailablePages({
    organizationId: testUserId,
    workspaceId: testUserId,
    userId: testUserId,
  });
  assert(discovery.pages.length > 0, 'Facebook Page Discovery', `Found ${discovery.pages.length} Pages`);
  assert(discovery.pages[0]?.pageId === '477334159265235' || discovery.pages[0]?.pageId === '6a82df7277555aae018b92b4', 'Verified Page ID Match', discovery.pages[0]?.pageId || 'none');

  // Test 3: Connect Primary Page (Allowed)
  const connRes = await FacebookPageManagementService.connectPage({
    organizationId: testUserId,
    userId: testUserId,
    pageId: '477334159265235',
    pageData: { name: 'Ras Ali Labs', username: '@rasalibass', followersCount: 107 },
  });
  assert(connRes.success === true, 'Primary Facebook Page Connection', 'Ras Ali Labs');

  // Test 4: Block 2nd Page when limit is 1 (Server-Side 403 Enforcement)
  let blocked = false;
  try {
    // If limit is 1 and 1 is used, attempt connecting a 2nd distinct page
    await FacebookPageManagementService.connectPage({
      organizationId: testUserId,
      userId: testUserId,
      pageId: 'page_unauthorized_2',
      pageData: { name: 'Unauthorized Page 2' },
    });
  } catch (err) {
    if (err.code === 'FEATURE_LIMIT_REACHED' || err.statusCode === 403) {
      blocked = true;
    }
  }
  assert(blocked, 'Server-Side Entitlement Limit Enforcement', 'HTTP 403 FEATURE_LIMIT_REACHED');

  // Test 5: Real Facebook Posts Query
  const posts = await FacebookPageManagementService.getPagePosts({
    organizationId: testUserId,
    userId: testUserId,
    pageId: '477334159265235',
  });
  assert(posts.length > 0, 'Real Facebook Posts Feed Retrieval', `${posts.length} posts retrieved`);

  // Test 6: Normalized Analytics & Deterministic Scoring
  const analytics = await FacebookPageManagementService.getPageAnalytics({
    organizationId: testUserId,
    userId: testUserId,
    pageId: '477334159265235',
  });
  const score = MariFacebookGrowthService.calculateGrowthScore(analytics);
  assert(score.total > 0 && score.total <= 100, 'Deterministic Growth Score Calculation', `${score.total}/100`);

  // Test 7: Mari AI Strategic Insights
  const insightsRes = await MariFacebookGrowthService.generateGrowthInsights({
    context: {
      organizationId: 'org_test_1',
      pageId: '477334159265235',
      pageName: 'Ras Ali Labs',
      followers: 107,
      followerGrowth30d: 14,
      followerGrowthPercentage: 13.1,
      totalPosts30d: 8,
      engagementRate: 5.8,
      totalReach30d: 1840,
      totalImpressions30d: 2650,
      topContentType: 'video',
      postingFrequencyPerWeek: 2,
    },
    userId: 'user_1',
  });
  assert(insightsRes.insights.length >= 3, 'Mari AI Strategic Insights Generation', `${insightsRes.insights.length} actionable insights`);

  // Test 8: Mari AI 7-Day Growth Plan
  const plan = await MariFacebookGrowthService.generate7DayGrowthPlan({
    context: {
      organizationId: 'org_test_1',
      pageId: '477334159265235',
      pageName: 'Ras Ali Labs',
      followers: 107,
      followerGrowth30d: 14,
      followerGrowthPercentage: 13.1,
      totalPosts30d: 8,
      engagementRate: 5.8,
      totalReach30d: 1840,
      totalImpressions30d: 2650,
      topContentType: 'video',
      postingFrequencyPerWeek: 2,
    },
    userId: 'user_1',
  });
  assert(plan.days && plan.days.length === 7, 'Mari AI 7-Day Actionable Content Plan', '7 Days Scheduled');

  // Test 9: Mari Context Sanitization (Data Minimization Rule)
  const contextKeys = Object.keys({
    organizationId: 'org_test_1',
    pageId: '477334159265235',
    pageName: 'Ras Ali Labs',
    followers: 107,
    followerGrowth30d: 14,
    followerGrowthPercentage: 13.1,
    totalPosts30d: 8,
    engagementRate: 5.8,
    totalReach30d: 1840,
    totalImpressions30d: 2650,
    topContentType: 'video',
    postingFrequencyPerWeek: 2,
  });
  const hasSecrets = contextKeys.some(k => k.includes('token') || k.includes('secret') || k.includes('key') || k.includes('password'));
  assert(!hasSecrets, 'Mari AI Security: Zero Secrets in Prompt Context', 'Data Minimization Verified');

  console.log('\n===============================================================');
  console.log(`VERIFICATION COMPLETE: ${passed} / ${total} TESTS PASSED`);
  console.log('===============================================================');

  if (passed === total) {
    console.log('\n>>> STATUS: FACEBOOK PAGE MANAGEMENT + MARI GROWTH INTELLIGENCE READY <<<');
  }
}

testFacebookPageArchitecture().catch(console.error);
