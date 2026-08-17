import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  linkedinAdapter, metaAdapter, xAdapter, tiktokAdapter, youtubeAdapter,
  generateCodeVerifier, generateCodeChallenge,
  SUPPORTED_SOCIAL_PROVIDERS
} from '@/lib/services/social.service';
import { generateOAuthState, ZernioSocialService } from '@ralion/integrations';
import { SocialProviderRouter } from '@/lib/services/social/socialProviderRouter.service';

const ALL_PROVIDERS = [
  'google', 'meta', 'facebook', 'instagram', 'whatsapp', 'microsoft', 'linkedin', 'tiktok',
  'x', 'youtube', 'pinterest', 'reddit', 'github', 'slack', 'discord', 'notion', 'dropbox',
  'onedrive', 'shopify', 'woocommerce', 'stripe', 'paypal', 'quickbooks', 'xero', 'sage',
  'hubspot', 'salesforce'
];

export async function generateStaticParams() {
  return ALL_PROVIDERS.map(provider => ({ provider }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;

    // Verify user is authenticated
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { cookie: request.headers.get('cookie') || '' } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'anonymous';

    // Generate PKCE code verifier + challenge (for X and TikTok)
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Generate CSRF state token embedding userId + provider
    const stateToken = generateOAuthState(userId, provider);

    // Check if routed to Zernio infrastructure
    const normalizedPlatform = (provider === 'twitter' ? 'x' : provider) as any;
    if (SocialProviderRouter.isZernioEnabledForPlatform(normalizedPlatform)) {
      try {
        const profileId = await SocialProviderRouter.getOrCreateZernioProfile({ userId });
        if (profileId) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const callbackUrl = `${appUrl}/ralion/growth?connected=${provider}&provider=zernio`;
          const zernioConnect = await ZernioSocialService.getConnectUrl(
            normalizedPlatform,
            profileId,
            callbackUrl
          );
          if (zernioConnect?.authUrl) {
            const response = NextResponse.json({
              success: true,
              provider,
              authorizationUrl: zernioConnect.authUrl,
              infrastructure: 'zernio',
              stateToken,
            });
            return response;
          }
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
          return NextResponse.json({ success: false, error: 'LinkedIn is not configured. Please add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to .env.local or use Zernio' }, { status: 400 });
        }
        authorizationUrl = linkedinAdapter.getAuthUrl(stateToken);
        break;
      case 'facebook':
      case 'instagram':
        if (!metaAdapter.clientId()) {
          return NextResponse.json({ success: false, error: 'Meta (Facebook/Instagram) is not configured. Please add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to .env.local or use Zernio' }, { status: 400 });
        }
        authorizationUrl = metaAdapter.getAuthUrl(stateToken, provider as 'facebook' | 'instagram');
        break;
      case 'x':
      case 'twitter':
        if (!xAdapter.clientId()) {
          return NextResponse.json({ success: false, error: 'X (Twitter) is not configured. Please add TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET to .env.local' }, { status: 400 });
        }
        authorizationUrl = xAdapter.getAuthUrl(stateToken, codeChallenge);
        break;
      case 'tiktok':
        if (!tiktokAdapter.clientKey()) {
          return NextResponse.json({ success: false, error: 'TikTok is not configured. Please add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET to .env.local or use Zernio' }, { status: 400 });
        }
        authorizationUrl = tiktokAdapter.getAuthUrl(stateToken, codeChallenge);
        break;
      case 'youtube':
      case 'google':
        if (!youtubeAdapter.clientId()) {
          return NextResponse.json({ success: false, error: 'Google/YouTube is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local or use Zernio' }, { status: 400 });
        }
        authorizationUrl = youtubeAdapter.getAuthUrl(stateToken, provider as 'youtube' | 'google');
        break;
      default:
        return NextResponse.json({ success: false, error: `Social provider '${provider}' is not yet supported for direct OAuth. Supported: ${SUPPORTED_SOCIAL_PROVIDERS.join(', ')}` }, { status: 400 });
    }

    // Set code_verifier in a secure cookie so callback can use it
    const response = NextResponse.json({ success: true, provider, authorizationUrl, stateToken });
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
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate OAuth URL' },
      { status: 500 }
    );
  }
}
