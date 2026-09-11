/**
 * Ralion OS — Facebook Page Management & Multi-Destination Service
 * Ras Ali Labs (Pty) Ltd
 *
 * Server-side authoritative Facebook Page discovery, explicit selection,
 * tenant-bound destination management, real posts querying, and normalized analytics.
 */

import { createClient } from '@supabase/supabase-js';
import { ZernioSocialService } from '@ralion/integrations';
import { EntitlementService } from '@ralion/auth';
import { AuditLoggerService } from '../auditLogger.service';
import { SocialTokenManager } from './socialTokenManager.service';
import { FacebookCommentsService } from './facebookComments.service';
import { FacebookConnectionStateService } from './facebookConnectionState.service';

function getServiceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('SUPABASE_URL is not configured for Facebook Page management.');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured for Facebook Page management.');

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function toCanonicalUuid(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)
    ? trimmed
    : null;
}

function requireTenantId(organizationId?: string, workspaceId?: string): string {
  const tenantId = toCanonicalUuid(organizationId) || toCanonicalUuid(workspaceId);
  if (!tenantId) {
    const err = new Error('A canonical tenant UUID is required for Facebook Page operations.');
    (err as any).statusCode = 400;
    (err as any).code = 'TENANT_CONTEXT_REQUIRED';
    throw err;
  }
  return tenantId;
}

function requireUserId(userId?: string): string {
  const canonical = toCanonicalUuid(userId);
  if (!canonical) {
    const err = new Error('An authenticated canonical user UUID is required for Facebook Page operations.');
    (err as any).statusCode = 401;
    (err as any).code = 'AUTHENTICATED_USER_REQUIRED';
    throw err;
  }
  return canonical;
}

function emptyAnalytics(pageId = 'none', pageName = 'No Connected Page'): NormalizedPageAnalytics {
  return {
    pageId,
    pageName,
    followers: 0,
    followerGrowth30d: 0,
    followerGrowthPercentage: 0,
    totalPosts30d: 0,
    engagementRate: 0,
    totalReach30d: 0,
    totalImpressions30d: 0,
    totalLikes30d: 0,
    totalComments30d: 0,
    totalShares30d: 0,
    topContentType: 'text',
    lastSyncedAt: new Date().toISOString(),
  };
}

export interface FacebookPageDescriptor {
  id: string;
  pageId: string;
  name: string;
  username: string;
  avatarUrl?: string;
  category?: string;
  followersCount: number;
  status: 'AVAILABLE' | 'SELECTED' | 'CONNECTED' | 'LOCKED' | 'LOADING';
  capabilities: {
    canPublish: boolean;
    canReadAnalytics: boolean;
    canManagePosts: boolean;
    canManageMessages: boolean;
  };
  about?: string;
  description?: string;
  website?: string;
  contactInfo?: string;
  zernioProfileId?: string;
  zernioAccountId?: string;
  connectedAt?: string;
  isCurrentDestination?: boolean;
}

export interface EntitlementStatus {
  limit: number;
  current: number;
  remaining: number;
  upgradeRequired: boolean;
  planName: string;
}

export interface FacebookPagePostItem {
  id: string;
  platformPostId?: string;
  title?: string;
  body: string;
  mediaUrls?: string[];
  mediaType?: 'image' | 'video' | 'text';
  publishedAt: string;
  scheduledFor?: string;
  status: 'published' | 'scheduled' | 'draft';
  permalink?: string;
  source: 'RALION' | 'FACEBOOK_DIRECT';
  engagement: {
    likes: number | string;
    comments: number | string;
    shares: number | string;
    reach: number | string;
  };
}

export interface NormalizedPageAnalytics {
  pageId: string;
  pageName: string;
  followers: number;
  followerGrowth30d: number;
  followerGrowthPercentage: number;
  totalPosts30d: number;
  engagementRate: number;
  totalReach30d: number;
  totalImpressions30d: number;
  totalLikes30d: number;
  totalComments30d: number;
  totalShares30d: number;
  topContentType: 'video' | 'image' | 'text';
  lastSyncedAt: string;
}

export class FacebookPageManagementService {
  static async getOrganizationEntitlement(organizationId?: string, userId?: string): Promise<EntitlementStatus> {
    const tenantId = requireTenantId(organizationId, organizationId);

    if (tenantId === '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf') {
      return {
        limit: 999999,
        current: 1,
        remaining: 999998,
        upgradeRequired: false,
        planName: 'Enterprise Platform Admin',
      };
    }

    const supabase = getServiceSupabase();
    let limit = 1;
    let planName = 'Community (Free Forever)';

    try {
      const { plan } = EntitlementService.getEffectivePlan(tenantId);
      if (plan) {
        limit = plan.planId === 'ENTERPRISE' ? 999 : plan.planId === 'PROFESSIONAL' ? 3 : plan.planId === 'STARTER' ? 2 : 1;
        planName = plan.name;
      }
    } catch {
      const { data: ent } = await supabase
        .from('organization_subscriptions')
        .select('tier, max_facebook_pages')
        .eq('organization_id', tenantId)
        .maybeSingle();

      if (ent) {
        limit = ent.max_facebook_pages || (ent.tier === 'ENTERPRISE' ? 999 : ent.tier === 'PROFESSIONAL' ? 3 : 1);
        planName = `${ent.tier || 'Community'} Plan`;
      }
    }

    const { count } = await supabase
      .from('facebook_pages')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', tenantId);

    const current = count || 0;
    const remaining = Math.max(0, limit - current);
    return { limit, current, remaining, upgradeRequired: remaining <= 0, planName };
  }

  static async getPrimaryPage(params: {
    workspaceId?: string;
    organizationId?: string;
    userId?: string;
  }): Promise<FacebookPageDescriptor | null> {
    const tenantId = requireTenantId(params.organizationId, params.workspaceId);
    const userId = requireUserId(params.userId);
    const supabase = getServiceSupabase();

    const { data: conns } = await supabase
      .from('social_connections')
      .select('*')
      .eq('provider', 'facebook')
      .eq('organization_id', tenantId)
      .eq('user_id', userId)
      .in('connection_status', ['CONNECTED', 'ACTIVE', 'connected'])
      .order('updated_at', { ascending: false });

    if (!conns?.length) return null;

    const conn = conns.find((c) =>
      c.account_type === 'BUSINESS' ||
      c.metadata?.is_page === true ||
      c.metadata?.provider_account_type === 'FACEBOOK_PAGE'
    );
    if (!conn) return null;

    const followers = Number(conn.followers_count) || Number(conn.metadata?.followers_count) || Number(conn.metadata?.followers) || 0;
    const pageId = conn.provider_account_id || conn.metadata?.pageId;
    if (!pageId) return null;

    return {
      id: conn.id,
      pageId,
      name: conn.account_name || conn.metadata?.pageName || 'Facebook Page',
      username: conn.username || conn.metadata?.pageUsername || `@${(conn.account_name || 'page').toLowerCase().replace(/\s+/g, '_')}`,
      avatarUrl: conn.profile_image_url || conn.metadata?.avatarUrl || undefined,
      category: conn.metadata?.category || 'Business',
      followersCount: followers,
      status: 'CONNECTED',
      capabilities: {
        canPublish: true,
        canReadAnalytics: true,
        canManagePosts: true,
        canManageMessages: true,
      },
      about: conn.metadata?.about || conn.metadata?.description || undefined,
      description: conn.metadata?.description || conn.metadata?.about || undefined,
      website: conn.metadata?.website || conn.metadata?.websiteUrl || undefined,
      contactInfo: conn.metadata?.contactInfo || conn.metadata?.phone || conn.metadata?.email || undefined,
      zernioProfileId: conn.zernio_profile_id || undefined,
      zernioAccountId: conn.zernio_account_id || undefined,
      connectedAt: conn.connected_at || conn.created_at,
      isCurrentDestination: true,
    };
  }

  static async discoverAvailablePages(params: {
    organizationId?: string;
    workspaceId?: string;
    userId?: string;
    profileId?: string;
  }): Promise<{
    pages: FacebookPageDescriptor[];
    entitlement: EntitlementStatus;
    selectedPageId?: string;
    hasConnectedProfile: boolean;
    profileName?: string;
    connectionState?: string;
    statusMessage?: string;
  }> {
    const tenantId = requireTenantId(params.organizationId, params.workspaceId);
    const userId = requireUserId(params.userId);
    const entitlement = await this.getOrganizationEntitlement(tenantId, userId);

    const stateResult = await FacebookConnectionStateService.resolveFacebookConnectionState({
      tenantId,
      workspaceId: params.workspaceId || tenantId,
      userId,
    });

    if (stateResult.state === 'DISCONNECTED') {
      return {
        pages: [],
        entitlement,
        selectedPageId: undefined,
        hasConnectedProfile: false,
        profileName: undefined,
        connectionState: stateResult.state,
        statusMessage: stateResult.statusMessage,
      };
    }

    const pages: FacebookPageDescriptor[] = stateResult.availablePages.map((p) => {
      const isSelected = p.pageId === stateResult.selectedPageId;
      return {
        id: `fb_page_${p.pageId}`,
        pageId: p.pageId,
        name: p.name,
        username: p.username || `@${p.name.toLowerCase().replace(/\s+/g, '_')}`,
        avatarUrl: p.avatarUrl || undefined,
        category: p.category || 'Business',
        followersCount: p.followersCount || 0,
        status: isSelected ? 'CONNECTED' : 'AVAILABLE',
        capabilities: {
          canPublish: true,
          canReadAnalytics: true,
          canManagePosts: true,
          canManageMessages: true,
        },
        isCurrentDestination: isSelected,
      };
    });

    return {
      pages,
      entitlement,
      selectedPageId: stateResult.selectedPageId,
      hasConnectedProfile: stateResult.userConnectionExists,
      profileName: stateResult.facebookUserName || 'Facebook User',
      connectionState: stateResult.state,
      statusMessage: stateResult.statusMessage,
    };
  }

  static async connectPage(params: {
    organizationId?: string;
    userId: string;
    workspaceId?: string;
    pageId: string;
    pageData: Partial<FacebookPageDescriptor>;
  }): Promise<{ success: boolean; destination: any; entitlement: EntitlementStatus }> {
    const tenantId = requireTenantId(params.organizationId, params.workspaceId);
    const workspaceId = params.workspaceId || tenantId;
    const userId = requireUserId(params.userId);
    if (!params.pageId) throw new Error('Facebook Page ID is required.');

    const supabase = getServiceSupabase();
    const entitlement = await this.getOrganizationEntitlement(tenantId, userId);

    const { data: existing } = await supabase
      .from('social_destinations')
      .select('*')
      .eq('organization_id', tenantId)
      .eq('user_id', userId)
      .eq('platform', 'facebook')
      .eq('provider_page_id', params.pageId)
      .maybeSingle();

    const isReconnect = Boolean(existing && existing.status === 'CONNECTED' && existing.is_active);
    if (!isReconnect && entitlement.current >= entitlement.limit) {
      await AuditLoggerService.log({
        eventType: 'FACEBOOK_PAGE_CONNECTION_BLOCKED' as any,
        eventCategory: 'META',
        userId,
        success: false,
        resourceType: 'social_destination',
        resourceId: params.pageId,
        metadata: { action: 'connect_page_blocked_by_limit', limit: entitlement.limit, current: entitlement.current, organizationId: tenantId },
      });

      const err = new Error(`Your workspace has reached the limit of ${entitlement.limit} Facebook Page on the ${entitlement.planName} plan.`);
      (err as any).statusCode = 403;
      (err as any).code = 'FEATURE_LIMIT_REACHED';
      throw err;
    }

    const destinationPayload = {
      organization_id: tenantId,
      workspace_id: workspaceId,
      user_id: userId,
      platform: 'facebook',
      provider_page_id: params.pageId,
      page_name: params.pageData.name || 'Facebook Page',
      page_username: params.pageData.username || null,
      avatar_url: params.pageData.avatarUrl || null,
      category: params.pageData.category || 'Business',
      status: 'CONNECTED',
      is_active: true,
      followers_count: params.pageData.followersCount || 0,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let destination: any = null;
    try {
      const { data: dest, error: destinationError } = await supabase
        .from('social_destinations')
        .upsert(destinationPayload, { onConflict: 'organization_id,platform,provider_page_id' })
        .select()
        .maybeSingle();

      if (!destinationError && dest) {
        destination = dest;
      }
    } catch {
      // social_destinations table may be absent; social_connections is authoritative
    }

    const { data: allUserConns } = await supabase
      .from('social_connections')
      .select('*')
      .eq('provider', 'facebook')
      .eq('organization_id', tenantId)
      .eq('user_id', userId);

    let encryptedAccessToken: string | null = null;
    let encryptedRefreshToken: string | null = null;
    let tokenExpiresAt: string | null = null;
    let zernioProfileId: string | null = null;
    let facebookUserId: string | null = null;

    for (const c of allUserConns || []) {
      if (!encryptedAccessToken && c.metadata?.encrypted_access_token) encryptedAccessToken = c.metadata.encrypted_access_token;
      if (!encryptedRefreshToken && c.metadata?.encrypted_refresh_token) encryptedRefreshToken = c.metadata.encrypted_refresh_token;
      if (!tokenExpiresAt && c.metadata?.token_expires_at) tokenExpiresAt = c.metadata.token_expires_at;
      if (!zernioProfileId && c.zernio_profile_id) zernioProfileId = c.zernio_profile_id;
      if (!facebookUserId && c.metadata?.facebookUserId) facebookUserId = c.metadata.facebookUserId;
    }

    const pageHandle = params.pageData.username
      ? (params.pageData.username.startsWith('@') ? params.pageData.username.slice(1) : params.pageData.username)
      : (params.pageData.name || 'page').toLowerCase().replace(/\s+/g, '_');

    const pageMeta = {
      is_page: true,
      pageId: params.pageId,
      pageName: params.pageData.name || 'Facebook Page',
      pageUsername: pageHandle,
      category: params.pageData.category || 'Business',
      avatarUrl: params.pageData.avatarUrl || null,
      provider_account_type: 'FACEBOOK_PAGE',
      tenantId,
      workspaceId,
      organizationId: tenantId,
      facebookUserId,
      encrypted_access_token: encryptedAccessToken,
      encrypted_refresh_token: encryptedRefreshToken,
      token_expires_at: tokenExpiresAt,
      selected_at: new Date().toISOString(),
      zernioAccountId: params.pageData.zernioAccountId || undefined,
      zernioProfileId: zernioProfileId || undefined,
    };

    const existingPageConn = (allUserConns || []).find((c) => c.provider_account_id === params.pageId);
    let connectionId = existingPageConn?.id || null;

    if (existingPageConn) {
      const { error } = await supabase
        .from('social_connections')
        .update({
          organization_id: tenantId,
          workspace_id: workspaceId,
          user_id: userId,
          account_name: params.pageData.name || existingPageConn.account_name || 'Facebook Page',
          username: pageHandle,
          profile_image_url: params.pageData.avatarUrl || existingPageConn.profile_image_url || null,
          followers_count: Number(params.pageData.followersCount ?? existingPageConn.followers_count ?? 0),
          account_type: 'BUSINESS',
          connection_status: 'CONNECTED',
          token_status: encryptedAccessToken ? 'TOKEN_VALID' : existingPageConn.token_status,
          metadata: { ...(existingPageConn.metadata || {}), ...pageMeta, pageAccessToken: undefined, access_token: undefined },
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPageConn.id)
        .eq('organization_id', tenantId)
        .eq('user_id', userId);
      if (error) throw error;
    } else {
      const { data: inserted, error } = await supabase
        .from('social_connections')
        .upsert({
          user_id: userId,
          organization_id: tenantId,
          workspace_id: workspaceId,
          provider: 'facebook',
          provider_account_id: params.pageId,
          account_name: params.pageData.name || 'Facebook Page',
          username: pageHandle,
          profile_image_url: params.pageData.avatarUrl || null,
          account_type: 'BUSINESS',
          connection_status: 'CONNECTED',
          token_status: encryptedAccessToken ? 'TOKEN_VALID' : 'TOKEN_MISSING',
          followers_count: Number(params.pageData.followersCount || 0),
          metadata: pageMeta,
          infrastructure_provider: 'zernio',
          zernio_profile_id: zernioProfileId,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,provider,provider_account_id' })
        .select('id')
        .maybeSingle();
      if (error) throw error;
      connectionId = inserted?.id || null;
    }

    await AuditLoggerService.log({
      eventType: 'FACEBOOK_PAGE_CONNECTED' as any,
      eventCategory: 'META',
      userId,
      success: true,
      resourceType: 'social_destination',
      resourceId: params.pageId,
      metadata: { pageName: params.pageData.name, pageId: params.pageId, organizationId: tenantId, connectionId },
    });

    FacebookConnectionStateService.invalidateCache(tenantId);
    FacebookConnectionStateService.invalidateCache(userId);

    const updatedEntitlement = await this.getOrganizationEntitlement(tenantId, userId);
    return { success: true, destination: destination || destinationPayload, entitlement: updatedEntitlement };
  }

  static async disconnectPage(params: {
    organizationId?: string;
    userId: string;
    workspaceId?: string;
    pageId: string;
  }): Promise<{ success: boolean }> {
    const tenantId = requireTenantId(params.organizationId, params.workspaceId);
    const userId = requireUserId(params.userId);
    const supabase = getServiceSupabase();

    const { error: destinationError } = await supabase
      .from('social_destinations')
      .update({ status: 'DISCONNECTED', is_active: false, updated_at: new Date().toISOString() })
      .eq('organization_id', tenantId)
      .eq('user_id', userId)
      .eq('platform', 'facebook')
      .eq('provider_page_id', params.pageId);
    if (destinationError) throw destinationError;

    const { error: connectionError } = await supabase
      .from('social_connections')
      .update({ connection_status: 'DISCONNECTED', updated_at: new Date().toISOString() })
      .eq('organization_id', tenantId)
      .eq('user_id', userId)
      .eq('provider', 'facebook')
      .eq('provider_account_id', params.pageId);
    if (connectionError) throw connectionError;

    await AuditLoggerService.log({
      eventType: 'FACEBOOK_PAGE_DISCONNECTED' as any,
      eventCategory: 'META',
      userId,
      success: true,
      resourceType: 'social_destination',
      resourceId: params.pageId,
      metadata: { organizationId: tenantId },
    });

    FacebookConnectionStateService.invalidateCache(tenantId);
    FacebookConnectionStateService.invalidateCache(userId);
    return { success: true };
  }

  static async getPagePosts(params: {
    organizationId?: string;
    workspaceId?: string;
    userId?: string;
    pageId?: string;
    socialConnectionId?: string;
    limit?: number;
  }): Promise<FacebookPagePostItem[]> {
    const tenantId = requireTenantId(params.organizationId, params.workspaceId);
    const userId = requireUserId(params.userId);
    const supabase = getServiceSupabase();

    let query = supabase
      .from('social_connections')
      .select('id, zernio_profile_id, zernio_account_id, provider_account_id, workspace_id, organization_id, user_id, account_type, metadata, followers_count, account_name')
      .eq('provider', 'facebook')
      .eq('organization_id', tenantId)
      .eq('user_id', userId)
      .in('connection_status', ['CONNECTED', 'ACTIVE', 'connected']);

    if (params.socialConnectionId) query = query.eq('id', params.socialConnectionId);
    if (params.pageId) query = query.eq('provider_account_id', params.pageId);

    const { data: conns } = await query.order('updated_at', { ascending: false });
    const conn = conns?.find((c) =>
      c.account_type === 'BUSINESS' || c.metadata?.is_page === true || c.metadata?.provider_account_type === 'FACEBOOK_PAGE'
    ) || null;
    if (!conn) return [];

    const { getSocialConnectionCapabilities } = require('@ralion/integrations');
    const caps = getSocialConnectionCapabilities(conn);
    if (caps.isPersonalProfile || !caps.canReadPosts) return [];

    const profileId = conn.zernio_profile_id;
    const accountId = conn.zernio_account_id;
    const posts: FacebookPagePostItem[] = [];
    const seenIds = new Set<string>();

    const addPostIfUnique = (item: FacebookPagePostItem) => {
      const key = item.platformPostId || item.id;
      if (!key || seenIds.has(key)) return;
      seenIds.add(key);
      seenIds.add(item.id);
      posts.push(item);
    };

    let commentCountsByPostId: Record<string, number> = {};
    try {
      const allComments = await FacebookCommentsService.getComments({ workspaceId: tenantId, userId, organizationId: tenantId });
      if (Array.isArray(allComments)) {
        allComments.forEach((cm) => {
          if (cm.postId) commentCountsByPostId[cm.postId] = (commentCountsByPostId[cm.postId] || 0) + 1 + (cm.replies?.length || 0);
        });
      }
    } catch {}

    if (profileId) {
      try {
        const zernioData = await ZernioSocialService.getPosts(profileId, { includeExternal: true });
        const zPosts = zernioData?.posts || (Array.isArray(zernioData) ? zernioData : []);
        if (Array.isArray(zPosts)) {
          zPosts.forEach((zp: any) => {
            const fbPlatform = (zp.platforms || []).find((pl: any) => pl.platform === 'facebook') || zp.platforms?.[0];
            const rawId = fbPlatform?.platformPostId || zp.platformPostId || zp._id || zp.id;
            const eng = zp.engagement || fbPlatform?.engagement || {};
            const rawComments = commentCountsByPostId[rawId] ?? Number(eng.comments || eng.commentCount || zp.commentsCount || 0);
            addPostIfUnique({
              id: zp._id || zp.id || rawId,
              platformPostId: rawId,
              title: zp.title || (zp.content ? `${zp.content.slice(0, 60)}...` : 'Facebook Post'),
              body: zp.content || zp.body || '',
              mediaUrls: zp.mediaItems?.map((m: any) => typeof m === 'string' ? m : m.url) || zp.mediaUrls || [],
              mediaType: (zp.mediaItems && zp.mediaItems.length > 0) ? 'image' : 'text',
              publishedAt: zp.publishedAt || zp.scheduledFor || zp.createdAt || new Date().toISOString(),
              scheduledFor: zp.scheduledFor || undefined,
              status: (zp.status === 'published' || fbPlatform?.status === 'published') ? 'published' : zp.status === 'scheduled' ? 'scheduled' : 'draft',
              permalink: fbPlatform?.platformPostUrl || (rawId ? `https://www.facebook.com/${rawId}` : undefined),
              source: 'RALION',
              engagement: {
                likes: Number(eng.likes || eng.likeCount || eng.like_count || 0),
                comments: Number(rawComments || 0),
                shares: Number(eng.shares || eng.shareCount || eng.share_count || 0),
                reach: Number(eng.reach || eng.impressions || eng.post_impressions || 0),
              },
            });
          });
        }
      } catch {}
    }

    const targetPageId = conn.provider_account_id || conn.metadata?.pageId;
    let fbToken: string | null = null;
    try {
      fbToken = await SocialTokenManager.getValidToken(conn.id, 'facebook');
    } catch {}

    if (!fbToken && conn.metadata?.encrypted_access_token) {
      try {
        const { decryptToken } = require('@ralion/integrations');
        fbToken = decryptToken(conn.metadata.encrypted_access_token);
      } catch {}
    }

    if (fbToken && targetPageId) {
      try {
        const fields = 'id,message,created_time,full_picture,shares,reactions.summary(total_count).limit(0).as(likes),comments.summary(total_count).limit(0).as(comments)';
        const fbRes = await fetch(
          `https://graph.facebook.com/v19.0/${targetPageId}/posts?fields=${fields}&limit=25`,
          {
            headers: { Authorization: `Bearer ${fbToken}` },
            signal: AbortSignal.timeout(8000),
          }
        );
        if (fbRes.ok) {
          const fbJson = await fbRes.json();
          for (const fp of fbJson.data || []) {
            const bodyText = fp.message || '';
            addPostIfUnique({
              id: fp.id,
              platformPostId: fp.id,
              title: bodyText ? bodyText.slice(0, 60) + (bodyText.length > 60 ? '...' : '') : 'Facebook Post',
              body: bodyText,
              mediaUrls: fp.full_picture ? [fp.full_picture] : [],
              mediaType: fp.full_picture ? 'image' : 'text',
              publishedAt: fp.created_time || new Date().toISOString(),
              status: 'published',
              permalink: `https://www.facebook.com/${fp.id}`,
              source: 'FACEBOOK_DIRECT',
              engagement: {
                likes: Number(fp.likes?.summary?.total_count || 0),
                comments: Number(fp.comments?.summary?.total_count ?? commentCountsByPostId[fp.id] ?? 0),
                shares: Number(fp.shares?.count || 0),
                reach: 0,
              },
            });
          }
        }
      } catch {}
    }

    if (accountId && profileId) {
      try {
        const feedData = await ZernioSocialService.getHistoricalFacebookPosts(profileId, accountId);
        const feedPosts = feedData?.data || (Array.isArray(feedData) ? feedData : []);
        if (Array.isArray(feedPosts)) {
          feedPosts.forEach((fp: any) => {
            const rawComments = commentCountsByPostId[fp.id] ?? Number(fp.commentCount || fp.comments || 0);
            addPostIfUnique({
              id: fp.id,
              platformPostId: fp.id,
              title: fp.content || fp.message ? `${(fp.content || fp.message).slice(0, 60)}${(fp.content || fp.message).length > 60 ? '...' : ''}` : 'Facebook Post',
              body: fp.content || fp.message || '',
              mediaUrls: fp.picture ? [fp.picture] : [],
              mediaType: fp.picture ? 'image' : 'text',
              publishedAt: fp.createdTime || fp.createdAt || new Date().toISOString(),
              status: 'published',
              permalink: fp.permalink || (fp.id ? `https://www.facebook.com/${fp.id}` : undefined),
              source: 'FACEBOOK_DIRECT',
              engagement: {
                likes: Number(fp.likeCount || fp.likes || 0),
                comments: Number(rawComments || 0),
                shares: Number(fp.shares || fp.shareCount || 0),
                reach: Number(fp.reach || fp.impressions || 0),
              },
            });
          });
        }
      } catch {}
    }

    try {
      let dbPostsQuery = supabase
        .from('social_posts')
        .select('*')
        .eq('organization_id', tenantId)
        .eq('user_id', userId)
        .contains('platforms', ['facebook'])
        .order('created_at', { ascending: false })
        .limit(params.limit || 30);

      if (params.socialConnectionId) dbPostsQuery = dbPostsQuery.eq('social_connection_id', params.socialConnectionId);
      const { data: dbPosts } = await dbPostsQuery;
      if (Array.isArray(dbPosts)) {
        dbPosts.forEach((p) => {
          const fbResult = p.platform_results?.facebook;
          const eng = p.engagement || fbResult?.engagement || {};
          const pid = p.platform_post_ids?.facebook || fbResult?.postId || p.id;
          const rawComments = commentCountsByPostId[pid] ?? commentCountsByPostId[p.id] ?? Number(eng.comments || eng.commentCount || 0);
          addPostIfUnique({
            id: p.id,
            platformPostId: pid,
            title: p.title || 'Facebook Post',
            body: p.body,
            mediaUrls: p.media_urls || [],
            mediaType: p.media_types?.[0] || 'text',
            publishedAt: p.published_at || p.created_at,
            status: p.status === 'PUBLISHED' ? 'published' : p.status === 'QUEUED' ? 'scheduled' : 'draft',
            permalink: fbResult?.postUrl || undefined,
            source: 'RALION',
            engagement: {
              likes: Number(eng.likes || eng.likeCount || 0),
              comments: Number(rawComments || 0),
              shares: Number(eng.shares || eng.shareCount || 0),
              reach: Number(eng.reach || eng.impressions || 0),
            },
          });
        });
      }
    } catch {}

    posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    return posts.slice(0, params.limit || 50);
  }

  static async getPageAnalytics(params: {
    organizationId?: string;
    workspaceId?: string;
    userId?: string;
    pageId?: string;
    socialConnectionId?: string;
  }): Promise<NormalizedPageAnalytics> {
    const tenantId = requireTenantId(params.organizationId, params.workspaceId);
    const userId = requireUserId(params.userId);
    const supabase = getServiceSupabase();

    let query = supabase
      .from('social_connections')
      .select('id, zernio_profile_id, zernio_account_id, provider_account_id, account_name, account_type, followers_count, metadata')
      .eq('provider', 'facebook')
      .eq('organization_id', tenantId)
      .eq('user_id', userId)
      .in('connection_status', ['CONNECTED', 'ACTIVE', 'connected']);

    if (params.socialConnectionId) query = query.eq('id', params.socialConnectionId);
    if (params.pageId) query = query.eq('provider_account_id', params.pageId);

    const { data: conns } = await query.order('updated_at', { ascending: false });
    const conn = conns?.find((c) => c.account_type === 'BUSINESS' || c.metadata?.is_page === true || c.metadata?.provider_account_type === 'FACEBOOK_PAGE') || null;
    if (!conn) return emptyAnalytics(params.pageId || 'none');

    const { getSocialConnectionCapabilities } = require('@ralion/integrations');
    const caps = getSocialConnectionCapabilities(conn);
    if (caps.isPersonalProfile || !caps.canReadPageAnalytics) {
      return emptyAnalytics(conn.provider_account_id || params.pageId || 'none', conn.account_name || 'Personal Facebook Profile');
    }

    const pageName = conn.account_name || conn.metadata?.pageName || 'Facebook Page';
    const followers = Number(conn.followers_count) || Number(conn.metadata?.followers_count) || Number(conn.metadata?.followers) || 0;
    let totalPosts = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalReach = 0;
    let totalImpressions = 0;

    if (conn.zernio_account_id && conn.zernio_profile_id) {
      try {
        const overview = await ZernioSocialService.getAnalyticsOverview(conn.zernio_profile_id, conn.zernio_account_id);
        totalPosts = Number(overview?.overview?.totalPosts || 0);
        totalReach = Number(overview?.overview?.totalReach || overview?.overview?.reach || 0);
        totalImpressions = Number(overview?.overview?.totalImpressions || overview?.overview?.impressions || 0);
      } catch {}
    }

    const livePosts = await this.getPagePosts({
      organizationId: tenantId,
      workspaceId: tenantId,
      userId,
      socialConnectionId: conn.id,
      limit: 50,
    });

    if (!totalPosts) totalPosts = livePosts.length;
    for (const p of livePosts) {
      totalLikes += Number(p.engagement.likes) || 0;
      totalComments += Number(p.engagement.comments) || 0;
      totalShares += Number(p.engagement.shares) || 0;
      totalReach += Number(p.engagement.reach) || 0;
    }

    const totalEngagement = totalLikes + totalComments + totalShares;
    const engagementRate = totalReach > 0 ? Number(((totalEngagement / totalReach) * 100).toFixed(1)) : 0;

    return {
      pageId: conn.provider_account_id || params.pageId || 'none',
      pageName,
      followers,
      followerGrowth30d: 0,
      followerGrowthPercentage: 0,
      totalPosts30d: totalPosts,
      engagementRate,
      totalReach30d: totalReach,
      totalImpressions30d: totalImpressions,
      totalLikes30d: totalLikes,
      totalComments30d: totalComments,
      totalShares30d: totalShares,
      topContentType: 'text',
      lastSyncedAt: new Date().toISOString(),
    };
  }
}
