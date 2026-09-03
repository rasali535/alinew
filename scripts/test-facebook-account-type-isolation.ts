import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { resolveAccountClassification, getSocialConnectionCapabilities } from '../packages/integrations/src/social/capabilities';
import { FacebookPageManagementService } from '../apps/ralion/src/lib/services/social/facebookPageManagement.service';
import { BusinessContextService } from '../packages/ai/src/businessContext.service';
import { callMariAiApi } from '../packages/ai/src/mariChat';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  [FAIL] ${msg}`);
    process.exit(1);
  }
  console.log(`  [PASS] ${msg}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('  Ralion OS: Facebook Profile vs Page + Website Isolation Tests');
  console.log('================================================================\n');

  // Load real production accounts
  const { data: conns, error } = await supabase
    .from('social_connections')
    .select('*')
    .in('id', ['f8656d3c-789b-4890-bc80-83920ce91870', '9196984f-a119-42ec-b23d-588e623a4415']);

  assert(!error && (conns || []).length === 2, 'Loaded production accounts A and B from database');

  const accountA = conns!.find(c => c.id === 'f8656d3c-789b-4890-bc80-83920ce91870')!;
  const accountB = conns!.find(c => c.id === '9196984f-a119-42ec-b23d-588e623a4415')!;

  // -------------------------------------------------------------------------
  console.log('--- Test 1: Facebook Page Connection (Account A: Ras Ali Labs) ---');
  // -------------------------------------------------------------------------
  const classA = resolveAccountClassification(accountA);
  const capsA = getSocialConnectionCapabilities(accountA);

  assert(classA === 'FACEBOOK_PAGE', `Account A classification is FACEBOOK_PAGE (got: ${classA})`);
  assert(capsA.isBusinessPage === true, 'Account A isBusinessPage === true');
  assert(capsA.canReadPosts === true, 'Account A canReadPosts === true');
  assert(capsA.canReadPageAnalytics === true, 'Account A canReadPageAnalytics === true');
  assert(capsA.canContributeToBusinessLearning === true, 'Account A canContributeToBusinessLearning === true');

  const postsA = await FacebookPageManagementService.getPagePosts({
    socialConnectionId: accountA.id,
    workspaceId: accountA.workspace_id,
    userId: accountA.user_id,
  });
  assert(postsA.length >= 20, `Account A returns live provider posts (count: ${postsA.length})`);

  const analyticsA = await FacebookPageManagementService.getPageAnalytics({
    socialConnectionId: accountA.id,
    workspaceId: accountA.workspace_id,
    userId: accountA.user_id,
  });
  assert(analyticsA.pageName === 'Ras Ali Labs', `Account A analytics resolves Page Name: ${analyticsA.pageName}`);

  // -------------------------------------------------------------------------
  console.log('\n--- Test 2: Facebook Personal Profile Connection (Account B: Kutlwano B Pule) ---');
  // -------------------------------------------------------------------------
  const classB = resolveAccountClassification(accountB);
  const capsB = getSocialConnectionCapabilities(accountB);

  assert(classB === 'FACEBOOK_PERSONAL_PROFILE', `Account B classification is FACEBOOK_PERSONAL_PROFILE (got: ${classB})`);
  assert(capsB.isPersonalProfile === true, 'Account B isPersonalProfile === true');
  assert(capsB.isBusinessPage === false, 'Account B isBusinessPage === false');
  assert(capsB.canReadPosts === false, 'Account B canReadPosts === false');
  assert(capsB.canReadPageAnalytics === false, 'Account B canReadPageAnalytics === false');
  assert(capsB.canContributeToBusinessLearning === false, 'Account B canContributeToBusinessLearning === false');

  const postsB = await FacebookPageManagementService.getPagePosts({
    socialConnectionId: accountB.id,
    workspaceId: accountB.workspace_id,
    userId: accountB.user_id,
  });
  assert(postsB.length === 0, `Account B returns 0 Page posts (got: ${postsB.length})`);

  const analyticsB = await FacebookPageManagementService.getPageAnalytics({
    socialConnectionId: accountB.id,
    workspaceId: accountB.workspace_id,
    userId: accountB.user_id,
  });
  assert(analyticsB.followers === 0, `Account B returns 0 followers for page analytics (got: ${analyticsB.followers})`);

  // -------------------------------------------------------------------------
  console.log('\n--- Test 3: Website + Personal Profile (Scenario E) ---');
  // -------------------------------------------------------------------------
  const contextE = await BusinessContextService.assembleContext('org-test-scenario-e', {
    isTestExecution: true,
    localOverrides: {
      websiteKnowledge: {
        status: 'INGESTED',
        provenance: 'VERIFIED',
        title: 'Ras Ali Labs (Pty) Ltd',
        websiteUrl: 'https://rasalilabs.com',
        summary: 'Sovereign African Enterprise Software Architecture',
        sections: [
          { title: 'Overview', keyTakeaways: ['Enterprise ERP', 'Sovereign Cloud', 'B2B Solutions'] }
        ]
      },
      fbPage: {
        name: 'Kutlwano B Pule',
        accountType: 'FACEBOOK_PERSONAL_PROFILE',
        isPersonalProfile: true,
        fanCount: 0,
        id: accountB.provider_account_id,
      }
    }
  });

  assert(contextE.primarySource === 'Website', `Scenario E primarySource is 'Website' (got: ${contextE.primarySource})`);
  assert(contextE.hasVerifiedKnowledge === true, 'Scenario E hasVerifiedKnowledge === true (derived from website)');
  assert(contextE.isPersonalSocialProfile === true, 'Scenario E isPersonalSocialProfile === true');
  assert(contextE.layer2.social.isConnected === false, 'Scenario E layer2.social.isConnected === false (not a Page)');
  assert(contextE.layer2.social.followersCount?.value === 0, 'Scenario E followersCount === 0');
  assert(Boolean(contextE.personalProfileNotice), 'Scenario E has explicit personalProfileNotice');

  // Verify Mari Chat response for Scenario E
  const chatResponseE = await callMariAiApi('What does my business do?', undefined, contextE);
  console.log('Mari Chat Response E:', chatResponseE?.text);
  assert(chatResponseE?.text?.includes('website'), 'Mari chat cites website as source of truth');
  assert(
    chatResponseE?.text?.includes('personal profile') || chatResponseE?.text?.includes('not available yet'),
    'Mari explicitly notes that connected Facebook account is a personal profile and Page insights are unavailable'
  );

  // -------------------------------------------------------------------------
  console.log('\n--- Test 4: Website + Facebook Page (Scenario D) ---');
  // -------------------------------------------------------------------------
  const contextD = await BusinessContextService.assembleContext('org-test-scenario-d', {
    isTestExecution: true,
    localOverrides: {
      websiteKnowledge: {
        status: 'INGESTED',
        provenance: 'VERIFIED',
        title: 'Ras Ali Labs (Pty) Ltd',
        websiteUrl: 'https://rasalilabs.com',
        sections: [{ title: 'Overview', keyTakeaways: ['Enterprise ERP'] }]
      },
      fbPage: {
        name: 'Ras Ali Labs',
        accountType: 'FACEBOOK_PAGE',
        isPersonalProfile: false,
        fanCount: 142,
        id: '477334159265235',
      }
    }
  });

  assert(contextD.primarySource === 'Facebook + Website', `Scenario D primarySource is 'Facebook + Website' (got: ${contextD.primarySource})`);
  assert(contextD.layer2.social.isConnected === true, 'Scenario D layer2.social.isConnected === true');
  assert(contextD.layer2.social.followersCount?.value === 142, 'Scenario D followersCount === 142');

  // -------------------------------------------------------------------------
  console.log('\n--- Test 5: Account A Page + Account B Personal Profile Zero Bleed ---');
  // -------------------------------------------------------------------------
  const postsFromA = await FacebookPageManagementService.getPagePosts({
    socialConnectionId: accountA.id,
    workspaceId: accountA.workspace_id,
    userId: accountA.user_id,
  });
  const postsFromB = await FacebookPageManagementService.getPagePosts({
    socialConnectionId: accountB.id,
    workspaceId: accountB.workspace_id,
    userId: accountB.user_id,
  });

  const bHasPostFromA = postsFromB.some(bPost => postsFromA.some(aPost => aPost.id === bPost.id));
  assert(!bHasPostFromA, 'Zero post IDs from Account A exist in Account B');
  assert(postsFromA.length >= 20, `Account A has live posts (count: ${postsFromA.length})`);
  assert(postsFromB.length === 0, 'Account B has 0 posts');

  // -------------------------------------------------------------------------
  console.log('\n--- Test 6: Command Center Account Type Representation ---');
  // -------------------------------------------------------------------------
  const capsTestA = getSocialConnectionCapabilities(accountA);
  const capsTestB = getSocialConnectionCapabilities(accountB);

  assert(capsTestA.accountTypeLabel === 'Business Page', `Command Center Account A label is 'Business Page' (got: ${capsTestA.accountTypeLabel})`);
  assert(capsTestB.accountTypeLabel === 'Personal Profile', `Command Center Account B label is 'Personal Profile' (got: ${capsTestB.accountTypeLabel})`);

  console.log('\n================================================================');
  console.log('  ALL FACEBOOK ACCOUNT TYPE & ISOLATION CHECKS PASSED (100%)');
  console.log('================================================================\n');
}

runTests().catch(e => {
  console.error('[FATAL] Test suite failed:', e);
  process.exit(1);
});
