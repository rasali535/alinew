import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SocialPlatformType, ZernioSocialService } from '@ralion/integrations';
import { SocialProviderRouter } from '@/lib/services/social/socialProviderRouter.service';
import { AuditLoggerService } from '@/lib/services/auditLogger.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, workspaceId, organizationId } = body;

    if (!platform) {
      return NextResponse.json({ success: false, error: 'Social platform is required.' }, { status: 400 });
    }

    // Verify user authentication
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { cookie: request.headers.get('cookie') || '' } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'anonymous';

    if (!ZernioSocialService.isConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Zernio social infrastructure is not configured on the server.' },
        { status: 503 }
      );
    }

    // 1. Resolve or provision Zernio Profile for this tenant
    const profileId = await SocialProviderRouter.getOrCreateZernioProfile({
      workspaceId,
      organizationId,
      userId,
    });

    if (!profileId) {
      return NextResponse.json(
        { success: false, error: 'Failed to provision Zernio tenant profile.' },
        { status: 500 }
      );
    }

    // 2. Generate Connect URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackUrl = `${appUrl}/ralion/growth?connected=${platform}&provider=zernio`;
    const { authUrl } = await ZernioSocialService.getConnectUrl(
      platform as SocialPlatformType,
      profileId,
      callbackUrl
    );

    // 3. Log Audit Event
    await AuditLoggerService.log({
      eventType: 'SOCIAL_ACCOUNT_CONNECT_STARTED',
      eventCategory: 'META',
      userId,
      success: true,
      metadata: {
        platform,
        provider: 'zernio',
        profileId,
        workspaceId,
      },
    });

    return NextResponse.json({
      success: true,
      provider: 'zernio',
      platform,
      authUrl,
      profileId,
    });
  } catch (err: any) {
    console.error('[ZernioConnectAPI] Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
