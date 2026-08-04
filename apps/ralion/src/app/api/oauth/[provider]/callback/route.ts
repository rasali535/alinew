const PROVIDERS = [
  'google', 'meta', 'facebook', 'instagram', 'whatsapp', 'microsoft', 'linkedin', 'tiktok',
  'x', 'youtube', 'pinterest', 'reddit', 'github', 'slack', 'discord', 'notion', 'dropbox',
  'onedrive', 'shopify', 'woocommerce', 'stripe', 'paypal', 'quickbooks', 'xero', 'sage',
  'hubspot', 'salesforce'
];

export async function generateStaticParams() {
  return PROVIDERS.map(provider => ({ provider }));
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyOAuthState, getConnectorForProvider, IntegrationProvider, encryptToken } from '@ralion/integrations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!state) {
      return NextResponse.json({ success: false, error: 'Missing OAuth state token' }, { status: 400 });
    }

    const { workspaceId, valid } = verifyOAuthState(state);
    if (!valid || !workspaceId) {
      return NextResponse.json({ success: false, error: 'Invalid or expired CSRF state token' }, { status: 400 });
    }

    const connector = getConnectorForProvider(provider as IntegrationProvider);

    // Simulate authorization code exchange for tokens
    const dummyAccessToken = `access_token_${provider}_${Date.now()}`;
    const dummyRefreshToken = `refresh_token_${provider}_${Date.now()}`;

    // Encrypt tokens securely using AES-256-GCM
    const encryptedAccess = encryptToken(dummyAccessToken);
    const encryptedRefresh = encryptToken(dummyRefreshToken);

    // Trigger Business Learning Engine automatically post-connection
    const learnResult = await connector.learn(workspaceId);

    // If request comes from desktop system browser deep link callback
    const isDesktopDeepLink = request.headers.get('user-agent')?.includes('Electron') || searchParams.get('desktop') === 'true';

    if (isDesktopDeepLink) {
      return NextResponse.redirect(`ralion://oauth-callback#provider=${provider}&status=success&workspaceId=${workspaceId}`);
    }

    return NextResponse.json({
      success: true,
      provider,
      workspaceId,
      status: 'CONNECTED',
      tokensEncrypted: true,
      learnResult
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'OAuth callback processing failed' },
      { status: 500 }
    );
  }
}
