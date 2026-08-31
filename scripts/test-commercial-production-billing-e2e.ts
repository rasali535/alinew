/**
 * Ralion OS — Commercial Production Billing & Entitlement E2E Suite
 * Ras Ali Labs (Pty) Ltd
 *
 * Full Lifecycle Commercial Simulation:
 * Customer: Zambezi Clean Energy (org_prod_zambezi_01)
 *
 * Validating:
 * 1. Community Baseline & Entitlement Gates
 * 2. Server-side PayPal Verification & Upgrade to Professional
 * 3. Entitlement Engine Feature Unlocking
 * 4. Credit Metering & User Consumption
 * 5. Idempotent PayPal Webhook Processing (Cycle Renewal)
 * 6. Adversarial Cross-Tenant Billing & Subscription Hijack Rejections
 */

import dotenv from 'dotenv';
dotenv.config();

import {
  BillingDatabaseService,
  SubscriptionPlanId,
} from '../packages/database/src/index';

import {
  EntitlementService,
  PLAN_CATALOG,
} from '../packages/auth/src/index';

import {
  PayPalService,
} from '../packages/integrations/src/index';

import {
  TenantCreditsService,
  CreativeOrchestrator,
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

async function runCommercialProductionBillingE2E() {
  console.log('================================================================================');
  console.log('🚀 RALION OS — COMMERCIAL PRODUCTION BILLING & ENTITLEMENT E2E SUITE');
  console.log('================================================================================\n');

  BillingDatabaseService._resetForTesting();
  TenantCreditsService._resetForTesting();

  const CUSTOMER = {
    organizationId: 'org_prod_zambezi_01',
    companyName: 'Zambezi Clean Energy',
    ownerId: 'u_zambezi_owner',
    industry: 'Renewable Solar Grids & Infrastructure',
    country: 'Zambia',
  };

  const ATTACKER = {
    organizationId: 'org_prod_rogue_99',
    companyName: 'Rogue Tenant Group',
    ownerId: 'u_rogue_attacker',
  };

  // ===========================================================================
  // SECTION 1: COMMUNITY BASELINE & DEFAULT SUBSCRIPTION
  // ===========================================================================
  console.log('--- SECTION 1: Customer Signup & Community Plan Baseline ---');

  const defaultSub = BillingDatabaseService.getSubscription(CUSTOMER.organizationId);
  const effectivePlan = EntitlementService.getEffectivePlan(CUSTOMER.organizationId);
  const initialWallet = TenantCreditsService.getOrCreateWallet(CUSTOMER.organizationId, 'COMMUNITY');

  const baselineValid =
    defaultSub.planId === 'COMMUNITY' &&
    defaultSub.status === 'ACTIVE' &&
    effectivePlan.plan.planId === 'COMMUNITY' &&
    effectivePlan.plan.monthlyCreditQuota === 100 &&
    initialWallet.balance === 50;

  recordTest(
    'SEC 1: Community Baseline',
    'Default Free Plan Provisioning & Quota Scoping',
    baselineValid,
    'Default plan is COMMUNITY, quota is 100 credits/mo, status is ACTIVE',
    `Plan: ${defaultSub.planId} | Status: ${defaultSub.status} | Quota: ${effectivePlan.plan.monthlyCreditQuota}`,
    'Customer starts cleanly in isolated Community baseline.'
  );

  // ===========================================================================
  // SECTION 2: ENTITLEMENT GATING ON FREE TIER
  // ===========================================================================
  console.log('--- SECTION 2: Entitlement Gating on Free Tier ---');

  // Attempt CogVideoX Reel Generation on Community tier (Requires Professional/Enterprise)
  const genVideoBlocked = await CreativeOrchestrator.generate({
    organizationId: CUSTOMER.organizationId,
    type: 'VIDEO_REEL',
    prompt: 'Commercial drone flyover of solar plant in Zambia',
  });

  const gatesEnforced =
    !genVideoBlocked.success &&
    genVideoBlocked.errorDetails?.errorCode === 'ENTITLEMENT_REQUIRED';

  recordTest(
    'SEC 2: Entitlement Gates',
    'Commercial Video AI Strictly Blocked on Free Community Tier',
    gatesEnforced,
    'Video reel generation rejected with ENTITLEMENT_REQUIRED error code',
    `Video Status: ${genVideoBlocked.errorDetails?.errorCode} (${genVideoBlocked.userFacingMessage})`,
    'Backend entitlement engine prevented unauthorized feature consumption.'
  );

  // ===========================================================================
  // SECTION 3: PAYPAL SERVER-SIDE SUBSCRIPTION VERIFICATION & UPGRADE
  // ===========================================================================
  console.log('--- SECTION 3: PayPal Server-Side Verification & Upgrade ---');

  const paypalSubId = 'I-ZAMBEZI-PRO-2026';
  const activateResult = await PayPalService.activateVerifiedSubscription({
    organizationId: CUSTOMER.organizationId,
    planId: 'PROFESSIONAL',
    billingCycle: 'MONTHLY',
    subscriptionId: paypalSubId,
    userId: CUSTOMER.ownerId,
  });

  const subAfterUpgrade = BillingDatabaseService.getSubscription(CUSTOMER.organizationId);
  const planAfterUpgrade = EntitlementService.getEffectivePlan(CUSTOMER.organizationId);
  const walletAfterUpgrade = TenantCreditsService.getBalance(CUSTOMER.organizationId);

  const upgradeSuccess =
    activateResult.success &&
    subAfterUpgrade.planId === 'PROFESSIONAL' &&
    subAfterUpgrade.status === 'ACTIVE' &&
    subAfterUpgrade.providerSubscriptionId === paypalSubId &&
    planAfterUpgrade.plan.planId === 'PROFESSIONAL' &&
    walletAfterUpgrade >= 5000;

  recordTest(
    'SEC 3: PayPal Upgrade',
    'Server-Side Subscription Verification & Professional Plan Activation',
    upgradeSuccess,
    'Plan updated to PROFESSIONAL; 5,000 credits provisioned into organization wallet',
    `Plan: ${subAfterUpgrade.planId} | Status: ${subAfterUpgrade.status} | Credits: ${walletAfterUpgrade}`,
    'PayPal subscription verified and bound to organization.'
  );

  // ===========================================================================
  // SECTION 4: UNLOCKED ENTITLEMENTS & CREATIVE GENERATION METERING
  // ===========================================================================
  console.log('--- SECTION 4: Unlocked Entitlements & Metered Consumption ---');

  // Customer generates a FLUX Visual on Professional tier (10 credits)
  const balanceBefore = TenantCreditsService.getBalance(CUSTOMER.organizationId);
  const genImageAllowed = await CreativeOrchestrator.generate({
    organizationId: CUSTOMER.organizationId,
    type: 'POSTER_IMAGE',
    prompt: 'Clean energy solar microgrid in rural Zambia',
    title: 'Zambezi Solar Vision',
  });

  const balanceAfterImage = TenantCreditsService.getBalance(CUSTOMER.organizationId);

  // Customer generates a Commercial Reel on Professional tier (50 credits)
  const genVideoAllowed = await CreativeOrchestrator.generate({
    organizationId: CUSTOMER.organizationId,
    type: 'VIDEO_REEL',
    prompt: 'High resolution clean energy commercial in Zambia',
    title: 'Zambezi Power Reel',
  });

  const balanceAfterVideo = TenantCreditsService.getBalance(CUSTOMER.organizationId);

  const meteringAccurate =
    genImageAllowed.success &&
    genVideoAllowed.success &&
    balanceAfterImage === balanceBefore - 10 &&
    balanceAfterVideo === balanceAfterImage - 50;

  recordTest(
    'SEC 4: Entitlements & Metering',
    'Feature Unlocked & Atomic Usage Metering (Image -10, Video -50)',
    meteringAccurate,
    `Balance drops by 10 for image (${balanceBefore} -> ${balanceAfterImage}), then by 50 for video (${balanceAfterImage} -> ${balanceAfterVideo})`,
    `Final Balance: ${balanceAfterVideo} credits`,
    'Visual & Video assets generated and metered against organization balance.'
  );

  // ===========================================================================
  // SECTION 5: PAYPAL WEBHOOK PROCESSING & IDEMPOTENCY
  // ===========================================================================
  console.log('--- SECTION 5: PayPal Webhook Processing & Idempotency ---');

  const webhookEventId = 'WH-ZAMBEZI-RENEWAL-01';
  const renewalWebhookPayload = {
    id: webhookEventId,
    event_type: 'PAYMENT.SALE.COMPLETED',
    resource: {
      id: 'SALE-TX-998877',
      billing_agreement_id: paypalSubId,
      amount: { total: '49.00', currency: 'USD' },
    },
  };

  // 1. First webhook dispatch (Cycle Renewal)
  const balanceBeforeRenewal = TenantCreditsService.getBalance(CUSTOMER.organizationId);
  const firstWebhookRes = await PayPalService.processWebhookEvent(renewalWebhookPayload);
  const balanceAfterRenewal = TenantCreditsService.getBalance(CUSTOMER.organizationId);

  // 2. Duplicate webhook replay attack / retry
  const replayWebhookRes = await PayPalService.processWebhookEvent(renewalWebhookPayload);
  const balanceAfterReplay = TenantCreditsService.getBalance(CUSTOMER.organizationId);

  const webhookIdempotent =
    firstWebhookRes.handled &&
    firstWebhookRes.action === 'PAYMENT.SALE.COMPLETED' &&
    balanceAfterRenewal === balanceBeforeRenewal + 5000 &&
    replayWebhookRes.handled &&
    replayWebhookRes.action === 'IGNORED_DUPLICATE' &&
    balanceAfterReplay === balanceAfterRenewal; // No double-credit refill!

  recordTest(
    'SEC 5: Webhook Idempotency',
    'Cycle Renewal Quota Replenishment & Duplicate Replay Immunity',
    webhookIdempotent,
    'First webhook adds 5,000 renewal credits; duplicate replay is safely ignored with zero balance change',
    `First: ${firstWebhookRes.action} (+5000) | Replay: ${replayWebhookRes.action} (No Change: ${balanceAfterReplay})`,
    'Webhook ledger guarantees exactly-once processing semantics.'
  );

  // ===========================================================================
  // SECTION 6: ADVERSARIAL CROSS-TENANT BILLING ATTACKS
  // ===========================================================================
  console.log('--- SECTION 6: Adversarial Cross-Tenant Billing Attacks ---');

  // Attack 1: Rogue tenant attempts to hijack Zambezi's PayPal subscription ID
  const hijackAttempt = await PayPalService.activateVerifiedSubscription({
    organizationId: ATTACKER.organizationId,
    planId: 'PROFESSIONAL',
    billingCycle: 'MONTHLY',
    subscriptionId: paypalSubId, // Already bound to Zambezi!
  });

  const hijackBlocked =
    !hijackAttempt.success &&
    Boolean(hijackAttempt.error?.includes('already registered to a different organization'));

  recordTest(
    'SEC 6: Cross-Tenant Attack 1',
    'Subscription Hijacking Denial (Replay Protection)',
    hijackBlocked,
    'Access denied: PayPal subscription is already registered to a different organization',
    hijackBlocked ? 'Blocked with Subscription Hijack Guard' : 'Allowed (VULNERABILITY!)',
    'Organization-to-subscription 1:1 binding strictly preserved.'
  );

  // Attack 2: Rogue tenant attempts to view Zambezi transaction records
  const attackerTxView = BillingDatabaseService.listTransactions(ATTACKER.organizationId);
  const zambeziTxView = BillingDatabaseService.listTransactions(CUSTOMER.organizationId);

  const transactionsIsolated =
    attackerTxView.length === 0 &&
    zambeziTxView.length >= 2;

  recordTest(
    'SEC 6: Cross-Tenant Attack 2',
    'Cross-Tenant Transaction Ledger Isolation',
    transactionsIsolated,
    'Rogue tenant sees 0 transactions; Zambezi sees their own verified transactions',
    `Attacker Tx Count: ${attackerTxView.length} | Zambezi Tx Count: ${zambeziTxView.length}`,
    'Transaction store completely partitioned by organizationId.'
  );

  // Attack 3: Forged Webhook Cryptographic Verification Rejection
  const forgedHeaders = {
    'paypal-transmission-id': 'forged_id',
    'paypal-transmission-time': '2026-08-25T12:00:00Z',
    'paypal-transmission-sig': 'forged_invalid_signature',
  };
  const forgedValid = await PayPalService.verifyWebhookSignature(forgedHeaders, { test: 'fake' });

  recordTest(
    'SEC 6: Cross-Tenant Attack 3',
    'Cryptographic Forgery & Untrusted Webhook Rejection',
    !forgedValid,
    'Forged webhook signature verification returns false',
    forgedValid ? 'Accepted (VULNERABILITY!)' : 'Rejected (Signature verification failed)',
    'Webhook authenticity enforced via REST signature gateway.'
  );

  // ===========================================================================
  // SECTION 7: SUMMARY MATRIX
  // ===========================================================================
  console.log('================================================================================');
  console.log('📊 COMMERCIAL PRODUCTION BILLING & ENTITLEMENT E2E SUMMARY:');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total Validation Tests: ${total}`);
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Failed: ${failed}/${total}`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCommercialProductionBillingE2E().catch((err) => {
  console.error('Commercial Production Billing Simulation Failed:', err);
  process.exit(1);
});
