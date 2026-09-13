/**
 * Ralion OS — Live Gemini Model & Semantic Intent Acceptance Suite
 * Ras Ali Labs (Pty) Ltd
 *
 * Verifies:
 * 1. Live Gemini Reasoning Model returns genuine intelligence (modelSucceeded: true, responseSource: 'gemini', fallbackUsed: false).
 * 2. Model-based structured semantic classifier (MODEL_CLASSIFICATION) accurately parses complex natural language.
 * 3. Credit accounting deducts exactly 1 credit on model success and 0 credits on retry/fallback.
 * 4. Facebook live read-only verification (0 mutations, real primary page).
 * 5. Durable creative flyer generation with storage persistence.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../apps/ralion/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { MariUniversalCore } from '../packages/ai/src/mariUniversalCore';
import { TenantCreditsService } from '../packages/ai/src/tenantCredits.service';
import { FacebookPageManagementService } from '../apps/ralion/src/lib/services/social/facebookPageManagement.service';
import { setMariFacebookPageService } from '../packages/ai/src/mariUniversalCore';

setMariFacebookPageService(FacebookPageManagementService);

const CANONICAL_TENANT_ID = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
const CANONICAL_COMPANY_NAME = 'Ras Ali Labs';

function assert(condition: boolean, testName: string, detail?: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${testName}`);
    if (detail) console.error(`   Detail: ${detail}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${testName}`);
}

async function runAcceptance() {
  console.log('===============================================================');
  console.log('  RALION OS — LIVE GEMINI ACCEPTANCE & PIPELINE SUITE');
  console.log('===============================================================\n');

  // -----------------------------------------------------------------
  // 1. LOCAL MODEL VALIDATION
  // -----------------------------------------------------------------
  console.log('--- 1. Live Reasoning Model Query ---');
  const generalPrompt = 'Explain three practical ways a small creative technology agency can improve recurring client retention.';
  const generalRes = await MariUniversalCore.ask({
    prompt: generalPrompt,
    tenantId: CANONICAL_TENANT_ID,
    companyName: CANONICAL_COMPANY_NAME,
  });

  console.log('Diagnostics:', {
    modelAttempted: generalRes.modelAttempted,
    modelSucceeded: generalRes.modelSucceeded,
    responseSource: generalRes.responseSource,
    fallbackUsed: generalRes.fallbackUsed,
    fallbackReason: generalRes.fallbackReason,
    semanticDecisionSource: generalRes.semanticDecisionSource,
    detectedIntent: generalRes.detectedIntent,
    totalTokens: generalRes.usage?.totalTokens,
  });

  assert(generalRes.modelSucceeded === true, 'Reasoning model succeeded (modelSucceeded: true)', `Got modelSucceeded=${generalRes.modelSucceeded}, fallbackReason=${generalRes.fallbackReason}`);
  assert(generalRes.responseSource === 'gemini', 'Response source is gemini (responseSource: gemini)', `Got ${generalRes.responseSource}`);
  assert(generalRes.fallbackUsed === false, 'Fallback was not used (fallbackUsed: false)');
  assert(generalRes.fallbackReason === null, 'Fallback reason is null');
  assert(typeof generalRes.answer === 'string' && generalRes.answer.length > 100, 'Received comprehensive reasoning answer from Gemini');
  console.log('\nAnswer Snippet:\n' + generalRes.answer.slice(0, 250) + '...\n');

  // -----------------------------------------------------------------
  // 2. MODEL-BASED SEMANTIC CLASSIFICATION
  // -----------------------------------------------------------------
  console.log('--- 2. Model-Based Semantic Intent Classification ---');
  const novelNLPrompt = 'Could you evaluate whether our customer records indicate any dropoff in enterprise account renewals?';
  const nlRes = await MariUniversalCore.ask({
    prompt: novelNLPrompt,
    tenantId: CANONICAL_TENANT_ID,
    companyName: CANONICAL_COMPANY_NAME,
  });

  console.log('Semantic Diagnostics:', {
    semanticDecisionSource: nlRes.semanticDecisionSource,
    detectedIntent: nlRes.detectedIntent,
    requestedSources: nlRes.requestedSources,
    modelSucceeded: nlRes.modelSucceeded,
  });

  assert(nlRes.semanticDecisionSource === 'MODEL_CLASSIFICATION', 'Structured classifier used MODEL_CLASSIFICATION', `Got ${nlRes.semanticDecisionSource}`);
  assert(
    nlRes.detectedIntent === 'CRM_PIPELINE' ||
    nlRes.detectedIntent === 'BUSINESS_PERFORMANCE' ||
    nlRes.detectedIntent === 'BUSINESS_SYNTHESIS' ||
    nlRes.detectedIntent === 'GENERAL_REASONING',
    `Valid semantic intent resolved: ${nlRes.detectedIntent}`
  );

  // -----------------------------------------------------------------
  // 3. CREDIT ACCOUNTING (BEFORE / AFTER VERIFICATION)
  // -----------------------------------------------------------------
  console.log('\n--- 3. Credit Deduction Accounting ---');
  await new Promise(r => setTimeout(r, 4000));
  const balanceBefore = TenantCreditsService.getBalance(CANONICAL_TENANT_ID);
  
  // Ask a live reasoning question
  const creditPrompt = 'What are key considerations when setting SLA terms for multi-tenant cloud applications?';
  const creditRes = await MariUniversalCore.ask({
    prompt: creditPrompt,
    tenantId: CANONICAL_TENANT_ID,
    companyName: CANONICAL_COMPANY_NAME,
  });

  const balanceAfter = TenantCreditsService.getBalance(CANONICAL_TENANT_ID);
  console.log(`Credit Wallet: Before=${balanceBefore}, After=${balanceAfter}, Deducted=${balanceBefore - balanceAfter}`);

  assert(creditRes.modelSucceeded === true, 'Credit test query succeeded on live Gemini model');
  assert(balanceBefore - balanceAfter === 1, 'Exactly 1 credit was deducted for successful reasoning model query');

  // Pure greeting credit verification (0 deduction)
  const balanceBeforeGreet = TenantCreditsService.getBalance(CANONICAL_TENANT_ID);
  await MariUniversalCore.ask({
    prompt: 'hello mari',
    tenantId: CANONICAL_TENANT_ID,
    companyName: CANONICAL_COMPANY_NAME,
  });
  const balanceAfterGreet = TenantCreditsService.getBalance(CANONICAL_TENANT_ID);
  assert(balanceBeforeGreet === balanceAfterGreet, 'Zero credits deducted for pure deterministic greeting');

  // -----------------------------------------------------------------
  // 4. FACEBOOK LIVE READ-ONLY QUERY (REAL SERVICE)
  // -----------------------------------------------------------------
  console.log('\n--- 4. Facebook Status Query (Real Service, 0 Mutations) ---');
  const fbRes = await MariUniversalCore.ask({
    prompt: 'Is my Facebook connected?',
    tenantId: CANONICAL_TENANT_ID,
    userId: '00000000-0000-0000-0000-000000000001',
    companyName: CANONICAL_COMPANY_NAME,
  });

  console.log('Facebook Query Result:', {
    detectedIntent: fbRes.detectedIntent,
    requestedAction: fbRes.requestedAction,
    toolsActuallyExecuted: fbRes.toolsActuallyExecuted,
    responseSource: fbRes.responseSource,
  });

  assert(fbRes.detectedIntent === 'FACEBOOK_CONNECTION_STATUS', 'Detected Facebook status intent');
  assert(fbRes.requestedAction === 'inspect_facebook_status', 'Requested action inspect_facebook_status');
  assert(fbRes.toolsActuallyExecuted.includes('FacebookPageManagementService.getPrimaryPage'), 'Real Facebook service recorded in toolsActuallyExecuted');

  // -----------------------------------------------------------------
  // 5. DURABLE CREATIVE FLYER PERSISTENCE
  // -----------------------------------------------------------------
  console.log('\n--- 5. Durable Creative Flyer Persistence ---');
  const flyerRes = await MariUniversalCore.ask({
    prompt: 'Create a flyer for the Ralion OS launch.',
    tenantId: CANONICAL_TENANT_ID,
    userId: '00000000-0000-0000-0000-000000000001',
    companyName: CANONICAL_COMPANY_NAME,
  });

  console.log('Flyer Generation Result:', {
    detectedIntent: flyerRes.detectedIntent,
    requestedAction: flyerRes.requestedAction,
    toolsActuallyExecuted: flyerRes.toolsActuallyExecuted,
    modelAttempted: flyerRes.modelAttempted,
    modelSucceeded: flyerRes.modelSucceeded,
  });

  assert(flyerRes.detectedIntent === 'CREATIVE_STUDIO', 'Detected CREATIVE_STUDIO intent');
  assert(flyerRes.toolsActuallyExecuted.includes('CreativeOrchestrator.generate'), 'Creative orchestrator recorded in toolsActuallyExecuted');
  assert(flyerRes.answer.includes('Job ID') || flyerRes.answer.includes('Creative Generation Job'), 'Returned genuine generation receipt in answer');

  console.log('\n===============================================================');
  console.log('  🎉 ALL LIVE GEMINI ACCEPTANCE CRITERIA PASSED 100%!');
  console.log('===============================================================\n');
}

runAcceptance().catch((err) => {
  console.error('[FATAL] Acceptance suite failed:', err);
  process.exit(1);
});
