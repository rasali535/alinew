import { NextRequest } from 'next/server';
import { FacebookPageManagementService } from '@/lib/services/social/facebookPageManagement.service';
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

    // 1. Validate the connection belongs to this workspace/user (tenant boundary)
    const { data: conn } = await supabase
      .from('social_connections')
      .select('id, provider, provider_account_id, workspace_id, user_id, account_type, zernio_profile_id, zernio_account_id, metadata, connection_status')
      .eq('id', socialConnectionId)
      .or(`workspace_id.eq.${context.workspace.id},user_id.eq.${context.user.id}`)
      .maybeSingle();

    if (!conn) {
      return corsJsonResponse(
        {
          success: false,
          error: `Access denied: Connection ${socialConnectionId} does not belong to this workspace/user.`,
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

    // 3. Facebook Business Page: delegate to full service (Zernio + Graph API + DB)
    if (provider === 'facebook') {
      const posts = await FacebookPageManagementService.getPagePosts({
        organizationId: context.workspace.id,
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
    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to retrieve posts for this connection' },
      { status: 500 },
      request
    );
  }
}
