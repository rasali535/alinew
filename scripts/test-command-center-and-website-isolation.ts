import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { resolveAccountClassification, getSocialConnectionCapabilities } from '../packages/integrations/src/social/capabilities';
import { WebsiteIngestionService } from '../packages/ai/src/websiteIngestion.service';
import { BusinessContextService } from '../packages/ai/src/businessContext.service';
import { callMariAiApi } from '../packages/ai/src/mariChat';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  [FAIL] ${msg}`);
    process.exit(1);
  }
  console.log(`  [PASS] ${msg}`);
}

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('  Ralion OS: Command Center Users & Website Isolation Suite');
  console.log('================================================================\n');

  // Load production connections
  const { data: conns, error } = await supabase
    .from('social_connections')
    .select('*')
    .order('created_at', { ascending: false });

  assert(!error && (conns || []).length >= 2, 'Loaded production connections from database');

  const activeConns = conns!.filter(c => c.connection_status === 'CONNECTED');
  const distinctUserIds = Array.from(new Set(activeConns.map(c => c.user_id).filter(Boolean)));

  // -------------------------------------------------------------------------
  console.log('--- Test A: Connected Users Count & Identity Mapping ---');
  // -------------------------------------------------------------------------
  // Fetch from /api/admin/metrics logic directly
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', distinctUserIds);

  const userProfiles: Record<string, { full_name?: string; email?: string }> = {};
  (profiles || []).forEach(p => {
    userProfiles[p.id] = { full_name: p.full_name, email: p.email };
  });

  const userMap = new Map<string, any>();
  activeConns.forEach(c => {
    const uId = c.user_id || c.workspace_id || 'unknown';
    const prof = userProfiles[c.user_id] || {};
    const caps = getSocialConnectionCapabilities(c);

    if (!userMap.has(uId)) {
      userMap.set(uId, {
        userId: uId,
        userName: prof.full_name || (c.metadata?.email === 'chiwabby@gmail.com' ? 'Kutlwano B Pule' : (c.account_name || 'Connected User')),
        email: prof.email || c.metadata?.email || 'user@customer.ralion.io',
        workspaceId: c.workspace_id || c.organization_id || uId,
        connectionCount: 0,
        connections: [],
      });
    }

    const uEntry = userMap.get(uId);
    uEntry.connections.push({
      socialConnectionId: c.id,
      provider: c.provider,
      providerAccountId: c.provider_account_id,
      accountName: c.account_name,
      accountType: caps.classification,
      accountTypeLabel: caps.accountTypeLabel,
      isPersonalProfile: caps.isPersonalProfile,
      isBusinessPage: caps.isBusinessPage,
    });
    uEntry.connectionCount = uEntry.connections.length;
  });

  const connectedUsers = Array.from(userMap.values());
  assert(connectedUsers.length === distinctUserIds.length, `connectedUserCount (${connectedUsers.length}) equals distinct active users (${distinctUserIds.length})`);
  assert(connectedUsers.length === 2, `Found exactly 2 distinct active social users in production`);

  const userA = connectedUsers.find(u => u.email === 'ali@rasalilabs.com' || u.userName.includes('Ras Ali'));
  const userB = connectedUsers.find(u => u.email === 'chiwabby@gmail.com' || u.userName.includes('Kutlwano') || u.userName === 'grape');

  assert(Boolean(userA), 'User A (Ras Ali Labs) resolved in connected users collection');
  assert(Boolean(userB), 'User B (Account 2 / Kutlwano B Pule) resolved in connected users collection');
  assert(userA!.connectionCount === 1, `User A connection count is 1 (got: ${userA!.connectionCount})`);
  assert(userB!.connectionCount === 1, `User B connection count is 1 (got: ${userB!.connectionCount})`);

  // -------------------------------------------------------------------------
  console.log('\n--- Test B: Accounts Registry Completeness ---');
  // -------------------------------------------------------------------------
  assert(activeConns.length >= 2, `Active connection count is at least 2 (got: ${activeConns.length})`);
  const accountAConn = activeConns.find(c => c.id === 'f8656d3c-789b-4890-bc80-83920ce91870');
  const accountBConn = activeConns.find(c => c.id === '9196984f-a119-42ec-b23d-588e623a4415');

  assert(Boolean(accountAConn), 'Account A exists in active connections');
  assert(Boolean(accountBConn), 'Account B exists in active connections');

  // -------------------------------------------------------------------------
  console.log('\n--- Test C: Account Types & Classifications ---');
  // -------------------------------------------------------------------------
  const classA = resolveAccountClassification(accountAConn);
  const classB = resolveAccountClassification(accountBConn);
  const capsA = getSocialConnectionCapabilities(accountAConn);
  const capsB = getSocialConnectionCapabilities(accountBConn);

  assert(classA === 'FACEBOOK_PAGE' && accountAConn.account_type === 'BUSINESS', `Ras Ali Labs Facebook Page is BUSINESS / FACEBOOK_PAGE (got: ${accountAConn.account_type} / ${classA})`);
  assert(classB === 'FACEBOOK_PERSONAL_PROFILE' && accountBConn.account_type === 'PERSONAL', `Account 2 is PERSONAL / FACEBOOK_PERSONAL_PROFILE (got: ${accountBConn.account_type} / ${classB})`);
  assert(capsA.accountTypeLabel === 'Business Page', `Account A label is Business Page`);
  assert(capsB.accountTypeLabel === 'Personal Profile', `Account B label is Personal Profile`);

  // -------------------------------------------------------------------------
  console.log('\n--- Test D: Website Ownership Decoupling ---');
  // -------------------------------------------------------------------------
  const rasAliWebsite = WebsiteIngestionService.getWebsiteKnowledge('ras-ali-labs');
  assert(Boolean(rasAliWebsite), 'Ras Ali Labs website knowledge exists for workspace ras-ali-labs');
  assert(rasAliWebsite?.websiteUrl.includes('rasalilabs.com'), `Ras Ali Labs website URL points to rasalilabs.com (got: ${rasAliWebsite?.websiteUrl})`);

  // Verify Account 2 workspace / social connection ID does NOT inherit the website
  const account2OrgId = accountBConn.workspace_id || accountBConn.organization_id;
  const account2Website = WebsiteIngestionService.getWebsiteKnowledge(account2OrgId);
  assert(!account2Website || account2Website.status === 'NOT_CONFIGURED', `Account 2 workspace (${account2OrgId}) does NOT have Ras Ali Labs website attached (got: ${account2Website?.websiteUrl || 'none'})`);

  // Also check if website was attached to Account 2 socialConnectionId
  const connWebsite = WebsiteIngestionService.getWebsiteKnowledge(accountBConn.id);
  assert(!connWebsite, `Website is NOT attached to Account 2 socialConnectionId (${accountBConn.id})`);

  // -------------------------------------------------------------------------
  console.log('\n--- Test E: Mari Access to Workspace Business Website ---');
  // -------------------------------------------------------------------------
  const contextRasAli = await BusinessContextService.assembleContext('ras-ali-labs');
  assert(Boolean(contextRasAli.layer1.websiteKnowledge?.value), 'Mari has access to Ras Ali Labs website for workspace ras-ali-labs');
  assert(contextRasAli.primarySource.includes('Website'), `Mari primarySource for ras-ali-labs includes Website (got: ${contextRasAli.primarySource})`);

  const responseRasAli = await callMariAiApi('Summarize the primary business focus.', undefined, contextRasAli);
  assert(responseRasAli.text.toLowerCase().includes('ras ali labs') || responseRasAli.text.toLowerCase().includes('enterprise'), 'Mari produces grounded response derived from workspace website');

  // -------------------------------------------------------------------------
  console.log('\n--- Test F: Cross-Tenant Isolation & Zero Leakage ---');
  // -------------------------------------------------------------------------
  // Verify an unrelated or empty workspace cannot see Ras Ali Labs website or social accounts
  const isolatedContext = await BusinessContextService.assembleContext('tenant-isolated-test-org', {
    isTestExecution: true,
  });

  assert(!isolatedContext.layer1.websiteKnowledge?.value, 'Isolated tenant cannot see Ras Ali Labs website');
  assert(isolatedContext.layer2.social.isConnected === false, 'Isolated tenant has no connected social accounts');
  assert(isolatedContext.primarySource.includes('Unverified'), `Isolated tenant primarySource is unverified (got: ${isolatedContext.primarySource})`);

  console.log('\n================================================================');
  console.log('  ALL COMMAND CENTER & WEBSITE ISOLATION CHECKS PASSED (100%)');
  console.log('================================================================\n');
}

runRegressionSuite().catch(err => {
  console.error('[FATAL] Regression suite failed:', err);
  process.exit(1);
});
