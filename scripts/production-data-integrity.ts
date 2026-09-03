/**
 * Ralion OS — Master Production Data Integrity & Multi-Account Isolation Verification
 * Ras Ali Labs (Pty) Ltd
 *
 * Strict validation:
 * 1. Multi-Account Post Isolation (Account A vs Account B)
 * 2. Admin Control Center Multi-Account & Distinct User Counts
 * 3. Mari AI Real Business Learning Gate (Zero fake pipeline, zero fake reach)
 * 4. Security & Credential Hygiene (Zero hardcoded service-role secrets)
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { FacebookPageManagementService } from '../apps/ralion/src/lib/services/social/facebookPageManagement.service';
import { BusinessContextService } from '../packages/ai/src/businessContext.service';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[FAIL] SUPABASE_SERVICE_ROLE_KEY is required to run integrity tests.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function assertStrict(condition: boolean, testName: string, detail?: string) {
  if (!condition) {
    console.error(`  [FAIL] ${testName}`);
    if (detail) console.error(`         Detail: ${detail}`);
    process.exit(1);
  }
  console.log(`  [PASS] ${testName}`);
}

async function runIntegritySuite() {
  console.log('================================================================');
  console.log('  Ralion OS: Master Production Data Integrity Verification');
  console.log('================================================================\n');

  // -----------------------------------------------------------------
  // 1. Social Connections Registry Validation
  // -----------------------------------------------------------------
  console.log('--- Test Group 1: Multi-Account Connection Registry ---');
  const { data: conns, error: connErr } = await supabase
    .from('social_connections')
    .select('id, provider, provider_account_id, account_name, user_id, workspace_id, connection_status, zernio_profile_id')
    .order('created_at', { ascending: true });

  assertStrict(!connErr && Boolean(conns), 'Query social_connections table successfully');
  assertStrict((conns?.length || 0) >= 2, `Found ${conns?.length} registered social connections (>= 2 required)`);

  const connA = conns?.find(c => c.provider_account_id === '477334159265235' || c.account_name?.toLowerCase().includes('ras ali')) || conns?.[0];
  const connB = conns?.find(c => c.id !== connA?.id);

  assertStrict(Boolean(connA), `Account A resolved: ${connA?.account_name} (${connA?.id})`);
  assertStrict(Boolean(connB), `Account B resolved: ${connB?.account_name} (${connB?.id})`);
  assertStrict(connA?.id !== connB?.id, 'Account A and Account B have distinct connection IDs');

  // -----------------------------------------------------------------
  // 2. Multi-Account Post Isolation & Provider Dispatch
  // -----------------------------------------------------------------
  console.log('\n--- Test Group 2: Post Isolation & Zero Cross-Account Bleed ---');
  
  // Query posts for Account A
  const postsA = await FacebookPageManagementService.getPagePosts({
    socialConnectionId: connA!.id,
    pageId: connA!.provider_account_id,
    limit: 20,
  });
  console.log(`  Account A (${connA!.account_name}): Loaded ${postsA.length} posts`);

  // Query posts for Account B
  const postsB = await FacebookPageManagementService.getPagePosts({
    socialConnectionId: connB!.id,
    pageId: connB!.provider_account_id,
    limit: 20,
  });
  console.log(`  Account B (${connB!.account_name}): Loaded ${postsB.length} posts`);

  // Critical Assertions
  const aPostIds = new Set(postsA.map((p: any) => p.id));
  const leakedPosts = postsB.filter((p: any) => aPostIds.has(p.id));

  assertStrict(leakedPosts.length === 0, 'Zero posts from Account A leaked into Account B dataset', 
    leakedPosts.length > 0 ? `Leaked post IDs: ${leakedPosts.map((p: any) => p.id).join(', ')}` : undefined);

  if (connB?.zernio_profile_id === null || !connB?.zernio_profile_id) {
    assertStrict(postsB.length === 0, 'Account B without remote post capability correctly returns 0 posts (truth over appearance)');
  }

  // -----------------------------------------------------------------
  // 3. Admin Control Center Isolation & Distinct User Metrics
  // -----------------------------------------------------------------
  console.log('\n--- Test Group 3: Admin Control Center User & Connection Metrics ---');
  const activeConns = conns!.filter(c => c.connection_status === 'CONNECTED');
  const distinctUsers = new Set(activeConns.map(c => c.user_id || c.workspace_id).filter(Boolean));

  assertStrict(activeConns.length >= 2, `Active social connections count: ${activeConns.length}`);
  assertStrict(distinctUsers.size >= 1, `Distinct connected users count: ${distinctUsers.size}`);
  
  // -----------------------------------------------------------------
  // 4. Mari AI Real Business Learning Gate
  // -----------------------------------------------------------------
  console.log('\n--- Test Group 4: Mari AI Real Business Learning Gate ---');
  
  // State A: Empty workspace (no contacts, no tasks, no documents)
  const emptyContext = await BusinessContextService.assembleContext('isolated-test-workspace', {
    localOverrides: {
      contacts: [],
      tasks: [],
      documents: [],
    },
  });

  assertStrict(emptyContext.layer2.crm.totalPipelineValue.value === 0, 'Empty workspace reports $0 pipeline (no fake $84,500)');
  assertStrict(emptyContext.layer2.crm.activeCustomersCount.value === 0, 'Empty workspace reports 0 active customers (no fake 5 clients)');
  assertStrict(emptyContext.layer2.crm.prospectsCount.value === 0, 'Empty workspace reports 0 prospects (no fake 3 prospects)');
  assertStrict(emptyContext.layer2.operations.pendingTasksCount.value === 0, 'Empty workspace reports 0 pending tasks');
  assertStrict(emptyContext.layer2.social.reachGrowthPct.value === 0, 'Empty workspace reports 0.0% reach growth (no fake 38.4%)');
  assertStrict(emptyContext.layer2.social.engagementRatePct.value === 0, 'Empty workspace reports 0.0% engagement rate (no fake 4.8%)');
  assertStrict(emptyContext.credits.used === 0, 'Mari credits used is 0 (no fake 1,580)');

  // Learning Gate: Unconnected workspace has unverified knowledge
  assertStrict(emptyContext.layer1.companyName.provenance === 'UNVERIFIED', 'Unconnected workspace companyName is UNVERIFIED');
  assertStrict(emptyContext.layer1.productsAndServices.value.length === 0, 'Unconnected workspace has 0 fabricated products');

  // -----------------------------------------------------------------
  // 5. Credential Security Check
  // -----------------------------------------------------------------
  console.log('\n--- Test Group 5: Zero Hardcoded Service Role Secrets in Core Files ---');
  const fs = require('fs');
  const coreFiles = [
    'apps/ralion/src/lib/auth/serverAuth.ts',
    'apps/ralion/src/lib/services/social.service.ts',
    'apps/ralion/src/lib/services/social/facebookPageManagement.service.ts',
    'apps/ralion/src/lib/services/social/socialTokenManager.service.ts',
    'apps/ralion/src/lib/services/social/socialPublishing.service.ts',
    'apps/ralion/src/lib/services/social/socialProviderRouter.service.ts',
    'apps/ralion/src/lib/services/social/socialProviderOrchestrator.service.ts',
    'packages/ai/src/mariChat.ts',
    'packages/ai/src/aimlClient.ts',
    'packages/ai/src/businessContext.service.ts',
  ];

  for (const f of coreFiles) {
    const content = fs.readFileSync(f, 'utf-8');
    assertStrict(!content.includes('mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA'), `File ${f} does not contain leaked service role JWT`);
    assertStrict(!content.includes('AQ.Ab8RN6LHIgVR8Zti6ifRmdpEKXKguMi1mbTZ951Mdn0mFzBhxA'), `File ${f} does not contain hardcoded Gemini API key`);
  }

  console.log('\n================================================================');
  console.log('  ALL INTEGRITY & MULTI-ACCOUNT ISOLATION CHECKS PASSED (100%)');
  console.log('================================================================\n');
}

runIntegritySuite().catch((err) => {
  console.error('[FATAL] Test execution failed:', err);
  process.exit(1);
});
