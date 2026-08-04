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
import { getConnectorForProvider, IntegrationProvider } from '@ralion/integrations';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const body = await request.json();
    const { refreshToken } = body;

    const connector = getConnectorForProvider(provider as IntegrationProvider);
    const refreshed = await connector.refreshToken(refreshToken);

    return NextResponse.json({
      success: true,
      provider,
      expiresAt: refreshed.expiresAt
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Token refresh failed' }, { status: 500 });
  }
}
