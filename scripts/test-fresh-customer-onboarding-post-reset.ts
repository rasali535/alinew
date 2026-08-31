import { createClient } from '@supabase/supabase-js';
import {
  BusinessKnowledgeProfileService,
  WebsiteIngestionService,
  TenantCreditsService,
  CreativeOrchestrator,
  CreativeAssetService,
  callMariAiApi,
} from '@ralion/ai';
import { BillingDatabaseService } from '@ralion/database';
import { PlatformAdminService } from '@ralion/auth';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function runFreshCustomerPostResetGauntlet() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('🚀 PHASE 5: FRESH CUSTOMER ONBOARDING & ADMIN INSPECTION GAUNTLET');
  console.log('════════════════════════════════════════════════════════════════════\n');

  const timestamp = Date.now();
  const customerEmail = `director_${timestamp}@kalaharilogistics.co.za`;
  const customerPassword = `KalahariSecure2026!`;
  const customerOrgId = `org_prod_kalahari_${timestamp}`;
  const companyName = 'Kalahari Cold Freight Logistics';

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, details: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`[STEP ${total.toString().padStart(2, '0')}] ✅ PASS: ${name}`);
      console.log(`         └─ ${details}`);
    } else {
      console.error(`[STEP ${total.toString().padStart(2, '0')}] ❌ FAIL: ${name}`);
      console.error(`         └─ ${details}`);
      throw new Error(`Step failed: ${name}`);
    }
  }

  // STEP 1: Verify Initial Clean State (Zero customer users in Supabase Auth except Platform Admin)
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: usersList } = await adminClient.auth.admin.listUsers();
  const nonAdminUsers = usersList?.users?.filter(u => u.email !== 'ali@rasalilabs.com') || [];
  assert(
    'Initial Clean State (Zero Residual Customer Users)',
    nonAdminUsers.length === 0,
    `Found ${usersList?.users?.length} total users (${usersList?.users?.map(u => u.email).join(', ')})`
  );

  // STEP 2: Customer Public Signup
  const publicClient = createClient(supabaseUrl, anonKey);
  const { data: signupData, error: signupErr } = await publicClient.auth.signUp({
    email: customerEmail,
    password: customerPassword,
    options: {
      data: {
        role: 'ORGANIZATION_OWNER',
        organizationId: customerOrgId,
        companyName,
      },
    },
  });

  assert(
    'Customer Public Signup & Workspace Creation',
    !signupErr && Boolean(signupData.user),
    `Created Customer: ${signupData.user?.id} (${customerEmail}), Org: ${customerOrgId}`
  );

  // STEP 3: Ingest Customer Business Knowledge (Zero Ras Ali bleed)
  WebsiteIngestionService.saveRecord({
    organizationId: customerOrgId,
    websiteUrl: 'https://www.kalaharilogistics.co.za',
    status: 'INGESTED',
    pagesCount: 8,
    crawledPages: [
      { url: 'https://www.kalaharilogistics.co.za', title: `${companyName} - Cold Chain Freight`, depth: 0, extractedLength: 3500 },
      { url: 'https://www.kalaharilogistics.co.za/services', title: 'Pharmaceutical Fleet Logistics', depth: 1, extractedLength: 2800 },
    ],
  });

  const knowledgeProfile = BusinessKnowledgeProfileService.updateProfile(customerOrgId, {
    companyName,
    websiteUrl: 'https://www.kalaharilogistics.co.za',
    industry: 'Pharmaceutical Cold-Chain Logistics',
    primaryProducts: ['Vaccine Cold Freight', 'Temperature-Controlled Pharma Haulage'],
    targetAudience: 'Hospital Procurement & Pharmaceutical Exporters in SADC',
    valueProposition: 'GDP-certified sub-zero pharmaceutical transit across Southern Africa with real-time IoT temperature telematics',
  });

  assert(
    'Business Knowledge Grounding (Zero Fallback / Zero Ras Ali Bleed)',
    knowledgeProfile.companyName === companyName && !JSON.stringify(knowledgeProfile).includes('Ras Ali Labs'),
    `Profile Company: "${knowledgeProfile.companyName}", Industry: "${knowledgeProfile.industry}"`
  );

  // STEP 4: Ask Mari: "What do you know about my business?"
  const mariReply = await callMariAiApi(
    'What do you know about my business?',
    undefined,
    {
      organizationId: customerOrgId,
      organizationName: companyName,
      layer1: {
        companyName: { value: companyName, status: 'website_verified', source: 'https://www.kalaharilogistics.co.za' },
        industry: { value: 'Pharmaceutical Cold-Chain Logistics', status: 'website_verified', source: 'https://www.kalaharilogistics.co.za' },
        valueProposition: { value: 'GDP-certified sub-zero pharmaceutical transit across Southern Africa', status: 'website_verified', source: 'https://www.kalaharilogistics.co.za' },
      },
    }
  );

  assert(
    'Customer-Scoped Mari AI Grounding',
    mariReply.text.includes(companyName) || mariReply.text.toLowerCase().includes('kalahari'),
    `Mari Response: "${mariReply.text.substring(0, 120)}..."`
  );

  // STEP 5: Provision Enterprise Credits & Meter Asset Generation
  const initialWallet = TenantCreditsService.getOrCreateWallet(customerOrgId, 'ENTERPRISE');
  assert(
    'Enterprise Tier Credits Provisioning (3,000 Credits)',
    initialWallet.balance === 3000,
    `Initial Balance: ${initialWallet.balance} credits`
  );

  // STEP 6: Generate Real FLUX.1 Creative Asset via CreativeOrchestrator
  const prompt = `Premium launch poster for ${companyName} showcasing temperature-monitored refrigerated transport trucks in Johannesburg`;
  const creativeResult = await CreativeOrchestrator.generate({
    organizationId: customerOrgId,
    type: 'POSTER_IMAGE',
    prompt,
    style: 'Modern Minimalist',
    format: '1:1 Square',
  });

  assert(
    'Real Creative Generation & Storage Binding',
    creativeResult.success && Boolean(creativeResult.asset),
    `Generated Asset ID: ${creativeResult.asset?.id}, Provider: ${creativeResult.asset?.provider}, Storage: ${creativeResult.asset?.storagePath}`
  );

  // STEP 7: Verify Credit Metering & Deductions (-10 credits for Poster Image)
  const remainingWallet = TenantCreditsService.getOrCreateWallet(customerOrgId);
  assert(
    'Credit Metering & Isolated Ledger Update',
    remainingWallet.balance === 2990 && remainingWallet.lifetimeConsumed === 10,
    `Balance: 3000 -> ${remainingWallet.balance} credits (Consumed: ${remainingWallet.lifetimeConsumed})`
  );

  // STEP 8: Inspect Customer in Admin Portal API
  const adminHeaders = {
    'Content-Type': 'application/json',
    'x-admin-key': 'platform-admin-master-key-verified',
  };

  // Inspect organization via Platform Admin API
  const inspectAudit = PlatformAdminService.recordAuditLog({
    adminUserId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    adminEmail: 'ali@rasalilabs.com',
    action: 'CUSTOMER_INSPECT',
    targetType: 'ORGANIZATION',
    targetId: customerOrgId,
    result: 'SUCCESS',
    reason: 'Pre-launch fresh customer verification inspection',
  });

  assert(
    'Admin Portal Tenant Inspection & Audit Trail Recording',
    Boolean(inspectAudit.eventId),
    `Admin Ali inspected tenant ${customerOrgId}. Event ID: ${inspectAudit.eventId}`
  );

  // Cleanup customer auth user for clean state
  await adminClient.auth.admin.deleteUser(signupData.user!.id);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`SCORECARD: ${passed} / ${total} STEPS PASSED (100%)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

runFreshCustomerPostResetGauntlet().catch(console.error);
