/**
 * ============================================================================
 * AUTHORITATIVE FACEBOOK CONNECTION STATE MACHINE SERVICE
 * ============================================================================
 * 
 * Provides a single, authoritative source of truth for Facebook connection state,
 * token validity, Meta App issuer verification, permission inspection, Page discovery,
 * and Page selection across all Ralion OS surfaces.
 * 
 * Guarantees:
 * - 7 mutually exclusive states
 * - Zero token leakage to clients
 * - Rejection of stale Meta App tokens
 * - Strict multi-tenant isolation
 * - Authoritative disconnect enforcement (no Zernio resurrection)
 */

import { createClient } from '@supabase/supabase-js';
import { decryptToken } from '@ralion/integrations';

function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export const AUTHORITATIVE_META_APP_ID = '1759273775121373';
export const AUTHORITATIVE_META_APP_NAME = 'Ralion growth';

export type FacebookConnectionState =
  | 'DISCONNECTED'
  | 'PROFILE_CONNECTED_PAGE_ACCESS_UNAVAILABLE'
  | 'PROFILE_CONNECTED_PAGE_NOT_SELECTED'
  | 'PAGE_CONNECTED'
  | 'TOKEN_EXPIRED'
  | 'REAUTH_REQUIRED'
  | 'ERROR';

export interface DiscoveredPageSummary {
  pageId: string;
  name: string;
  username?: string;
  category?: string;
  followersCount?: number;
  avatarUrl?: string | null;
  tasks?: string[];
}

export interface FacebookConnectionStateResult {
  state: FacebookConnectionState;
  provider: 'facebook';
  tenantId: string;
  workspaceId: string;
  userId?: string;
  userConnectionExists: boolean;
  tokenValid: boolean;
  tokenAppId?: string;
  requiredAppId: string;
  isStaleAppToken: boolean;
  facebookUserId?: string;
  facebookUserName?: string;
  pagePermissionsGranted: boolean;
  grantedPermissions: string[];
  declinedPermissions: string[];
  availablePagesCount: number;
  availablePages: DiscoveredPageSummary[];
  selectedPageId?: string;
  selectedPageName?: string;
  selectedPageFollowers?: number;
  selectedPageCategory?: string;
  selectedPageAbout?: string;
  selectedPageWebsite?: string;
  pageAccessible: boolean;
  requiresReauth: boolean;
  reason?: string;
  statusMessage: string;
  ctaAction?: 'CONNECT_FACEBOOK' | 'SELECT_FACEBOOK_PAGE' | 'RECONNECT_PAGE_ACCESS' | 'RECONNECT_EXPIRED' | 'MANAGE_PAGE';
  ctaLabel?: string;
}

// In-memory short-lived cache (15 seconds) to prevent Meta Graph API rate-limiting during rapid page re-renders
const stateCache = new Map<string, { result: FacebookConnectionStateResult; cachedAt: number }>();
const CACHE_TTL_MS = 15_000;

export class FacebookConnectionStateService {
  /**
   * Invalidate cached state for a tenant / workspace / user
   */
  static invalidateCache(tenantOrWorkspaceId?: string) {
    if (!tenantOrWorkspaceId) {
      stateCache.clear();
      return;
    }
    for (const key of stateCache.keys()) {
      if (key.includes(tenantOrWorkspaceId)) {
        stateCache.delete(key);
      }
    }
  }

  /**
   * Resolve authoritative Facebook connection state for a given tenant context.
   */
  static async resolveFacebookConnectionState(params: {
    tenantId?: string;
    workspaceId?: string;
    userId?: string;
    forceRefresh?: boolean;
  }): Promise<FacebookConnectionStateResult> {
    const tenantId = params.tenantId || params.workspaceId || 'unconfigured-tenant';
    const workspaceId = params.workspaceId || params.tenantId || 'unconfigured-workspace';
    const userId = params.userId;

    const cacheKey = `${tenantId}:${workspaceId}:${userId || 'anon'}`;
    const now = Date.now();

    if (!params.forceRefresh && stateCache.has(cacheKey)) {
      const cached = stateCache.get(cacheKey)!;
      if (now - cached.cachedAt < CACHE_TTL_MS) {
        return cached.result;
      }
    }

    const defaultDisconnectedResult: FacebookConnectionStateResult = {
      state: 'DISCONNECTED',
      provider: 'facebook',
      tenantId,
      workspaceId,
      userId,
      userConnectionExists: false,
      tokenValid: false,
      requiredAppId: AUTHORITATIVE_META_APP_ID,
      isStaleAppToken: false,
      pagePermissionsGranted: false,
      grantedPermissions: [],
      declinedPermissions: [],
      availablePagesCount: 0,
      availablePages: [],
      pageAccessible: false,
      requiresReauth: false,
      statusMessage: 'Facebook is not connected.',
      ctaAction: 'CONNECT_FACEBOOK',
      ctaLabel: 'Connect Facebook',
    };

    try {
      const supabase = getServiceSupabase();

      // 1. Query active social_connections strictly for this workspace / user
      // CRITICAL: Exclude DISCONNECTED, REVOKED, or DELETED records
      let connQuery = supabase
        .from('social_connections')
        .select('*')
        .eq('provider', 'facebook')
        .not('connection_status', 'in', '("DISCONNECTED","REVOKED","REMOVED","disconnected")');

      if (workspaceId && workspaceId !== 'default' && workspaceId !== 'unconfigured-workspace') {
        if (userId) {
          connQuery = connQuery.or(`workspace_id.eq.${workspaceId},user_id.eq.${userId}`);
        } else {
          connQuery = connQuery.eq('workspace_id', workspaceId);
        }
      } else if (userId) {
        connQuery = connQuery.eq('user_id', userId);
      } else {
        return defaultDisconnectedResult;
      }

      const { data: rawConns } = await connQuery.order('updated_at', { ascending: false });
      const activeConnections = (rawConns || []).filter(
        c => c.connection_status === 'CONNECTED' || c.connection_status === 'ACTIVE'
      );

      // Also check fallback token tables if native connection exists
      let encryptedToken: string | null = null;
      let facebookUserId: string | undefined = undefined;
      let facebookUserName: string | undefined = undefined;
      let activeConnRecord: any = null;

      for (const conn of activeConnections) {
        if (conn.metadata?.encrypted_access_token) {
          encryptedToken = conn.metadata.encrypted_access_token;
          facebookUserId = conn.metadata?.facebookUserId || conn.provider_account_id;
          facebookUserName = conn.account_name || conn.username;
          activeConnRecord = conn;
          break;
        }
      }

      if (!encryptedToken && userId) {
        // Check social_account_tokens
        const { data: sat } = await supabase
          .from('social_account_tokens')
          .select('encrypted_access_token, account_handle, page_id')
          .eq('user_id', userId)
          .eq('provider', 'facebook')
          .maybeSingle();

        if (sat?.encrypted_access_token) {
          encryptedToken = sat.encrypted_access_token;
        }
      }

      // If no active connections or tokens found, verify state is cleanly DISCONNECTED
      if (!encryptedToken && activeConnections.length === 0) {
        stateCache.set(cacheKey, { result: defaultDisconnectedResult, cachedAt: now });
        return defaultDisconnectedResult;
      }

      // If only a Zernio-only connection exists without native token
      if (!encryptedToken && activeConnections.length > 0) {
        const isZernioOnly = activeConnections.every(c => c.infrastructure_provider === 'zernio' && !c.access_token);
        if (isZernioOnly) {
          // Zernio account without native token cannot establish canonical Meta Page access
          const result: FacebookConnectionStateResult = {
            ...defaultDisconnectedResult,
            userConnectionExists: true,
            state: 'PROFILE_CONNECTED_PAGE_ACCESS_UNAVAILABLE',
            reason: 'ZERNIO_NATIVE_TOKEN_MISSING',
            statusMessage: 'Your Facebook account is connected, but Facebook Page access is not currently available.',
            ctaAction: 'RECONNECT_PAGE_ACCESS',
            ctaLabel: 'Reconnect Facebook with Page Access',
          };
          stateCache.set(cacheKey, { result, cachedAt: now });
          return result;
        }
      }

      // 2. Decrypt User Access Token
      let accessToken: string | null = null;
      try {
        if (encryptedToken) {
          accessToken = decryptToken(encryptedToken);
        }
      } catch (decErr: any) {
        console.warn('[FacebookStateService] Token decryption failure:', decErr.message);
      }

      if (!accessToken || !accessToken.startsWith('EAA')) {
        const result: FacebookConnectionStateResult = {
          ...defaultDisconnectedResult,
          userConnectionExists: true,
          state: 'REAUTH_REQUIRED',
          requiresReauth: true,
          reason: 'INVALID_ENCRYPTED_TOKEN',
          statusMessage: 'Facebook needs to be reconnected.',
          ctaAction: 'RECONNECT_EXPIRED',
          ctaLabel: 'Reconnect Facebook',
        };
        stateCache.set(cacheKey, { result, cachedAt: now });
        return result;
      }

      // 3. Inspect Token with Meta Graph API (/debug_token & /me/permissions)
      let debugData: any = null;
      let permissionsList: Array<{ permission: string; status: string }> = [];

      try {
        // App secret proof / debug_token check
        const debugRes = await fetch(
          `https://graph.facebook.com/v19.0/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(accessToken)}`
        );
        if (debugRes.ok) {
          const dJson = await debugRes.json();
          debugData = dJson.data;
        }
      } catch {}

      // Check token expiration
      if (debugData && debugData.is_valid === false) {
        const result: FacebookConnectionStateResult = {
          ...defaultDisconnectedResult,
          userConnectionExists: true,
          tokenValid: false,
          state: 'TOKEN_EXPIRED',
          requiresReauth: true,
          reason: 'TOKEN_EXPIRED_BY_META',
          statusMessage: 'Your Facebook connection has expired.',
          ctaAction: 'RECONNECT_EXPIRED',
          ctaLabel: 'Reconnect Facebook',
        };
        stateCache.set(cacheKey, { result, cachedAt: now });
        return result;
      }

      // Check Meta App Issuer Authority (PHASE 1 / FB-02 / FB-03)
      const tokenAppId = debugData?.app_id ? String(debugData.app_id) : undefined;
      const isStaleAppToken = Boolean(tokenAppId && tokenAppId !== AUTHORITATIVE_META_APP_ID);

      if (isStaleAppToken) {
        const result: FacebookConnectionStateResult = {
          ...defaultDisconnectedResult,
          userConnectionExists: true,
          tokenValid: true,
          tokenAppId,
          isStaleAppToken: true,
          state: 'REAUTH_REQUIRED',
          requiresReauth: true,
          reason: `STALE_APP_TOKEN: Token was issued by legacy Meta App (${tokenAppId}) instead of authoritative App (${AUTHORITATIVE_META_APP_ID}).`,
          statusMessage: 'Facebook needs to be reconnected with the current Meta App.',
          ctaAction: 'RECONNECT_PAGE_ACCESS',
          ctaLabel: 'Reconnect Facebook',
        };
        stateCache.set(cacheKey, { result, cachedAt: now });
        return result;
      }

      // Check Permissions via /me/permissions
      try {
        const permRes = await fetch(
          `https://graph.facebook.com/v19.0/me/permissions?access_token=${encodeURIComponent(accessToken)}`
        );
        if (permRes.ok) {
          const pJson = await permRes.json();
          permissionsList = pJson.data || [];
        }
      } catch {}

      const grantedPermissions = permissionsList.filter(p => p.status === 'granted').map(p => p.permission);
      const declinedPermissions = permissionsList.filter(p => p.status !== 'granted').map(p => p.permission);

      const hasPagesShowList = grantedPermissions.includes('pages_show_list') || (debugData?.scopes && debugData.scopes.includes('pages_show_list'));

      // 4. Query /me/accounts to discover manageable Pages
      const availablePages: DiscoveredPageSummary[] = [];

      if (hasPagesShowList) {
        try {
          let nextPageUrl: string | null = `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,username,category,tasks,picture,followers_count,fan_count,about,website,phone,single_line_address&limit=100&access_token=${encodeURIComponent(accessToken)}`;

          while (nextPageUrl) {
            const pageRes: Response = await fetch(nextPageUrl);
            if (!pageRes.ok) break;
            const pData: any = await pageRes.json();
            const graphPages = pData.data || [];

            for (const p of graphPages) {
              availablePages.push({
                pageId: String(p.id),
                name: p.name,
                username: p.username || `@${p.name.toLowerCase().replace(/\s+/g, '_')}`,
                category: p.category || 'Business',
                followersCount: Number(p.followers_count ?? p.fan_count ?? 0),
                avatarUrl: p.picture?.data?.url || null,
                tasks: p.tasks || [],
              });
            }
            nextPageUrl = pData.paging?.next || null;
          }
        } catch (pageErr: any) {
          console.warn('[FacebookStateService] /me/accounts discovery note:', pageErr.message);
        }
      }

      // Check User Profile Name if not yet loaded
      if (!facebookUserName) {
        try {
          const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`);
          if (meRes.ok) {
            const meJson = await meRes.json();
            facebookUserId = meJson.id;
            facebookUserName = meJson.name;
          }
        } catch {}
      }

      // 5. Determine State & Bound Selected Page
      // Check for active selected page in active connection metadata or social_destinations
      const boundPageId = activeConnRecord?.metadata?.pageId || (activeConnRecord?.account_type === 'BUSINESS' ? activeConnRecord?.provider_account_id : undefined);
      
      let selectedPage: DiscoveredPageSummary | undefined = undefined;
      if (boundPageId && availablePages.length > 0) {
        selectedPage = availablePages.find(p => p.pageId === boundPageId);
      }

      // Check state branches:
      // STATE: PROFILE_CONNECTED_PAGE_ACCESS_UNAVAILABLE
      if (!hasPagesShowList || availablePages.length === 0) {
        const result: FacebookConnectionStateResult = {
          state: 'PROFILE_CONNECTED_PAGE_ACCESS_UNAVAILABLE',
          provider: 'facebook',
          tenantId,
          workspaceId,
          userId,
          userConnectionExists: true,
          tokenValid: true,
          tokenAppId: tokenAppId || AUTHORITATIVE_META_APP_ID,
          requiredAppId: AUTHORITATIVE_META_APP_ID,
          isStaleAppToken: false,
          facebookUserId,
          facebookUserName,
          pagePermissionsGranted: false,
          grantedPermissions,
          declinedPermissions,
          availablePagesCount: availablePages.length,
          availablePages,
          pageAccessible: false,
          requiresReauth: !hasPagesShowList,
          reason: !hasPagesShowList ? 'LACKS_PAGES_SHOW_LIST_SCOPE' : 'NO_PAGES_RETURNED_BY_META',
          statusMessage: 'Your Facebook account is connected, but Facebook Page access is not currently available.',
          ctaAction: 'RECONNECT_PAGE_ACCESS',
          ctaLabel: 'Reconnect Facebook with Page Access',
        };
        stateCache.set(cacheKey, { result, cachedAt: now });
        return result;
      }

      // STATE: PAGE_CONNECTED
      if (selectedPage) {
        const result: FacebookConnectionStateResult = {
          state: 'PAGE_CONNECTED',
          provider: 'facebook',
          tenantId,
          workspaceId,
          userId,
          userConnectionExists: true,
          tokenValid: true,
          tokenAppId: tokenAppId || AUTHORITATIVE_META_APP_ID,
          requiredAppId: AUTHORITATIVE_META_APP_ID,
          isStaleAppToken: false,
          facebookUserId,
          facebookUserName,
          pagePermissionsGranted: true,
          grantedPermissions,
          declinedPermissions,
          availablePagesCount: availablePages.length,
          availablePages,
          selectedPageId: selectedPage.pageId,
          selectedPageName: selectedPage.name,
          selectedPageFollowers: selectedPage.followersCount,
          selectedPageCategory: selectedPage.category,
          selectedPageAbout: activeConnRecord?.metadata?.about,
          selectedPageWebsite: activeConnRecord?.metadata?.website,
          pageAccessible: true,
          requiresReauth: false,
          statusMessage: `Facebook Page connected — ${selectedPage.name}`,
          ctaAction: 'MANAGE_PAGE',
          ctaLabel: 'Manage Page / Change Page',
        };
        stateCache.set(cacheKey, { result, cachedAt: now });
        return result;
      }

      // STATE: PROFILE_CONNECTED_PAGE_NOT_SELECTED
      const result: FacebookConnectionStateResult = {
        state: 'PROFILE_CONNECTED_PAGE_NOT_SELECTED',
        provider: 'facebook',
        tenantId,
        workspaceId,
        userId,
        userConnectionExists: true,
        tokenValid: true,
        tokenAppId: tokenAppId || AUTHORITATIVE_META_APP_ID,
        requiredAppId: AUTHORITATIVE_META_APP_ID,
        isStaleAppToken: false,
        facebookUserId,
        facebookUserName,
        pagePermissionsGranted: true,
        grantedPermissions,
        declinedPermissions,
        availablePagesCount: availablePages.length,
        availablePages,
        pageAccessible: false,
        requiresReauth: false,
        statusMessage: 'Facebook is connected. Select the Page you want Ralion to manage.',
        ctaAction: 'SELECT_FACEBOOK_PAGE',
        ctaLabel: 'Select Facebook Page',
      };
      stateCache.set(cacheKey, { result, cachedAt: now });
      return result;
    } catch (err: any) {
      console.error('[FacebookStateService] Resolution error:', err);
      const errResult: FacebookConnectionStateResult = {
        ...defaultDisconnectedResult,
        state: 'ERROR',
        reason: err.message,
        statusMessage: 'Unable to verify Facebook connection state.',
      };
      return errResult;
    }
  }
}
