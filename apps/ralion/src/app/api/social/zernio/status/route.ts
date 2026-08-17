import { NextRequest, NextResponse } from 'next/server';
import { ZernioSocialService, SocialPlatformType } from '@ralion/integrations';
import { SocialProviderRouter } from '@/lib/services/social/socialProviderRouter.service';

export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
  try {
    const health = await ZernioSocialService.checkApiHealth();

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

    return NextResponse.json({
      success: true,
      status: health.reachable ? 'healthy' : health.configured ? 'unreachable' : 'not_configured',
      configured: health.configured,
      reachable: health.reachable,
      latencyMs: health.latencyMs,
      profileCount: health.profileCount,
      featureFlags,
      error: health.error,
      checkedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        status: 'error',
        configured: ZernioSocialService.isConfigured(),
        reachable: false,
        error: err.message,
        checkedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
