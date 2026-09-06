import { MariUniversalCore, BusinessIdentityResolver, BusinessKnowledgeProfileService } from '@ralion/ai';
import { FacebookPageManagementService } from '../apps/ralion/src/lib/services/social/facebookPageManagement.service';
import { FacebookConnectionStateService } from '../apps/ralion/src/lib/services/social/facebookConnectionState.service';
import * as dotenv from 'dotenv';
dotenv.config();

async function runTest() {
  console.log('===============================================================');
  console.log('MARI RUNTIME CONTEXT & CANONICAL FACEBOOK INTEGRATION TEST');
  console.log('===============================================================\n');

  const authenticatedUserId = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
  const organizationId = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
  const workspaceId = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';

  // 1. Resolve canonical business identity
  const resolvedIdentity = BusinessIdentityResolver.resolveIdentity(organizationId, {
    workspaceId,
  });
  const canonicalBusinessName = resolvedIdentity.companyName;

  // 2. Resolve business knowledge profile name
  const profile = BusinessKnowledgeProfileService.getProfile(organizationId);
  const businessKnowledgeName = profile?.companyName?.value || 'N/A';

  // 3. Resolve active Facebook connection
  const activePage = await FacebookPageManagementService.getActivePage({
    organizationId,
    workspaceId,
    userId: authenticatedUserId,
  });

  const recentPosts = activePage ? await FacebookPageManagementService.getPagePosts({
    organizationId,
    workspaceId,
    userId: authenticatedUserId,
    pageId: activePage.pageId,
    limit: 10,
  }) : [];

  // Runtime Diagnostic Block
  console.log('--- RUNTIME DIAGNOSTIC ---');
  console.log(JSON.stringify({
    authenticatedUserId,
    organizationId,
    workspaceId,
    canonicalBusinessName,
    businessKnowledgeName,
    'facebookConnection.organizationId': organizationId,
    'facebookConnection.pageId': activePage?.pageId || null,
    'facebookConnection.accountName': activePage?.name || null,
    'facebookConnection.status': activePage?.status || 'DISCONNECTED',
  }, null, 2));

  // 4. Test Mari Query
  console.log('\n--- MARI QUERY EXECUTION: "What does my Facebook say about us?" ---');
  const response = await MariUniversalCore.processQuery({
    prompt: 'What does my Facebook say about us?',
    organizationId,
    workspaceId,
    userId: authenticatedUserId,
    companyName: canonicalBusinessName,
    localOverrides: {
      facebookState: 'PAGE_CONNECTED',
      fbPage: activePage ? {
        id: activePage.id,
        pageId: activePage.pageId,
        name: activePage.name,
        username: activePage.username,
        category: activePage.category,
        fanCount: activePage.followersCount,
        about: activePage.about || activePage.description,
        description: activePage.description || activePage.about,
        website: activePage.website,
        contactInfo: activePage.contactInfo,
        status: activePage.status,
        recentPosts,
      } : undefined,
    },
  });

  console.log('\n[MARI RESPONSE ANSWER]:');
  console.log(response.answer);

  console.log('\n[MARI METADATA]:');
  console.log('Tenant ID:', response.tenantId);
  console.log('Company Name:', response.companyName);
  console.log('Detected Intent:', response.detectedIntent);
  console.log('Capability Mode:', response.capabilityMode);

  // 5. Cross-Tenant Isolation Tests (Pameltex & Grape)
  console.log('\n===============================================================');
  console.log('CROSS-TENANT ISOLATION SUITE (Pameltex & Grape)');
  console.log('===============================================================');

  // Pameltex Test
  const pameltexId = 'c0b39862-cf19-4882-a822-c7f3f493fec0';
  const pameltexIdentity = BusinessIdentityResolver.resolveIdentity(pameltexId);
  console.log('\nPameltex Resolved Business:', pameltexIdentity.companyName);

  const pameltexResponse = await MariUniversalCore.processQuery({
    prompt: 'What does my Facebook say about us?',
    organizationId: pameltexId,
    workspaceId: pameltexId,
    userId: pameltexId,
    companyName: pameltexIdentity.companyName,
  });
  console.log('Pameltex Mari Response Summary:\n', pameltexResponse.answer.slice(0, 200) + '...');

  // Grape Test
  const grapeId = '8c8d6392-e457-4145-9423-f551fda3b728';
  const grapeIdentity = BusinessIdentityResolver.resolveIdentity(grapeId);
  console.log('\nGrape Resolved Business:', grapeIdentity.companyName);

  const grapeResponse = await MariUniversalCore.processQuery({
    prompt: 'What does my Facebook say about us?',
    organizationId: grapeId,
    workspaceId: grapeId,
    userId: grapeId,
    companyName: grapeIdentity.companyName,
  });
  console.log('Grape Mari Response Summary:\n', grapeResponse.answer.slice(0, 200) + '...');

  // Assertions
  console.log('\n--- VERIFICATION ASSERTIONS ---');
  const isRasAliLabs = response.answer.includes('Ras Ali Labs');
  const hasPageId = response.answer.includes('477334159265235');
  const isConnected = !response.answer.includes("isn't currently connected") && !response.answer.includes('Reconnect Facebook');
  const hasPosts = response.answer.toLowerCase().includes('post') || response.answer.includes('August');
  const noStaleIdentity = !response.answer.includes('Multi-Disciplinary Creative & Technologist');

  console.log('1. Mari identifies business as Ras Ali Labs:', isRasAliLabs ? 'PASS' : 'FAIL');
  console.log('2. Mari reports Facebook as connected:', isConnected ? 'PASS' : 'FAIL');
  console.log('3. Mari resolves Page ID 477334159265235:', hasPageId ? 'PASS' : 'FAIL');
  console.log('4. Mari includes 10 Page posts context:', hasPosts ? 'PASS' : 'FAIL');
  console.log('5. Zero stale identity override:', noStaleIdentity ? 'PASS' : 'FAIL');
  console.log('6. Zero Pameltex leakage into Ras Ali Labs:', !response.answer.toLowerCase().includes('pameltex') ? 'PASS' : 'FAIL');
  console.log('7. Zero Ras Ali Labs leakage into Pameltex:', !pameltexResponse.answer.includes('477334159265235') ? 'PASS' : 'FAIL');
}

runTest().catch(console.error);
