import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { loadAllUserAccounts, loadOAuthTokens } from '@/lib/services/social.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';

export const dynamic = 'force-dynamic';

const PROVIDERS = [
  'all',
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;

    const required = await requireRalionContext(request);
    if (required.response || !required.context) {
      return required.response || corsJsonResponse({ success: false, connected: false, error: 'Authentication required' }, { status: 401 }, request);
    }
    const user = required.context.user;
    const scope = {
      organizationId: required.context.organization.id,
      workspaceId: required.context.workspace.id,
    };

    // Special case: fetch ALL accounts only for the authenticated workspace.
    if (provider === 'all') {
      const accounts = await loadAllUserAccounts(user.id, scope);
      return corsJsonResponse({
        success: true,
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
        accounts,
      }, undefined, request);
    }

    const socialConnectionId = request.nextUrl.searchParams.get('socialConnectionId') || undefined;

    // Load only a tenant-owned active credential. An explicit connection ID
    // never falls back to another account of the same provider.
    const tokenData = await loadOAuthTokens(user.id, provider, socialConnectionId, scope);
    if (!tokenData) {
      return corsJsonResponse({ success: true, connected: false, provider }, undefined, request);
    }

    const record = tokenData.record;
    const isExpired = tokenData.expiresAt ? tokenData.expiresAt < new Date() : false;

    return corsJsonResponse({
      success: true,
      connected: !isExpired && tokenData.record.status === 'connected',
      provider,
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      socialConnectionId: tokenData.record.id || socialConnectionId || null,
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
    }, undefined, request);
  } catch (error: any) {
    console.error('[OAuth Status]', error);
    return corsJsonResponse({ success: false, error: error.message || 'Status check failed' }, { status: 500 }, request);
  }
}
