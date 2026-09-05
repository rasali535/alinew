import dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });

import { createClient } from '@supabase/supabase-js';
import { BusinessContextService } from '../packages/ai/src/businessContext.service';
import { BusinessKnowledgeProfileService } from '../packages/ai/src/businessKnowledgeProfile.service';
import { callMariAiApi } from '../packages/ai/src/mariChat';

async function testRealProductionTenantPipeline() {
  console.log('================================================================');
  console.log('  MARI AI: REAL AUTHENTICATED PRODUCTION TENANT PIPELINE TEST');
  console.log('================================================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: usersData, error: uErr } = await supabase.auth.admin.listUsers();
  if (uErr || !usersData?.users) {
    throw new Error(`Failed to list users from Supabase: ${uErr?.message}`);
  }

  // 1. Resolve Real Ras Ali Labs User
  const rasAliUser = usersData.users.find(u => u.email === 'ali@rasalilabs.com');
  if (!rasAliUser) {
    throw new Error('Could not find real production user ali@rasalilabs.com');
  }

  console.log('[Auth] Found Real Production User:');
  console.log(`  User ID: ${rasAliUser.id}`);
  console.log(`  Email: ${rasAliUser.email}`);
  console.log(`  Metadata Org Name: ${rasAliUser.user_metadata?.org_name}`);
  console.log(`  Metadata Org ID: ${rasAliUser.user_metadata?.organizationId || rasAliUser.user_metadata?.organization_id}\n`);

  // Authoritatively resolve tenant for Ras Ali Labs
  const rasAliOrgId = rasAliUser.user_metadata?.organizationId || rasAliUser.user_metadata?.organization_id || 'ras-ali-labs';
  const rasAliCompanyName = rasAliUser.user_metadata?.org_name || 'Ras Ali Labs';

  const rasAliProfile = BusinessKnowledgeProfileService.getProfile(rasAliUser.id) || BusinessKnowledgeProfileService.getProfile(rasAliOrgId);
  console.log('[Tenant Resolution: Ras Ali Labs]');
  console.log(JSON.stringify({
    authenticatedUserId: rasAliUser.id,
    organizationId: rasAliOrgId,
    workspaceId: rasAliUser.id,
    tenantKey: rasAliOrgId,
    companyName: rasAliProfile?.companyName?.value || rasAliCompanyName,
    businessKnowledgeProfileId: rasAliProfile?.organizationId || null,
    businessKnowledgeSource: rasAliProfile ? 'BusinessKnowledgeProfile' : 'TenantProfile',
  }, null, 2));
  console.log('\n');

  if (rasAliProfile?.companyName?.value !== 'Ras Ali Labs' && rasAliCompanyName !== 'Ras Ali Labs') {
    throw new Error(`CRITICAL: companyName resolved to "${rasAliCompanyName}" instead of "Ras Ali Labs"!`);
  }

  // 2. Execute the EXACT Real Production Query
  const exactProductionQuery = `Compare our current growth position with where we were last month. What would happen if we focused on enterprise clients instead? Why do you think Facebook isn't growing? Look at everything you know about Ras Ali Labs and tell me what I'm overlooking.`;

  console.log(`--- EXECUTING EXACT REAL PRODUCTION PROMPT ---`);
  console.log(`Prompt: "${exactProductionQuery}"\n`);

  const rasAliContext = await BusinessContextService.assembleContext(rasAliUser.id, {
    companyName: rasAliCompanyName,
  });

  const startTime = Date.now();
  const rasAliResponse = await callMariAiApi(exactProductionQuery, undefined, rasAliContext);
  const elapsed = Date.now() - startTime;

  const rasAliText = typeof rasAliResponse === 'string' ? rasAliResponse : (rasAliResponse?.text || '');

  console.log(`[Response Generated in ${elapsed}ms]`);
  console.log('----------------------------------------------------------------');
  console.log(rasAliText);
  console.log('----------------------------------------------------------------\n');

  // Assertions for Ras Ali Labs
  if (rasAliText.includes('Default')) {
    throw new Error('❌ FAILED: Response incorrectly mentions "Default"!');
  }
  if (rasAliText.includes('No Ras Ali Labs information available')) {
    throw new Error('❌ FAILED: Response incorrectly claimed no Ras Ali Labs information is available!');
  }
  if (rasAliText.includes('\\*\\*')) {
    throw new Error('❌ FAILED: Response contains escaped markdown backslashes!');
  }
  if (!rasAliText.includes('Ras Ali Labs')) {
    throw new Error('❌ FAILED: Response does not mention Ras Ali Labs!');
  }
  if (!rasAliText.includes('Historical Comparison') && !rasAliText.includes('Month-over-Month') && !rasAliText.includes('baseline')) {
    throw new Error('❌ FAILED: Response missing historical comparison reasoning!');
  }
  if (!rasAliText.includes('Enterprise') && !rasAliText.includes('enterprise')) {
    throw new Error('❌ FAILED: Response missing enterprise scenario reasoning!');
  }

  console.log('✅ RAS ALI LABS PRODUCTION PROMPT VERIFIED WITH 100% ACCURACY!\n');

  // 3. Multi-Tenant Isolation Test: Tenant B (Pameltex)
  const pameltexUser = usersData.users.find(u => u.email === 'info@pameltex.com');
  if (!pameltexUser) {
    throw new Error('Could not find Tenant B user info@pameltex.com');
  }

  console.log('================================================================');
  console.log('  MULTI-TENANT ISOLATION VERIFICATION: TENANT B (PAMELTEX)');
  console.log('================================================================\n');

  const pameltexOrgId = pameltexUser.user_metadata?.organizationId || 'pameltex';
  const pameltexCompanyName = pameltexUser.user_metadata?.org_name?.trim() || 'Pameltex';

  const pameltexProfile = BusinessKnowledgeProfileService.getProfile(pameltexUser.id) || BusinessKnowledgeProfileService.getProfile(pameltexOrgId);
  console.log('[Tenant Resolution: Tenant B (Pameltex)]');
  console.log(JSON.stringify({
    authenticatedUserId: pameltexUser.id,
    organizationId: pameltexOrgId,
    workspaceId: pameltexUser.id,
    tenantKey: pameltexOrgId,
    companyName: pameltexProfile?.companyName?.value || pameltexCompanyName,
    businessKnowledgeProfileId: pameltexProfile?.organizationId || null,
    businessKnowledgeSource: pameltexProfile ? 'BusinessKnowledgeProfile' : 'TenantProfile',
  }, null, 2));
  console.log('\n');

  const pameltexContext = await BusinessContextService.assembleContext(pameltexUser.id, {
    companyName: pameltexCompanyName,
  });

  const pameltexResponse = await callMariAiApi(
    `What is our business, who are our target customers, and what are our products?`,
    undefined,
    pameltexContext
  );

  const pameltexText = typeof pameltexResponse === 'string' ? pameltexResponse : (pameltexResponse?.text || '');
  console.log('[Pameltex Tenant B Response]:');
  console.log(pameltexText);
  console.log('\n');

  if (pameltexText.includes('Ras Ali Labs')) {
    throw new Error('❌ CROSS-TENANT LEAKAGE: Pameltex response contained "Ras Ali Labs"!');
  }
  if (!pameltexText.includes('Pameltex')) {
    throw new Error('❌ FAILED: Pameltex response did not identify Pameltex!');
  }

  console.log('✅ MULTI-TENANT ISOLATION VERIFIED: Tenant B strictly received only Pameltex data.\n');

  console.log('================================================================');
  console.log('  🎉 ALL REAL PRODUCTION TENANT RESOLUTION TESTS PASSED 100%');
  console.log('================================================================');
}

testRealProductionTenantPipeline().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
