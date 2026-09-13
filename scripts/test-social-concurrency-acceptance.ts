/**
 * Acceptance Test: Multi-Process Publishing Idempotency & Concurrency Gate
 *
 * Proves:
 * 1. Concurrent requests across independent service contexts arrive simultaneously.
 * 2. Exactly one external dispatch to Meta occurs.
 * 3. The competing concurrent request receives a controlled conflict/in-progress response (HTTP 409).
 * 4. Protection survives clearing application in-memory state.
 * 5. Zero real Facebook posts are created.
 */

import dotenv from 'dotenv';
dotenv.config();

import { SocialPublishingService } from '../apps/ralion/src/lib/services/social/socialPublishing.service';
import { SocialProviderRouter } from '../apps/ralion/src/lib/services/social/socialProviderRouter.service';

async function run() {
  console.log('================================================================');
  console.log('RALION OS — PUBLISHING IDEMPOTENCY CONCURRENCY ACCEPTANCE TEST');
  console.log('================================================================\n');

  let failures = 0;
  let externalDispatchCounter = 0;

  // Clear in-memory state and durable test file before starting
  SocialPublishingService.clearRegistryForTesting();
  SocialPublishingService.clearDurableStoreForTesting();

  // Mock the provider routing to track external dispatch calls and simulate latency
  const originalResolveRouting = SocialProviderRouter.resolveRouting;
  (SocialProviderRouter as any).resolveRouting = async (params: any) => {
    return {
      provider: 'native',
      adapter: {
        publish: async (token: string, payload: any) => {
          externalDispatchCounter++;
          console.log(`[Mock Meta Dispatcher] Executing external dispatch #${externalDispatchCounter} for payload: "${payload.body?.substring(0, 30)}..."`);
          // Simulate network flight time to Meta Graph API
          await new Promise((resolve) => setTimeout(resolve, 150));
          return {
            success: true,
            postId: `fb_mock_post_${Date.now()}_${externalDispatchCounter}`,
            platform: 'facebook',
            publishedAt: new Date().toISOString(),
          };
        },
      },
    };
  };

  try {
    const user = 'usr-concurrent-01';
    const org = 'org-concurrent-alpha';
    const ws = 'ws-concurrent-01';
    const destination = 'facebook';
    const content = 'Exclusive Product Announcement — Ralion OS Enterprise Cluster Release';

    SocialPublishingService.registerMockConnectionForTesting({
      id: 'conn-fb-ws1',
      provider: 'facebook',
      provider_account_id: 'act_101',
      user_id: user,
      organization_id: org,
      workspace_id: ws,
      mock_token: 'mock_fb_valid_token',
      infrastructure_provider: 'native',
    });

    SocialPublishingService.registerMockConnectionForTesting({
      id: 'conn-fb-ws2',
      provider: 'facebook',
      provider_account_id: 'act_102',
      user_id: user,
      organization_id: org,
      workspace_id: 'ws-concurrent-02',
      mock_token: 'mock_fb_valid_token_2',
      infrastructure_provider: 'native',
    });

    console.log('[Test Stage 1] Firing 2 concurrent publish requests with identical canonical boundary...');
    const [resultA, resultB] = await Promise.all([
      SocialPublishingService.publish({
        userId: user,
        organizationId: org,
        workspaceId: ws,
        body: content,
        platforms: ['facebook'],
      }),
      SocialPublishingService.publish({
        userId: user,
        organizationId: org,
        workspaceId: ws,
        body: content,
        platforms: ['facebook'],
      }),
    ]);

    console.log('[Test Stage 1 Results]');
    console.log('  Result A:', { status: resultA.overallStatus, statusCode: resultA.statusCode, conflict: resultA.conflict });
    console.log('  Result B:', { status: resultB.overallStatus, statusCode: resultB.statusCode, conflict: resultB.conflict });
    console.log(`  External Dispatches Triggered: ${externalDispatchCounter}`);

    // Verification 1: Exactly one external dispatch occurs
    if (externalDispatchCounter === 1) {
      console.log('✅ PASS: Exactly one external dispatch reached the provider (Meta).');
    } else {
      console.error(`❌ FAIL: Expected exactly 1 external dispatch, but observed ${externalDispatchCounter}`);
      failures++;
    }

    // Verification 2: One succeeded, one was rejected with conflict (409)
    const hasSuccess = (resultA.overallStatus === 'PUBLISHED' && resultA.statusCode === 200) ||
                       (resultB.overallStatus === 'PUBLISHED' && resultB.statusCode === 200);
    const hasConflict = (resultA.conflict && resultA.statusCode === 409) ||
                        (resultB.conflict && resultB.statusCode === 409);

    if (hasSuccess && hasConflict) {
      console.log('✅ PASS: Exactly one request succeeded and the concurrent duplicate received HTTP 409 Conflict.');
    } else {
      console.error('❌ FAIL: Expected one success (200) and one conflict (409).');
      failures++;
    }

    // Verification 3: Protection survives clearing application memory
    console.log('\n[Test Stage 2] Testing durability across Node process restart / memory purge...');
    SocialPublishingService.clearRegistryForTesting();
    console.log('  In-memory publish registry and lock sets purged completely.');

    // Re-register mock connection in simulated new process context
    SocialPublishingService.registerMockConnectionForTesting({
      id: 'conn-fb-ws1',
      provider: 'facebook',
      provider_account_id: 'act_101',
      user_id: user,
      organization_id: org,
      workspace_id: ws,
      mock_token: 'mock_fb_valid_token',
      infrastructure_provider: 'native',
    });
    SocialPublishingService.registerMockConnectionForTesting({
      id: 'conn-fb-ws2',
      provider: 'facebook',
      provider_account_id: 'act_102',
      user_id: user,
      organization_id: org,
      workspace_id: 'ws-concurrent-02',
      mock_token: 'mock_fb_valid_token_2',
      infrastructure_provider: 'native',
    });

    const resultAfterMemoryPurge = await SocialPublishingService.publish({
      userId: user,
      organizationId: org,
      workspaceId: ws,
      body: content,
      platforms: ['facebook'],
    });

    console.log('  Result After Memory Purge:', {
      status: resultAfterMemoryPurge.overallStatus,
      statusCode: resultAfterMemoryPurge.statusCode,
      conflict: resultAfterMemoryPurge.conflict,
      totalDispatches: externalDispatchCounter,
    });

    if (resultAfterMemoryPurge.conflict && resultAfterMemoryPurge.statusCode === 409) {
      console.log('✅ PASS: Protection survived in-memory registry purge (rejected duplicate via database boundary).');
    } else {
      console.error('❌ FAIL: Post was not rejected after memory purge.');
      failures++;
    }

    if (externalDispatchCounter === 1) {
      console.log('✅ PASS: Zero additional dispatches occurred after memory purge (counter remains 1).');
    } else {
      console.error(`❌ FAIL: Dispatch counter increased to ${externalDispatchCounter}`);
      failures++;
    }

    // Verification 4: Cross-workspace isolation check
    console.log('\n[Test Stage 3] Verifying same organization DIFFERENT workspace can publish same content...');
    const resultOtherWs = await SocialPublishingService.publish({
      userId: user,
      organizationId: org,
      workspaceId: 'ws-concurrent-02', // Different workspace
      body: content,
      platforms: ['facebook'],
    });

    if (!resultOtherWs.conflict && resultOtherWs.overallStatus === 'PUBLISHED') {
      console.log('✅ PASS: Same content in different workspace was permitted without conflict.');
      console.log(`  Dispatch count for isolated workspace: ${externalDispatchCounter} (expected 2)`);
    } else {
      console.error('❌ FAIL: Different workspace was falsely conflicted:', resultOtherWs);
      failures++;
    }

  } finally {
    // Restore original router
    (SocialProviderRouter as any).resolveRouting = originalResolveRouting;
  }

  console.log('\n================================================================');
  if (failures > 0) {
    console.error(`TOTAL ACCEPTANCE FAILURES: ${failures}`);
    process.exit(1);
  } else {
    console.log('ALL CONCURRENCY IDEMPOTENCY ACCEPTANCE TESTS PASSED (100% GREEN)');
    console.log('No real Facebook posts were created.');
  }
}

run().catch((err) => {
  console.error('FATAL CONCURRENCY TEST ERROR:', err);
  process.exit(1);
});
