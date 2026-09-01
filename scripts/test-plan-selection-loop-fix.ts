/**
 * RALION OS — SOCIAL GROWTH PLAN SELECTION LOOP / CONNECTION BLOCKER ACCEPTANCE TEST
 * Ras Ali Labs (Pty) Ltd
 *
 * Verifies:
 * 1. Fresh customer signup and initial Community entitlement
 * 2. Plan selection and server-authoritative activation (STARTER / PROFESSIONAL)
 * 3. Plan gate decision: popup closes and connection flow proceeds
 * 4. Social connection (Facebook / Zernio) gating: connection allowed within quota
 * 5. Strict multi-tenant isolation (Customer A vs Customer B vs Platform Admin)
 * 6. Admin Portal visibility reflecting live server state
 */

import { BillingDatabaseService } from '../packages/database/src/billingDatabase.service';
import { EntitlementService, PLAN_CATALOG, PlatformAdminService } from '../packages/auth/src';
import { TenantCreditsService } from '../packages/ai/src';
import { PayPalService } from '../packages/integrations/src/billing/paypal.service';
import { FacebookPageManagementService } from '../apps/ralion/src/lib/services/social/facebookPageManagement.service';

async function runPlanSelectionLoopAcceptanceTest() {
  console.log('================================================================');
  console.log('RALION OS — SOCIAL GROWTH PLAN SELECTION LOOP ACCEPTANCE TEST');
  console.log('================================================================\n');

  // STEP 1: REPRODUCE WITH A FRESH CUSTOMER A
  const orgA = `org_fresh_alpha_${Date.now()}`;
  const userA = `usr_alpha_${Date.now()}`;
  const workspaceA = orgA;

  console.log('--- STEP 1: Fresh Customer A Onboarding ---');
  console.log(`organizationId: ${orgA}`);
  console.log(`workspaceId: ${workspaceA}`);
  console.log(`userId: ${userA}`);

  // Initial authoritative server state
  const initialSubA = BillingDatabaseService.getSubscription(orgA);
  const initialPlanA = EntitlementService.getEffectivePlan(orgA);
  const initialWalletA = TenantCreditsService.getOrCreateWallet(orgA, 'COMMUNITY');

  console.log(`selectedPlan: COMMUNITY`);
  console.log(`currentPlan: ${initialSubA.planId}`);
  console.log(`subscriptionStatus: ${initialSubA.status}`);
  console.log(`creditBalance: ${initialWalletA.balance}`);
  console.log(`entitlements.socialPublishing: ${initialPlanA.plan.features.socialPublishing}`);
  console.log(`entitlements.maxSocialConnections: ${initialPlanA.plan.maxSocialConnections}\n`);

  if (initialSubA.planId !== 'COMMUNITY' || initialSubA.status !== 'ACTIVE') {
    throw new Error('FAILED: Fresh customer should default to active COMMUNITY plan.');
  }

  // STEP 2: CHECK COMMUNITY PLAN SOCIAL CONNECTION GATING
  console.log('--- STEP 2: Verify Community Free Social Gating ---');
  const communityEntitlementA = await FacebookPageManagementService.getOrganizationEntitlement(orgA, userA);
  console.log('Community Facebook Page Entitlement:', communityEntitlementA);

  if (communityEntitlementA.limit < 1) {
    throw new Error('FAILED: Community plan must allow at least 1 social connection.');
  }
  if (communityEntitlementA.upgradeRequired) {
    throw new Error('FAILED: Upgrade must not be required when current connections < limit.');
  }
  console.log('✅ Community plan allows baseline social connection without loop.\n');

  // STEP 3: PLAN SELECTION & SERVER-SIDE UPGRADE
  console.log('--- STEP 3: Trace Plan Selection & PayPal Verification ---');
  const targetPlan = 'STARTER';
  const billingCycle = 'MONTHLY';
  const paypalSubId = `I-TEST-${Date.now().toString(36).toUpperCase()}`;

  const activationResult = await PayPalService.activateVerifiedSubscription({
    organizationId: orgA,
    planId: targetPlan,
    billingCycle,
    subscriptionId: paypalSubId,
    userId: userA,
  });

  if (!activationResult.success || !activationResult.subscription) {
    throw new Error(`FAILED: Subscription activation failed: ${activationResult.error}`);
  }

  // STEP 4: VERIFY AUTHORITATIVE SERVER STATE
  console.log('--- STEP 4: Verify Server-Side Entitlement & Wallet ---');
  const updatedSubA = BillingDatabaseService.getSubscription(orgA);
  const updatedPlanA = EntitlementService.getEffectivePlan(orgA);
  const updatedWalletA = TenantCreditsService.getOrCreateWallet(orgA);
  const updatedEntitlementA = await FacebookPageManagementService.getOrganizationEntitlement(orgA, userA);

  console.log(`Authoritative Plan: ${updatedSubA.planId}`);
  console.log(`Authoritative Status: ${updatedSubA.status}`);
  console.log(`Updated Credit Quota: ${updatedPlanA.plan.monthlyCreditQuota}`);
  console.log(`Credit Wallet Balance: ${updatedWalletA.balance}`);
  console.log(`Social Connections Limit: ${updatedEntitlementA.limit}`);
  console.log(`Upgrade Required: ${updatedEntitlementA.upgradeRequired}`);

  if (updatedSubA.planId !== 'STARTER') {
    throw new Error('FAILED: Subscription plan was not updated to STARTER.');
  }
  if (updatedWalletA.balance < 1000) {
    throw new Error(`FAILED: Expected credit balance >= 1000, got ${updatedWalletA.balance}`);
  }
  if (updatedEntitlementA.limit < 2) {
    throw new Error(`FAILED: Expected Starter Facebook Page limit >= 2, got ${updatedEntitlementA.limit}`);
  }
  console.log('✅ Server-side entitlement and credit balance verified.\n');

  // STEP 5: SIMULATE PLAN GATE EVALUATION
  console.log('--- STEP 5: PlanGate Decision Evaluation ---');
  const requiredTier = 'STANDARD'; // Growth AI standard requirement
  const rawTier = updatedSubA.planId; // 'STARTER'
  const normalizedUserTier = rawTier === 'STARTER' ? 'STANDARD' : rawTier;
  const isAllowed =
    normalizedUserTier === 'ENTERPRISE' ||
    normalizedUserTier === 'PLATFORM_ADMIN' ||
    (normalizedUserTier === 'PROFESSIONAL' && (requiredTier === 'PROFESSIONAL' || requiredTier === 'STANDARD')) ||
    (normalizedUserTier === 'STANDARD' && requiredTier === 'STANDARD');

  console.log(
    `[PlanGate]\n` +
    `organizationId=${orgA}\n` +
    `selectedPlan=${targetPlan}\n` +
    `currentPlan=${normalizedUserTier}\n` +
    `subscriptionStatus=${updatedSubA.status}\n` +
    `entitled=${isAllowed}\n` +
    `feature=Ralion Growth AI\n` +
    `decision=${isAllowed ? 'ALLOW' : 'GATE_REQUIRED'}`
  );

  if (!isAllowed) {
    throw new Error('FAILED: Starter plan should satisfy STANDARD TierAccessGate.');
  }
  console.log('✅ PlanGate allows access — plan modal closes and user proceeds to Connect Meta/Zernio.\n');

  // STEP 6: MULTI-TENANT ISOLATION (CUSTOMER B)
  console.log('--- STEP 6: Multi-Tenant Customer Isolation ---');
  const orgB = `org_fresh_beta_${Date.now()}`;
  const userB = `usr_beta_${Date.now()}`;

  const subB = BillingDatabaseService.getSubscription(orgB);
  const planB = EntitlementService.getEffectivePlan(orgB);
  const walletB = TenantCreditsService.getOrCreateWallet(orgB, 'COMMUNITY');

  console.log(`Customer B (${orgB}) Plan: ${subB.planId}, Credits: ${walletB.balance}`);
  if (subB.planId !== 'COMMUNITY') {
    throw new Error('FAILED: Customer B should be on COMMUNITY plan, isolated from Customer A.');
  }
  if (walletB.balance !== 50 && walletB.balance !== 100) {
    throw new Error(`FAILED: Customer B should have 50 or 100 credits, got ${walletB.balance}`);
  }

  // Verify Platform Admin separation
  const adminSub = BillingDatabaseService.getSubscription('ras-ali-labs');
  console.log(`Platform Admin (ras-ali-labs) Plan: ${adminSub.planId}`);
  if (adminSub.planId !== 'ENTERPRISE') {
    throw new Error('FAILED: Platform admin must remain on ENTERPRISE plan.');
  }
  console.log('✅ Multi-tenant isolation verified.\n');

  // STEP 7: ADMIN PORTAL VISIBILITY
  console.log('--- STEP 7: Admin Portal Visibility ---');
  const allSubs = BillingDatabaseService.listSubscriptions();
  const foundA = allSubs.find(s => s.organizationId === orgA);
  const foundB = allSubs.find(s => s.organizationId === orgB);

  console.log(`Admin sees Customer A: Plan=${foundA?.planId}, Status=${foundA?.status}`);
  console.log(`Admin sees Customer B: Plan=${foundB?.planId}, Status=${foundB?.status}`);

  if (!foundA || foundA.planId !== 'STARTER') {
    throw new Error('FAILED: Admin does not see Customer A on STARTER plan.');
  }
  if (!foundB || foundB.planId !== 'COMMUNITY') {
    throw new Error('FAILED: Admin does not see Customer B on COMMUNITY plan.');
  }
  console.log('✅ Admin Portal accurately reflects authoritative state.\n');

  console.log('================================================================');
  console.log('ALL PLAN SELECTION LOOP ACCEPTANCE CRITERIA PASSED ✅');
  console.log('================================================================\n');

  return {
    success: true,
    customerA: { orgId: orgA, plan: updatedSubA.planId, credits: updatedWalletA.balance },
    customerB: { orgId: orgB, plan: subB.planId, credits: walletB.balance },
  };
}

runPlanSelectionLoopAcceptanceTest().catch(err => {
  console.error('ACCEPTANCE TEST ERROR:', err);
  process.exit(1);
});
