import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  linkedinAdapter, metaAdapter, xAdapter, tiktokAdapter, youtubeAdapter,
  generateCodeVerifier, generateCodeChallenge,
  SUPPORTED_SOCIAL_PROVIDERS
} from '@/lib/services/social.service';
import { generateOAuthState } from '@ralion/integrations';

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

    // Build provider-specific authorization URL
    let authorizationUrl: string;
    switch (provider) {
      case 'linkedin':
        authorizationUrl = linkedinAdapter.getAuthUrl(stateToken);
        break;
      case 'facebook':
      case 'instagram':
        authorizationUrl = metaAdapter.getAuthUrl(stateToken, provider as 'facebook' | 'instagram');
        break;
      case 'x':
      case 'twitter':
        authorizationUrl = xAdapter.getAuthUrl(stateToken, codeChallenge);
        break;
      case 'tiktok':
        authorizationUrl = tiktokAdapter.getAuthUrl(stateToken, codeChallenge);
        break;
      case 'youtube':
      case 'google':
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
