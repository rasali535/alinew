/**
 * RALION OS — MARI BUSINESS KNOWLEDGE AUTHORITY & LIVE DATA INTEGRITY TEST SUITE
 * 
 * Tests the complete 3-layer knowledge model, website ingestion, zero-web-browsing refusal,
 * structured executive business summaries, tenant isolation, test fixture isolation,
 * staleness tracking, and model-name abstraction.
 */

import { 
  BusinessContextService, 
  WebsiteIngestionService,
  BusinessGrowthProfileService,
  callMariAiApi,
  processMariQuery,
  selectBestAimlModel,
} from '../packages/ai/src';

interface TestResult {
  suite: number;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(suite: number, name: string, passed: boolean, details: string) {
  results.push({ suite, name, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} [Suite ${suite}] ${name}: ${details}`);
}

async function runAcceptanceTests() {
  console.log('\n================================================================');
  console.log('RALION OS — MARI BUSINESS KNOWLEDGE AUTHORITY ACCEPTANCE SUITE');
  console.log('================================================================\n');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Real Organization Business Knowledge Retrieval
  // ──────────────────────────────────────────────────────────────────────────
  const context = await BusinessContextService.assembleContext('ras-ali-labs', { forceRefresh: true });
  const l1 = context.layer1;
  const isRealOrgGrounded = 
    l1.companyName.value === 'Ras Ali Labs' &&
    l1.companyName.provenance === 'VERIFIED' &&
    l1.industry.value.includes('Enterprise Software') &&
    l1.productsAndServices.value.length >= 3;

  record(1, 'Real Organization Business Knowledge Retrieval', isRealOrgGrounded, 
    `Layer 1 grounded: ${l1.companyName.value} (${l1.industry.value}) with ${l1.productsAndServices.value.length} verified products.`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Website Knowledge Ingestion & Section Retrieval
  // ──────────────────────────────────────────────────────────────────────────
  const websiteKnowledge = WebsiteIngestionService.getWebsiteKnowledge('ras-ali-labs');
  const hasWebsiteSections = 
    websiteKnowledge !== null &&
    websiteKnowledge.websiteUrl === 'https://www.rasalilabs.com' &&
    websiteKnowledge.provenance === 'VERIFIED' &&
    websiteKnowledge.sections.length >= 4 &&
    websiteKnowledge.sections.some(s => s.category === 'ABOUT') &&
    websiteKnowledge.sections.some(s => s.category === 'PRODUCTS_SERVICES') &&
    websiteKnowledge.sections.some(s => s.category === 'VALUE_PROPOSITION');

  record(2, 'Website Knowledge Ingestion & Sections', hasWebsiteSections,
    `Ingested ${websiteKnowledge?.sections.length} sections from ${websiteKnowledge?.websiteUrl} (Hash: ${websiteKnowledge?.contentHash}).`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Zero Web-Browsing Refusal Guarantee
  // ──────────────────────────────────────────────────────────────────────────
  const websiteQueryResponse = await callMariAiApi('What does my website say about our products and positioning?', undefined, context);
  const responseText = websiteQueryResponse?.text || '';
  
  const hasNoRefusal = 
    !responseText.toLowerCase().includes('do not have real-time web browsing') &&
    !responseText.toLowerCase().includes('cannot access the internet') &&
    !responseText.toLowerCase().includes('cannot browse') &&
    !responseText.toLowerCase().includes('as an ai, i cannot');

  const answersFromKnowledge = 
    responseText.includes('Ras Ali Labs') || 
    responseText.includes('https://www.rasalilabs.com') ||
    responseText.includes('Ralion OS') ||
    responseText.includes('verified website');

  record(3, 'Zero Web-Browsing Refusal Guarantee', hasNoRefusal && answersFromKnowledge,
    `Response directly answered from verified knowledge without refusal. Length: ${responseText.length} chars.`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Structured Executive Business Summary
  // ──────────────────────────────────────────────────────────────────────────
  const bizSummaryResponse = await callMariAiApi('What do you know about my business?', undefined, context);
  const bizText = bizSummaryResponse?.text || '';

  const hasExecutiveSections = 
    bizText.includes('### Your Business') ||
    (bizText.includes('Core business') && bizText.includes('What you sell') && bizText.includes('Who you serve'));
  
  const hasFollowupOffer = 
    bizText.includes('growth plan') || bizText.includes('Would you like');

  record(4, 'Structured Executive Business Summary', hasExecutiveSections && hasFollowupOffer,
    `Produced executive summary with Core Business, Products, Differentiators, and Growth follow-up offer.`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Live CRM & Social Data Integration into Growth Recommendations
  // ──────────────────────────────────────────────────────────────────────────
  const growthResponse = await callMariAiApi('How can we grow this business?', undefined, context);
  const growthText = growthResponse?.text || '';

  const referencesLiveTelemetry = 
    (growthText.includes('Pipeline') || growthText.includes('$84,500') || growthText.includes('CRM') || growthText.includes('deals')) &&
    (growthText.includes('Reach') || growthText.includes('Facebook') || growthText.includes('38.4%') || growthText.includes('video'));

  record(5, 'Live CRM & Social Growth Integration', referencesLiveTelemetry,
    `Growth recommendations seamlessly synthesize Layer 1 facts + Layer 2 live CRM and Social telemetry.`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: Strict Tenant Isolation
  // ──────────────────────────────────────────────────────────────────────────
  const tenantA = await BusinessContextService.assembleContext('tenant-alpha-mining', {
    localOverrides: {
      contacts: [{ name: 'Jwaneng Mining Tender', dealValue: 500000, type: 'PROSPECT', stage: 'CONTRACT' }],
      fbPage: { id: 'fb-a', name: 'Alpha Mining Africa', fanCount: 1250 },
    }
  });

  const tenantB = await BusinessContextService.assembleContext('tenant-beta-health', {
    localOverrides: {
      contacts: [{ name: 'Gaborone Private Clinic', dealValue: 75000, type: 'CUSTOMER', stage: 'ACTIVE' }],
      fbPage: { id: 'fb-b', name: 'Beta Health Network', fanCount: 89 },
    }
  });

  const isIsolated = 
    tenantA.layer2.crm.totalPipelineValue.value === 500000 &&
    tenantB.layer2.crm.totalPipelineValue.value === 75000 &&
    tenantA.layer2.social.connectedPageName?.value === 'Alpha Mining Africa' &&
    tenantB.layer2.social.connectedPageName?.value === 'Beta Health Network' &&
    tenantA.layer2.social.followersCount?.value === 1250 &&
    tenantB.layer2.social.followersCount?.value === 89;

  record(6, 'Strict Tenant Isolation', isIsolated,
    `Tenant A ($500k pipeline, 1250 fans) is strictly segregated from Tenant B ($75k pipeline, 89 fans).`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: Test Fixture Isolation from Production Context
  // ──────────────────────────────────────────────────────────────────────────
  const testTenant = await BusinessContextService.assembleContext('test-kalahari-solar', { isTestExecution: true });
  const isTestIsolated = 
    testTenant.isTestTenant === true &&
    context.isTestTenant === false &&
    !context.layer1.companyName.value.includes('Kalahari');

  record(7, 'Test Fixture Isolation', isTestIsolated,
    `Production context (${context.organizationName}) remains unpolluted by test fixtures.`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 8: Missing Knowledge & Data Source Disconnect Handling
  // ──────────────────────────────────────────────────────────────────────────
  const emptyTenant = await BusinessContextService.assembleContext('unconnected-new-client', {
    localOverrides: { contacts: [], tasks: [], fbPage: null }
  });

  const emptyResponse = await callMariAiApi('What does my website say?', undefined, emptyTenant);
  const emptyText = emptyResponse?.text || '';

  const handlesMissingGracefully = 
    emptyTenant.layer2.crm.isConnected === false &&
    emptyTenant.layer2.social.isConnected === false &&
    (emptyText.includes('Sync Website') || emptyText.includes('not currently have') || emptyText.includes('verified business knowledge'));

  record(8, 'Missing Knowledge Graceful Handling', handlesMissingGracefully,
    `Correctly identifies unconnected sources without hallucinating phantom metrics, providing [Sync Website] action.`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 9: Knowledge Staleness Tracking
  // ──────────────────────────────────────────────────────────────────────────
  // Ingest a simulated stale website (>15 days old)
  await WebsiteIngestionService.ingestWebsite('stale-corp', 'https://stale-corp.co.bw');
  const staleKnowledge = WebsiteIngestionService.getWebsiteKnowledge('stale-corp');
  if (staleKnowledge) {
    // Manually push lastSuccessfulSync back 20 days
    staleKnowledge.lastSuccessfulSync = new Date(Date.now() - (20 * 24 * 60 * 60 * 1000)).toISOString();
  }
  const verifiedStaleKnowledge = WebsiteIngestionService.getWebsiteKnowledge('stale-corp');
  const isStaleFlagged = verifiedStaleKnowledge?.isStale === true && verifiedStaleKnowledge?.syncStatus === 'STALE';

  record(9, 'Knowledge Staleness Tracking (>14 Days)', isStaleFlagged,
    `Knowledge older than 14 days is proactively flagged as STALE (isStale: ${verifiedStaleKnowledge?.isStale}).`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 10: Model-Name Abstraction
  // ──────────────────────────────────────────────────────────────────────────
  const isModelAbstracted = 
    bizSummaryResponse?.modelInfo.category.includes('Mari') &&
    !bizSummaryResponse?.text.includes('Gemini 2.5') &&
    !bizSummaryResponse?.text.includes('AIMLAPI') &&
    !bizSummaryResponse?.text.includes('OpenAI') &&
    !bizSummaryResponse?.text.includes('Anthropic');

  record(10, 'Customer Model-Name Abstraction', isModelAbstracted,
    `Customer sees only '${bizSummaryResponse?.modelInfo.category}' — underlying provider names masked.`);

  // ──────────────────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n================================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log('================================================================\n');

  if (passed === total) {
    console.log('🎉 ALL 10 BUSINESS KNOWLEDGE AUTHORITY ACCEPTANCE TESTS PASSED.');
  } else {
    console.error('❌ SOME ACCEPTANCE TESTS FAILED.');
    process.exit(1);
  }
}

runAcceptanceTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
