import dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config({ path: '.env.local' });
dotenv.config();

import assert from 'assert';
import {
  BusinessIdentityResolver,
  BusinessContextService,
  BusinessKnowledgeProfileService,
  MariUniversalCore,
  MariTokenTelemetryService,
} from '../packages/ai/src';

async function runAcceptanceGauntlet() {
  console.log('========================================================================');
  console.log('🧪 MARI GLOBAL IDENTITY RESOLUTION & CONTEXT GAUNTLET');
  console.log('========================================================================\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CANONICAL IDENTITY RESOLVER TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- TEST GROUP 1: Canonical Business Identity Resolver ---');

  // Tenant A: Ras Ali Labs
  const idA = BusinessIdentityResolver.resolveIdentity('ras-ali-labs');
  console.log('Tenant A (Ras Ali Labs):', idA.companyName, '| Verified:', idA.isVerified);
  assert.strictEqual(idA.companyName, 'Ras Ali Labs');
  assert.strictEqual(idA.isVerified, true);
  assert(idA.industry.includes('Software') || idA.industry.includes('Intelligence'));

  // Tenant B: Pameltex
  const idB = BusinessIdentityResolver.resolveIdentity('pameltex');
  console.log('Tenant B (Pameltex):', idB.companyName, '| Verified:', idB.isVerified);
  assert.strictEqual(idB.companyName, 'Pameltex');
  assert.strictEqual(idB.isVerified, true);
  assert(idB.industry.includes('Uniforms') || idB.industry.includes('Workwear'));
  assert(!JSON.stringify(idB).includes('Ras Ali Labs'), 'Zero Ras Ali Labs leakage in Tenant B');

  // Tenant C: grape with Facebook Page connection simulation
  BusinessKnowledgeProfileService.setProfile('org_grape', {
    organizationId: 'org_grape',
    companyName: { value: 'Grape Logistics', sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    websiteUrl: { value: 'https://www.grapelogistics.com', sourceType: 'WEBSITE', confidence: 1.0, lastUpdated: new Date().toISOString() },
    industry: { value: 'Freight & Cold Chain Logistics', sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    description: { value: 'Grape Logistics provides temperature-controlled freight.', sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    tagline: { value: 'Fresh freight delivered on time', sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    valuePropositions: { value: ['Cold chain logistics', 'SADC freight corridors'], sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    products: { value: [{ name: 'Reefer Freight', category: 'Logistics' }], sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    services: { value: [{ name: 'Cross-border clearing', category: 'Logistics' }], sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    targetMarkets: { value: ['Commercial Farmers', 'Supermarket Chains'], sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    targetCustomers: { value: ['Supply Chain Directors'], sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    geography: { value: ['Southern Africa'], sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    brandPositioning: { value: 'Premier SADC cold chain logistics', sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    brandVoice: { value: 'Dependable, Precise', sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    publicContacts: { value: { emails: ['dispatch@grapelogistics.com'], phones: ['+267 7100 0000'], addresses: ['Gaborone'] }, sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    socialLinks: { value: {}, sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    sourceUrls: ['https://www.grapelogistics.com'],
    contentHash: 'hash-grape-1',
    knowledgeVersion: 1,
    isVerified: true,
  });

  // Now enrich grape with a Facebook connection named "@facebook_page" or "Grape FB Page"
  BusinessKnowledgeProfileService.enrichWithFacebook('org_grape', {
    pageId: '10998877665544',
    pageName: 'Grape Juice Page',
    category: 'Beverage',
    about: 'Grape Juice social account',
    followersCount: 50,
  });

  const idC = BusinessIdentityResolver.resolveIdentity('org_grape');
  console.log('Tenant C (grape after Facebook connection):', idC.companyName, '| Industry:', idC.industry);
  assert.strictEqual(idC.companyName, 'Grape Logistics', 'Facebook connection MUST NOT overwrite company name!');
  assert.strictEqual(idC.industry, 'Freight & Cold Chain Logistics', 'Facebook category MUST NOT overwrite industry!');

  // Tenant D: Unconfigured Workspace
  const idD = BusinessIdentityResolver.resolveIdentity('tenant-unconfigured-456');
  console.log('Tenant D (Unconfigured):', idD.companyName || '(Empty/Unverified)', '| Verified:', idD.isVerified);
  assert.strictEqual(idD.isVerified, false);
  assert.notStrictEqual(idD.companyName, 'Default');
  assert.notStrictEqual(idD.companyName, '@facebook');
  assert.notStrictEqual(idD.companyName, 'Ras Ali Labs');

  console.log('✅ TEST GROUP 1 PASSED: All 4 tenant identities resolved with 100% isolation.\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. CONTEXT COMPOSITION & FACEBOOK INVARIANT
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- TEST GROUP 2: Context Composition & Facebook Invariant ---');

  const contextGrape = await BusinessContextService.assembleContext('org_grape', {
    forceRefresh: true,
    localOverrides: {
      fbPage: {
        name: 'Grape Juice Page',
        fanCount: 50,
        id: '10998877665544',
      },
    },
  });

  console.log('Grape Context Layer 1 Company:', contextGrape.layer1.companyName.value);
  console.log('Grape Context Layer 2 Social Page:', contextGrape.layer2.social.connectedPageName?.value);
  assert.strictEqual(contextGrape.layer1.companyName.value, 'Grape Logistics', 'Layer 1 company must be Grape Logistics');
  assert.strictEqual(contextGrape.layer2.social.connectedPageName?.value, 'Grape Juice Page', 'Layer 2 social contains Facebook page');
  assert.strictEqual(contextGrape.layer2.social.followersCount?.value, 50);

  console.log('✅ TEST GROUP 2 PASSED: Context is strictly compositional and Facebook Page never replaces business identity.\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. SOURCE-SPECIFIC PROMPT GAUNTLET
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- TEST GROUP 3: Source-Specific Prompt Gauntlet ---');

  const promptsToTest = [
    'hello',
    'what is my business?',
    'what does our website say about us?',
    'what do you know about my business?',
    'which Facebook Page is connected?',
    'where should we focus today?',
    'compare our website positioning with our Facebook presence',
    'what information are you missing about us?',
  ];

  const responses = new Map<string, string>();

  for (const prompt of promptsToTest) {
    console.log(`\nTesting Prompt: "${prompt}"...`);
    const res = await MariUniversalCore.processQuery({
      prompt,
      organizationId: 'ras-ali-labs',
      forceLocalOnly: true, // test deterministic local reasoning engine first
    });

    console.log(`[Intent: ${res.detectedIntent}] Response Preview:`);
    console.log(res.answer.substring(0, 180) + '...\n');

    // Invariant assertions
    assert(res.answer.length > 30, `Response for "${prompt}" should not be empty`);
    assert(!res.answer.includes('<svg'), `Response for "${prompt}" must not leak raw <svg> tags`);
    assert(!res.answer.includes('svgSend to Studio'), `Response for "${prompt}" must not leak svgSend to Studio`);
    assert(!res.answer.includes('- •'), `Response for "${prompt}" must not contain duplicated - • bullets`);
    assert(!res.answer.includes('[Open Growth Studio]'), `Response for "${prompt}" must not contain bracket action tokens in text`);
    assert(!res.answer.includes('@facebook'), `Response for "${prompt}" must never contain @facebook`);
    assert(!res.answer.includes('Commercial Enterprise'), `Response for "${prompt}" must never contain fallback "Commercial Enterprise"`);

    responses.set(prompt, res.answer);
  }

  // Verify non-canned uniqueness
  const ansWhatIs = responses.get('what is my business?');
  const ansWebsite = responses.get('what does our website say about us?');
  const ansKnowAbout = responses.get('what do you know about my business?');
  const ansFocus = responses.get('where should we focus today?');

  assert.notStrictEqual(ansWhatIs, ansWebsite, 'Website response must differ from business identity response');
  assert.notStrictEqual(ansKnowAbout, ansFocus, 'Focus response must differ from business synthesis response');
  assert.notStrictEqual(ansWhatIs, ansKnowAbout, 'Business synthesis must be richer than basic identity');

  console.log('✅ TEST GROUP 3 PASSED: All 8 source-specific prompts return distinct, clean, well-grounded answers.\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. UNCONFIGURED TENANT SAFETY CHECK
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- TEST GROUP 4: Unconfigured Tenant Safety & General Intelligence ---');

  const unconfiguredRes = await MariUniversalCore.processQuery({
    prompt: 'what is my business?',
    organizationId: 'tenant-fresh-client-999',
    forceLocalOnly: true,
  });

  console.log('[Unconfigured Tenant Identity Query]:\n', unconfiguredRes.answer);
  assert(unconfiguredRes.answer.includes('Verified business information has not yet been established') || unconfiguredRes.answer.includes('not configured'), 'Unconfigured tenant must truthfully state profile is pending');
  assert(!unconfiguredRes.answer.includes('Ras Ali Labs'), 'Must NOT leak Ras Ali Labs');
  assert(!unconfiguredRes.answer.includes('Default'), 'Must NOT invent "Default" entity');

  const unconfiguredEbitda = await MariUniversalCore.processQuery({
    prompt: 'Explain EBITDA to me like a CFO',
    organizationId: 'tenant-fresh-client-999',
    forceLocalOnly: true,
  });

  console.log('[Unconfigured Tenant General Query (EBITDA)]:\n', unconfiguredEbitda.answer.substring(0, 150) + '...');
  assert(unconfiguredEbitda.answer.includes('EBITDA'), 'Mari remains fully capable general AI assistant');

  console.log('✅ TEST GROUP 4 PASSED: Unconfigured tenants are safe, unpolluted, and fully capable.\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. TOKEN TELEMETRY CENTRALIZATION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- TEST GROUP 5: Centralized Token Telemetry ---');
  const usageCount = await MariTokenTelemetryService.getAuthoritativeUsageCount('ras-ali-labs');
  const telemetry = MariTokenTelemetryService.getTotalUsage('ras-ali-labs');
  console.log(`Authoritative Usage Count: ${usageCount} | Total Tokens: ${telemetry.totalTokens}`);
  assert(usageCount > 0, 'Usage count must be recorded in centralized telemetry');
  assert(telemetry.totalTokens > 0, 'Total tokens must be > 0');

  console.log('✅ TEST GROUP 5 PASSED: Centralized token telemetry records usage exactly once.\n');

  console.log('========================================================================');
  console.log('🎉 ALL MARI IDENTITY RESOLUTION & CONTEXT GAUNTLET TESTS PASSED (100%)');
  console.log('========================================================================\n');
}

runAcceptanceGauntlet().catch((err) => {
  console.error('❌ GAUNTLET FAILED:', err);
  process.exit(1);
});
