/**
 * Ralion OS — Tenant Business Onboarding + Website Knowledge Ingestion E2E Test Suite
 * Ras Ali Labs (Pty) Ltd
 */

import {
  WebsiteCrawlerService,
  BusinessKnowledgeProfileService,
  BusinessContextService,
  WebsiteIngestionService,
  callMariAiApi,
  PLATFORM_KNOWLEDGE,
} from '../packages/ai/src/index';

interface TestResult {
  section: string;
  testName: string;
  passed: boolean;
  expected: string;
  actual: string;
  evidence: string;
}

const results: TestResult[] = [];

function recordTest(
  section: string,
  testName: string,
  passed: boolean,
  expected: string,
  actual: string,
  evidence: string
) {
  results.push({ section, testName, passed, expected, actual, evidence });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${section}] ${status} | ${testName}`);
  console.log(`    ├─ Expected: ${expected}`);
  console.log(`    ├─ Actual:   ${actual}`);
  console.log(`    └─ Evidence: ${evidence}\n`);
}

async function runOnboardingWebsiteIngestionTests() {
  console.log('================================================================================');
  console.log('🌟 RALION OS — TENANT ONBOARDING & WEBSITE KNOWLEDGE INGESTION E2E SUITE');
  console.log('================================================================================\n');

  // ===========================================================================
  // SECTION 1: SSRF PROTECTION & CRAWLER SECURITY
  // ===========================================================================
  console.log('--- SECTION 1: SSRF Protection & Crawler Security ---');

  const dangerousUrls = [
    'http://localhost:3000',
    'http://127.0.0.1:8080/admin',
    'http://169.254.169.254/latest/meta-data', // AWS/GCP/Azure Cloud Metadata
    'http://10.0.0.1/internal',
    'http://192.168.1.1/router',
    'http://0.0.0.0',
  ];

  let allBlocked = true;
  const blockedDetails: string[] = [];

  for (const badUrl of dangerousUrls) {
    try {
      const safety = await WebsiteCrawlerService.verifyUrlSafety(badUrl);
      if (safety.safe) {
        allBlocked = false;
        blockedDetails.push(`${badUrl} was NOT blocked!`);
      } else {
        blockedDetails.push(`${badUrl} -> Blocked (${safety.reason})`);
      }
    } catch (e: any) {
      blockedDetails.push(`${badUrl} -> Blocked (${e.message})`);
    }
  }

  recordTest(
    'SEC 1: SSRF Security',
    'Private IP, Loopback & Cloud Metadata SSRF Rejection',
    allBlocked,
    'All dangerous and internal network URLs are rejected by SSRF guard',
    `${blockedDetails.length} vectors checked; all restricted`,
    blockedDetails.slice(0, 3).join('; ')
  );

  // ===========================================================================
  // SECTION 2: URL NORMALIZATION & VALIDATION
  // ===========================================================================
  console.log('--- SECTION 2: URL Normalization & Validation ---');

  const normalized1 = WebsiteCrawlerService.normalizeUrl('www.foundationsacademy.org');
  const normalized2 = WebsiteCrawlerService.normalizeUrl('https://example.com/about/');
  
  const normValid = normalized1 === 'https://www.foundationsacademy.org' && normalized2 === 'https://example.com/about';

  recordTest(
    'SEC 2: URL Normalization',
    'Automatic HTTPS Protocol & Path Normalization',
    normValid,
    'Accepts www.domain.com and normalizes to https://www.domain.com without trailing slash',
    `Normalized 1: ${normalized1} | Normalized 2: ${normalized2}`,
    'Normalized URL validated.'
  );

  // ===========================================================================
  // SECTION 3: REAL USER 2 WEBSITE INGESTION (NO FACEBOOK)
  // ===========================================================================
  console.log('--- SECTION 3: Real User 2 Website Ingestion ---');

  const TENANT_USER2 = {
    organizationId: 'org_foundations_academy',
    companyName: 'Foundations Academy',
    websiteUrl: 'https://www.foundationsacademy.org',
    industry: 'Education & Leadership Development',
    country: 'Botswana',
  };

  // Ingest User 2 website
  const user2Profile = await BusinessKnowledgeProfileService.ingestWebsiteForTenant(
    TENANT_USER2.organizationId,
    TENANT_USER2.websiteUrl,
    {
      overrideName: TENANT_USER2.companyName,
      overrideIndustry: TENANT_USER2.industry,
    }
  );

  // Assemble business context for User 2
  const contextUser2 = await BusinessContextService.assembleContext(TENANT_USER2.organizationId, { forceRefresh: true });

  const user2Learned =
    contextUser2.layer1.companyName.value === 'Foundations Academy' &&
    contextUser2.layer1.industry.value === 'Education & Leadership Development' &&
    contextUser2.layer1.websiteUrl?.value === 'https://www.foundationsacademy.org' &&
    contextUser2.layer1.companyName.provenance === 'VERIFIED';

  recordTest(
    'SEC 3: Website Ingestion',
    'User 2 Website Ingestion & Structured Knowledge Assembly',
    user2Learned,
    'User 2 website ingested into Layer 1 with verified provenance without Facebook connection',
    `Org: ${contextUser2.layer1.companyName.value}, Industry: ${contextUser2.layer1.industry.value}, Provenance: ${contextUser2.layer1.companyName.provenance}`,
    'Website knowledge successfully structured into tenant profile.'
  );

  // ===========================================================================
  // SECTION 4: MARI AI ANSWERS USER 2 BEFORE FACEBOOK LOGIN
  // ===========================================================================
  console.log('--- SECTION 4: Mari AI Answers User 2 Before Facebook Login ---');

  // Query: What does my business do?
  const resWhatWeDo = await callMariAiApi('What does my business do?', undefined, contextUser2);
  const knowsUser2 = Boolean(
    resWhatWeDo?.text.includes('Foundations Academy') &&
    (resWhatWeDo?.text.includes('Education') || resWhatWeDo?.text.includes('Leadership')) &&
    !resWhatWeDo?.text.includes('Ras Ali Labs')
  );

  recordTest(
    'SEC 4: Mari Intelligence',
    'Mari Answers "What does my business do?" Using Website-Derived Knowledge',
    knowsUser2,
    'Mari answers strictly using Foundations Academy education knowledge with zero Ras Ali Labs bleeding',
    `Mari Response: "${resWhatWeDo?.text.split('\n')[2] || resWhatWeDo?.text.substring(0, 80)}"`,
    'Mari grounded in User 2 website knowledge.'
  );

  // Query: What services do we provide?
  const resServices = await callMariAiApi('What services do we provide?', undefined, contextUser2);
  const knowsServices = Boolean(
    resServices?.text.includes('Foundations Academy') &&
    !resServices?.text.includes('Ras Ali Labs')
  );

  recordTest(
    'SEC 4: Mari Services',
    'Mari Answers "What services do we provide?" with Website Catalog',
    knowsServices,
    'Mari lists services derived from Foundations Academy without referencing other companies',
    `Mari Response: "${resServices?.text.split('\n')[6] || resServices?.text.substring(0, 80)}"`,
    'Services correctly extracted and cited.'
  );

  // ===========================================================================
  // SECTION 5: HOSTILE CROSS-TENANT RECONNAISSANCE DENIAL
  // ===========================================================================
  console.log('--- SECTION 5: Hostile Cross-Tenant Reconnaissance Denial ---');

  // User 2 asks about Ras Ali Labs
  const resUser2AskRasAli = await callMariAiApi('What do you know about Ras Ali Labs?', undefined, contextUser2);
  const user2BlockedFromRasAli = Boolean(
    resUser2AskRasAli?.text.includes('No Ras Ali Labs information available') ||
    resUser2AskRasAli?.text.includes('only maintain verified intelligence for Foundations Academy')
  );

  recordTest(
    'SEC 5: Cross-Reconnaissance',
    'User 2 Hostile Query Denial ("What do you know about Ras Ali Labs?")',
    user2BlockedFromRasAli,
    '"No Ras Ali Labs information available. I only maintain verified intelligence for Foundations Academy."',
    `Mari Response: "${resUser2AskRasAli?.text}"`,
    'Cross-tenant reconnaissance strictly blocked.'
  );

  // Ras Ali Labs asks about Foundations Academy
  const contextRasAli = await BusinessContextService.assembleContext('ras-ali-labs', { forceRefresh: true });
  const resRasAliAskUser2 = await callMariAiApi('What do you know about Foundations Academy?', undefined, contextRasAli);
  const rasAliBlockedFromUser2 = Boolean(
    resRasAliAskUser2?.text.includes('No Foundations Academy information available') ||
    resRasAliAskUser2?.text.includes('only maintain verified intelligence for Ras Ali Labs')
  );

  recordTest(
    'SEC 5: Cross-Reconnaissance',
    'Ras Ali Labs Hostile Query Denial ("What do you know about Foundations Academy?")',
    rasAliBlockedFromUser2,
    '"No Foundations Academy information available. I only maintain verified intelligence for Ras Ali Labs."',
    `Mari Response: "${resRasAliAskUser2?.text}"`,
    'Cross-tenant reconnaissance strictly blocked.'
  );

  // ===========================================================================
  // SECTION 6: UNVERIFIED / EMPTY TENANT STRICT FALLBACK
  // ===========================================================================
  console.log('--- SECTION 6: Unverified / Empty Tenant Strict Fallback ---');

  const contextEmpty = await BusinessContextService.assembleContext('org_brand_new_unconfigured', { forceRefresh: true });
  const resEmptyTenant = await callMariAiApi('What does my business do?', undefined, contextEmpty);

  const emptyStrictlyGuarded = Boolean(
    resEmptyTenant?.text.includes("I don't have enough verified information about your business yet") &&
    !resEmptyTenant?.text.includes('Ras Ali Labs')
  );

  recordTest(
    'SEC 6: Unverified Tenant Guard',
    'Empty Organization Receives "Add Website" Prompt (Zero Ras Ali Labs Fallback)',
    emptyStrictlyGuarded,
    '"I don\'t have enough verified information about your business yet. Add your website or complete your Business Profile and I\'ll learn from it."',
    `Mari Response: "${resEmptyTenant?.text}"`,
    'Zero fallback contamination.'
  );

  // ===========================================================================
  // SECTION 7: PLATFORM KNOWLEDGE VS TENANT KNOWLEDGE NAMESPACES
  // ===========================================================================
  console.log('--- SECTION 7: Platform Knowledge vs Tenant Knowledge ---');

  // Empty tenant asking platform knowledge: "What is Ralion OS?"
  const resPlatform = await callMariAiApi('What is Ralion OS and what modules are available?', undefined, contextEmpty);
  const platformAvailable = Boolean(
    resPlatform?.text.includes('Ralion OS') &&
    resPlatform?.text.includes('CRM & Sales Pipeline') &&
    resPlatform?.text.includes('Growth Studio')
  );

  recordTest(
    'SEC 7: Platform KB Namespace',
    'Global PLATFORM_KNOWLEDGE Accessible to Unconfigured Tenants',
    platformAvailable,
    'Platform documentation, module capabilities, and support links answered globally',
    `Response: "${resPlatform?.text.split('\n')[2]}"`,
    'Platform knowledge accessible across all tenants.'
  );

  // ===========================================================================
  // SECTION 8: PROGRESSIVE ENRICHMENT (WEBSITE + FACEBOOK MERGE)
  // ===========================================================================
  console.log('--- SECTION 8: Progressive Enrichment (Website + Facebook Merge) ---');

  // Enrich User 2 with a connected Facebook page
  BusinessKnowledgeProfileService.enrichWithFacebook(TENANT_USER2.organizationId, {
    pageId: 'page_foundations_academy_101',
    pageName: 'Foundations Academy Official',
    category: 'Educational Organization',
    followersCount: 1420,
    about: 'Inspiring future African leaders through STEM education and values-based curriculum.',
  });

  const enrichedContextUser2 = await BusinessContextService.assembleContext(TENANT_USER2.organizationId, {
    forceRefresh: true,
    localOverrides: {
      fbPage: {
        pageId: 'page_foundations_academy_101',
        pageName: 'Foundations Academy Official',
        followersCount: 1420,
      },
    },
  });

  const profileAfterFacebook = BusinessKnowledgeProfileService.getProfile(TENANT_USER2.organizationId);

  const progressiveMergeSuccessful = Boolean(
    profileAfterFacebook?.websiteUrl.value === 'https://www.foundationsacademy.org' &&
    profileAfterFacebook?.websiteUrl.sourceType === 'WEBSITE' &&
    profileAfterFacebook?.socialLinks.value.facebook?.includes('page_foundations_academy_101') &&
    profileAfterFacebook?.socialLinks.sourceType === 'FACEBOOK'
  );

  recordTest(
    'SEC 8: Progressive Enrichment',
    'Facebook Intelligence Merged Without Overwriting Website Knowledge',
    progressiveMergeSuccessful,
    'Website URL retained as WEBSITE source; Facebook page added as FACEBOOK source',
    `Website: ${profileAfterFacebook?.websiteUrl.value} (${profileAfterFacebook?.websiteUrl.sourceType}) | FB: ${profileAfterFacebook?.socialLinks.value.facebook} (${profileAfterFacebook?.socialLinks.sourceType})`,
    'Progressive multi-source provenance maintained.'
  );

  // ===========================================================================
  // SECTION 9: FINAL SUMMARY MATRIX
  // ===========================================================================
  console.log('================================================================================');
  console.log('📊 ONBOARDING & WEBSITE INGESTION VALIDATION SUMMARY:');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Failed: ${failed}/${total}`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runOnboardingWebsiteIngestionTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
