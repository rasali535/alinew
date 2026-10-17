/**
 * Ralion Unified Social Media Architecture — Token Lifecycle Manager
 * Ras Ali Labs (Pty) Ltd
 * Secure server-side OAuth token lifecycle management using AES-256-GCM
 */

import 'server-only';
import { encryptToken, decryptToken, SocialPlatformType, SocialProviderRegistry } from '@ralion/integrations/server';
import { AuditLoggerService } from '../auditLogger.service';
import { getPrivilegedSupabase as getServiceSupabase } from '@/lib/supabase/server';

export interface SocialTokenScope {
  organizationId: string;
  workspaceId: string;
  userId?: string;
}

const ACTIVE_CONNECTION_STATES = new Set(['CONNECTED', 'ACTIVE', 'connected', 'active']);
const INVALID_TOKEN_STATES = new Set(['TOKEN_EXPIRED', 'TOKEN_REVOKED', 'REAUTH_REQUIRED']);

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
        disconnected_at: null,
        connected_at: new Date().toISOString(),
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
  static async getValidToken(
    connectionId: string,
    provider: SocialPlatformType,
    scope?: SocialTokenScope
  ): Promise<string | null> {
    const supabase = getServiceSupabase();

    let encryptedAccessToken: string | null = null;
    let encryptedRefreshToken: string | null = null;
    let expiresAt: number | null = null;

    try {
      let query = supabase
        .from('social_connections')
        .select('id, provider, user_id, organization_id, workspace_id, metadata, connection_status, token_status')
        .eq('id', connectionId)
        .eq('provider', provider);

      if (scope?.organizationId) query = query.eq('organization_id', scope.organizationId);
      if (scope?.workspaceId) query = query.eq('workspace_id', scope.workspaceId);
      if (scope?.userId) query = query.eq('user_id', scope.userId);

      const { data: conn, error: connErr } = await query.maybeSingle();

      if (
        !connErr &&
        conn &&
        ACTIVE_CONNECTION_STATES.has(String(conn.connection_status || '')) &&
        !INVALID_TOKEN_STATES.has(String(conn.token_status || '').toUpperCase()) &&
        conn.metadata?.encrypted_access_token
      ) {
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
   * Force-refresh a specific tenant-owned connection and persist the replacement
   * credential atomically before reporting the connection healthy.
   */
  static async refreshConnectionToken(params: {
    connectionId: string;
    provider: SocialPlatformType;
    organizationId: string;
    workspaceId: string;
    userId: string;
  }): Promise<{ expiresAt: string | null }> {
    const supabase = getServiceSupabase();
    const { data: conn, error } = await supabase
      .from('social_connections')
      .select('id, provider, user_id, organization_id, workspace_id, metadata, connection_status')
      .eq('id', params.connectionId)
      .eq('provider', params.provider)
      .eq('organization_id', params.organizationId)
      .eq('workspace_id', params.workspaceId)
      .eq('user_id', params.userId)
      .maybeSingle();

    if (error) {
      throw Object.assign(new Error('Unable to resolve social connection for refresh.'), { statusCode: 503 });
    }
    if (!conn) {
      throw Object.assign(new Error('Social connection not found in this workspace.'), { statusCode: 404 });
    }

    const encryptedRefreshToken = conn.metadata?.encrypted_refresh_token;
    const refreshToken = encryptedRefreshToken ? decryptToken(encryptedRefreshToken) : '';
    if (!refreshToken) {
      await supabase
        .from('social_connections')
        .update({
          token_status: 'REAUTH_REQUIRED',
          connection_status: 'RECONNECT_REQUIRED',
          health_error_message: 'Refresh token unavailable. Reconnection required.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.connectionId)
        .eq('organization_id', params.organizationId)
        .eq('workspace_id', params.workspaceId)
        .eq('user_id', params.userId);

      throw Object.assign(new Error('Refresh token unavailable. Reconnect this account.'), {
        statusCode: 409,
        publicCode: 'REAUTH_REQUIRED',
      });
    }

    try {
      const adapter = SocialProviderRegistry.getProvider(params.provider);
      const refreshed = await adapter.refreshToken(refreshToken);
      if (!refreshed?.accessToken) {
        throw new Error('Provider returned no replacement access token.');
      }

      await this.saveCredentials({
        connectionId: params.connectionId,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken || refreshToken,
        expiresIn: refreshed.expiresIn,
        userId: params.userId,
        provider: params.provider,
      });

      const expiresAt = refreshed.expiresIn
        ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
        : null;

      return { expiresAt };
    } catch (refreshError: any) {
      await supabase
        .from('social_connections')
        .update({
          token_status: 'REAUTH_REQUIRED',
          connection_status: 'RECONNECT_REQUIRED',
          health_error_message: 'OAuth refresh failed. Reconnection required.',
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.connectionId)
        .eq('organization_id', params.organizationId)
        .eq('workspace_id', params.workspaceId)
        .eq('user_id', params.userId);

      throw Object.assign(
        new Error(refreshError?.message || 'OAuth refresh failed. Reconnect this account.'),
        { statusCode: 401, publicCode: 'REAUTH_REQUIRED' }
      );
    }
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
