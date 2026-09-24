export interface SocialConnectionStatusRecord {
  id?: string;
  organization_id?: string | null;
  workspace_id?: string | null;
  user_id?: string | null;
  provider?: string | null;
  provider_account_id?: string | null;
  account_name?: string | null;
  username?: string | null;
  account_type?: string | null;
  connection_status?: string | null;
  token_status?: string | null;
  disconnected_at?: string | null;
  connected_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: any;
}

const ACTIVE_CONNECTION_STATUSES = new Set(['CONNECTED', 'ACTIVE']);
const USABLE_TOKEN_STATUSES = new Set(['TOKEN_VALID', 'TOKEN_EXPIRING']);

/**
 * Canonical server-side interpretation of an active social connection.
 * Historical rows that were disconnected or had their token revoked/expired
 * must never make Command Centre display an account as connected.
 */
export function isActiveSocialConnection(connection: SocialConnectionStatusRecord): boolean {
  const connectionStatus = String(connection.connection_status || '').toUpperCase();
  const tokenStatus = String(connection.token_status || '').toUpperCase();

  return !connection.disconnected_at &&
    ACTIVE_CONNECTION_STATUSES.has(connectionStatus) &&
    (!tokenStatus || USABLE_TOKEN_STATUSES.has(tokenStatus));
}

export function isActiveFacebookConnection(connection: SocialConnectionStatusRecord): boolean {
  return String(connection.provider || '').toLowerCase() === 'facebook' &&
    isActiveSocialConnection(connection);
}

/**
 * Resolves unique channel key for a social connection record.
 * Scoped by tenant (org or workspace) and provider account id.
 */
export function getSocialChannelKey(connection: SocialConnectionStatusRecord): string {
  const tenantId = connection.organization_id || connection.workspace_id || 'global';
  const provider = String(connection.provider || 'unknown').toLowerCase();
  const accountId =
    connection.provider_account_id ||
    connection.metadata?.pageId ||
    connection.metadata?.zernioAccountId ||
    connection.username ||
    connection.account_name ||
    connection.id ||
    'unknown';
  return `${tenantId}:${provider}:${accountId}`;
}

/**
 * Filter social connections to identify genuine unresolved current bindings needing attention.
 *
 * Requirements:
 * 1. "Needs Attention" represents unresolved current bindings, not every historical disconnected record.
 * 2. If Page X has a newer TOKEN_VALID canonical connection, its superseded REAUTH_REQUIRED
 *    rows do NOT count as incidents.
 * 3. If Page Y has NO valid connection and has failed attempts, it counts as ONE single
 *    unresolved binding, rather than seven historical failed attempts inflating Admin health.
 */
export function getUnresolvedAttentionConnections<T extends SocialConnectionStatusRecord>(
  connections: T[]
): T[] {
  const channels = new Map<string, T[]>();

  for (const conn of connections) {
    const key = getSocialChannelKey(conn);
    if (!channels.has(key)) {
      channels.set(key, []);
    }
    channels.get(key)!.push(conn);
  }

  const unresolved: T[] = [];

  for (const [, rows] of channels) {
    // Sort rows: active + TOKEN_VALID first, then newest updated_at
    const sorted = [...rows].sort((a, b) => {
      const aActiveValid = isActiveSocialConnection(a) ? 1 : 0;
      const bActiveValid = isActiveSocialConnection(b) ? 1 : 0;
      if (aActiveValid !== bActiveValid) return bActiveValid - aActiveValid;

      const aValid = a.token_status === 'TOKEN_VALID' ? 1 : 0;
      const bValid = b.token_status === 'TOKEN_VALID' ? 1 : 0;
      if (aValid !== bValid) return bValid - aValid;

      const aTime = new Date(a.updated_at || a.connected_at || a.created_at || 0).getTime();
      const bTime = new Date(b.updated_at || b.connected_at || b.created_at || 0).getTime();
      return bTime - aTime;
    });

    const canonical = sorted[0];
    if (!canonical) continue;

    // If the canonical current binding for this channel is active and valid,
    // the channel is healthy — superseded REAUTH_REQUIRED rows do NOT count!
    if (isActiveSocialConnection(canonical)) {
      continue;
    }

    // Historical disconnected records (!active and disconnected_at is set) are excluded
    if (canonical.disconnected_at) {
      continue;
    }

    const status = String(canonical.connection_status || '').toUpperCase();
    const tokenStatus = String(canonical.token_status || '').toUpperCase();
    const needsAttention =
      ['NEEDS_ATTENTION', 'RECONNECT_REQUIRED', 'REVOKED'].includes(status) ||
      ['TOKEN_EXPIRED', 'TOKEN_REVOKED', 'REAUTH_REQUIRED'].includes(tokenStatus);

    if (needsAttention) {
      unresolved.push(canonical);
    }
  }

  return unresolved;
}

/**
 * Identifies obsolete duplicate Facebook Page connection records that are superseded
 * by a newer valid binding for the same Page and tenant.
 */
export function getObsoleteDuplicateConnectionIds(connections: SocialConnectionStatusRecord[]): string[] {
  const channels = new Map<string, SocialConnectionStatusRecord[]>();

  for (const conn of connections) {
    if (String(conn.provider || '').toLowerCase() !== 'facebook') continue;
    const key = getSocialChannelKey(conn);
    if (!channels.has(key)) {
      channels.set(key, []);
    }
    channels.get(key)!.push(conn);
  }

  const obsoleteIds: string[] = [];

  for (const [, rows] of channels) {
    // Look for an active, valid connection for this Page
    const validConn = rows.find(
      r => isActiveSocialConnection(r) && r.token_status === 'TOKEN_VALID' && r.id
    );
    if (!validConn || !validConn.id) continue;

    for (const r of rows) {
      if (!r.id || r.id === validConn.id) continue;
      // Any other record for the same channel is superseded and obsolete
      if (
        r.token_status !== 'TOKEN_VALID' ||
        !ACTIVE_CONNECTION_STATUSES.has(String(r.connection_status || '').toUpperCase()) ||
        r.disconnected_at ||
        new Date(r.updated_at || r.created_at || 0).getTime() <= new Date(validConn.updated_at || validConn.created_at || 0).getTime()
      ) {
        obsoleteIds.push(r.id);
      }
    }
  }

  return obsoleteIds;
}

