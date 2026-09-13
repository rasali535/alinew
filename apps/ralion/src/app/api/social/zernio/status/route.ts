import { NextRequest } from 'next/server';
import { ZernioSocialService, SocialPlatformType } from '@ralion/integrations';
import { SocialProviderRouter } from '@/lib/services/social/socialProviderRouter.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export type ResilientNetworkConnectionState =
  | 'NETWORK_NOT_CONFIGURED'
  | 'NETWORK_CONFIGURED'
  | 'NETWORK_CONNECTED'
  | 'NETWORK_CONNECTION_FAILED';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const health = await ZernioSocialService.checkApiHealth();

    let connectionState: ResilientNetworkConnectionState = 'NETWORK_NOT_CONFIGURED';
    if (!health.configured) {
      connectionState = 'NETWORK_NOT_CONFIGURED';
    } else if (health.reachable) {
      connectionState = 'NETWORK_CONNECTED';
    } else if (health.error) {
      connectionState = 'NETWORK_CONNECTION_FAILED';
    } else {
      connectionState = 'NETWORK_CONFIGURED';
    }

    const platforms: SocialPlatformType[] = [
      'facebook',
      'instagram',
      'whatsapp',
      'tiktok',
      'linkedin',
      'x',
      'youtube',
      'threads',
      'pinterest',
      'reddit',
      'bluesky',
    ];

    const featureFlags: Record<string, boolean> = {};
    for (const p of platforms) {
      featureFlags[p] = SocialProviderRouter.isZernioEnabledForPlatform(p);
    }

    return corsJsonResponse({
      success: true,
      status: connectionState,
      network: 'Ralion Resilient Delivery Network',
      configured: health.configured,
      reachable: health.reachable,
      latencyMs: health.latencyMs,
      featureFlags,
      error: health.error ? 'Connection test failed: server was unable to verify remote endpoint.' : undefined,
      checkedAt: new Date().toISOString(),
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse(
      {
        success: false,
        status: 'NETWORK_CONNECTION_FAILED' as ResilientNetworkConnectionState,
        network: 'Ralion Resilient Delivery Network',
        configured: ZernioSocialService.isConfigured(),
        reachable: false,
        error: 'Unexpected server-side error during health probe.',
        checkedAt: new Date().toISOString(),
      },
      { status: 500 },
      request
    );
  }
}
