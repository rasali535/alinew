// =====================================================================
// Worker process for Multi-Process Social Publishing Concurrency Test
// Runs in its own separate Node.js OS process.
// =====================================================================

import './preload-server-only.cjs';
import { SocialPublishingService } from '../apps/ralion/src/lib/services/social/socialPublishing.service';
import { SocialProviderRegistry } from '../packages/integrations/src/social/SocialProviderRegistry';
import { SocialProvider } from '../packages/integrations/src/social/SocialProvider';
import {
  SocialPlatformType,
  SocialCapabilities,
  SocialProfile,
  SocialAuthResult,
  PublishContentParams,
  PublishResponse,
  SocialAnalyticsResult,
  SocialMessagePayload,
  SocialMessageResult,
  ConnectionHealthResult,
} from '../packages/integrations/src/social/types';

class MockFacebookProvider extends SocialProvider {
  readonly platform: SocialPlatformType = 'facebook';
  readonly displayName = 'Mock Facebook Provider';
  readonly defaultScopes = ['pages_show_list', 'pages_manage_posts'];

  getCapabilities(): SocialCapabilities {
    return {
      canPublish: true,
      canPublishText: true,
      canPublishImage: true,
      canPublishVideo: true,
      canPublishReels: true,
      canPublishCarousel: true,
      canSchedule: true,
      canReadAnalytics: true,
      canManageComments: true,
      canSendDirectMessages: false,
    };
  }

  getAuthorizationUrl(): string {
    return 'https://mock.local/oauth';
  }

  async handleCallback(): Promise<SocialAuthResult> {
    return { success: true, accessToken: 'mock-access-token' };
  }

  async refreshToken(): Promise<{ accessToken: string }> {
    return { accessToken: 'mock-refreshed-token' };
  }

  async getProfile(): Promise<SocialProfile> {
    return { id: 'fb-page-12345', name: 'Mock Page', platform: 'facebook' };
  }

  async publish(accessToken: string, params: PublishContentParams): Promise<PublishResponse> {
    return {
      success: true,
      postId: `fb-post-${Date.now()}`,
      platform: 'facebook',
      publishedAt: new Date().toISOString(),
    };
  }

  async deletePost(): Promise<boolean> {
    return true;
  }

  async getAnalytics(): Promise<SocialAnalyticsResult> {
    return { metrics: [] };
  }

  async sendMessage(): Promise<SocialMessageResult> {
    return { success: true };
  }

  async revokeAccess(): Promise<boolean> {
    return true;
  }

  async healthCheck(): Promise<ConnectionHealthResult> {
    return { healthy: true, status: 'CONNECTED', checkedAt: new Date().toISOString() };
  }
}

async function main() {
  const workerId = process.argv[2] || `worker-${process.pid}`;

  // Register mock provider so publishing never hits external Facebook network
  SocialProviderRegistry.registerProvider('facebook', new MockFacebookProvider());

  // Register a mock active Facebook connection for this tenant
  SocialPublishingService.registerMockConnectionForTesting({
    id: 'conn-worker-fb',
    provider: 'facebook',
    provider_account_id: 'fb-page-12345',
    account_name: 'Test Page',
    account_type: 'BUSINESS_PAGE',
    connection_status: 'CONNECTED',
    token_status: 'VALID',
    infrastructure_provider: 'native',
    mock_token: 'mock-valid-token-no-external-calls',
    user_id: 'user-concurrent-1',
    workspace_id: 'ws-concurrent-main',
    organization_id: 'org-concurrent-111',
    metadata: { page_access_token: 'mock-valid-page-token' },
  });

  try {
    const result = await SocialPublishingService.publish({
      userId: 'user-concurrent-1',
      organizationId: 'org-concurrent-111',
      workspaceId: 'ws-concurrent-main',
      title: 'Synchronized Concurrency Test',
      body: 'Testing atomic idempotency claims across multiple separate Node OS processes.',
      platforms: ['facebook'] as any,
      idempotencyKey: 'idemp-fixed-multiprocess-test-key',
    });

    const output = {
      workerId,
      pid: process.pid,
      conflict: Boolean(result.conflict),
      overallStatus: result.overallStatus,
      statusCode: result.statusCode || (result.overallStatus === 'PUBLISHED' ? 200 : 400),
      postId: result.postId,
      errors: result.errors,
      platformResults: result.platformResults,
    };

    console.log(`WORKER_RESULT:${JSON.stringify(output)}`);
    process.exit(0);
  } catch (err: any) {
    const errorOutput = {
      workerId,
      pid: process.pid,
      error: err.message,
      statusCode: err.statusCode || 500,
    };
    console.log(`WORKER_ERROR:${JSON.stringify(errorOutput)}`);
    process.exit(1);
  }
}

main();
