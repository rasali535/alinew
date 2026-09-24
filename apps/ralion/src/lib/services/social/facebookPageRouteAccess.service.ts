import 'server-only';

import { getPrivilegedSupabase as getServiceSupabase } from '@/lib/supabase/server';

export interface FacebookPageRouteConnection {
  id: string;
  user_id: string;
  workspace_id: string;
  organization_id: string;
  provider_account_id: string | null;
  zernio_account_id: string | null;
  account_name: string | null;
  account_type: string | null;
  connection_status: string | null;
  token_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata: any;
}

const ACTIVE_STATUSES = ['CONNECTED', 'ACTIVE', 'connected', 'active'];

function matchesPageId(conn: FacebookPageRouteConnection, pageId: string): boolean {
  return conn.provider_account_id === pageId ||
    conn.zernio_account_id === pageId ||
    conn.metadata?.pageId === pageId ||
    conn.metadata?.zernioAccountId === pageId;
}

function isBusinessPage(conn: FacebookPageRouteConnection): boolean {
  return conn.account_type === 'BUSINESS' ||
    conn.metadata?.is_page === true ||
    conn.metadata?.provider_account_type === 'FACEBOOK_PAGE';
}

/**
 * Resolves a Facebook Page connection strictly inside the authenticated tenant.
 *
 * Guarantees:
 * - Canonical Page resolution: prefer newest connection with connection_status=CONNECTED
 *   and token_status=TOKEN_VALID. A stale REAUTH_REQUIRED row must never override a valid Page.
 * - Deduplicates old Page bindings: archives/deletes obsolete historical failed records
 *   superseded by a valid Page binding.
 */
export async function resolveFacebookPageRouteConnection(params: {
  organizationId: string;
  workspaceId: string;
  userId: string;
  pageId?: string | null;
}): Promise<FacebookPageRouteConnection | null> {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('social_connections')
    .select('id,user_id,workspace_id,organization_id,provider_account_id,zernio_account_id,account_name,account_type,connection_status,token_status,created_at,metadata,updated_at')
    .eq('provider', 'facebook')
    .eq('organization_id', params.organizationId)
    .eq('workspace_id', params.workspaceId)
    .eq('user_id', params.userId)
    .in('connection_status', ACTIVE_STATUSES)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`[FacebookPageRouteAccess] Failed to resolve tenant Facebook connections: ${error.code || error.message}`);
  }

  const rawConnections = (data || []) as FacebookPageRouteConnection[];

  // Canonical Page resolution: prefer newest tenant/workspace Page connection with
  // connection_status=CONNECTED and token_status=TOKEN_VALID.
  // A stale REAUTH_REQUIRED row must never override a valid Page.
  const connections = [...rawConnections].sort((a, b) => {
    const aValid = a.token_status === 'TOKEN_VALID' ? 1 : 0;
    const bValid = b.token_status === 'TOKEN_VALID' ? 1 : 0;
    if (aValid !== bValid) return bValid - aValid;

    const aBiz = isBusinessPage(a) ? 1 : 0;
    const bBiz = isBusinessPage(b) ? 1 : 0;
    if (aBiz !== bBiz) return bBiz - aBiz;

    const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
    const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
    return bTime - aTime;
  });

  const requestedPageId = String(params.pageId || '').trim();

  const resolved = (requestedPageId && requestedPageId !== 'default')
    ? connections.find((conn) => matchesPageId(conn, requestedPageId)) || null
    : connections.find(isBusinessPage) || null;

  // Deduplicate old Page bindings: prune obsolete records superseded by a valid Page connection
  if (resolved && resolved.token_status === 'TOKEN_VALID' && resolved.provider_account_id) {
    const targetPageId = resolved.provider_account_id;
    const obsoleteConns = rawConnections.filter(c =>
      c.id !== resolved.id &&
      matchesPageId(c, targetPageId) &&
      (c.token_status !== 'TOKEN_VALID' || !ACTIVE_STATUSES.includes(String(c.connection_status || '')))
    );
    if (obsoleteConns.length > 0) {
      const obsoleteIds = obsoleteConns.map(c => c.id);
      void supabase
        .from('social_connections')
        .delete()
        .in('id', obsoleteIds)
        .then(() => {
          console.log(`[FacebookPageRouteAccess] Pruned ${obsoleteIds.length} obsolete duplicate binding(s) for Page ${targetPageId}`);
        })
        .catch(err => {
          console.warn('[FacebookPageRouteAccess] Obsolete binding prune warning:', err?.message || err);
        });
    }
  }

  return resolved;
}
