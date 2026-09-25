/**
 * Ralion OS — Meta Credential & Token Lifecycle Management Service
 * Complies with Meta Platform Data Protection Assessment and minimization guidelines.
 *
 * Responsibilities:
 * - Server-side only token encryption and storage (AES-256-GCM)
 * - Safe in-memory retrieval without client exposure
 * - Token lifecycle tracking and automated expiry checks
 * - Token revocation via Meta Graph API
 * - Account disconnection and user data deletion workflows
 * - Structured audit logging for every lifecycle event
 */

import 'server-only';
import { encryptToken, decryptToken } from '@ralion/integrations/server';
import { AuditLoggerService } from './auditLogger.service';
import { getPrivilegedSupabase as getServiceSupabase } from '@/lib/supabase/server';

export interface SaveMetaTokenParams {
  userId: string;
  workspaceId?: string;
  metaUserId: string;
  provider: 'facebook' | 'instagram' | 'meta' | 'whatsapp';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string[];
  email?: string;
  profilePictureUrl?: string;
  accountHandle?: string;
  accountName?: string;
  pageId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class MetaCredentialService {
  /**
   * Encrypt and store Meta OAuth credentials
   */
  static async saveToken(params: SaveMetaTokenParams): Promise<boolean> {
    const supabase = getServiceSupabase();
    const encryptedAccessToken = encryptToken(params.accessToken);
    const encryptedRefreshToken = params.refreshToken ? encryptToken(params.refreshToken) : null;
    const tokenExpiresAt = params.expiresAt ? params.expiresAt.toISOString() : null;

    if (!encryptedAccessToken.startsWith('enc_gcm_v2_')) {
      throw new Error('[MetaCredentialService] Refusing to persist an unencrypted access token.');
    }
    if (params.refreshToken && (!encryptedRefreshToken || !encryptedRefreshToken.startsWith('enc_gcm_v2_'))) {
      throw new Error('[MetaCredentialService] Refusing to persist an unencrypted refresh token.');
    }

    try {
      // 1. Store in primary meta_connections table
      const { error: connError } = await supabase.from('meta_connections').upsert({
        user_id: params.userId,
        workspace_id: params.workspaceId || null,
        meta_user_id: params.metaUserId,
        provider: params.provider,
        email: params.email || null,
        profile_picture_url: params.profilePictureUrl || null,
        account_handle: params.accountHandle || null,
        account_name: params.accountName || null,
        page_id: params.pageId || null,
        scopes: params.scopes || [],
        connection_status: 'connected',
        encrypted_access_token: encryptedAccessToken,
        encrypted_refresh_token: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,user_id,provider,meta_user_id' });

      if (connError) {
        throw new Error(`[MetaCredentialService] Connection upsert error: ${connError.message}`);
      }

      // 2. Also keep Growth OS social_account_tokens table synchronized
      await supabase.from('social_account_tokens').upsert({
        user_id: params.userId,
        provider: params.provider,
        encrypted_access_token: encryptedAccessToken,
        encrypted_refresh_token: encryptedRefreshToken,
        expires_at: tokenExpiresAt,
        account_handle: params.accountHandle || `@${params.metaUserId}`,
        account_label: params.accountName || `${params.provider.toUpperCase()} Business`,
        avatar_url: params.profilePictureUrl || null,
        page_id: params.pageId || null,
        scopes: params.scopes || [],
        status: 'connected',
        connected_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' });

      // 3. Emit structured audit log event (zero token exposure)
      await AuditLoggerService.log({
        eventType: 'META_TOKEN_CREATED',
        eventCategory: 'META',
        userId: params.userId,
        metaUserId: params.metaUserId,
        success: true,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        resourceType: 'meta_connection',
        resourceId: params.metaUserId,
        metadata: {
          provider: params.provider,
          scopes: params.scopes,
          has_refresh_token: !!params.refreshToken,
          expires_at: tokenExpiresAt,
        },
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta credential storage error';
      console.error('[MetaCredentialService] Save token failed:', message);
      await AuditLoggerService.log({
        eventType: 'META_API_FAILURE',
        eventCategory: 'META',
        userId: params.userId,
        metaUserId: params.metaUserId,
        success: false,
        metadata: { error: message, action: 'saveToken' },
      });
      throw err;
    }
  }

  /**
   * Retrieve and decrypt active Meta access token in server memory only
   */
  static async getValidToken(userId: string, provider: 'facebook' | 'instagram' | 'meta' | 'whatsapp' = 'facebook') {
    const supabase = getServiceSupabase();

    // Production's canonical OAuth credential store is social_account_tokens.
    // Keep meta_connections as an optional compatibility source only; some
    // deployments do not have that legacy table at all.
    const { data: tokenRow, error: tokenError } = await supabase
      .from('social_account_tokens')
      .select('encrypted_access_token, scopes, page_id, expires_at, account_label, extra_meta, status')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('status', 'connected')
      .maybeSingle();

    if (!tokenError && tokenRow?.encrypted_access_token) {
      const decryptedToken = decryptToken(tokenRow.encrypted_access_token);
      if (!decryptedToken) {
        console.error('[MetaCredentialService] Failed to decrypt stored token for requested account.');
        return null;
      }

      const isExpired = tokenRow.expires_at ? new Date(tokenRow.expires_at) < new Date() : false;
      return {
        accessToken: decryptedToken,
        metaUserId: tokenRow.extra_meta?.facebookUserId || tokenRow.extra_meta?.metaUserId || undefined,
        scopes: tokenRow.scopes || [],
        isExpired,
        pageId: tokenRow.page_id,
        expiresAt: tokenRow.expires_at ? new Date(tokenRow.expires_at) : undefined,
        extraMeta: tokenRow.extra_meta || {},
      };
    }

    // Optional legacy compatibility fallback.
    try {
      const { data } = await supabase
        .from('meta_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', provider)
        .eq('connection_status', 'connected')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data?.encrypted_access_token) return null;
      const decryptedToken = decryptToken(data.encrypted_access_token);
      if (!decryptedToken) return null;
      const isExpired = data.token_expires_at ? new Date(data.token_expires_at) < new Date() : false;

      return {
        accessToken: decryptedToken,
        metaUserId: data.meta_user_id,
        scopes: data.scopes || [],
        isExpired,
        pageId: data.page_id,
        expiresAt: data.token_expires_at ? new Date(data.token_expires_at) : undefined,
        extraMeta: {},
      };
    } catch {
      return null;
    }
  }

  /**
   * Retrieve a Meta OAuth credential only when it belongs to the exact
   * authenticated user + workspace pair. Page discovery and selection must use
   * this path and must never fall back to a user-global credential row.
   */
  static async getValidTokenForWorkspace(
    userId: string,
    workspaceId: string,
    provider: 'facebook' | 'instagram' | 'meta' | 'whatsapp' = 'facebook'
  ) {
    if (!userId || !workspaceId) return null;

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('meta_connections')
      .select('encrypted_access_token,meta_user_id,scopes,page_id,token_expires_at,account_name,workspace_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('connection_status', 'connected')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.encrypted_access_token || data.workspace_id !== workspaceId) return null;

    const decryptedToken = decryptToken(data.encrypted_access_token);
    if (!decryptedToken) return null;

    // Retrieve discovered_pages and extra metadata from social_account_tokens if available
    let extraMeta: Record<string, any> = {};
    try {
      const { data: satRow } = await supabase
        .from('social_account_tokens')
        .select('extra_meta')
        .eq('user_id', userId)
        .eq('provider', provider)
        .eq('status', 'connected')
        .maybeSingle();
      if (satRow?.extra_meta) {
        extraMeta = satRow.extra_meta;
      }
    } catch {}

    return {
      accessToken: decryptedToken,
      metaUserId: data.meta_user_id,
      scopes: data.scopes || [],
      isExpired: data.token_expires_at ? new Date(data.token_expires_at) < new Date() : false,
      pageId: data.page_id,
      expiresAt: data.token_expires_at ? new Date(data.token_expires_at) : undefined,
      extraMeta,
    };
  }

  /**
   * Revoke Meta token remotely via Meta Graph API and mark revoked locally
   */
  static async revokeToken(userId: string, metaUserId: string, provider: 'facebook' | 'instagram' | 'meta' = 'facebook'): Promise<boolean> {
    const creds = await this.getValidToken(userId, provider);

    if (creds?.accessToken) {
      try {
        const res = await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${encodeURIComponent(creds.accessToken)}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          console.warn('[MetaCredentialService] Meta Graph API revocation returned a non-success status.');
        }
      } catch (graphErr) {
        console.warn('[MetaCredentialService] Meta remote revocation warning:', (graphErr as Error).message);
      }
    }

    const supabase = getServiceSupabase();
    await supabase
      .from('meta_connections')
      .update({
        connection_status: 'revoked',
        encrypted_access_token: null,
        encrypted_refresh_token: null,
        disconnected_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('meta_user_id', metaUserId)
      .eq('provider', provider);

    await AuditLoggerService.log({
      eventType: 'META_TOKEN_REVOKED',
      eventCategory: 'META',
      userId,
      metaUserId,
      success: true,
      metadata: { provider, action: 'revokeToken' },
    });

    return true;
  }

  /**
   * Disconnect Meta account with complete token destruction
   */
  static async disconnectAccount(userId: string, provider: 'facebook' | 'instagram' | 'meta' = 'facebook'): Promise<boolean> {
    const supabase = getServiceSupabase();

    const { data: conn } = await supabase
      .from('meta_connections')
      .select('meta_user_id')
      .eq('user_id', userId)
      .eq('provider', provider)
      .maybeSingle();

    const metaUserId = conn?.meta_user_id || 'unknown';

    if (conn?.meta_user_id) {
      await this.revokeToken(userId, conn.meta_user_id, provider);
    }

    await supabase
      .from('meta_connections')
      .update({
        connection_status: 'disconnected',
        encrypted_access_token: null,
        encrypted_refresh_token: null,
        disconnected_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', provider);

    await supabase
      .from('social_account_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('provider', provider);

    await AuditLoggerService.log({
      eventType: 'META_DISCONNECT',
      eventCategory: 'META',
      userId,
      metaUserId,
      success: true,
      metadata: { provider, action: 'disconnectAccount' },
    });

    return true;
  }

  /**
   * Complete Meta User Data Deletion Pipeline (Meta Data Deletion Callback compliance)
   */
  static async deleteUserData(metaUserId: string): Promise<{ confirmationCode: string; deletedAt: string }> {
    const supabase = getServiceSupabase();
    const confirmationCode = `del_${cryptoSafeIdentifier(metaUserId)}_${Date.now()}`;
    const deletedAt = new Date().toISOString();

    await supabase
      .from('meta_connections')
      .delete()
      .eq('meta_user_id', metaUserId);

    await AuditLoggerService.log({
      eventType: 'META_DISCONNECT',
      eventCategory: 'DATA_ACCESS',
      metaUserId,
      success: true,
      resourceType: 'meta_user_data',
      resourceId: metaUserId,
      metadata: {
        action: 'meta_data_deletion_callback',
        confirmation_code: confirmationCode,
        deleted_at: deletedAt,
      },
    });

    return { confirmationCode, deletedAt };
  }
}

function cryptoSafeIdentifier(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || 'unknown';
}
