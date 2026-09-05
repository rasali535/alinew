import dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config({ path: 'apps/admin/.env.local' });

import { createClient } from '@supabase/supabase-js';
import { BusinessKnowledgeProfileService } from '../packages/ai/src/businessKnowledgeProfile.service';
import { BillingDatabaseService } from '../packages/database/src/billingDatabase.service';
import { TenantCreditsService } from '../packages/ai/src/tenantCredits.service';
import { WebsiteIngestionService } from '../packages/ai/src/websiteIngestion.service';

async function traceTenantSources() {
  console.log('================================================================');
  console.log('  TRACING TENANT SOURCES FOR /api/admin/customers');
  console.log('================================================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Supabase profiles
  console.log('--- Source 1: Supabase `profiles` ---');
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  if (pErr) console.error('Profiles error:', pErr);
  else {
    profiles?.forEach(p => console.log(`  [profiles] id=${p.id} | email=${p.email} | name=${p.full_name}`));
  }

  // 2. Supabase organizations
  console.log('\n--- Source 2: Supabase `organizations` ---');
  const { data: orgs, error: oErr } = await supabase.from('organizations').select('*');
  if (oErr) console.error('Organizations error:', oErr);
  else {
    orgs?.forEach(o => console.log(`  [organizations] id=${o.id} | name=${o.name} | slug=${o.slug}`));
  }

  // 3. Supabase organization_members
  console.log('\n--- Source 3: Supabase `organization_members` ---');
  const { data: members, error: mErr } = await supabase.from('organization_members').select('*');
  if (mErr) console.error('Members error:', mErr);
  else {
    members?.forEach(m => console.log(`  [org_members] org_id=${m.organization_id} | user_id=${m.user_id} | role=${m.role}`));
  }

  // 4. Supabase social_connections
  console.log('\n--- Source 4: Supabase `social_connections` ---');
  const { data: conns } = await supabase.from('social_connections').select('id, user_id, organization_id, workspace_id, account_name, provider');
  conns?.forEach(c => console.log(`  [social_connections] id=${c.id} | user_id=${c.user_id} | org_id=${c.organization_id} | ws_id=${c.workspace_id} | name=${c.account_name}`));

  // 5. BusinessKnowledgeProfileService
  console.log('\n--- Source 5: BusinessKnowledgeProfileService.listProfiles() ---');
  const bkProfiles = BusinessKnowledgeProfileService.listProfiles();
  bkProfiles.forEach(p => console.log(`  [BusinessKnowledgeProfile] orgId=${p.organizationId} | companyName=${(p.companyName as any)?.value || p.companyName}`));

  // 6. BillingDatabaseService.listSubscriptions()
  console.log('\n--- Source 6: BillingDatabaseService.listSubscriptions() ---');
  const subs = BillingDatabaseService.listSubscriptions();
  subs.forEach(s => console.log(`  [BillingSubscription] orgId=${s.organizationId} | planId=${s.planId} | status=${s.status}`));

  // 7. TenantCreditsService wallets
  console.log('\n--- Source 7: TenantCreditsService ---');
  console.log(`  Registered Wallets`);
}

traceTenantSources().catch(console.error);
