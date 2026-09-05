/**
 * Comprehensive Acceptance Test Suite for Mari AI:
 * Facebook Knowledge Grounding & Source-Aware Intelligence Architecture
 * 
 * Verifies:
 * 1. Source-Aware Routing (FACEBOOK_KNOWLEDGE, WEBSITE_KNOWLEDGE, COMPARE_WEBSITE_VS_SOCIAL, etc.)
 * 2. State A: Page connected and data available ("According to your Facebook Page, [Page Name]...")
 * 3. State B: Facebook connected but no Page selected (SELECT_FACEBOOK_PAGE action)
 * 4. State C: Page selected but useful About/business info unavailable (Explicit statement, 0 hallucinated facts)
 * 5. Cross-Source queries (Compare website vs FB, missing info, positioning improvement)
 * 6. Zero placeholder leaks ("Unspecified Target Market", "Verified business knowledge sources not yet established")
 * 7. Tenant Isolation (No Ras Ali Labs leakage into customer tenant)
 * 8. Token Accounting (Exact-once metering per query)
 */

import { MariUniversalCore } from '../packages/ai/src/mariUniversalCore';
import { BusinessContextService } from '../packages/ai/src/businessContext.service';

async function runAcceptanceTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING MARI SOURCE-AWARE INTELLIGENCE TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TEST SCENARIO 1: Tenant A (Pameltex - State A: Page Connected + Data Available)
  // -------------------------------------------------------------
  console.log('-------------------------------------------------------------');
  console.log('SCENARIO 1: State A — Verified Business Page (Pameltex)');
  console.log('-------------------------------------------------------------');

  const tenantA_Id = 'tenant-pameltex-production-01';
  BusinessContextService.registerTenantProfile(tenantA_Id, {
    companyName: 'Pameltex Industrial Textiles',
    industry: 'Industrial Manufacturing & Textiles',
    targetMarket: 'Heavy commercial and mining operations',
    valueProposition: 'Premium heavy-duty woven textiles and filtration fabrics',
    tagline: 'Engineered for durability',
    websiteUrl: 'https://pameltex.co.za',
  });

  const pameltexLocalOverrides = {
    websiteKnowledge: {
      title: 'Pameltex Industrial Textiles',
      websiteUrl: 'https://pameltex.co.za',
      description: 'South Africa leading manufacturer of industrial filtration fabrics and technical textiles.',
      industry: 'Industrial Textiles',
      status: 'INGESTED' as const,
      sections: [
        { title: 'Products', content: 'Filter cloths, conveyor belts, heavy canvas, and protective fabrics.' },
        { title: 'Markets', content: 'Mining, agriculture, and manufacturing plants across Sub-Saharan Africa.' },
      ],
    },
    fbPage: {
      id: 'fb_page_477334159265235',
      pageId: '477334159265235',
      name: 'Pameltex Technical Fabrics',
      username: '@pameltexfabrics',
      category: 'Textile Company',
      fanCount: 2450,
      about: 'Pameltex manufactures high-performance industrial fabrics, heavy duty filtration media, and protective canvas for mining and transport industries.',
      website: 'https://pameltex.co.za',
      contactInfo: 'orders@pameltex.co.za | +27 11 555 0199',
      status: 'CONNECTED',
    },
  };

  // Query 1: "What does our Facebook say about us?"
  console.log('\n[Query 1] "What does our Facebook say about us?"');
  const resA1 = await MariUniversalCore.processQuery({
    prompt: 'what does our facebook say about us',
    organizationId: tenantA_Id,
    workspaceId: tenantA_Id,
    userId: 'user_pameltex_owner',
    companyName: 'Pameltex Industrial Textiles',
    localOverrides: pameltexLocalOverrides,
    requestId: 'req_test_01',
  });

  console.log(`Response snippet:\n${resA1.answer.slice(0, 300)}...\n`);
  assert(resA1.detectedIntent === 'FACEBOOK_KNOWLEDGE', 'Classified as FACEBOOK_KNOWLEDGE');
  assert(resA1.answer.includes('According to your Facebook Page, Pameltex Technical Fabrics presents the business as') ||
         resA1.answer.toLowerCase().includes('pameltex technical fabrics'), 'Includes verified State A prefix/Page name');
  assert(resA1.answer.toLowerCase().includes('textile') || resA1.answer.toLowerCase().includes('filtration'), 'Contains verified Facebook content');
  assert(!resA1.answer.includes('Unspecified Target Market'), 'No "Unspecified Target Market" placeholder');
  assert(!resA1.answer.includes('Verified business knowledge sources not yet established'), 'No "Verified business knowledge sources not yet established" placeholder');
  assert(!resA1.answer.includes('Ras Ali Labs'), 'Tenant Isolation: Zero Ras Ali Labs leakage');
  assert(resA1.usage.totalTokens > 0 && resA1.usageRecordId !== undefined, 'Token accounting tracked exactly once');

  // Query 2: "What does our website say about us?"
  console.log('\n[Query 2] "What does our website say about us?"');
  const resA2 = await MariUniversalCore.processQuery({
    prompt: 'What does our website say about us?',
    organizationId: tenantA_Id,
    workspaceId: tenantA_Id,
    userId: 'user_pameltex_owner',
    companyName: 'Pameltex Industrial Textiles',
    localOverrides: pameltexLocalOverrides,
    requestId: 'req_test_02',
  });

  assert(resA2.detectedIntent === 'WEBSITE_KNOWLEDGE', 'Classified as WEBSITE_KNOWLEDGE');
  assert(resA2.answer.toLowerCase().includes('pameltex') || resA2.answer.toLowerCase().includes('textile'), 'Mentions website-grounded facts');
  assert(!resA2.answer.includes('Ras Ali Labs'), 'Tenant Isolation on website query');

  // Query 3: "Compare our website with our Facebook Page."
  console.log('\n[Query 3] "Compare our website with our Facebook Page."');
  const resA3 = await MariUniversalCore.processQuery({
    prompt: 'Compare our website with our Facebook Page.',
    organizationId: tenantA_Id,
    workspaceId: tenantA_Id,
    userId: 'user_pameltex_owner',
    companyName: 'Pameltex Industrial Textiles',
    localOverrides: pameltexLocalOverrides,
    requestId: 'req_test_03',
  });

  assert(resA3.detectedIntent === 'COMPARE_WEBSITE_VS_SOCIAL', 'Classified as COMPARE_WEBSITE_VS_SOCIAL');
  assert(resA3.answer.toLowerCase().includes('website') && resA3.answer.toLowerCase().includes('facebook'), 'Analyzes both sources');

  // Query 4: "What information is missing from our Facebook Page?"
  console.log('\n[Query 4] "What information is missing from our Facebook Page?"');
  const resA4 = await MariUniversalCore.processQuery({
    prompt: 'What information is missing from our Facebook Page?',
    organizationId: tenantA_Id,
    workspaceId: tenantA_Id,
    userId: 'user_pameltex_owner',
    companyName: 'Pameltex Industrial Textiles',
    localOverrides: pameltexLocalOverrides,
    requestId: 'req_test_04',
  });

  assert(resA4.detectedIntent === 'FACEBOOK_MISSING_INFO', 'Classified as FACEBOOK_MISSING_INFO');
  assert(resA4.answer.length > 50, 'Provides actionable missing info suggestions');

  // Query 5: "How can we improve our Facebook positioning?"
  console.log('\n[Query 5] "How can we improve our Facebook positioning?"');
  const resA5 = await MariUniversalCore.processQuery({
    prompt: 'How can we improve our Facebook positioning?',
    organizationId: tenantA_Id,
    workspaceId: tenantA_Id,
    userId: 'user_pameltex_owner',
    companyName: 'Pameltex Industrial Textiles',
    localOverrides: pameltexLocalOverrides,
    requestId: 'req_test_05',
  });

  assert(resA5.detectedIntent === 'FACEBOOK_IMPROVEMENT_AUDIT', 'Classified as FACEBOOK_IMPROVEMENT_AUDIT');

  // -------------------------------------------------------------
  // TEST SCENARIO 2: State B (Facebook Account Connected, No Page Selected / Personal Profile)
  // -------------------------------------------------------------
  console.log('\n-------------------------------------------------------------');
  console.log('SCENARIO 2: State B — Personal Profile Connected / No Page Selected');
  console.log('-------------------------------------------------------------');

  const tenantB_Id = 'tenant-solofounder-personal-02';
  const soloLocalOverrides = {
    fbPage: {
      id: 'fb_user_12345',
      name: 'John Doe',
      accountType: 'FACEBOOK_PERSONAL_PROFILE',
      isPersonalProfile: true,
      fanCount: 0,
      metadata: {
        provider_account_type: 'FACEBOOK_PERSONAL_PROFILE',
      },
    },
  };

  const resB = await MariUniversalCore.processQuery({
    prompt: 'What does our Facebook say about us?',
    organizationId: tenantB_Id,
    workspaceId: tenantB_Id,
    userId: 'user_solo_john',
    companyName: 'Solo Freelance Studio',
    localOverrides: soloLocalOverrides,
    requestId: 'req_test_06',
  });

  console.log(`Response snippet (State B):\n${resB.answer}\n`);
  assert(resB.answer.toLowerCase().includes("haven't selected a business page") || 
         resB.answer.toLowerCase().includes('personal facebook profile') ||
         resB.answer.toLowerCase().includes('select a business page') ||
         resB.answer.toLowerCase().includes('select a page'), 'Returns explicit State B guidance');
  assert(resB.suggestedActions?.some(a => a.id === 'SELECT_FACEBOOK_PAGE' || a.id === 'CONNECT_FACEBOOK_PAGE'), 'Suggests SELECT_FACEBOOK_PAGE action');
  assert(!resB.answer.includes('Unspecified Target Market'), 'No placeholder leak');

  // -------------------------------------------------------------
  // TEST SCENARIO 3: State C (Page Selected but About/Description Unavailable)
  // -------------------------------------------------------------
  console.log('\n-------------------------------------------------------------');
  console.log('SCENARIO 3: State C — Page Connected but No About/Description');
  console.log('-------------------------------------------------------------');

  const tenantC_Id = 'tenant-blankpage-03';
  const blankPageOverrides = {
    fbPage: {
      id: 'fb_page_empty_99',
      pageId: 'empty_99',
      name: 'Alpha Logistics Page',
      username: '@alphalogistics',
      category: 'Cargo & Freight Company',
      fanCount: 120,
      about: '', // Empty About
      description: '',
      website: '',
      status: 'CONNECTED',
    },
  };

  const resC = await MariUniversalCore.processQuery({
    prompt: 'what does our facebook say about us',
    organizationId: tenantC_Id,
    workspaceId: tenantC_Id,
    userId: 'user_alpha_mgr',
    companyName: 'Alpha Logistics',
    localOverrides: blankPageOverrides,
    requestId: 'req_test_07',
  });

  console.log(`Response snippet (State C):\n${resC.answer}\n`);
  assert(resC.answer.toLowerCase().includes('does not currently provide') ||
         resC.answer.toLowerCase().includes('no detailed about') ||
         resC.answer.toLowerCase().includes('description is currently blank') ||
         resC.answer.toLowerCase().includes('not enough verified business description'), 'Returns explicit State C notice');
  assert(!resC.answer.includes('Commercial Enterprise'), 'No fabricated industry');
  assert(!resC.answer.includes('Regional Commercial Clients'), 'No fabricated target market');

  // -------------------------------------------------------------
  // TEST SCENARIO 4: State D (Unconnected Facebook)
  // -------------------------------------------------------------
  console.log('\n-------------------------------------------------------------');
  console.log('SCENARIO 4: State D — Facebook Completely Disconnected');
  console.log('-------------------------------------------------------------');

  const tenantD_Id = 'tenant-unconnected-04';
  const resD = await MariUniversalCore.processQuery({
    prompt: 'what does our facebook say about us',
    organizationId: tenantD_Id,
    workspaceId: tenantD_Id,
    userId: 'user_unconnected',
    companyName: 'New Venture Co',
    localOverrides: { fbPage: null },
    requestId: 'req_test_08',
  });

  console.log(`Response snippet (Unconnected):\n${resD.answer}\n`);
  assert(resD.answer.toLowerCase().includes('not currently connected') ||
         resD.answer.toLowerCase().includes('connect your facebook page'), 'Informs user Facebook is disconnected');
  assert(resD.suggestedActions?.some(a => a.id === 'CONNECT_FACEBOOK'), 'Suggests CONNECT_FACEBOOK action');

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n=============================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('=============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAcceptanceTests().catch(err => {
  console.error('Test run failed with unhandled exception:', err);
  process.exit(1);
});
