import { NextRequest } from 'next/server';
import { SocialPlatformType, ZernioSocialService } from '@ralion/integrations/server';
import { SocialProviderRouter } from '@/lib/services/social/socialProviderRouter.service';
import { AuditLoggerService } from '@/lib/services/auditLogger.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { requireRalionContext } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRalionContext(request);
    if (authResult.response || !authResult.context) {
      return (
        authResult.response ||
        corsJsonResponse(
          { success: false, error: 'Authentication required to initiate social connection.' },
          { status: 401 },
          request
        )
      );
    }

    const { user, workspace, organization } = authResult.context;
    const authenticatedUserId = user.id;
    const authenticatedWorkspaceId = workspace.id;
    const authenticatedOrgId = organization.id;

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return corsJsonResponse({ success: false, error: 'Invalid JSON request body.' }, { status: 400 }, request);
    }

    const { platform, workspaceId: hintWorkspaceId, organizationId: hintOrgId } = body;

    if (!platform) {
      return corsJsonResponse({ success: false, error: 'Social platform is required.' }, { status: 400 }, request);
    }

    // Reject mismatched client tenant hints with 403 Forbidden
    if (hintWorkspaceId && hintWorkspaceId !== authenticatedWorkspaceId) {
      return corsJsonResponse({ success: false, error: 'Forbidden: Workspace mismatch.' }, { status: 403 }, request);
    }
    if (hintOrgId && hintOrgId !== authenticatedOrgId) {
      return corsJsonResponse({ success: false, error: 'Forbidden: Organization mismatch.' }, { status: 403 }, request);
    }

    if (!ZernioSocialService.isConfigured()) {
      return corsJsonResponse(
        { success: false, error: 'Ralion Resilient Delivery Network is not configured on the server.' },
        { status: 503 },
        request
      );
    }

    // 1. Resolve or provision Profile for this tenant using verified server context
    const profileId = await SocialProviderRouter.getOrCreateZernioProfile({
      workspaceId: authenticatedWorkspaceId,
      organizationId: authenticatedOrgId,
      userId: authenticatedUserId,
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
      userId: authenticatedUserId,
      success: true,
      metadata: {
        platform,
        provider: 'resilient_network',
        profileId,
        workspaceId: authenticatedWorkspaceId,
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
