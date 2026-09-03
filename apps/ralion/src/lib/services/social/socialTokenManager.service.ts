/**
 * Ralion Unified Social Media Architecture — Token Lifecycle Manager
 * Ras Ali Labs (Pty) Ltd
 * Secure server-side OAuth token lifecycle management using AES-256-GCM
 */

import { createClient } from '@supabase/supabase-js';
import { encryptToken, decryptToken, SocialPlatformType, SocialProviderRegistry } from '@ralion/integrations';
import { AuditLoggerService } from '../auditLogger.service';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('[SocialTokenManager] Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export class SocialTokenManager {
  /**
   * Save OAuth credentials with AES-256-GCM authenticated encryption into isolated vault
   */
  static async saveCredentials(params: {
    connectionId: string;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    tokenType?: string;
    userId?: string;
    provider?: SocialPlatformType;
  }): Promise<boolean> {
    const supabase = getServiceSupabase();
    const encryptedAccessToken = encryptToken(params.accessToken);
    const encryptedRefreshToken = params.refreshToken ? encryptToken(params.refreshToken) : null;
    const expiresAt = params.expiresIn ? new Date(Date.now() + params.expiresIn * 1000).toISOString() : null;

    try {
      // 1. Save into isolated social_connections metadata vault
      const { data: existingConn } = await supabase
        .from('social_connections')
        .select('metadata')
        .eq('id', params.connectionId)
        .maybeSingle();

      const mergedMeta = {
        ...(existingConn?.metadata || {}),
        encrypted_access_token: encryptedAccessToken,
        encrypted_refresh_token: encryptedRefreshToken,
        token_type: params.tokenType || 'Bearer',
        token_expires_at: expiresAt,
      };

      await supabase.from('social_connections').update({
        metadata: mergedMeta,
        token_status: 'TOKEN_VALID',
        connection_status: 'CONNECTED',
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', params.connectionId);

      // 2. Try saving to separate social_credentials table if provisioned
      try {
        await supabase.from('social_credentials').upsert({
          social_connection_id: params.connectionId,
          encrypted_access_token: encryptedAccessToken,
          encrypted_refresh_token: encryptedRefreshToken,
          token_type: params.tokenType || 'Bearer',
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'social_connection_id' });
      } catch {}

      // 3. Log audit event
      if (params.userId && params.provider) {
        await AuditLoggerService.log({
          eventType: 'META_TOKEN_CREATED',
          eventCategory: 'META',
          userId: params.userId,
          success: true,
          resourceType: 'social_connection',
          resourceId: params.connectionId,
          metadata: { provider: params.provider, expires_at: expiresAt },
        });
      }

      return true;
    } catch (err: any) {
      console.error('[SocialTokenManager] Save error:', err.message);
      throw err;
    }
  }

  /**
   * Retrieve and decrypt valid token in server memory, auto-refreshing if expiring
   */
  static async getValidToken(connectionId: string, provider: SocialPlatformType): Promise<string | null> {
    const supabase = getServiceSupabase();

    let encryptedAccessToken: string | null = null;
    let encryptedRefreshToken: string | null = null;
    let expiresAt: number | null = null;

    // 1. Try social_credentials
    try {
      const { data: creds, error } = await supabase
        .from('social_credentials')
        .select('*')
        .eq('social_connection_id', connectionId)
        .maybeSingle();

      if (!error && creds?.encrypted_access_token) {
        encryptedAccessToken = creds.encrypted_access_token;
        encryptedRefreshToken = creds.encrypted_refresh_token;
        expiresAt = creds.expires_at ? new Date(creds.expires_at).getTime() : null;
      }
    } catch {}

    // 2. Fallback to social_connections metadata
    if (!encryptedAccessToken) {
      try {
        const { data: conn, error: connErr } = await supabase
          .from('social_connections')
          .select('id, metadata, connection_status')
          .eq('id', connectionId)
          .maybeSingle();

        if (!connErr && conn && conn.connection_status !== 'DISCONNECTED' && conn.metadata?.encrypted_access_token) {
          encryptedAccessToken = conn.metadata.encrypted_access_token;
          encryptedRefreshToken = conn.metadata.encrypted_refresh_token || null;
          expiresAt = conn.metadata.token_expires_at ? new Date(conn.metadata.token_expires_at).getTime() : null;
        }
      } catch {}
    }

    if (!encryptedAccessToken) {
      return null;
    }

    const decryptedAccessToken = decryptToken(encryptedAccessToken);
    const decryptedRefreshToken = encryptedRefreshToken ? decryptToken(encryptedRefreshToken) : null;

    // Check if token is expired or expiring within 5 minutes
    const isExpiringSoon = expiresAt ? expiresAt - Date.now() < 5 * 60 * 1000 : false;

    if (isExpiringSoon && decryptedRefreshToken) {
      try {
        const adapter = SocialProviderRegistry.getProvider(provider);
        const refreshed = await adapter.refreshToken(decryptedRefreshToken);

        if (refreshed.accessToken) {
          await this.saveCredentials({
            connectionId,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken || decryptedRefreshToken,
            expiresIn: refreshed.expiresIn,
            provider,
          });
          return refreshed.accessToken;
        }
      } catch (refreshErr: any) {
        console.warn(`[SocialTokenManager] Auto-refresh failed for ${provider}:`, refreshErr.message);
        await supabase.from('social_connections').update({
          token_status: 'REAUTH_REQUIRED',
          connection_status: 'RECONNECT_REQUIRED',
          health_error_message: 'Token expired. Reconnection required.',
        }).eq('id', connectionId);
      }
    }

    return decryptedAccessToken;
  }

  /**
   * Revoke token remotely and purge from database
   */
  static async revokeAndDestroy(connectionId: string, provider: SocialPlatformType, userId?: string): Promise<boolean> {
    const token = await this.getValidToken(connectionId, provider);
    if (token) {
      try {
        const adapter = SocialProviderRegistry.getProvider(provider);
        await adapter.revokeAccess(token);
      } catch (err: any) {
        console.warn(`[SocialTokenManager] Remote revoke warning for ${provider}:`, err.message);
      }
    }

    const supabase = getServiceSupabase();

    // 1. Delete credentials from vault
    await supabase.from('social_credentials').delete().eq('social_connection_id', connectionId);

    // 2. Mark connection disconnected
    await supabase.from('social_connections').update({
      connection_status: 'DISCONNECTED',
      token_status: 'TOKEN_REVOKED',
      disconnected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', connectionId);

    if (userId) {
      await AuditLoggerService.log({
        eventType: 'META_TOKEN_REVOKED',
        eventCategory: 'META',
        userId,
        success: true,
        resourceType: 'social_connection',
        resourceId: connectionId,
        metadata: { provider, action: 'revokeAndDestroy' },
      });
    }

    return true;
  }
}
