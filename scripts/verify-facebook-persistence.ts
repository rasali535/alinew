import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { FacebookPageManagementService } from '../apps/ralion/src/lib/services/social/facebookPageManagement.service';
import { FacebookConnectionStateService } from '../apps/ralion/src/lib/services/social/facebookConnectionState.service';

dotenv.config({ path: path.resolve('apps/ralion/.env.production') });
dotenv.config({ path: path.resolve('.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyPersistenceAndIsolation() {
  console.log('================================================================================');
  console.log('TEST SUITE: FACEBOOK POST-OAUTH PERSISTENCE & GROWTH STUDIO PIPELINE');
  console.log('================================================================================\n');

  const adminUserId = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
  const pageId = '477334159265235';
  const pageName = 'Ras Ali Labs';

  // 1. Execute connectPage for Ras Ali Labs
  console.log('--- 1. EXECUTING FacebookPageManagementService.connectPage ---');
  const connectResult = await FacebookPageManagementService.connectPage({
    organizationId: adminUserId,
    workspaceId: adminUserId,
    userId: adminUserId,
    pageId,
    pageData: {
      pageId,
      name: pageName,
      username: 'rasalilabs',
      followersCount: 108,
      category: 'Information Technology Company',
      status: 'CONNECTED',
    },
  });

  console.log('connectPage result:', JSON.stringify(connectResult, null, 2));

  // 2. Verify social_connections table
  console.log('\n--- 2. VERIFYING social_connections PERSISTENCE ---');
  const { data: conns, error: connErr } = await supabase
    .from('social_connections')
    .select('*')
    .eq('user_id', adminUserId)
    .eq('provider', 'facebook')
    .eq('provider_account_id', pageId)
    .single();

  if (connErr || !conns) {
    throw new Error(`Failed to find persisted social_connections record: ${connErr?.message}`);
  }

  console.log('Persisted social_connections record:', {
    id: conns.id,
    user_id: conns.user_id,
    provider: conns.provider,
    provider_account_id: conns.provider_account_id,
    account_name: conns.account_name,
    username: conns.username,
    account_type: conns.account_type,
    connection_status: conns.connection_status,
    followers_count: conns.followers_count,
    is_page: conns.metadata?.is_page,
    pageId: conns.metadata?.pageId,
  });

  if (conns.connection_status !== 'CONNECTED' || conns.account_type !== 'BUSINESS' || conns.provider_account_id !== pageId) {
    throw new Error(`social_connections record state is invalid: status=${conns.connection_status}, type=${conns.account_type}`);
  }
  console.log('✅ social_connections record verified: CONNECTED as BUSINESS Facebook Page.');

  // 3. Verify social_account_tokens table
  console.log('\n--- 3. VERIFYING social_account_tokens PERSISTENCE ---');
  const { data: sat, error: satErr } = await supabase
    .from('social_account_tokens')
    .select('*')
    .eq('user_id', adminUserId)
    .eq('provider', 'facebook')
    .single();

  console.log('social_account_tokens:', {
    user_id: sat?.user_id,
    page_id: sat?.page_id,
    account_label: sat?.account_label,
    account_handle: sat?.account_handle,
    status: sat?.status,
  });

  if (sat?.page_id !== pageId || sat?.status !== 'connected') {
    throw new Error(`social_account_tokens invalid: page_id=${sat?.page_id}, status=${sat?.status}`);
  }
  console.log('✅ social_account_tokens verified: page_id mapped to Ras Ali Labs.');

  // 4. Verify FacebookConnectionStateService resolution
  console.log('\n--- 4. VERIFYING FacebookConnectionStateService.resolveFacebookConnectionState ---');
  const stateResult = await FacebookConnectionStateService.resolveFacebookConnectionState({
    tenantId: adminUserId,
    workspaceId: adminUserId,
    userId: adminUserId,
    forceRefresh: true,
  });

  console.log('State Machine Output:', {
    state: stateResult.state,
    userConnectionExists: stateResult.userConnectionExists,
    pageAccessible: stateResult.pageAccessible,
    selectedPageId: stateResult.selectedPageId,
    selectedPageName: stateResult.selectedPageName,
    selectedPageFollowers: stateResult.selectedPageFollowers,
    statusMessage: stateResult.statusMessage,
  });

  if (stateResult.state !== 'PAGE_CONNECTED' || stateResult.selectedPageId !== pageId) {
    throw new Error(`State machine did not resolve to PAGE_CONNECTED for ${pageId}: state=${stateResult.state}`);
  }
  console.log('✅ State Machine verified: PAGE_CONNECTED with Ras Ali Labs selected.');

  // 5. Verify /api/social/connections simulation (what Growth Studio frontend loads)
  console.log('\n--- 5. SIMULATING Growth Studio /api/social/connections QUERY ---');
  const { data: activeConnections } = await supabase
    .from('social_connections')
    .select('id, user_id, organization_id, workspace_id, provider, provider_account_id, account_name, username, profile_image_url, account_type, connection_status, followers_count, metadata')
    .or(`workspace_id.eq.${adminUserId},user_id.eq.${adminUserId}`)
    .in('connection_status', ['CONNECTED', 'ACTIVE', 'connected', 'active']);

  console.log(`Growth Studio receives ${activeConnections?.length || 0} active connection(s):`);
  const frontendAccounts = (activeConnections || []).map((c: any) => ({
    id: c.id,
    provider: c.provider,
    label: c.account_name,
    handle: c.username.startsWith('@') ? c.username : `@${c.username}`,
    followers: Number(c.followers_count || 0).toLocaleString(),
    providerAccountId: c.provider_account_id,
  }));

  console.log('Growth Studio connectedAccounts state:', frontendAccounts);

  if (frontendAccounts.length === 0 || frontendAccounts[0].label !== 'Ras Ali Labs' || frontendAccounts[0].handle !== '@rasalilabs') {
    throw new Error('Growth Studio connected accounts mapping failed!');
  }
  console.log(`✅ Growth Studio UI will display: Connected Accounts (${frontendAccounts.length}), Ras Ali Labs (@rasalilabs), 108 followers.`);

  // 6. Verify Strict Multi-Tenant Isolation
  console.log('\n--- 6. VERIFYING STRICT MULTI-TENANT ISOLATION ---');
  const otherTenantIds = [
    '816853f4-0fc4-4cf4-9d5f-c01c508a7aec', // Alpheaus
    '8c8d6392-e457-4145-9423-f551fda3b728', // grape
    'c0b39862-cf19-4882-a822-c7f3f493fec0', // Pameltex
  ];

  for (const tid of otherTenantIds) {
    const { data: foreignConns } = await supabase
      .from('social_connections')
      .select('id, provider_account_id, account_name')
      .or(`workspace_id.eq.${tid},user_id.eq.${tid}`)
      .in('connection_status', ['CONNECTED', 'ACTIVE']);

    const leaked = (foreignConns || []).some(c => c.provider_account_id === pageId);
    if (leaked) {
      throw new Error(`SECURITY LEAK: Tenant ${tid} can see Admin Page ${pageId}!`);
    }
    console.log(`✅ Tenant ${tid} isolation intact: 0 leaked connections from Admin.`);
  }

  console.log('\n================================================================================');
  console.log('ALL PERSISTENCE & ISOLATION CHECKS PASSED (6/6)');
  console.log('================================================================================');
}

verifyPersistenceAndIsolation().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
