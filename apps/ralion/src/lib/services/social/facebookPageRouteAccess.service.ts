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
  created_at?: string | null;
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
 * Important: a workspace can legitimately contain multiple Facebook connections
 * (Page + personal profile + historical/disconnected Page). Do not use maybeSingle()
 * for page ownership checks. Fetch the small tenant-scoped set and match the exact
 * requested provider Page ID in memory.
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
    .select('id,user_id,workspace_id,organization_id,provider_account_id,zernio_account_id,account_name,account_type,connection_status,created_at,metadata,updated_at')
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

  const connections = (data || []) as FacebookPageRouteConnection[];
  const requestedPageId = String(params.pageId || '').trim();

  if (requestedPageId && requestedPageId !== 'default') {
    return connections.find((conn) => matchesPageId(conn, requestedPageId)) || null;
  }

  return connections.find(isBusinessPage) || null;
}
