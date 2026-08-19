import { NextRequest } from 'next/server';
import {
  linkedinAdapter, metaAdapter, xAdapter, tiktokAdapter, youtubeAdapter,
  generateCodeVerifier, generateCodeChallenge,
  SUPPORTED_SOCIAL_PROVIDERS
} from '@/lib/services/social.service';
import { generateOAuthState, ZernioSocialService } from '@ralion/integrations';
import { SocialProviderRouter } from '@/lib/services/social/socialProviderRouter.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext, authRequiredResponse } from '@/lib/auth/serverAuth';

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

    // Verify user is authenticated with server-authoritative context
    const context = await getCurrentRalionContext(request, { requireAuth: true });
    if (!context) {
      return authRequiredResponse(request);
    }

    const userId = context.user.id;
    const workspaceId = context.workspace.id;
    const orgId = context.workspace.organization_id || context.workspace.id;
    const workspaceName = context.workspace.name;

    // Generate PKCE code verifier + challenge (for X and TikTok)
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Generate CSRF state token embedding userId + provider
    const stateToken = generateOAuthState(userId, provider);

    // Check if routed to Zernio infrastructure
    const normalizedPlatform = (provider === 'twitter' ? 'x' : provider) as any;
    const routing = await SocialProviderRouter.resolveRouting({
      platform: normalizedPlatform,
      workspaceId,
      organizationId: orgId,
      userId,
    });

    if (routing.provider === 'zernio' && routing.zernioProfileId) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rasalilabs.com';
        const callbackUrl = `${appUrl}/ralion/growth?connected=${provider}&provider=zernio`;
        const zernioConnect = await ZernioSocialService.getConnectUrl(
          normalizedPlatform,
          routing.zernioProfileId,
          callbackUrl
        );
        if (zernioConnect?.authUrl) {
          return corsJsonResponse({
            success: true,
            provider,
            authorizationUrl: zernioConnect.authUrl,
            infrastructure: 'zernio',
            profileId: routing.zernioProfileId,
            stateToken,
          }, undefined, request);
        }
      } catch (zErr: any) {
        console.warn(`[OAuth Connect] Zernio routing fallback for ${provider}:`, zErr.message);
      }
    }

    // Build provider-specific authorization URL with credential checks
    let authorizationUrl: string;
    switch (provider) {
      case 'linkedin':
        if (!linkedinAdapter.clientId()) {
          return corsJsonResponse({ success: false, error: 'LinkedIn is not configured. Please add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to .env.local or use Zernio' }, { status: 400 }, request);
        }
        authorizationUrl = linkedinAdapter.getAuthUrl(stateToken);
        break;
      case 'facebook':
      case 'instagram':
        if (!metaAdapter.clientId()) {
          return corsJsonResponse({ success: false, error: 'Meta (Facebook/Instagram) is not configured. Please add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to .env.local or use Zernio' }, { status: 400 }, request);
        }
        authorizationUrl = metaAdapter.getAuthUrl(stateToken, provider as 'facebook' | 'instagram');
        break;
      case 'x':
      case 'twitter':
        if (!xAdapter.clientId()) {
          return corsJsonResponse({ success: false, error: 'X (Twitter) is not configured. Please add TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET to .env.local' }, { status: 400 }, request);
        }
        authorizationUrl = xAdapter.getAuthUrl(stateToken, codeChallenge);
        break;
      case 'tiktok':
        if (!tiktokAdapter.clientKey()) {
          return corsJsonResponse({ success: false, error: 'TikTok is not configured. Please add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET to .env.local or use Zernio' }, { status: 400 }, request);
        }
        authorizationUrl = tiktokAdapter.getAuthUrl(stateToken, codeChallenge);
        break;
      case 'youtube':
      case 'google':
        if (!youtubeAdapter.clientId()) {
          return corsJsonResponse({ success: false, error: 'Google/YouTube is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local or use Zernio' }, { status: 400 }, request);
        }
        authorizationUrl = youtubeAdapter.getAuthUrl(stateToken, provider as 'youtube' | 'google');
        break;
      default:
        return corsJsonResponse({ success: false, error: `Social provider '${provider}' is not yet supported for direct OAuth. Supported: ${SUPPORTED_SOCIAL_PROVIDERS.join(', ')}` }, { status: 400 }, request);
    }

    // Set code_verifier in a secure cookie so callback can use it
    const response = corsJsonResponse({ success: true, provider, authorizationUrl, stateToken }, undefined, request);
    response.cookies.set(`oauth_verifier_${provider}`, codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
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
