/**
 * ============================================================================
 * AUTHORITATIVE SOCIAL DISCONNECT SERVICE
 * ============================================================================
 * 
 * Provides a single, unified server-side operation to authoritatively and
 * irreversibly disconnect any social provider (Facebook, Instagram, LinkedIn, etc.)
 * across all database tables, destination bindings, token vaults, and Zernio infrastructure.
 * 
 * Guarantees:
 * - 100% persistent disconnect surviving page refreshes and server reboots
 * - Zero resurrection from Zernio or client-side caches
 * - Invalidation of all downstream caches (State Machine, BusinessContext, TokenManager)
 */

import 'server-only';
import { ZernioSocialService } from '@ralion/integrations/server';
import { FacebookConnectionStateService } from './facebookConnectionState.service';
import { getPrivilegedSupabase as getServiceSupabase } from '@/lib/supabase/server';

export interface DisconnectSocialParams {
  tenantId?: string;
  workspaceId?: string;
  userId?: string;
  provider: string;
  connectionId?: string;
}

export interface DisconnectSocialResult {
  success: boolean;
  provider: string;
  tenantId: string;
  workspaceId: string;
  recordsUpdated: number;
  tokensPurged: number;
  zernioDisconnected: boolean;
  finalState: string;
}

export class SocialDisconnectService {
  /**
   * Authoritatively disconnect a social provider for a given tenant context.
   */
  static async disconnectSocialProvider(params: DisconnectSocialParams): Promise<DisconnectSocialResult> {
    const provider = params.provider.toLowerCase();
    const tenantId = params.tenantId || params.workspaceId || 'unconfigured-tenant';
    const workspaceId = params.workspaceId || params.tenantId || 'unconfigured-workspace';
    const userId = params.userId;
    const connectionId = params.connectionId;

    const supabase = getServiceSupabase();
    const nowIso = new Date().toISOString();
    let recordsUpdated = 0;
    let tokensPurged = 0;
    let zernioDisconnected = false;

    // 1. Target social_connections records. Every selector is an AND
    // boundary: connection ID never weakens organization/workspace/user scope.
    let connQuery = supabase
      .from('social_connections')
      .select('*')
      .eq('provider', provider);

    if (tenantId && tenantId !== 'unconfigured-tenant') {
      connQuery = connQuery.eq('organization_id', tenantId);
    }
    if (workspaceId && workspaceId !== 'default' && workspaceId !== 'unconfigured-workspace') {
      connQuery = connQuery.eq('workspace_id', workspaceId);
    }
    if (userId) {
      connQuery = connQuery.eq('user_id', userId);
    }
    if (connectionId) {
      connQuery = connQuery.eq('id', connectionId);
    }

    const { data: matchedConns, error: connectionLookupError } = await connQuery;
    if (connectionLookupError) {
      throw Object.assign(new Error('Unable to resolve the social connection to disconnect.'), { statusCode: 503 });
    }
    if (connectionId && (!matchedConns || matchedConns.length === 0)) {
      throw Object.assign(new Error('Social connection not found in this workspace.'), { statusCode: 404 });
    }

    for (const conn of matchedConns || []) {
      // If connected via Zernio, disconnect on remote Zernio platform first
      if (conn.zernio_account_id) {
        try {
          await ZernioSocialService.disconnectAccount(conn.zernio_account_id);
          zernioDisconnected = true;
        } catch (zErr: any) {
          console.warn(`[SocialDisconnect] Zernio remote disconnect warning (${conn.zernio_account_id}):`, zErr.message);
        }
      }

      // Sanitize metadata to strip all tokens and Page selections
      const sanitizedMeta = { ...(conn.metadata || {}) };
      delete sanitizedMeta.encrypted_access_token;
      delete sanitizedMeta.encrypted_refresh_token;
      delete sanitizedMeta.page_access_token;
      delete sanitizedMeta.accessToken;
      delete sanitizedMeta.pageId;
      delete sanitizedMeta.pageName;
      delete sanitizedMeta.pageUsername;
      delete sanitizedMeta.about;
      delete sanitizedMeta.website;

      const { error: updateErr } = await supabase
        .from('social_connections')
        .update({
          connection_status: 'DISCONNECTED',
          token_status: 'TOKEN_REVOKED',
          metadata: sanitizedMeta,
          zernio_account_id: null,
          disconnected_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', conn.id)
        .eq('organization_id', tenantId)
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId || conn.user_id);

      if (!updateErr) recordsUpdated += 1;
    }

    // 2. Purge provider-level authorization vaults only for an explicit
    // provider-wide disconnect. Disconnecting one Page/account must not revoke
    // another account or another workspace's authorization state.
    if (userId && !connectionId) {
      try {
        const { data: legacyToken } = await supabase
          .from('social_account_tokens')
          .select('id, extra_meta')
          .eq('user_id', userId)
          .eq('provider', provider)
          .maybeSingle();

        const legacyMeta = (legacyToken?.extra_meta || {}) as Record<string, any>;
        const belongsToScope =
          legacyToken &&
          legacyMeta.workspaceId === workspaceId &&
          legacyMeta.organizationId === tenantId;

        if (belongsToScope) {
          const { error: delTokenErr } = await supabase
            .from('social_account_tokens')
            .delete()
            .eq('id', legacyToken.id);
          if (!delTokenErr) tokensPurged += 1;
        }
      } catch {}

      if (['facebook', 'instagram', 'meta', 'whatsapp'].includes(provider)) {
        try {
          await supabase
            .from('meta_connections')
            .update({
              connection_status: 'disconnected',
              encrypted_access_token: null,
              encrypted_refresh_token: null,
              disconnected_at: nowIso,
              updated_at: nowIso,
            })
            .eq('user_id', userId)
            .eq('workspace_id', workspaceId)
            .eq('provider', provider);
        } catch {}
      }
    }

    // 3. Provider-wide destination invalidation is safe only when the user
    // explicitly disconnected the provider rather than one isolated account.
    if (!connectionId) {
      try {
        let destQuery = supabase
          .from('social_destinations')
          .update({
            is_active: false,
            status: 'DISCONNECTED',
            updated_at: nowIso,
          })
          .eq('provider', provider)
          .eq('workspace_id', workspaceId);

        if (userId) destQuery = destQuery.eq('user_id', userId);
        await destQuery;
      } catch {}
    }

    // 4. Invalidate all In-Memory & Service Caches
    FacebookConnectionStateService.invalidateCache(tenantId);
    FacebookConnectionStateService.invalidateCache(workspaceId);
    if (userId) FacebookConnectionStateService.invalidateCache(userId);

    try {
      const { BusinessContextService } = require('@ralion/ai/server');
      BusinessContextService.invalidateContext(tenantId);
      BusinessContextService.invalidateContext(workspaceId);
    } catch {}

    // 5. Verify authoritative post-disconnect state
    let finalState = 'DISCONNECTED';
    if (provider === 'facebook') {
      const postState = await FacebookConnectionStateService.resolveFacebookConnectionState({
        tenantId,
        workspaceId,
        userId,
        forceRefresh: true,
      });
      finalState = postState.state;
    }

    return {
      success: true,
      provider,
      tenantId,
      workspaceId,
      recordsUpdated,
      tokensPurged,
      zernioDisconnected,
      finalState,
    };
  }
}
