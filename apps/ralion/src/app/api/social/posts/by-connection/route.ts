import { NextRequest } from 'next/server';
import { FacebookPageManagementService } from '@/lib/services/social/facebookPageManagement.service';
import { SocialTokenManager } from '@/lib/services/social/socialTokenManager.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext, authRequiredResponse, getServiceSupabase } from '@/lib/auth/serverAuth';
import { tenantCache, buildTenantCacheKey } from '@/lib/cache/tenantCache';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const context = await getCurrentRalionContext(request, { requireAuth: true });
    if (!context) {
      return authRequiredResponse(request);
    }

    const { searchParams } = new URL(request.url);
    const socialConnectionId = searchParams.get('socialConnectionId');

    if (!socialConnectionId) {
      return corsJsonResponse(
        {
          success: false,
          error: 'socialConnectionId is required. Do not fall back to a default account — pass an explicit connection ID.',
        },
        { status: 400 },
        request
      );
    }

    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const cacheKey = buildTenantCacheKey(context.user.id, context.workspace.id, 'posts_by_conn', `${socialConnectionId}:${limit}`);
    const cached = tenantCache.get<any>(cacheKey);
    if (cached) {
      return corsJsonResponse(cached, undefined, request);
    }

    const supabase = getServiceSupabase();

    // 1. Validate the connection belongs strictly to this workspace & organization
    const { data: conn } = await supabase
      .from('social_connections')
      .select('id, provider, provider_account_id, workspace_id, organization_id, user_id, account_type, zernio_profile_id, zernio_account_id, metadata, connection_status')
      .eq('id', socialConnectionId)
      .eq('workspace_id', context.workspace.id)
      .eq('organization_id', context.organization.id)
      .in('connection_status', ['CONNECTED', 'ACTIVE', 'connected', 'active'])
      .maybeSingle();

    if (!conn) {
      return corsJsonResponse(
        {
          success: false,
          error: `Access denied: Connection ${socialConnectionId} does not belong to this workspace/organization.`,
        },
        { status: 403 },
        request
      );
    }

    const { getSocialConnectionCapabilities } = require('@ralion/integrations');
    const caps = getSocialConnectionCapabilities(conn);

    // 2. Personal Facebook profile: posts are explicitly unavailable (do not emulate a page)
    if (caps.classification === 'FACEBOOK_PERSONAL_PROFILE') {
      const respPayload = {
        success: true,
        socialConnectionId,
        provider: conn.provider,
        accountType: 'FACEBOOK_PERSONAL_PROFILE',
        accountTypeLabel: 'Personal Profile',
        posts: [],
        total: 0,
        dataAvailable: false,
        reason: 'facebook_personal_profile',
        message: 'This is a personal Facebook profile. Personal profiles do not provide Facebook Page posts or analytics.',
      };
      tenantCache.set(cacheKey, respPayload, 60);
      return corsJsonResponse(respPayload, undefined, request);
    }

    const provider = conn.provider as string;

    // 3. Facebook Business Page: delegate to the full service first, then
    // degrade to already-persisted Ralion publication history if an upstream
    // provider/network call fails. A transient Graph/Zernio fetch must not turn
    // the whole Growth page into a raw HTTP 500.
    if (provider === 'facebook') {
      try {
        const posts = await FacebookPageManagementService.getPagePosts({
          organizationId: context.organization.id,
          workspaceId: context.workspace.id,
          userId: context.user.id,
          pageId: conn.provider_account_id || conn.metadata?.pageId,
          socialConnectionId,
          limit,
        });

        const respPayload = {
          success: true,
          socialConnectionId,
          provider,
          posts,
          total: posts.length,
          dataAvailable: posts.length > 0,
          source: 'FACEBOOK_DIRECT',
          lastSyncedAt: new Date().toISOString(),
        };
        tenantCache.set(cacheKey, respPayload, 60);

        return corsJsonResponse(respPayload, undefined, request);
      } catch (upstreamErr: any) {
        console.warn(
          '[PostsByConnection] Facebook upstream unavailable; using durable publication fallback:',
          upstreamErr?.message || upstreamErr
        );

        const { data: fallbackRows, error: fallbackErr } = await supabase
          .from('social_posts')
          .select('*')
          .eq('social_connection_id', socialConnectionId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (fallbackErr) {
          throw upstreamErr;
        }

        const posts = (fallbackRows || []).map((p: any) => ({
          id: p.id,
          platformPostId: p.platform_post_ids?.facebook || p.platform_results?.facebook?.postId || p.id,
          title: p.title || 'Facebook Post',
          body: p.body || '',
          mediaUrls: p.media_urls || [],
          mediaType: p.media_types?.[0] || 'text',
          publishedAt: p.published_at || p.created_at,
          scheduledFor: p.scheduled_for || undefined,
          status: (p.status === 'PUBLISHED' ? 'published' : p.status === 'SCHEDULED' || p.status === 'QUEUED' ? 'scheduled' : 'draft') as 'published' | 'scheduled' | 'draft',
          source: 'RALION' as const,
          permalink: p.platform_results?.facebook?.postUrl || undefined,
          engagement: {
            likes: Number(p.platform_results?.facebook?.engagement?.likes || p.engagement?.likes || 0),
            comments: Number(p.platform_results?.facebook?.engagement?.comments || p.engagement?.comments || 0),
            shares: Number(p.platform_results?.facebook?.engagement?.shares || p.engagement?.shares || 0),
            reach: Number(p.platform_results?.facebook?.engagement?.reach || p.engagement?.reach || 0),
          },
        }));

        const respPayload = {
          success: true,
          socialConnectionId,
          provider,
          posts,
          total: posts.length,
          dataAvailable: posts.length > 0,
          source: 'RALION_FALLBACK',
          degraded: true,
          reason: 'facebook_upstream_temporarily_unavailable',
          message: posts.length
            ? 'Showing Ralion publication history while Facebook post retrieval is temporarily unavailable.'
            : 'Facebook post retrieval is temporarily unavailable. No locally persisted posts are available for this connection yet.',
          lastSyncedAt: new Date().toISOString(),
        };
        tenantCache.set(cacheKey, respPayload, 15);

        return corsJsonResponse(respPayload, undefined, request);
      }
    }

    // 3b. Instagram Professional: retrieve the selected account's real media
    // directly through Instagram Login. Keep the connection boundary strict.
    if (provider === 'instagram') {
      const token = await SocialTokenManager.getValidToken(socialConnectionId, 'instagram');
      if (!token) {
        return corsJsonResponse(
          {
            success: false,
            error: 'Instagram authentication expired. Please reconnect the selected account.',
            socialConnectionId,
            provider,
          },
          { status: 401 },
          request
        );
      }

      const version = (process.env.INSTAGRAM_GRAPH_VERSION || process.env.META_GRAPH_VERSION || 'v26.0')
        .replace(/^\/+|\/+$/g, '');
      const accountId = conn.provider_account_id || 'me';
      const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,comments_count,like_count';
      const params = new URLSearchParams({
        fields,
        limit: String(Math.min(Math.max(limit, 1), 100)),
      });

      const igRes = await fetch(
        `https://graph.instagram.com/${version}/${encodeURIComponent(accountId)}/media?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(10000),
        }
      );
      const igPayload = await igRes.json().catch(() => ({}));

      if (!igRes.ok || igPayload.error) {
        console.warn('[PostsByConnection] Instagram media fetch notice:', igPayload.error?.message || igRes.status);
        return corsJsonResponse(
          {
            success: false,
            error: igPayload.error?.message || `Instagram media request failed (HTTP ${igRes.status}).`,
            socialConnectionId,
            provider,
          },
          { status: igRes.status || 502 },
          request
        );
      }

      const posts = (Array.isArray(igPayload.data) ? igPayload.data : []).map((media: any) => ({
        id: String(media.id || ''),
        platformPostId: String(media.id || ''),
        title: media.caption
          ? String(media.caption).split(/\r?\n/)[0].slice(0, 80)
          : `Instagram ${String(media.media_type || 'Post').toLowerCase()}`,
        body: String(media.caption || ''),
        mediaUrls: [media.media_url || media.thumbnail_url].filter(Boolean),
        mediaType: String(media.media_type || '').toUpperCase() === 'VIDEO' ||
          String(media.media_type || '').toUpperCase() === 'REELS'
          ? 'video'
          : 'image',
        publishedAt: media.timestamp || undefined,
        status: 'published' as const,
        source: 'INSTAGRAM_DIRECT' as const,
        permalink: media.permalink || undefined,
        engagement: {
          likes: Number(media.like_count || 0),
          comments: Number(media.comments_count || 0),
          shares: 0,
          reach: 0,
        },
      }));

      const respPayload = {
        success: true,
        socialConnectionId,
        provider,
        posts,
        total: posts.length,
        dataAvailable: posts.length > 0,
        source: 'INSTAGRAM_DIRECT',
        lastSyncedAt: new Date().toISOString(),
      };
      tenantCache.set(cacheKey, respPayload, 60);
      return corsJsonResponse(respPayload, undefined, request);
    }

    // 3. Other providers: query social_posts strictly by social_connection_id
    const { data: dbPosts, error: dbErr } = await supabase
      .from('social_posts')
      .select('*')
      .eq('social_connection_id', socialConnectionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (dbErr) {
      console.warn('[PostsByConnection] Local DB query note:', dbErr.message);
    }

    const normalizedPosts = (dbPosts || []).map((p: any) => ({
      id: p.id,
      platformPostId: p.platform_post_ids?.[provider] || p.id,
      title: p.title || `${provider} Post`,
      body: p.body || '',
      mediaUrls: p.media_urls || [],
      mediaType: p.media_types?.[0] || 'text',
      publishedAt: p.published_at || p.created_at,
      scheduledFor: p.scheduled_for || undefined,
      status: (p.status === 'PUBLISHED' ? 'published' : p.status === 'SCHEDULED' ? 'scheduled' : 'draft') as 'published' | 'scheduled' | 'draft',
      source: 'RALION' as const,
      permalink: p.platform_results?.[provider]?.postUrl || undefined,
      engagement: {
        likes: Number(p.platform_results?.[provider]?.engagement?.likes || 0),
        comments: Number(p.platform_results?.[provider]?.engagement?.comments || 0),
        shares: Number(p.platform_results?.[provider]?.engagement?.shares || 0),
        reach: Number(p.platform_results?.[provider]?.engagement?.reach || 0),
      },
    }));

    return corsJsonResponse(
      {
        success: true,
        socialConnectionId,
        provider,
        posts: normalizedPosts,
        total: normalizedPosts.length,
        dataAvailable: normalizedPosts.length > 0,
        ...((normalizedPosts.length === 0 && provider !== 'facebook') ? { reason: 'provider_post_retrieval_unavailable' } : {})
      },
      undefined,
      request
    );
  } catch (err: any) {
    console.error('[PostsByConnection] Error:', err.message);
    const transient = /fetch failed|network|timed? out|timeout|ECONN|ENOTFOUND|EAI_AGAIN/i.test(
      String(err?.message || '')
    );
    return corsJsonResponse(
      {
        success: false,
        error: err.message || 'Failed to retrieve posts for this connection',
        code: transient ? 'SOCIAL_UPSTREAM_UNAVAILABLE' : 'SOCIAL_POSTS_FAILED',
      },
      { status: transient ? 503 : 500 },
      request
    );
  }
}
