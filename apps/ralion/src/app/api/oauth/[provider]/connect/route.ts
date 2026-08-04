import { NextRequest, NextResponse } from 'next/server';
import { getConnectorForProvider, IntegrationProvider } from '@ralion/integrations';

const PROVIDERS = [
  'google', 'meta', 'facebook', 'instagram', 'whatsapp', 'microsoft', 'linkedin', 'tiktok',
  'x', 'youtube', 'pinterest', 'reddit', 'github', 'slack', 'discord', 'notion', 'dropbox',
  'onedrive', 'shopify', 'woocommerce', 'stripe', 'paypal', 'quickbooks', 'xero', 'sage',
  'hubspot', 'salesforce'
];

export async function generateStaticParams() {
  return PROVIDERS.map(provider => ({ provider }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId') || 'default-workspace';

    const connector = getConnectorForProvider(provider as IntegrationProvider);
    const { authorizationUrl, stateToken } = await connector.connect(workspaceId);

    return NextResponse.json({
      success: true,
      provider,
      authorizationUrl,
      stateToken
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate OAuth URL' },
      { status: 500 }
    );
  }
}
