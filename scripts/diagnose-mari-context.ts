import { createClient } from '@supabase/supabase-js';
import { MariUniversalCore } from '@ralion/ai';
import { FacebookConnectionStateService } from '../apps/ralion/src/lib/services/social/facebookConnectionState.service';
import { FacebookPageManagementService } from '../apps/ralion/src/lib/services/social/facebookPageManagement.service';
import * as dotenv from 'dotenv';

dotenv.config();

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const organizationId = process.env.DIAG_ORGANIZATION_ID;
const workspaceId = process.env.DIAG_WORKSPACE_ID;
const userId = process.env.DIAG_USER_ID;
const companyName = process.env.DIAG_COMPANY_NAME;

if (!url || !key) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}
if (!organizationId || !workspaceId || !userId) {
  throw new Error('DIAG_ORGANIZATION_ID, DIAG_WORKSPACE_ID and DIAG_USER_ID are required.');
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

async function diagnose() {
  console.log('====================================================');
  console.log('MARI RUNTIME CONTEXT & FACEBOOK INTEGRATION DIAGNOSIS');
  console.log('====================================================');

  // Do not dump full rows: social/token metadata can contain credentials or customer data.
  const { count: profileCount, error: profileError } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true });
  console.log('\n--- SUPABASE PROFILES ---');
  console.log({ count: profileCount, error: profileError?.message || null });

  const { data: socialRows, error: socialError } = await supabase
    .from('social_connections')
    .select('id, provider, provider_account_id, connection_status, organization_id, workspace_id, user_id')
    .or(`workspace_id.eq.${workspaceId},organization_id.eq.${organizationId},user_id.eq.${userId}`);
  console.log('\n--- TENANT-SCOPED SOCIAL CONNECTIONS ---');
  console.log({ count: socialRows?.length || 0, error: socialError?.message || null });

  const growthStudioState = await FacebookConnectionStateService.resolveFacebookConnectionState({
    tenantId: organizationId,
    workspaceId,
    userId,
  });
  console.log('\n--- GROWTH STUDIO FACEBOOK CONNECTION STATE ---');
  console.log({
    state: growthStudioState.state,
    selectedPageId: growthStudioState.selectedPageId || null,
    availablePages: growthStudioState.availablePages?.map((p: any) => ({ pageId: p.pageId, name: p.name })) || [],
  });

  const activePage = await FacebookPageManagementService.getPrimaryPage({
    organizationId,
    workspaceId,
    userId,
  });
  console.log('\n--- FACEBOOK PAGE MANAGEMENT ACTIVE PAGE ---');
  console.log(activePage ? { pageId: activePage.pageId, name: activePage.name, status: activePage.status } : null);

  console.log('\n--- TESTING MARI UNIVERSAL CORE ---');
  const mariResponse = await MariUniversalCore.processQuery({
    prompt: 'What does my Facebook say about us?',
    organizationId,
    workspaceId,
    userId,
    companyName,
  });

  console.log('\n--- MARI RESPONSE METADATA ---');
  console.log({
    detectedIntent: mariResponse.detectedIntent,
    capabilityMode: mariResponse.capabilityMode,
    tenantId: mariResponse.tenantId,
    companyName: mariResponse.companyName,
  });
}

diagnose().catch((error) => {
  console.error('Mari diagnostic failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
