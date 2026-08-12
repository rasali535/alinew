import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadAllUserAccounts, loadOAuthTokens } from '@/lib/services/social.service';

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

    // Get authenticated user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { cookie: request.headers.get('cookie') || '' } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, connected: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Special case: fetch ALL accounts for this user (provider='all')
    if (provider === 'all') {
      const accounts = await loadAllUserAccounts(user.id);
      return NextResponse.json({ success: true, accounts });
    }

    // Load specific provider token record from Supabase
    const tokenData = await loadOAuthTokens(user.id, provider);
    if (!tokenData) {
      return NextResponse.json({ success: true, connected: false, provider });
    }

    const record = tokenData.record;
    const isExpired = tokenData.expiresAt ? tokenData.expiresAt < new Date() : false;

    return NextResponse.json({
      success: true,
      connected: !isExpired,
      provider,
      account: {
        provider: record.provider,
        label: record.account_label,
        handle: record.account_handle,
        followersCount: record.followers_count,
        avatarUrl: record.avatar_url,
        pageId: record.page_id,
        scopes: record.scopes,
        status: isExpired ? 'expired' : record.status,
        connectedAt: record.connected_at,
        lastSyncedAt: record.last_synced_at,
      }
    });
  } catch (error: any) {
    console.error('[OAuth Status]', error);
    return NextResponse.json({ success: false, error: error.message || 'Status check failed' }, { status: 500 });
  }
}

