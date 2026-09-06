import { NextRequest } from 'next/server';
import { getConnectorForProvider, IntegrationProvider } from '@ralion/integrations';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext } from '@/lib/auth/serverAuth';
import { SocialDisconnectService } from '@/lib/services/social/socialDisconnect.service';

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

async function handleDisconnect(request: NextRequest, provider: string) {
  try {
    const context = await getCurrentRalionContext(request, { requireAuth: false });
    const tenantId = context?.organization.id || context?.workspace.id || request.headers.get('x-organization-id') || request.headers.get('x-workspace-id') || undefined;
    const workspaceId = context?.workspace.id || request.headers.get('x-workspace-id') || undefined;
    const userId = context?.user.id || request.headers.get('x-user-id') || undefined;

    const result = await SocialDisconnectService.disconnectSocialProvider({
      tenantId,
      workspaceId,
      userId,
      provider,
    });

    try {
      const connector = getConnectorForProvider(provider as IntegrationProvider);
      await connector.disconnect(workspaceId || userId || 'default-workspace');
    } catch {}

    return corsJsonResponse({
      success: true,
      provider,
      status: 'DISCONNECTED',
      finalState: result.finalState,
    }, undefined, request);
  } catch (error: any) {
    return corsJsonResponse({ success: false, error: error.message || 'Disconnect failed' }, { status: 500 }, request);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  return handleDisconnect(request, provider);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  return handleDisconnect(request, provider);
}
