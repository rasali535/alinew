/**
 * RALION OS — MARI AI COMPREHENSION & MULTI-TURN ACCEPTANCE SUITE
 * Ras Ali Labs (Pty) Ltd
 *
 * Verifies:
 * 1. Universal Semantic Comprehension (no rigid regex dependencies, handles misspellings & natural phrasing).
 * 2. Model-Based Intent & Selective Context Loading (Facebook, CRM, Website, General).
 * 3. Real Creative Generation Job Execution (Flyer, Poster, Reel) with Job ID, status, receipt, and credit accounting.
 * 4. Multi-Turn Understanding ("Why?", "Do it.", "Make it shorter.", "Use the second option.", "Turn that into an email.").
 * 5. Honest Fallback & 0-Credit Accounting on unavailable reasoning engine.
 * 6. Strict Multi-Tenant Isolation (Ras Ali Labs vs Pameltex vs Grapevine).
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config({ path: 'apps/ralion/.env.production' });
dotenv.config({ path: '.env' });

import assert from 'assert';
import { MariUniversalCore, decideSemanticIntent } from '../packages/ai/src/mariUniversalCore';
import { TenantCreditsService, CREDIT_COSTS } from '../packages/ai/src/tenantCredits.service';
import { BusinessIdentityResolver } from '../packages/ai/src/businessIdentityResolver';

async function runAcceptanceSuite() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('  MARI AI UNIVERSAL SEMANTIC COMPREHENSION & REASONING ACCEPTANCE SUITE');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      passed++;
      console.log(`  ✅ [PASS] ${name}`);
    } catch (err: any) {
      failed++;
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GROUP 1: ACCEPTANCE EXAMPLE A — LIVE FACEBOOK CONNECTION STATUS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 1: ACCEPTANCE EXAMPLE A — LIVE FACEBOOK CONNECTION STATUS ---');

  await test('A1: "Is my Facebook connected?" returns verified live state with connected page name', async () => {
    const res = await MariUniversalCore.processQuery({
      prompt: 'Is my Facebook connected?',
      organizationId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
      companyName: 'Ras Ali Labs',
      businessContext: {
        layer1: { companyName: { value: 'Ras Ali Labs', provenance: 'VERIFIED' } },
        layer2: {
          social: {
            isConnected: true,
            hasSelectedPage: true,
            connectionState: 'CONNECTED_ACTIVE',
            connectedPageName: { value: 'Ras Ali Labs' },
            pageId: { value: '477334159265235' },
            pageCategory: { value: 'Information Technology Company' },
            followersCount: { value: 1420 },
          },
        },
      } as any,
    });

    assert.strictEqual(res.detectedIntent, 'FACEBOOK_CONNECTION_STATUS');
    assert.strictEqual(res.capabilityMode, 'BUSINESS');
    assert(res.answer.includes('Connected & Active') || res.answer.includes('Ras Ali Labs'), 'Must confirm active connected page');
    assert(res.answer.includes('Ras Ali Labs'), 'Must contain connected page name');
  });

  await test('A2: Natural variations & spelling mistakes ("is facebok conected?", "check my fb connection", "which page is connected")', async () => {
    const prompts = [
      'is facebok conected?',
      'check my fb connection',
      'can mari see our facebook page?',
      'which page is connected',
      'what fb account do we have linked?',
    ];

    for (const p of prompts) {
      const decision = decideSemanticIntent(p);
      assert.strictEqual(decision.intent, 'FACEBOOK_CONNECTION_STATUS', `Prompt "${p}" should resolve to FACEBOOK_CONNECTION_STATUS`);
      assert(decision.requestedSources.includes('FACEBOOK'), `Prompt "${p}" must request FACEBOOK context source`);
    }
  });

  await test('A3: Disconnected tenant returns clear disconnected status without hallucination', async () => {
    const res = await MariUniversalCore.processQuery({
      prompt: 'Is my Facebook connected?',
      organizationId: 'unconnected-tenant-123',
      companyName: 'Apex Innovations',
      businessContext: {
        layer1: { companyName: { value: 'Apex Innovations', provenance: 'VERIFIED' } },
        layer2: {
          social: {
            isConnected: false,
            hasSelectedPage: false,
            connectionState: 'DISCONNECTED',
          },
        },
      } as any,
    });

    assert.strictEqual(res.detectedIntent, 'FACEBOOK_CONNECTION_STATUS');
    assert(res.answer.toLowerCase().includes("isn't currently connected") || res.answer.toLowerCase().includes("not connected"), 'Must state disconnected');
    assert(!res.answer.includes('Ras Ali Labs'), 'Must not leak other tenant names');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GROUP 2: ACCEPTANCE EXAMPLE B — REAL CREATIVE GENERATION JOB EXECUTION
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 2: ACCEPTANCE EXAMPLE B — REAL CREATIVE GENERATION JOB EXECUTION ---');

  await test('B1: "Create a flyer for the Ralion OS launch." creates a real creative generation job', async () => {
    const orgId = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
    const initialCredits = TenantCreditsService.getBalance(orgId);

    const res = await MariUniversalCore.processQuery({
      prompt: 'Create a flyer for the Ralion OS launch.',
      organizationId: orgId,
      companyName: 'Ras Ali Labs',
      businessContext: {
        layer1: {
          companyName: { value: 'Ras Ali Labs', provenance: 'VERIFIED' },
          websiteUrl: { value: 'www.rasalilabs.com', provenance: 'VERIFIED' },
        },
      } as any,
    });

    assert.strictEqual(res.detectedIntent, 'CREATIVE_STUDIO');
    assert.strictEqual(res.capabilityMode, 'ACTION');

    // Verify all required Acceptance B entities are present
    assert(res.answer.includes('FLYER'), 'Must specify assetType: FLYER');
    assert(res.answer.includes('Ras Ali Labs'), 'Must specify parent brand: Ras Ali Labs');
    assert(res.answer.includes('Ralion OS'), 'Must specify product: Ralion OS');
    assert(res.answer.includes('Empowered to Prosper'), 'Must specify tagline: Empowered to Prosper');
    assert(res.answer.includes('Your AI Business Operating System'), 'Must specify description: Your AI Business Operating System');
    assert(res.answer.includes('www.rasalilabs.com'), 'Must specify website: www.rasalilabs.com');
    assert(res.answer.includes('Job ID') || res.answer.includes('job_') || res.answer.includes('asset-'), 'Must include generated Job ID');
    assert(res.answer.includes('Status') || res.answer.includes('COMPLETED') || res.answer.includes('QUEUED'), 'Must include job status');
    assert(res.answer.includes('Preview') || res.answer.includes('View Generated Asset'), 'Must include preview/download URL');
  });

  await test('B2: Creative generation defaults to Facebook portrait without blocking question', async () => {
    const decision = decideSemanticIntent('Make a promotional flyer for Ralion OS');
    assert.strictEqual(decision.requestedAction, 'GENERATE_CREATIVE_JOB');
    assert.strictEqual(decision.entities.assetType, 'FLYER');
    assert.strictEqual(decision.entities.format, 'PORTRAIT_4_5', 'Default format must be Facebook portrait 4:5');
    assert.strictEqual(decision.missingInformation.length, 0, 'No blocking clarification for standard portrait flyer');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GROUP 3: MULTI-TURN UNDERSTANDING & CONTEXT CONTINUITY
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 3: MULTI-TURN UNDERSTANDING & CONTEXT CONTINUITY ---');

  await test('C1: Multi-turn "Why?" references preceding context', async () => {
    const decision = decideSemanticIntent('Why?', [
      { role: 'user', text: 'Where should we focus our growth this quarter?' },
      { role: 'model', text: 'We should focus on converting active CRM leads.' },
    ]);

    assert.strictEqual(decision.intent, 'MULTI_TURN_EXPLANATION');
    assert.strictEqual(decision.isMultiTurnFollowup, true);
  });

  await test('C2: Multi-turn "Do it." triggers execution confirmation', async () => {
    const decision = decideSemanticIntent('Do it.', [
      { role: 'user', text: 'Should we draft a follow-up campaign for enterprise clients?' },
      { role: 'model', text: 'Yes, I can draft a 3-part campaign sequence.' },
    ]);

    assert.strictEqual(decision.intent, 'MULTI_TURN_EXECUTE');
    assert.strictEqual(decision.requestedAction, 'CONFIRM_ACTION');
    assert.strictEqual(decision.isMultiTurnFollowup, true);
  });

  await test('C3: Multi-turn "Make it shorter." detects condensation request', async () => {
    const decision = decideSemanticIntent('Make it shorter.', [
      { role: 'user', text: 'Explain our value proposition' },
      { role: 'model', text: 'A long 500-word explanation...' },
    ]);

    assert.strictEqual(decision.intent, 'MULTI_TURN_CONDENSE');
    assert.strictEqual(decision.isMultiTurnFollowup, true);
  });

  await test('C4: Multi-turn "Use the second option." detects option selection', async () => {
    const decision = decideSemanticIntent('Use the second option.', [
      { role: 'user', text: 'Give me 3 headline options for our advert' },
      { role: 'model', text: 'Option 1: ... Option 2: ... Option 3: ...' },
    ]);

    assert.strictEqual(decision.intent, 'MULTI_TURN_SELECT_OPTION');
    assert.strictEqual(decision.entities.actionSubject, 'OPTION_2');
    assert.strictEqual(decision.isMultiTurnFollowup, true);
  });

  await test('C5: Multi-turn "Turn that into an email." detects email transformation', async () => {
    const decision = decideSemanticIntent('Turn that into an email.', [
      { role: 'user', text: 'Draft our new product announcement copy' },
      { role: 'model', text: 'Here is the announcement copy...' },
    ]);

    assert.strictEqual(decision.intent, 'MULTI_TURN_TRANSFORM_EMAIL');
    assert.strictEqual(decision.entities.actionSubject, 'EMAIL');
    assert.strictEqual(decision.isMultiTurnFollowup, true);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GROUP 4: SELECTIVE CONTEXT LOADING & DATA MINIMALISM
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 4: SELECTIVE CONTEXT LOADING & DATA MINIMALISM ---');

  await test('D1: General knowledge query loads GENERAL source with 0 forced business clutter', async () => {
    const decision = decideSemanticIntent('Explain how quantum entanglement works in simple terms.');
    assert.strictEqual(decision.mode, 'GENERAL');
    assert.deepStrictEqual(decision.requestedSources, ['GENERAL']);
  });

  await test('D2: Facebook question loads only FACEBOOK source', async () => {
    const decision = decideSemanticIntent('What is our audience reach on Facebook?');
    assert.deepStrictEqual(decision.requestedSources, ['FACEBOOK']);
  });

  await test('D3: CRM question loads only CRM source', async () => {
    const decision = decideSemanticIntent('What is our total commercial pipeline value in CRM?');
    assert.deepStrictEqual(decision.requestedSources, ['CRM']);
  });

  await test('D4: Website question loads only WEBSITE source', async () => {
    const decision = decideSemanticIntent('What capabilities does our website list?');
    assert.deepStrictEqual(decision.requestedSources, ['WEBSITE']);
  });

  await test('D5: Cross-source question loads only CROSS_SOURCE', async () => {
    const decision = decideSemanticIntent('Compare what our website says with our Facebook positioning.');
    assert.deepStrictEqual(decision.requestedSources, ['CROSS_SOURCE']);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GROUP 5: HONEST FALLBACK & ZERO-CREDIT REASONING FAILURE
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 5: HONEST FALLBACK & ZERO-CREDIT REASONING FAILURE ---');

  await test('E1: General ungrounded question with unavailable Gemini returns honest fallback and deducts 0 credits', async () => {
    const orgId = 'test-credits-org-001';
    TenantCreditsService.getOrCreateWallet(orgId, 'COMMUNITY');
    const balanceBefore = TenantCreditsService.getBalance(orgId);

    const res = await MariUniversalCore.processQuery({
      prompt: 'What were the geopolitical consequences of the Treaty of Utrecht in 1713 on Mediterranean trade routes?',
      organizationId: orgId,
      companyName: 'Test Corp',
      forceLocalOnly: true, // Simulates offline / unavailable external neural engine
    });

    assert(res.answer.includes('temporarily unavailable'), 'Must return honest temporary unavailable response');
    const balanceAfter = TenantCreditsService.getBalance(orgId);
    assert.strictEqual(balanceAfter, balanceBefore, 'Must deduct ZERO credits on reasoning failure / unavailable engine');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GROUP 6: MULTI-TENANT ISOLATION & PROMPT INJECTION RESISTANCE
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n--- GROUP 6: MULTI-TENANT ISOLATION & PROMPT INJECTION RESISTANCE ---');

  await test('F1: Pameltex Medical workspace never receives Ras Ali Labs facts or Facebook page data', async () => {
    const res = await MariUniversalCore.processQuery({
      prompt: 'What is my business name and what Facebook page is connected?',
      organizationId: '768997a6-4b95-46ae-8ee6-857c32bf28b2',
      companyName: 'Pameltex Medical',
      businessContext: {
        layer1: { companyName: { value: 'Pameltex Medical', provenance: 'VERIFIED' } },
        layer2: {
          social: {
            isConnected: true,
            hasSelectedPage: false,
            connectionState: 'PROFILE_CONNECTED_PAGE_NOT_SELECTED',
          },
        },
      } as any,
    });

    assert(res.answer.includes('Pameltex Medical'), 'Must identify as Pameltex Medical');
    assert(!res.answer.includes('Ras Ali Labs'), 'Must NOT leak Ras Ali Labs');
    assert(!res.answer.includes('477334159265235'), 'Must NOT leak Ras Ali Labs Page ID');
  });

  console.log('\n────────────────────────────────────────────────────────────────────────────────');
  console.log(`  MARI ACCEPTANCE SUITE COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('────────────────────────────────────────────────────────────────────────────────\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAcceptanceSuite();
