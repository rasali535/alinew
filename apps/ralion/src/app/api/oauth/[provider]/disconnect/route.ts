import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deleteOAuthToken } from '@/lib/services/social.service';
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

async function handleDisconnect(request: NextRequest, provider: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: { cookie: request.headers.get('cookie') || '' } },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await deleteOAuthToken(user.id, provider);
    }

    try {
      const connector = getConnectorForProvider(provider as IntegrationProvider);
      await connector.disconnect(user?.id || 'default-workspace');
    } catch {
      // Connector fallback if not implemented in GenericOAuthConnector
    }

    return corsJsonResponse({
      success: true,
      provider,
      status: 'DISCONNECTED'
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
