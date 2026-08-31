import {
  ZernioSocialService,
  assertMasterZernioAuthorization,
  MASTER_PLATFORM_ZERNIO_PROFILE_ID,
  MASTER_PLATFORM_ZERNIO_ACCOUNT_ID,
  MASTER_PLATFORM_FACEBOOK_PAGE_ID,
  PLATFORM_ADMIN_ORGANIZATION_ID,
  PLATFORM_ADMIN_USER_ID,
} from '@ralion/integrations';
import { SocialPublishingService } from '../apps/ralion/src/lib/services/social/socialPublishing.service';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

interface TestResult {
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function recordResult(name: string, expected: string, actual: string, passed: boolean, details?: string) {
  results.push({ name, expected, actual, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon}: ${name}`);
  if (!passed && details) {
    console.log(`   Details: ${details}`);
  }
}

async function runMasterZernioImmutabilitySuite() {
  console.log('================================================================================');
  console.log('RALION OS — MASTER ZERNIO PROFILE IMMUTABILITY & ISOLATION GAUNTLET');
  console.log(`Master Profile ID:  ${MASTER_PLATFORM_ZERNIO_PROFILE_ID}`);
  console.log(`Master Account ID:  ${MASTER_PLATFORM_ZERNIO_ACCOUNT_ID}`);
  console.log(`Master FB Page ID:  ${MASTER_PLATFORM_FACEBOOK_PAGE_ID}`);
  console.log(`Platform Admin Org: ${PLATFORM_ADMIN_ORGANIZATION_ID}`);
  console.log(`Platform Admin UID: ${PLATFORM_ADMIN_USER_ID}`);
  console.log('================================================================================\n');

  const customerA = {
    userId: 'cust-user-alpha-1234',
    organizationId: 'cust-org-alpha',
    workspaceId: 'cust-ws-alpha',
    role: 'CUSTOMER_ADMIN',
  };

  const customerB = {
    userId: 'cust-user-beta-5678',
    organizationId: 'cust-org-beta',
    workspaceId: 'cust-ws-beta',
    role: 'CUSTOMER_USER',
  };

  const unauthenticated = {
    userId: undefined,
    organizationId: undefined,
    workspaceId: undefined,
    role: undefined,
  };

  const platformAdmin = {
    userId: PLATFORM_ADMIN_USER_ID,
    organizationId: PLATFORM_ADMIN_ORGANIZATION_ID,
    workspaceId: PLATFORM_ADMIN_ORGANIZATION_ID,
    role: 'PLATFORM_ADMIN',
  };

  // -------------------------------------------------------------------------
  // TEST 1: Customer A attempted deletion/mutation of Master Profile
  // -------------------------------------------------------------------------
  try {
    await ZernioSocialService.deleteProfile(MASTER_PLATFORM_ZERNIO_PROFILE_ID, customerA);
    recordResult('Customer A delete Master Profile', '403 Forbidden', 'Allowed (FAIL)', false);
  } catch (err: any) {
    const isDenied = err.status === 403 || err.statusCode === 403 || err.message.includes('403') || err.message.includes('permanent');
    recordResult(
      'Customer A delete Master Profile',
      '403 Forbidden',
      `${err.statusCode || 403} (${err.message.slice(0, 50)}...)`,
      isDenied
    );
  }

  // -------------------------------------------------------------------------
  // TEST 2: Customer A attempted disconnect of Master Account
  // -------------------------------------------------------------------------
  try {
    await ZernioSocialService.disconnectAccount(MASTER_PLATFORM_ZERNIO_ACCOUNT_ID, customerA);
    recordResult('Customer A disconnect Master Account', '403 Forbidden', 'Allowed (FAIL)', false);
  } catch (err: any) {
    const isDenied = err.status === 403 || err.statusCode === 403 || err.message.includes('403') || err.message.includes('permanent');
    recordResult(
      'Customer A disconnect Master Account',
      '403 Forbidden',
      `${err.statusCode || 403} (${err.message.slice(0, 50)}...)`,
      isDenied
    );
  }

  // -------------------------------------------------------------------------
  // TEST 3: Customer A attempted publish via Master Profile
  // -------------------------------------------------------------------------
  try {
    await ZernioSocialService.createPost({
      profileId: MASTER_PLATFORM_ZERNIO_PROFILE_ID,
      userId: customerA.userId,
      organizationId: customerA.organizationId,
      workspaceId: customerA.workspaceId,
      platforms: [{ accountId: 'custom-acc-123' }],
      content: 'Attack post attempting to use master profile container',
    });
    recordResult('Customer A publish via Master Profile', '403 Forbidden', 'Allowed (FAIL)', false);
  } catch (err: any) {
    const isDenied = err.status === 403 || err.statusCode === 403 || err.message.includes('403') || err.message.includes('SecurityViolation');
    recordResult(
      'Customer A publish via Master Profile',
      '403 Forbidden',
      `${err.statusCode || 403} (${err.message.slice(0, 50)}...)`,
      isDenied
    );
  }

  // -------------------------------------------------------------------------
  // TEST 4: Customer A attempted publish to Ras Ali Labs Facebook Page (477334159265235)
  // -------------------------------------------------------------------------
  try {
    await ZernioSocialService.createPost({
      profileId: 'cust-tenant-profile-999',
      userId: customerA.userId,
      organizationId: customerA.organizationId,
      workspaceId: customerA.workspaceId,
      pageId: MASTER_PLATFORM_FACEBOOK_PAGE_ID,
      platforms: [{ accountId: 'custom-acc-123', pageId: MASTER_PLATFORM_FACEBOOK_PAGE_ID }],
      content: 'Attack post attempting to publish to Ras Ali Labs Facebook Page',
    });
    recordResult('Customer A publish to Ras Ali Labs FB Page', '403 Forbidden', 'Allowed (FAIL)', false);
  } catch (err: any) {
    const isDenied = err.status === 403 || err.statusCode === 403 || err.message.includes('403') || err.message.includes('SecurityViolation');
    recordResult(
      'Customer A publish to Ras Ali Labs FB Page',
      '403 Forbidden',
      `${err.statusCode || 403} (${err.message.slice(0, 50)}...)`,
      isDenied
    );
  }

  // -------------------------------------------------------------------------
  // TEST 5: Customer B attempted cross-tenant binding of Master Profile
  // -------------------------------------------------------------------------
  try {
    assertMasterZernioAuthorization({
      userId: customerB.userId,
      organizationId: customerB.organizationId,
      workspaceId: customerB.workspaceId,
      targetProfileId: MASTER_PLATFORM_ZERNIO_PROFILE_ID,
      action: 'BIND_WORKSPACE_PROFILE',
    });
    recordResult('Customer B bind Master Profile', '403 Forbidden', 'Allowed (FAIL)', false);
  } catch (err: any) {
    const isDenied = err.status === 403 || err.statusCode === 403 || err.message.includes('403') || err.message.includes('SecurityViolation');
    recordResult(
      'Customer B bind Master Profile',
      '403 Forbidden',
      `${err.statusCode || 403} (${err.message.slice(0, 50)}...)`,
      isDenied
    );
  }

  // -------------------------------------------------------------------------
  // TEST 6: Unauthenticated request attempted OAuth Connect on Master Profile
  // -------------------------------------------------------------------------
  try {
    await ZernioSocialService.getConnectUrl(
      'facebook',
      MASTER_PLATFORM_ZERNIO_PROFILE_ID,
      'https://rasalilabs.com/callback',
      unauthenticated
    );
    recordResult('Unauthenticated access to Master Profile', '403 Forbidden', 'Allowed (FAIL)', false);
  } catch (err: any) {
    const isDenied = err.status === 403 || err.statusCode === 403 || err.message.includes('403') || err.message.includes('SecurityViolation');
    recordResult(
      'Unauthenticated access to Master Profile',
      '403 Forbidden',
      `${err.statusCode || 403} (${err.message.slice(0, 50)}...)`,
      isDenied
    );
  }

  // -------------------------------------------------------------------------
  // TEST 7: PLATFORM_ADMIN access to Master Profile -> ALLOWED
  // -------------------------------------------------------------------------
  try {
    assertMasterZernioAuthorization({
      userId: platformAdmin.userId,
      organizationId: platformAdmin.organizationId,
      workspaceId: platformAdmin.workspaceId,
      role: platformAdmin.role,
      targetProfileId: MASTER_PLATFORM_ZERNIO_PROFILE_ID,
      targetAccountId: MASTER_PLATFORM_ZERNIO_ACCOUNT_ID,
      targetPageId: MASTER_PLATFORM_FACEBOOK_PAGE_ID,
      action: 'ADMIN_ACCESS',
    });
    recordResult('Platform-Admin access to Master Profile', 'Allowed', 'Allowed (PASS)', true);
  } catch (err: any) {
    recordResult('Platform-Admin access to Master Profile', 'Allowed', `Denied: ${err.message}`, false);
  }

  // -------------------------------------------------------------------------
  // TEST 8: Customer access to Own Dedicated Zernio Profile -> ALLOWED
  // -------------------------------------------------------------------------
  try {
    const ownTenantProfileId = 'tenant-profile-cust-a-888';
    assertMasterZernioAuthorization({
      userId: customerA.userId,
      organizationId: customerA.organizationId,
      workspaceId: customerA.workspaceId,
      targetProfileId: ownTenantProfileId,
      action: 'PUBLISH_POST',
    });
    recordResult('Customer publish via Own Profile', 'Allowed', 'Allowed (PASS)', true);
  } catch (err: any) {
    recordResult('Customer publish via Own Profile', 'Allowed', `Denied: ${err.message}`, false);
  }

  // -------------------------------------------------------------------------
  // TEST 9: Database Immutability Check in Supabase
  // -------------------------------------------------------------------------
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const { data: dbProfiles } = await supabase
    .from('social_provider_profiles')
    .select('*')
    .eq('provider_profile_id', MASTER_PLATFORM_ZERNIO_PROFILE_ID);

  const masterDbProf = dbProfiles?.[0];
  const dbBoundProperly =
    masterDbProf &&
    masterDbProf.user_id === PLATFORM_ADMIN_USER_ID &&
    masterDbProf.status === 'ACTIVE' &&
    masterDbProf.metadata?.isPlatformAdmin === true;

  recordResult(
    'Supabase DB Master Profile Immutability & Admin Lock',
    'Bound to PLATFORM_ADMIN (22e61ff6...)',
    dbBoundProperly ? `Bound to ${masterDbProf.user_id} (ACTIVE)` : 'Not locked properly',
    Boolean(dbBoundProperly)
  );

  // -------------------------------------------------------------------------
  // Print Scorecard
  // -------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log('FINAL SCORECARD');
  console.log('================================================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`Total Scenarios Tested: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r.passed).length}`);
  console.log(`Failed: ${results.filter(r => !r.passed).length}`);
  console.log(`Result: ${allPassed ? 'ALL TESTS PASSED (100%)' : 'FAILURES DETECTED'}`);
  console.log('================================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runMasterZernioImmutabilitySuite().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
