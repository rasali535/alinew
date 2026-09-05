import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { BusinessKnowledgeProfileService, TenantCreditsService, CreativeAssetService, BusinessContextService } from '../packages/ai/src';
import { BillingDatabaseService } from '../packages/database/src';
import { PlatformAdminService } from '../packages/auth/src';
import { verifyPlatformAdminRequest } from '../apps/ralion/src/lib/auth/adminAuth';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  [FAIL] ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  [PASS] ${msg}`);
}

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('  RALION OS: Platform Admin & Multi-Tenant Isolation Suite');
  console.log('================================================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const TENANT_A = 'tenant_alpha_enterprise_001';
  const TENANT_B = 'tenant_beta_growth_002';

  // Setup sample isolated data for tenants
  BusinessKnowledgeProfileService.setProfile(TENANT_A, {
    organizationId: TENANT_A,
    companyName: { value: 'Alpha Mining Corp', sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    websiteUrl: { value: 'https://alphamining.example.com', sourceType: 'WEBSITE', confidence: 1.0, lastUpdated: new Date().toISOString() },
    industry: { value: 'Mining & Resources', sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    description: { value: 'Alpha Mining Corp confidential operational context', sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    tagline: { value: 'Sovereign extraction', sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    valuePropositions: { value: ['Safe', 'Efficient'], sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    products: { value: [], sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    services: { value: [], sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    targetMarkets: { value: [], sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    targetCustomers: { value: [], sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    geography: { value: ['Botswana'], sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    brandPositioning: { value: 'Market leader', sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    brandVoice: { value: 'Authoritative', sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    publicContacts: { value: { emails: ['alpha@mining.com'], phones: [], addresses: [] }, sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    socialLinks: { value: {}, sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    sourceUrls: ['https://alphamining.example.com'],
    contentHash: 'hash-alpha-1',
    knowledgeVersion: 1,
    isVerified: true,
  });

  BusinessKnowledgeProfileService.setProfile(TENANT_B, {
    organizationId: TENANT_B,
    companyName: { value: 'Beta Logistics Express', sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    websiteUrl: { value: 'https://betalogistics.example.com', sourceType: 'WEBSITE', confidence: 1.0, lastUpdated: new Date().toISOString() },
    industry: { value: 'Logistics & Freight', sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    description: { value: 'Beta Logistics Express cross-border network', sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    tagline: { value: 'Fast SADC freight', sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    valuePropositions: { value: ['On-time', 'Real-time tracking'], sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    products: { value: [], sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    services: { value: [], sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    targetMarkets: { value: [], sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    targetCustomers: { value: [], sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    geography: { value: ['South Africa', 'Namibia'], sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    brandPositioning: { value: 'Speed leader', sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    brandVoice: { value: 'Dynamic', sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    publicContacts: { value: { emails: ['ops@betalogistics.com'], phones: [], addresses: [] }, sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    socialLinks: { value: {}, sourceType: 'MANUAL', confidence: 1.0, lastUpdated: new Date().toISOString() },
    sourceUrls: ['https://betalogistics.example.com'],
    contentHash: 'hash-beta-1',
    knowledgeVersion: 1,
    isVerified: true,
  });

  BillingDatabaseService.saveSubscription({
    id: `sub_${TENANT_A}`,
    organizationId: TENANT_A,
    planId: 'ENTERPRISE',
    status: 'ACTIVE',
    billingCycle: 'MONTHLY',
    provider: 'manual',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  BillingDatabaseService.saveSubscription({
    id: `sub_${TENANT_B}`,
    organizationId: TENANT_B,
    planId: 'GROWTH',
    status: 'ACTIVE',
    billingCycle: 'MONTHLY',
    provider: 'manual',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  TenantCreditsService.getOrCreateWallet(TENANT_A, 'ENTERPRISE');
  TenantCreditsService.addCredits(TENANT_A, 2000, 'Initial enterprise allocation');
  TenantCreditsService.getOrCreateWallet(TENANT_B, 'PROFESSIONAL');
  TenantCreditsService.addCredits(TENANT_B, 800, 'Initial growth allocation');

  CreativeAssetService.createAssetRecord({
    organizationId: TENANT_A,
    type: 'POSTER_IMAGE',
    status: 'COMPLETED',
    provider: 'FLUX.1',
    publicUrl: 'https://rasalilabs.com/creatives/alpha_poster.png',
    prompt: 'Alpha Mining sovereign industrial poster',
  });

  CreativeAssetService.createAssetRecord({
    organizationId: TENANT_B,
    type: 'VIDEO_REEL',
    status: 'COMPLETED',
    provider: 'CogVideoX',
    publicUrl: 'https://rasalilabs.com/creatives/beta_reel.mp4',
    prompt: 'Beta Logistics freight automation reel',
  });

  // -------------------------------------------------------------------------
  console.log('--- Test A: Tenant A cannot read Tenant B data ---');
  // -------------------------------------------------------------------------
  const profileA = BusinessKnowledgeProfileService.getProfile(TENANT_A);
  const contextA = await BusinessContextService.assembleContext(TENANT_A);
  const assetsA = CreativeAssetService.listAssets(TENANT_A);
  const walletA = TenantCreditsService.getOrCreateWallet(TENANT_A);

  assert(profileA?.organizationId === TENANT_A, 'Tenant A profile matches Tenant A org ID');
  assert(!JSON.stringify(contextA).includes('Beta Logistics'), 'Tenant A context contains NO Tenant B data');
  assert(assetsA.every(a => a.organizationId === TENANT_A), 'Tenant A assets only belong to Tenant A');
  assert(walletA?.organizationId === TENANT_A, 'Tenant A wallet only belongs to Tenant A');

  // -------------------------------------------------------------------------
  console.log('\n--- Test B: Tenant B cannot read Tenant A data ---');
  // -------------------------------------------------------------------------
  const profileB = BusinessKnowledgeProfileService.getProfile(TENANT_B);
  const contextB = await BusinessContextService.assembleContext(TENANT_B);
  const assetsB = CreativeAssetService.listAssets(TENANT_B);
  const walletB = TenantCreditsService.getOrCreateWallet(TENANT_B);

  assert(profileB?.organizationId === TENANT_B, 'Tenant B profile matches Tenant B org ID');
  assert(!JSON.stringify(contextB).includes('Alpha Mining'), 'Tenant B context contains NO Tenant A data');
  assert(assetsB.every(a => a.organizationId === TENANT_B), 'Tenant B assets only belong to Tenant B');
  assert(walletB?.organizationId === TENANT_B, 'Tenant B wallet only belongs to Tenant B');

  // -------------------------------------------------------------------------
  console.log('\n--- Test C: Platform Admin can read authorized aggregate data ---');
  // -------------------------------------------------------------------------
  const adminReq = new NextRequest('http://localhost:6509/api/admin/metrics', {
    headers: { 'x-admin-key': 'platform-admin-master-key-verified' },
  });
  const authRes = await verifyPlatformAdminRequest(adminReq);
  assert(authRes.authorized === true && authRes.user?.role === 'PLATFORM_ADMIN', 'Platform Admin request authorized with master role');

  const { GET: getMetrics } = await import('../apps/ralion/src/app/api/admin/metrics/route');
  const metricsRes = await getMetrics(adminReq);
  const metricsJson = await metricsRes.json();

  assert(metricsRes.status === 200, `Metrics route returns HTTP 200 (got: ${metricsRes.status})`);
  assert(metricsJson.success === true, 'Metrics response indicates success: true');
  assert(typeof metricsJson.data === 'object', 'Metrics data payload is present');

  // -------------------------------------------------------------------------
  console.log('\n--- Test D: Platform Admin cannot mutate tenant data without explicit reason ---');
  // -------------------------------------------------------------------------
  let threwWithoutReason = false;
  try {
    PlatformAdminService.setCustomerStatus({
      organizationId: TENANT_A,
      status: 'SUSPENDED',
      reason: '', // Missing reason
      adminUserId: 'platform-system-admin',
    });
  } catch {
    threwWithoutReason = true;
  }
  assert(threwWithoutReason, 'Platform Admin cannot suspend tenant without mandatory audit reason (min 5 chars)');

  // -------------------------------------------------------------------------
  console.log('\n--- Test E: Command Centre returns real aggregate customer count ---');
  // -------------------------------------------------------------------------
  const totalCustomers = metricsJson.data.totalCustomers;
  assert(typeof totalCustomers === 'number' && totalCustomers >= 2, `Total Customers returns real count >= 2 (got: ${totalCustomers})`);

  const { GET: getCustomers } = await import('../apps/ralion/src/app/api/admin/customers/route');
  const custRes = await getCustomers(adminReq);
  const custJson = await custRes.json();
  assert(custRes.status === 200, `Customers route returns HTTP 200 (got: ${custRes.status})`);
  assert(Array.isArray(custJson.data) && custJson.data.length >= 2, `Customers list contains real tenants (got: ${custJson.data.length})`);

  // -------------------------------------------------------------------------
  console.log('\n--- Test F: Command Centre returns real MRR ---');
  // -------------------------------------------------------------------------
  const estimatedMRR = metricsJson.data.estimatedMRR;
  // TENANT_A (ENTERPRISE = $499) + TENANT_B (GROWTH = $149) = $648 minimum
  assert(typeof estimatedMRR === 'number' && estimatedMRR >= 648, `Estimated MRR aggregates real active subscriptions (got: $${estimatedMRR})`);

  // -------------------------------------------------------------------------
  console.log('\n--- Test G: Command Centre returns real credits data ---');
  // -------------------------------------------------------------------------
  const creditsIssued = metricsJson.data.totalCreditsIssued;
  const creditsConsumed = metricsJson.data.totalCreditsConsumed;
  assert(typeof creditsIssued === 'number' && creditsIssued >= 2800, `Credits issued reflects real tenant wallets (got: ${creditsIssued})`);
  assert(typeof creditsConsumed === 'number', `Credits consumed is a valid numeric value (got: ${creditsConsumed})`);

  // -------------------------------------------------------------------------
  console.log('\n--- Test H: Command Centre returns real creative asset counts ---');
  // -------------------------------------------------------------------------
  const creativeGens = metricsJson.data.creativeGenerations;
  assert(typeof creativeGens === 'object', 'creativeGenerations payload exists');
  assert(creativeGens.total >= 2, `Creative assets total includes all tenant assets (got: ${creativeGens.total})`);
  assert(creativeGens.images >= 1, `Creative image assets count >= 1 (got: ${creativeGens.images})`);
  assert(creativeGens.videos >= 1, `Creative video assets count >= 1 (got: ${creativeGens.videos})`);

  // -------------------------------------------------------------------------
  console.log('\n--- Test I: Connected Users returns real users from database ---');
  // -------------------------------------------------------------------------
  const { GET: getConnectedUsers } = await import('../apps/ralion/src/app/api/admin/connected-users/route');
  const uRes = await getConnectedUsers(adminReq);
  const uJson = await uRes.json();

  assert(uRes.status === 200, `Dedicated Connected Users route returns HTTP 200 (got: ${uRes.status})`);
  assert(uJson.success === true, 'Connected Users response is success: true');
  assert(Array.isArray(uJson.data.users) && uJson.data.users.length >= 2, `Connected users contains real distinct users (got: ${uJson.data.users.length})`);

  const userWithFacebook = uJson.data.users.find((u: any) => u.connections.some((c: any) => c.provider === 'facebook'));
  assert(Boolean(userWithFacebook), 'At least one connected user has an active Facebook/Meta connection');

  // -------------------------------------------------------------------------
  console.log('\n--- Test J: Failed database/auth requests return explicit HTTP status codes & structured errors ---');
  // -------------------------------------------------------------------------
  // Unauthenticated request
  const unauthReq = new NextRequest('http://localhost:6509/api/admin/metrics');
  const unauthRes = await getMetrics(unauthReq);
  const unauthJson = await unauthRes.json();
  assert(unauthRes.status === 401, `Unauthenticated request returns HTTP 401 (got: ${unauthRes.status})`);
  assert(unauthJson.success === false && Boolean(unauthJson.error), 'Unauthenticated response returns structured error');

  // Unauthorized non-admin token
  const fakeUserReq = new NextRequest('http://localhost:6509/api/admin/metrics', {
    headers: { authorization: 'Bearer invalid-token-xyz' },
  });
  const fakeUserRes = await getMetrics(fakeUserReq);
  const fakeUserJson = await fakeUserRes.json();
  assert(fakeUserRes.status === 401 || fakeUserRes.status === 403, `Unauthorized request returns HTTP 401/403 (got: ${fakeUserRes.status})`);
  assert(fakeUserJson.success === false && Boolean(fakeUserJson.error), 'Unauthorized response returns structured error');

  console.log('\n================================================================');
  console.log('  ALL 10 MULTI-TENANT & COMMAND CENTRE TESTS PASSED (100%)');
  console.log('================================================================\n');
}

runRegressionSuite().catch(err => {
  console.error('[FATAL] Multi-tenant regression suite failed:', err);
  process.exit(1);
});
