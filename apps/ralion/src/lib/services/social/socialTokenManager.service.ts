/**
 * Ralion Unified Social Media Architecture — Token Lifecycle Manager
 * Ras Ali Labs (Pty) Ltd
 * Secure server-side OAuth token lifecycle management using AES-256-GCM
 */

import { createClient } from '@supabase/supabase-js';
import { encryptToken, decryptToken, SocialPlatformType, SocialProviderRegistry } from '@ralion/integrations';
import { AuditLoggerService } from '../auditLogger.service';

function getServiceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('[SocialTokenManager] Missing SUPABASE_URL environment variable.');
  }
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

    if (!encryptedAccessToken.startsWith('enc_gcm_v2_')) {
      throw new Error('[SocialTokenManager] Refusing to persist an unencrypted access token.');
    }
    if (params.refreshToken && (!encryptedRefreshToken || !encryptedRefreshToken.startsWith('enc_gcm_v2_'))) {
      throw new Error('[SocialTokenManager] Refusing to persist an unencrypted refresh token.');
    }

    try {
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

      // Explicitly strip any legacy plaintext token fields while saving.
      delete (mergedMeta as any).access_token;
      delete (mergedMeta as any).accessToken;
      delete (mergedMeta as any).pageAccessToken;
      delete (mergedMeta as any).refresh_token;
      delete (mergedMeta as any).refreshToken;

      const { error: updateError } = await supabase.from('social_connections').update({
        metadata: mergedMeta,
        token_status: 'TOKEN_VALID',
        connection_status: 'CONNECTED',
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', params.connectionId);

      if (updateError) {
        throw new Error(`[SocialTokenManager] Credential update failed: ${updateError.message}`);
      }

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
      console.error('[SocialTokenManager] Save error:', err instanceof Error ? err.message : 'Unknown credential storage error');
      throw err;
    }
  }

  /**
   * Retrieve and decrypt valid token in server memory, auto-refreshing if expiring.
   * Unknown/plaintext token envelopes are rejected by decryptToken().
   */
  static async getValidToken(connectionId: string, provider: SocialPlatformType): Promise<string | null> {
    const supabase = getServiceSupabase();

    let encryptedAccessToken: string | null = null;
    let encryptedRefreshToken: string | null = null;
    let expiresAt: number | null = null;

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

    if (!encryptedAccessToken) {
      return null;
    }

    const decryptedAccessToken = decryptToken(encryptedAccessToken);
    if (!decryptedAccessToken) {
      return null;
    }

    const decryptedRefreshToken = encryptedRefreshToken ? decryptToken(encryptedRefreshToken) : null;
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
        console.warn(`[SocialTokenManager] Auto-refresh failed for ${provider}:`, refreshErr instanceof Error ? refreshErr.message : 'Unknown refresh error');
        await supabase.from('social_connections').update({
          token_status: 'REAUTH_REQUIRED',
          connection_status: 'RECONNECT_REQUIRED',
          health_error_message: 'Token expired. Reconnection required.',
        }).eq('id', connectionId);
        return null;
      }
    }

    return decryptedAccessToken;
  }

  /**
   * Revoke token remotely and purge encrypted credential material from database.
   */
  static async revokeAndDestroy(connectionId: string, provider: SocialPlatformType, userId?: string): Promise<boolean> {
    const token = await this.getValidToken(connectionId, provider);
    if (token) {
      try {
        const adapter = SocialProviderRegistry.getProvider(provider);
        await adapter.revokeAccess(token);
      } catch (err: any) {
        console.warn(`[SocialTokenManager] Remote revoke warning for ${provider}:`, err instanceof Error ? err.message : 'Unknown revoke error');
      }
    }

    const supabase = getServiceSupabase();
    const { data: existingConn } = await supabase
      .from('social_connections')
      .select('metadata')
      .eq('id', connectionId)
      .maybeSingle();

    const cleanedMeta = { ...(existingConn?.metadata || {}) } as Record<string, unknown>;
    delete cleanedMeta.encrypted_access_token;
    delete cleanedMeta.encrypted_refresh_token;
    delete cleanedMeta.access_token;
    delete cleanedMeta.accessToken;
    delete cleanedMeta.pageAccessToken;
    delete cleanedMeta.refresh_token;
    delete cleanedMeta.refreshToken;

    await supabase.from('social_connections').update({
      metadata: cleanedMeta,
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
