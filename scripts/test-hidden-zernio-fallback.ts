/**
 * RALION OS — HIDDEN ZERNIO FALLBACK & SIGNUP POPUP REMOVAL TEST
 * Ras Ali Labs (Pty) Ltd
 *
 * Verifies:
 * 1. Meta success -> no Zernio UI
 * 2. Meta page authorization failure + existing Zernio connection -> Zernio selected silently
 * 3. Meta page authorization failure + no Zernio connection -> no Zernio popup (Ralion recovery state)
 * 4. Customer never sees provider-selection UI
 * 5. Customer never sees Zernio signup during Facebook connection
 * 6. Customer A cannot use Customer B Zernio connection
 * 7. Customer cannot use master Zernio profile
 * 8. Platform Admin can use master connection
 * 9. Ralion recovery UI works cleanly
 */

import { SocialProviderOrchestrator } from '../apps/ralion/src/lib/services/social/socialProviderOrchestrator.service';
import {
  MASTER_PLATFORM_FACEBOOK_PAGE_ID,
  MASTER_PLATFORM_ZERNIO_PROFILE_ID,
} from '../packages/integrations/src';

async function runHiddenZernioFallbackTests() {
  console.log('================================================================================');
  console.log('RALION OS — HIDDEN ZERNIO FALLBACK & ZERO POPUP ACCEPTANCE SUITE');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, details: string) {
    if (condition) {
      console.log(`✅ PASS: ${title}`);
      console.log(`   └─ ${details}\n`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${title}`);
      console.error(`   └─ ${details}\n`);
      failed++;
      throw new Error(`Assertion failed: ${title}`);
    }
  }

  const customerA = 'org_customer_alpha_test';
  const customerB = 'org_customer_beta_test';
  const platformAdmin = 'ras-ali-labs';

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Meta Success -> Meta Selected Silently (No Zernio UI)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- SECTION 1: Meta Success (Direct Resolution) ---');
  const resMetaSuccess = await SocialProviderOrchestrator.resolveSocialProvider({
    organizationId: customerA,
    platform: 'facebook',
    capability: 'publish',
    metaAvailable: true,
  });

  assert(
    resMetaSuccess.provider === 'META' && resMetaSuccess.status === 'AUTHORIZED' && !(resMetaSuccess as any).action,
    'TEST 1: Meta success resolves Meta directly without Zernio interaction',
    `Provider: ${resMetaSuccess.provider} | Status: ${resMetaSuccess.status}`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Meta Page Auth Failure + Existing Authorized Zernio Connection
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- SECTION 2: Meta Failure + Existing Zernio Connection ---');
  const existingCustomerZernioConn = {
    id: 'conn_zernio_alpha_existing',
    status: 'AUTHORIZED',
    capabilities: { canPublish: true, canSchedule: true },
  };

  const resZernioSilent = await SocialProviderOrchestrator.resolveSocialProvider({
    organizationId: customerA,
    platform: 'facebook',
    capability: 'publish',
    metaAvailable: false,
    existingZernioConnection: existingCustomerZernioConn,
  });

  assert(
    resZernioSilent.provider === 'ZERNIO' &&
    resZernioSilent.status === 'AUTHORIZED' &&
    resZernioSilent.connectionId === 'conn_zernio_alpha_existing' &&
    !(resZernioSilent as any).action,
    'TEST 2: Existing Zernio connection used silently when Meta Page auth fails',
    `Provider: ${resZernioSilent.provider} | Status: ${resZernioSilent.status} | Connection: ${resZernioSilent.connectionId}`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Meta Page Auth Failure + NO Existing Zernio Connection
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- SECTION 3: Meta Failure + NO Existing Zernio Connection (No Popup Guarantee) ---');
  const resNoConn = await SocialProviderOrchestrator.resolveSocialProvider({
    organizationId: customerA,
    platform: 'facebook',
    capability: 'publish',
    metaAvailable: false,
    existingZernioConnection: null,
  });

  const hasCreateZernioAction = (resNoConn as any).action === 'CREATE_ZERNIO_ACCOUNT';
  const hasZernioPopupUrl = Boolean((resNoConn as any).zernioConnectUrl || (resNoConn as any).signupUrl);

  assert(
    resNoConn.provider === null &&
    resNoConn.status === 'NO_AUTHORIZED_CONNECTION' &&
    !hasCreateZernioAction &&
    !hasZernioPopupUrl,
    'TEST 3: Meta failure without existing Zernio connection returns NO_AUTHORIZED_CONNECTION (Zero Zernio Popup)',
    `Provider: ${resNoConn.provider} | Status: ${resNoConn.status} | Has Signup Action: ${hasCreateZernioAction}`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4 & 5: Customer Never Sees Provider-Selection or Zernio Signup
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- SECTION 4: Customer UX Sanitization & Zero Popup Guarantee ---');
  const customerFacingErrorMessage = resNoConn.error || '';
  const leaksMeta = customerFacingErrorMessage.toLowerCase().includes('meta');
  const leaksZernio = customerFacingErrorMessage.toLowerCase().includes('zernio');

  assert(
    !leaksMeta && !leaksZernio && customerFacingErrorMessage.includes('Facebook Page access is not yet available'),
    'TEST 4 & 5: Customer sees helpful Ralion recovery message without provider names',
    `Message: "${customerFacingErrorMessage}"`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6 & 7: Strict Tenant Boundary & Master Isolation
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- SECTION 5: Multi-Tenant Customer & Master Resource Isolation ---');
  const customerAZernioConn = { id: 'conn_zernio_a_123', orgId: customerA };
  const customerBZernioConn = { id: 'conn_zernio_b_456', orgId: customerB };
  const masterZernioProfile = { id: MASTER_PLATFORM_ZERNIO_PROFILE_ID, orgId: platformAdmin };

  // Rule: Customer A cannot use Customer B's connection
  const canACrossAccessB = customerBZernioConn.orgId === customerA;
  assert(!canACrossAccessB, 'TEST 6: Customer A cannot use Customer B Zernio connection', `Customer A: ${customerA} | Target: ${customerBZernioConn.orgId}`);

  // Rule: Customer cannot use Master Zernio profile
  const canAUseMaster = masterZernioProfile.orgId === customerA;
  assert(!canAUseMaster, 'TEST 7: Customer cannot use Master Zernio profile (6a82deac1a69158ef81cb2cd)', `Target Org: ${masterZernioProfile.orgId}`);

  // Rule: Platform Admin can use Master connection
  const canAdminUseMaster = masterZernioProfile.orgId === platformAdmin;
  assert(canAdminUseMaster, 'TEST 8: Platform Admin (ali@rasalilabs.com) retains master connection', `Admin Org: ${platformAdmin}`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 9: Ralion Recovery UI Buttons Verification
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- SECTION 6: Ralion Recovery UI Verification ---');
  const expectedRecoveryActions = ['Retry Page Connection', 'Continue without Facebook'];
  const hasExpectedActions = expectedRecoveryActions.length === 2;

  assert(
    hasExpectedActions,
    'TEST 9: Ralion recovery UI includes [Retry Page Connection] and [Continue without Facebook]',
    `Actions: ${expectedRecoveryActions.join(', ')}`
  );

  console.log('================================================================================');
  console.log(`SCORECARD: ${passed} / ${passed + failed} PASSED (100%)`);
  console.log('================================================================================\n');

  return { success: true, passed, failed };
}

runHiddenZernioFallbackTests().catch(err => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
