import { createClient } from '@supabase/supabase-js';
import { PlatformAdminService } from '@ralion/auth';
import {
  TenantCreditsService,
  BusinessKnowledgeProfileService,
} from '@ralion/ai';
import { BillingDatabaseService } from '@ralion/database';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function runAdminSecuritySuite() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('🛡️ PHASE 4: PLATFORM ADMIN PORTAL & SECURITY SUITE');
  console.log('════════════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, details: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`[TEST ${total.toString().padStart(2, '0')}] ✅ PASS: ${name}`);
      console.log(`         └─ ${details}`);
    } else {
      console.error(`[TEST ${total.toString().padStart(2, '0')}] ❌ FAIL: ${name}`);
      console.error(`         └─ ${details}`);
      throw new Error(`Assertion failed: ${name}`);
    }
  }

  // TEST 1: Verify Platform Admin Account Exists & Can Authenticate
  const publicClient = createClient(supabaseUrl, anonKey);
  const { data: adminLogin, error: adminLoginErr } = await publicClient.auth.signInWithPassword({
    email: 'ali@rasalilabs.com',
    password: 'Ali@na12#',
  });

  assert(
    'Platform Admin Authentication (ali@rasalilabs.com)',
    !adminLoginErr && adminLogin.user?.email === 'ali@rasalilabs.com',
    `Authenticated user: ${adminLogin.user?.id}, Role: ${adminLogin.user?.user_metadata?.role}`
  );

  const adminToken = adminLogin.session?.access_token || '';

  // TEST 2: Adversarial Customer User Creation & Role Check
  const customerEmail = `customer_adversary_${Date.now()}@example.com`;
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: customerData, error: custErr } = await adminClient.auth.admin.createUser({
    email: customerEmail,
    password: 'CustomerPass123!',
    email_confirm: true,
    user_metadata: {
      role: 'ORGANIZATION_OWNER',
      organizationId: 'org_customer_adversary',
      isPlatformAdmin: false,
    },
  });

  assert(
    'Create Customer User for Adversarial Penetration Test',
    !custErr && Boolean(customerData.user),
    `Customer User: ${customerData.user?.id} (${customerEmail})`
  );

  const { data: custLogin } = await publicClient.auth.signInWithPassword({
    email: customerEmail,
    password: 'CustomerPass123!',
  });
  const customerToken = custLogin.session?.access_token || '';

  // TEST 3: Adversarial Check - Customer is NOT Authorized for Admin
  const isCustAdmin = PlatformAdminService.verifyAdminAuthorization(
    custLogin.user?.user_metadata,
    custLogin.user?.email
  );
  assert(
    'Customer Token Rejected by PlatformAdminService',
    isCustAdmin === false,
    'verifyAdminAuthorization correctly returned false for customer role'
  );

  // TEST 4: Platform Admin Token is Authorized
  const isAdminAuthorized = PlatformAdminService.verifyAdminAuthorization(
    adminLogin.user?.user_metadata,
    adminLogin.user?.email
  );
  assert(
    'Platform Admin Token Authorized by PlatformAdminService',
    isAdminAuthorized === true,
    'verifyAdminAuthorization correctly returned true for ali@rasalilabs.com'
  );

  // TEST 5: Mandatory Reason Enforcement on Audit Logging
  let reasonEnforced = false;
  try {
    PlatformAdminService.recordAuditLog({
      adminUserId: adminLogin.user!.id,
      action: 'CONFIGURATION_CHANGE',
      targetType: 'SYSTEM',
      targetId: 'config',
      result: 'SUCCESS',
      reason: '', // Empty reason should throw
    });
  } catch (err: any) {
    reasonEnforced = true;
  }
  assert(
    'Audit Logging Mandatory Reason Enforcement',
    reasonEnforced,
    'PlatformAdminService rejected audit record with empty reason'
  );

  // TEST 6: Audited Credit Adjustment Execution
  const targetOrg = 'org_test_customer_credits_' + Date.now();
  TenantCreditsService.getOrCreateWallet(targetOrg, 'ENTERPRISE');

  const adjustmentReason = 'Promotional enterprise grant for Q3 production trial';
  TenantCreditsService.addCredits(targetOrg, 500, `ADMIN_GRANT: ${adjustmentReason}`);
  const logged = PlatformAdminService.recordAuditLog({
    adminUserId: adminLogin.user!.id,
    adminEmail: adminLogin.user!.email,
    action: 'CREDIT_ADJUST',
    targetType: 'CREDIT',
    targetId: targetOrg,
    result: 'SUCCESS',
    reason: adjustmentReason,
    details: { amount: 500, newBalance: 3500 },
  });

  const wallet = TenantCreditsService.getOrCreateWallet(targetOrg);
  assert(
    'Audited Credit Adjustment Execution & Persistence',
    wallet.balance === 3500 && Boolean(logged.eventId),
    `New Balance: ${wallet.balance} credits. Event ID: ${logged.eventId}`
  );

  // TEST 7: Customer Suspension & Reactivation with Audit Log
  const suspendReason = 'Temporary compliance audit review';
  PlatformAdminService.setCustomerStatus({
    organizationId: targetOrg,
    status: 'SUSPENDED',
    reason: suspendReason,
    adminUserId: adminLogin.user!.id,
    adminEmail: adminLogin.user!.email,
  });

  const isSuspended = PlatformAdminService.isTenantSuspended(targetOrg);
  assert(
    'Tenant Suspension Capability & Audit Recording',
    isSuspended === true,
    `Tenant ${targetOrg} successfully suspended. Reason: "${suspendReason}"`
  );

  PlatformAdminService.setCustomerStatus({
    organizationId: targetOrg,
    status: 'ACTIVE',
    reason: 'Compliance audit cleared successfully',
    adminUserId: adminLogin.user!.id,
    adminEmail: adminLogin.user!.email,
  });

  const isReactivated = !PlatformAdminService.isTenantSuspended(targetOrg);
  assert(
    'Tenant Reactivation Capability & Audit Recording',
    isReactivated === true,
    `Tenant ${targetOrg} successfully reactivated.`
  );

  // TEST 8: Query Audit Trail
  const auditLogs = PlatformAdminService.getAuditLogs({ targetId: targetOrg });
  assert(
    'Immutable Audit Ledger Retrieval',
    auditLogs.length >= 3,
    `Retrieved ${auditLogs.length} audit entries for target ${targetOrg}`
  );

  // Cleanup Adversarial Test User
  await adminClient.auth.admin.deleteUser(customerData.user!.id);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`SCORECARD: ${passed} / ${total} PASSED (100%)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

runAdminSecuritySuite().catch(console.error);
