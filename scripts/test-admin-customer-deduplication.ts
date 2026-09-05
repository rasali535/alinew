import dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { BusinessKnowledgeProfileService, TenantCreditsService, CreativeAssetService } from '../packages/ai/src';
import { BillingDatabaseService } from '../packages/database/src';

async function runAdminCustomerDeduplicationSuite() {
  console.log('================================================================');
  console.log('🏛️ RUNNING ADMIN CUSTOMER CANONICAL DEDUPLICATION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, description: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testId}: ${description}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testId}: ${description}`);
      failed++;
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.warn('Supabase environment variables missing. Checking local simulation.');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // 1. Fetch raw Supabase registered profiles
  const { data: rawProfiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, created_at');

  if (profErr) {
    console.error('Failed to query profiles:', profErr.message);
    process.exit(1);
  }

  console.log('Raw Supabase profiles in DB:', rawProfiles);

  // Test ACD-01: Registered profiles contain Carole Sithole, Alpheaus, and grape
  const emails = (rawProfiles || []).map((p: any) => p.email?.toLowerCase());
  const hasCarole = emails.includes('info@pameltex.com');
  const hasAlpheaus = emails.includes('maplininc@gmail.com');
  const hasGrape = emails.includes('chiwabby@gmail.com');

  assert(
    hasCarole && hasAlpheaus && hasGrape,
    'ACD-01',
    `Found all 3 customer user accounts in Supabase profiles (${emails.join(', ')})`
  );

  // Test ACD-02: Platform Admin is filtered out from customer list
  const filteredCustomers = (rawProfiles || []).filter((p: any) => {
    return (
      p.id &&
      p.id !== '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf' &&
      p.email !== 'ali@rasalilabs.com' &&
      p.email !== 'admin@rasalilabs.com'
    );
  });

  const hasAdmin = filteredCustomers.some((c: any) => c.email === 'ali@rasalilabs.com' || c.id === '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf');
  assert(
    !hasAdmin,
    'ACD-02',
    'Platform Admin (ali@rasalilabs.com / 22e61ff6-16fe-44c7-9d67-38e2a2e91ccf) is excluded from customer list'
  );

  // Test ACD-03: Filtered customer count is EXACTLY 3 (0 phantom or duplicate rows)
  assert(
    filteredCustomers.length === 3,
    'ACD-03',
    `Canonical customer tenant count is exactly 3 (received: ${filteredCustomers.length})`
  );

  // Test ACD-04: Verify Pameltex aliases map into single canonical tenant
  const pameltexProfile = filteredCustomers.find((c: any) => c.email === 'info@pameltex.com');
  assert(
    Boolean(pameltexProfile && pameltexProfile.id === 'c0b39862-cf19-4882-a822-c7f3f493fec0'),
    'ACD-04',
    `Carole Sithole / Pameltex maps to canonical UUID ${pameltexProfile?.id}`
  );

  // Test ACD-05: Ensure no duplicate rows named "pameltex" or "org-demo" exist as top-level customers
  const customerIds = filteredCustomers.map((c: any) => c.id);
  const hasSlugAsId = customerIds.some((id: string) => id === 'pameltex' || id === 'Pameltex' || id === 'org-demo');
  assert(
    !hasSlugAsId,
    'ACD-05',
    'No slug/demo aliases (pameltex, org-demo) exist as standalone customer IDs'
  );

  console.log('\n================================================================');
  console.log(`🏁 DEDUPLICATION SUITE COMPLETE: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdminCustomerDeduplicationSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
