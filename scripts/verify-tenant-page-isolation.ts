import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config({ path: '.env' });

import { FacebookConnectionStateService } from '../apps/ralion/src/lib/services/social/facebookConnectionState.service';
import { FacebookPageManagementService } from '../apps/ralion/src/lib/services/social/facebookPageManagement.service';

const RAS_ALI_LABS_TENANT = {
  userId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
  workspaceId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
  organizationId: 'ras-ali-labs',
  expectedPageId: '477334159265235',
  expectedPageName: 'Ras Ali Labs'
};

const PAMELTEX_TENANT = {
  userId: '331c1ca7-bc09-450f-90e8-07cb74459997',
  workspaceId: 'b73a216c-e069-42b7-84a1-002f2324f9f7',
  organizationId: 'b73a216c-e069-42b7-84a1-002f2324f9f7',
  targetPageId: '100127903032713',
  targetPageName: 'Pameltex Consultancy'
};

async function runTenantIsolationVerification() {
  console.log('=================================================================');
  console.log('TENANT FACEBOOK PAGE BINDING & ISOLATION VERIFICATION');
  console.log('=================================================================\n');

  // Test 1: Verify Ras Ali Labs Tenant Binding
  console.log('--- TEST 1: Inspect Ras Ali Labs Tenant Connection State ---');
  FacebookConnectionStateService.invalidateCache();
  const rasAliState = await FacebookConnectionStateService.resolveFacebookConnectionState({
    tenantId: RAS_ALI_LABS_TENANT.organizationId,
    workspaceId: RAS_ALI_LABS_TENANT.workspaceId,
    userId: RAS_ALI_LABS_TENANT.userId,
    forceRefresh: true,
  });

  console.log('Ras Ali Labs State:', rasAliState.state);
  console.log('Ras Ali Labs Selected Page ID:', rasAliState.selectedPageId);
  console.log('Ras Ali Labs Selected Page Name:', rasAliState.selectedPageName);

  const rasAliPass = rasAliState.selectedPageId === RAS_ALI_LABS_TENANT.expectedPageId;
  console.log(`[${rasAliPass ? 'PASS' : 'FAIL'}] Ras Ali Labs is bound to Page ${RAS_ALI_LABS_TENANT.expectedPageId} (${RAS_ALI_LABS_TENANT.expectedPageName})`);

  // Test 2: Verify Pameltex Tenant DOES NOT inherit Ras Ali Labs Page
  console.log('\n--- TEST 2: Inspect Pameltex Tenant Initial State (Zero Leakage) ---');
  const pameltexInitialState = await FacebookConnectionStateService.resolveFacebookConnectionState({
    tenantId: PAMELTEX_TENANT.organizationId,
    workspaceId: PAMELTEX_TENANT.workspaceId,
    userId: PAMELTEX_TENANT.userId,
    forceRefresh: true,
  });

  console.log('Pameltex Initial State:', pameltexInitialState.state);
  console.log('Pameltex Initial Selected Page ID:', pameltexInitialState.selectedPageId);

  const noLeakagePass = pameltexInitialState.selectedPageId !== RAS_ALI_LABS_TENANT.expectedPageId;
  console.log(`[${noLeakagePass ? 'PASS' : 'FAIL'}] Pameltex tenant DID NOT inherit Ras Ali Labs Page ${RAS_ALI_LABS_TENANT.expectedPageId}`);

  // Test 3: Connect Pameltex Consultancy Page to Pameltex Tenant
  console.log('\n--- TEST 3: Connect Pameltex Consultancy Page to Pameltex Tenant ---');
  const { encryptToken } = await import('@ralion/integrations');
  const testToken = 'EAAZAADNhtw90BSWL34RBtg7hZCnZCKIq4Cqw3JGZCJIxkXOCPlQ7OcMByZAx1BoHFRvR40EidXzzsIKU61dAnelPagLzZBISiGM889y0ccZBg2ECUYyZAxH4bJUPwZA4ajfe2r5HGy4fKZBQtgtsKILIySZAFg9oYef5nIARkboNlDscwXNC4TMdSYd41ZBBnzJHJ5cl7bRoXJXvKx4zl5ZBVmdc4UW2XJBLgzkD5xGFgowrcgLqjivDkfUDnbNl0WtMD9FCXu0fn9Urk2sJ7wvcTvLvuU7Df';
  const encToken = encryptToken(testToken);

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
  await supabase.from('social_account_tokens').upsert({
    user_id: PAMELTEX_TENANT.userId,
    provider: 'facebook',
    encrypted_access_token: encToken,
    account_handle: '@pameltex_consultancy_',
    account_label: 'Facebook Profile (Pameltex)',
    page_id: PAMELTEX_TENANT.targetPageId,
    status: 'connected',
    updated_at: new Date().toISOString()
  });

  const connectResult = await FacebookPageManagementService.connectPage({
    organizationId: PAMELTEX_TENANT.organizationId,
    workspaceId: PAMELTEX_TENANT.workspaceId,
    userId: PAMELTEX_TENANT.userId,
    pageId: PAMELTEX_TENANT.targetPageId,
    pageData: {
      name: PAMELTEX_TENANT.targetPageName,
      username: '@pameltex_consultancy_',
      category: 'Consulting agency',
      followersCount: 2,
    },
  });

  console.log('Connect Result Success:', connectResult.success);
  console.log('Destination Page Name:', connectResult.destination?.page_name);

  // Test 4: Verify Both Tenants are Concurrent and Mutually Isolated
  console.log('\n--- TEST 4: Concurrent Tenant Isolation Check ---');
  FacebookConnectionStateService.invalidateCache();
  
  const [rasAliFinal, pameltexFinal] = await Promise.all([
    FacebookConnectionStateService.resolveFacebookConnectionState({
      tenantId: RAS_ALI_LABS_TENANT.organizationId,
      workspaceId: RAS_ALI_LABS_TENANT.workspaceId,
      userId: RAS_ALI_LABS_TENANT.userId,
      forceRefresh: true,
    }),
    FacebookConnectionStateService.resolveFacebookConnectionState({
      tenantId: PAMELTEX_TENANT.organizationId,
      workspaceId: PAMELTEX_TENANT.workspaceId,
      userId: PAMELTEX_TENANT.userId,
      forceRefresh: true,
    }),
  ]);

  console.log('\nFinal Mappings:');
  console.log(`1. Tenant [${RAS_ALI_LABS_TENANT.organizationId}] (User: ${RAS_ALI_LABS_TENANT.userId})`);
  console.log(`   -> State: ${rasAliFinal.state}`);
  console.log(`   -> Page: ${rasAliFinal.selectedPageName} (${rasAliFinal.selectedPageId})`);

  console.log(`\n2. Tenant [${PAMELTEX_TENANT.organizationId}] (User: ${PAMELTEX_TENANT.userId})`);
  console.log(`   -> State: ${pameltexFinal.state}`);
  console.log(`   -> Page: ${pameltexFinal.selectedPageName} (${pameltexFinal.selectedPageId})`);

  const finalIsolationPass = (
    rasAliFinal.selectedPageId === RAS_ALI_LABS_TENANT.expectedPageId &&
    pameltexFinal.selectedPageId === PAMELTEX_TENANT.targetPageId &&
    rasAliFinal.selectedPageId !== pameltexFinal.selectedPageId
  );

  console.log('\n=================================================================');
  if (finalIsolationPass) {
    console.log('✅ ALL TENANT PAGE BINDING & ISOLATION TESTS PASSED PERFECTLY!');
  } else {
    console.log('❌ TENANT ISOLATION FAILED');
  }
  console.log('=================================================================');
}

runTenantIsolationVerification();
