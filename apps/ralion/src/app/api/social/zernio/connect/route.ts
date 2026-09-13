import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SocialPlatformType, ZernioSocialService } from '@ralion/integrations';
import { SocialProviderRouter } from '@/lib/services/social/socialProviderRouter.service';
import { AuditLoggerService } from '@/lib/services/auditLogger.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, workspaceId, organizationId } = body;

    if (!platform) {
      return corsJsonResponse({ success: false, error: 'Social platform is required.' }, { status: 400 }, request);
    }

    // Verify user authentication
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: { cookie: request.headers.get('cookie') || '' } },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'anonymous';

    if (!ZernioSocialService.isConfigured()) {
      return corsJsonResponse(
        { success: false, error: 'Ralion Resilient Delivery Network is not configured on the server.' },
        { status: 503 },
        request
      );
    }

    // 1. Resolve or provision Profile for this tenant
    const profileId = await SocialProviderRouter.getOrCreateZernioProfile({
      workspaceId,
      organizationId,
      userId,
    });

    if (!profileId) {
      return corsJsonResponse(
        { success: false, error: 'Failed to provision delivery profile for tenant.' },
        { status: 500 },
        request
      );
    }

    // 2. Generate Connect URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackUrl = `${appUrl}/ralion/growth?connected=${platform}&provider=resilient_network`;
    const { authUrl } = await ZernioSocialService.getConnectUrl(
      platform as SocialPlatformType,
      profileId,
      callbackUrl
    );

    // 3. Log Audit Event (internal logs retain technical details)
    await AuditLoggerService.log({
      eventType: 'SOCIAL_ACCOUNT_CONNECT_STARTED',
      eventCategory: 'META',
      userId,
      success: true,
      metadata: {
        platform,
        provider: 'resilient_network',
        profileId,
        workspaceId,
      },
    });

    return corsJsonResponse({
      success: true,
      provider: 'resilient_network',
      platform,
      authUrl,
    }, undefined, request);
  } catch (err: any) {
    console.error('[ResilientNetworkConnectAPI] Error:', err.message);
    return corsJsonResponse({ success: false, error: 'Failed to generate connection authorization URL.' }, { status: 500 }, request);
  }
}
