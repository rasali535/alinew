import { NextRequest } from 'next/server';
import { getConnectorForProvider, IntegrationProvider } from '@ralion/integrations';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';

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
    const { provider } = await params;
    const body = await request.json();
    const { refreshToken } = body;

    const connector = getConnectorForProvider(provider as IntegrationProvider);
    const refreshed = await connector.refreshToken(refreshToken);

    return corsJsonResponse({
      success: true,
      provider,
      expiresAt: refreshed.expiresAt
    }, undefined, request);
  } catch (error: any) {
    return corsJsonResponse({ success: false, error: error.message || 'Token refresh failed' }, { status: 500 }, request);
  }
}
