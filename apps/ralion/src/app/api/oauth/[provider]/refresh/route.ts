import { NextRequest } from 'next/server';
import { SocialPlatformType } from '@ralion/integrations/server';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { SocialTokenManager } from '@/lib/services/social/socialTokenManager.service';

export const dynamic = 'force-dynamic';

const PROVIDERS = [
  'google', 'meta', 'facebook', 'instagram', 'whatsapp', 'microsoft', 'linkedin', 'tiktok',
  'x', 'youtube', 'pinterest', 'reddit', 'github', 'slack', 'discord', 'notion', 'dropbox',
  'onedrive', 'shopify', 'woocommerce', 'stripe', 'paypal', 'quickbooks', 'xero', 'sage',
  'hubspot', 'salesforce'
];

export async function generateStaticParams() {
  return PROVIDERS.map(provider => ({ provider }));
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const required = await requireRalionContext(request);
    if (required.response || !required.context) {
      return required.response || corsJsonResponse({ success: false, code: 'AUTHENTICATION_REQUIRED', error: 'Authentication required.' }, { status: 401 }, request);
    }

    const { provider } = await params;
    const body = await request.json().catch(() => ({}));
    const socialConnectionId = body.socialConnectionId;

    if (typeof socialConnectionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(socialConnectionId)) {
      return corsJsonResponse(
        { success: false, code: 'CONNECTION_ID_REQUIRED', error: 'A valid socialConnectionId is required to refresh OAuth state.' },
        { status: 400 },
        request
      );
    }

    const refreshed = await SocialTokenManager.refreshConnectionToken({
      connectionId: socialConnectionId,
      provider: provider as SocialPlatformType,
      organizationId: required.context.organization.id,
      workspaceId: required.context.workspace.id,
      userId: required.context.user.id,
    });

    return corsJsonResponse({
      success: true,
      provider,
      socialConnectionId,
      connectionStatus: 'CONNECTED',
      tokenStatus: 'TOKEN_VALID',
      expiresAt: refreshed.expiresAt,
    }, undefined, request);
  } catch (error: any) {
    const status = [400, 401, 403, 404, 409, 503].includes(error?.statusCode) ? error.statusCode : 500;
    return corsJsonResponse(
      { success: false, code: error?.publicCode || 'TOKEN_REFRESH_FAILED', error: error.message || 'Token refresh failed' },
      { status },
      request
    );
  }
}
