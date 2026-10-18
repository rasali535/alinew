import { NextRequest } from 'next/server';
import {
  loadOAuthTokens,
  persistRefreshedOAuthTokens,
  tiktokAdapter,
  xAdapter,
  youtubeAdapter,
} from '@/lib/services/social.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { requireRalionContext } from '@/lib/auth/serverAuth';

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

function canonicalProvider(provider: string): string {
  const normalized = provider.trim().toLowerCase();
  if (normalized === 'twitter') return 'x';
  if (normalized === 'google') return 'youtube';
  return normalized;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const required = await requireRalionContext(request);
    if (required.response || !required.context) {
      return required.response || corsJsonResponse(
        { success: false, code: 'AUTHENTICATION_REQUIRED', error: 'Authentication required.' },
        { status: 401 },
        request
      );
    }

    const { provider: routeProvider } = await params;
    const provider = canonicalProvider(routeProvider);
    const body = await request.json().catch(() => ({}));

    // Refresh credentials are server-owned secrets. Never accept one from the
    // browser because doing so would bypass canonical connection ownership.
    if (body?.refreshToken) {
      return corsJsonResponse(
        {
          success: false,
          code: 'REFRESH_TOKEN_NOT_ACCEPTED',
          error: 'OAuth refresh tokens are resolved from the authenticated server-side connection.',
        },
        { status: 400 },
        request
      );
    }

    const { searchParams } = new URL(request.url);
    const socialConnectionId =
      typeof body?.socialConnectionId === 'string'
        ? body.socialConnectionId
        : searchParams.get('socialConnectionId') || undefined;

    const scope = {
      organizationId: required.context.organization.id,
      workspaceId: required.context.workspace.id,
    };

    const tokenData = await loadOAuthTokens(
      required.context.user.id,
      provider,
      scope,
      socialConnectionId
    );

    if (!tokenData?.record?.id) {
      return corsJsonResponse(
        { success: false, code: 'CONNECTION_NOT_FOUND', error: 'No active OAuth connection exists in this workspace.' },
        { status: 404 },
        request
      );
    }

    if (!tokenData.refreshToken) {
      return corsJsonResponse(
        {
          success: false,
          code: 'REAUTH_REQUIRED',
          error: 'This provider requires reconnection because no refresh credential is available.',
        },
        { status: 409 },
        request
      );
    }

    let refreshed: { accessToken?: string; refreshToken?: string; expiresIn?: number; expiresAt?: number };
    if (provider === 'x') {
      refreshed = await xAdapter.refreshAccessToken(tokenData.refreshToken);
    } else if (provider === 'youtube') {
      refreshed = await youtubeAdapter.refreshToken(tokenData.refreshToken);
    } else if (provider === 'tiktok') {
      refreshed = await tiktokAdapter.refreshAccessToken(tokenData.refreshToken);
    } else {
      return corsJsonResponse(
        {
          success: false,
          code: 'REAUTH_REQUIRED',
          error: `${provider} does not support silent refresh in Ralion. Reconnect the account to renew authorization.`,
        },
        { status: 409 },
        request
      );
    }

    if (!refreshed.accessToken) {
      throw new Error('Provider refresh response did not include an access token.');
    }

    const expiresAt = refreshed.expiresAt
      ? new Date(refreshed.expiresAt)
      : new Date(Date.now() + Math.max(60, Number(refreshed.expiresIn || 3600)) * 1000);

    await persistRefreshedOAuthTokens({
      userId: required.context.user.id,
      provider,
      scope,
      connectionId: tokenData.record.id,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken || tokenData.refreshToken,
      expiresAt,
    });

    return corsJsonResponse({
      success: true,
      provider,
      socialConnectionId: tokenData.record.id,
      connected: true,
      tokenStatus: 'TOKEN_VALID',
      expiresAt: expiresAt.toISOString(),
    }, undefined, request);
  } catch (error: any) {
    console.error('[OAuth Refresh]', {
      code: error?.code || 'OAUTH_REFRESH_FAILED',
      message: error?.message || 'Token refresh failed',
    });
    return corsJsonResponse(
      { success: false, code: 'OAUTH_REFRESH_FAILED', error: error.message || 'Token refresh failed' },
      { status: 502 },
      request
    );
  }
}
