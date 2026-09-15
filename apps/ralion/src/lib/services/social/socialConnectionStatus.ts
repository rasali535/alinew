export interface SocialConnectionStatusRecord {
  provider?: string | null;
  connection_status?: string | null;
  token_status?: string | null;
  disconnected_at?: string | null;
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
