/**
 * Ralion OS — Facebook Real Live Posting & Data Verification
 * Ras Ali Labs (Pty) Ltd
 */

require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

const { SocialPublishingService } = require('../apps/ralion/src/lib/services/social/socialPublishing.service');
const { FacebookPageManagementService } = require('../apps/ralion/src/lib/services/social/facebookPageManagement.service');

async function testFacebookPostingAndData() {
  console.log('=====================================================================');
  console.log('RALION OS — FACEBOOK LIVE POSTING & REAL DATA VERIFICATION');
  console.log('=====================================================================\n');

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

  // 1. Verify Page Entitlement
  const ent = await FacebookPageManagementService.getOrganizationEntitlement();
  assert(ent.limit >= 1, 'Facebook Page Entitlement Limit', `Limit: ${ent.limit}, Current: ${ent.current}`);

  // 2. Discover Available Pages (Real Zernio / Facebook Account)
  const discovery = await FacebookPageManagementService.discoverAvailablePages({
    userId: 'default-user',
    profileId: '6a82deac1a69158ef81cb2cd',
  });
  assert(discovery.pages.length > 0, 'Facebook Page Discovery', `Found: ${discovery.pages.length} Pages`);
  assert(
    discovery.pages[0].name === 'Ras Ali Labs' || discovery.pages[0].name === 'Connected Account',
    'Primary Facebook Page Identification',
    discovery.pages[0].name
  );

  // 3. Fetch Real Facebook Page Posts
  const posts = await FacebookPageManagementService.getPagePosts({
    userId: 'default-user',
    limit: 5,
  });
  assert(posts.length > 0, 'Facebook Posts Feed Query', `${posts.length} real posts loaded`);
  assert(posts[0].source === 'RALION', 'Post Source Verification', posts[0].source);

  // 4. Test Live Facebook Publishing Engine Dispatch
  console.log('\n--- Testing SocialPublishingService for Facebook ---');
  try {
    const pubResult = await SocialPublishingService.publish({
      userId: 'default-user',
      title: 'Automated Real-Time Test Post',
      body: 'Testing live Facebook publishing pipeline in Ralion OS. #RalionOS #RasAliLabs #EnterpriseAI',
      platforms: ['facebook'],
      authorName: 'Ras Ali Labs Automation',
    });

    assert(pubResult.postId !== undefined, 'Publish Dispatch Post ID Generated', pubResult.postId);
    assert(pubResult.overallStatus !== 'FAILED', 'Publish Overall Status', pubResult.overallStatus);
    assert(pubResult.platformResults.facebook !== undefined, 'Facebook Platform Result Present');
  } catch (err) {
    console.error('Publish test error:', err.message);
    assert(false, 'Live Facebook Publishing Engine Dispatch', err.message);
  }

  console.log('\n=====================================================================');
  console.log(`VERIFICATION COMPLETE: ${passed} / ${total} TESTS PASSED`);
  console.log('=====================================================================');

  if (passed === total) {
    console.log('\n>>> STATUS: FACEBOOK PUBLISHING & REAL DATA FULLY VERIFIED <<<');
  }
}

testFacebookPostingAndData().catch(console.error);
