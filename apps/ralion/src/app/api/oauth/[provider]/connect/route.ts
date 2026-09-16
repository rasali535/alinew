import { NextRequest } from 'next/server';
import {
  linkedinAdapter, xAdapter, tiktokAdapter, youtubeAdapter,
  generateCodeVerifier, generateCodeChallenge,
  SUPPORTED_SOCIAL_PROVIDERS
} from '@/lib/services/social.service';
import { metaAdapterV26 } from '@/lib/services/metaAdapter.service';
import { generateOAuthState } from '@ralion/integrations/server';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { requireRalionContext } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

const ALL_PROVIDERS = [
  'google', 'meta', 'facebook', 'instagram', 'whatsapp', 'microsoft', 'linkedin', 'tiktok',
  'x', 'youtube', 'pinterest', 'reddit', 'github', 'slack', 'discord', 'notion', 'dropbox',
  'onedrive', 'shopify', 'woocommerce', 'stripe', 'paypal', 'quickbooks', 'xero', 'sage',
  'hubspot', 'salesforce'
];

export async function generateStaticParams() {
  return ALL_PROVIDERS.map(provider => ({ provider }));
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const { searchParams } = new URL(request.url);
    const intent = (searchParams.get('intent') || 'login') as 'login' | 'page_connection';

    const { context, response: authErrorResponse } = await requireRalionContext(request);
    if (authErrorResponse) return authErrorResponse;

    const userId = context.user.id;
    const workspaceId = context.workspace.id;
    const orgId = context.workspace.organization_id || context.workspace.id;

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const stateToken = generateOAuthState({
      userId,
      organizationId: orgId,
      workspaceId,
      provider,
      intent,
    });

    let authorizationUrl: string;
    switch (provider) {
      case 'linkedin':
        if (!linkedinAdapter.clientId()) {
          return corsJsonResponse({ success: false, error: 'LinkedIn is not configured.' }, { status: 400 }, request);
        }
        authorizationUrl = linkedinAdapter.getAuthUrl(stateToken);
        break;
      case 'facebook':
      case 'instagram':
        if (!metaAdapterV26.clientId()) {
          return corsJsonResponse({ success: false, error: 'Meta (Facebook/Instagram) is not configured.' }, { status: 400 }, request);
        }
        authorizationUrl = metaAdapterV26.getAuthUrl(stateToken, provider, intent);
        break;
      case 'x':
      case 'twitter':
        if (!xAdapter.clientId()) {
          return corsJsonResponse({ success: false, error: 'X (Twitter) is not configured.' }, { status: 400 }, request);
        }
        authorizationUrl = xAdapter.getAuthUrl(stateToken, codeChallenge);
        break;
      case 'tiktok':
        if (!tiktokAdapter.clientKey()) {
          return corsJsonResponse({ success: false, error: 'TikTok is not configured.' }, { status: 400 }, request);
        }
        authorizationUrl = tiktokAdapter.getAuthUrl(stateToken, codeChallenge);
        break;
      case 'youtube':
      case 'google':
        if (!youtubeAdapter.clientId()) {
          return corsJsonResponse({ success: false, error: 'Google/YouTube is not configured.' }, { status: 400 }, request);
        }
        authorizationUrl = youtubeAdapter.getAuthUrl(stateToken, provider as 'youtube' | 'google');
        break;
      default:
        return corsJsonResponse({ success: false, error: `Social provider '${provider}' is not yet supported for direct OAuth. Supported: ${SUPPORTED_SOCIAL_PROVIDERS.join(', ')}` }, { status: 400 }, request);
    }

    const response = corsJsonResponse({
      success: true,
      provider,
      authorizationUrl,
      stateToken,
      ...(provider === 'facebook' || provider === 'instagram' ? { graphVersion: metaAdapterV26.graphVersion() } : {}),
    }, undefined, request);
    response.cookies.set(`oauth_verifier_${provider}`, codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[OAuth Connect]', error);
    return corsJsonResponse(
      { success: false, error: error.message || 'Failed to generate OAuth URL' },
      { status: 500 },
      request
    );
  }
}
