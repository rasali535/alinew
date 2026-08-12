import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deleteOAuthToken } from '@/lib/services/social.service';
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

async function handleDisconnect(request: NextRequest, provider: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { cookie: request.headers.get('cookie') || '' } } }
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

    return NextResponse.json({
      success: true,
      provider,
      status: 'DISCONNECTED'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Disconnect failed' }, { status: 500 });
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
