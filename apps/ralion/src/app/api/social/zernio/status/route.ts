import { NextRequest } from 'next/server';
import { ZernioSocialService, SocialPlatformType } from '@ralion/integrations';
import { SocialProviderRouter } from '@/lib/services/social/socialProviderRouter.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export type ZernioConnectionState =
  | 'ZERNIO_NOT_CONFIGURED'
  | 'ZERNIO_CONFIGURED'
  | 'ZERNIO_CONNECTED'
  | 'ZERNIO_CONNECTION_FAILED';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const health = await ZernioSocialService.checkApiHealth();

    let connectionState: ZernioConnectionState = 'ZERNIO_NOT_CONFIGURED';
    if (!health.configured) {
      connectionState = 'ZERNIO_NOT_CONFIGURED';
    } else if (health.reachable) {
      connectionState = 'ZERNIO_CONNECTED';
    } else if (health.error) {
      connectionState = 'ZERNIO_CONNECTION_FAILED';
    } else {
      connectionState = 'ZERNIO_CONFIGURED';
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
      configured: health.configured,
      reachable: health.reachable,
      latencyMs: health.latencyMs,
      profileCount: health.profileCount,
      featureFlags,
      testedEndpoint: 'https://zernio.com/api/v1/profiles',
      error: health.error ? 'Connection test failed: server was unable to verify remote endpoint.' : undefined,
      checkedAt: new Date().toISOString(),
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse(
      {
        success: false,
        status: 'ZERNIO_CONNECTION_FAILED' as ZernioConnectionState,
        configured: ZernioSocialService.isConfigured(),
        reachable: false,
        testedEndpoint: 'https://zernio.com/api/v1/profiles',
        error: 'Unexpected server-side error during health probe.',
        checkedAt: new Date().toISOString(),
      },
      { status: 500 },
      request
    );
  }
}
