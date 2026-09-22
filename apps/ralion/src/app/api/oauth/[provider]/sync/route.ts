import { NextRequest } from 'next/server';
import {
  linkedinAdapter, xAdapter, tiktokAdapter, youtubeAdapter,
} from '@/lib/services/social.service';
import { SocialTokenManager } from '@/lib/services/social/socialTokenManager.service';
import { FacebookPageManagementService } from '@/lib/services/social/facebookPageManagement.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { requireRalionContext, getServiceSupabase } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

const PROVIDERS = [
  'google', 'meta', 'facebook', 'instagram', 'whatsapp', 'microsoft', 'linkedin', 'tiktok',
  'x', 'youtube', 'pinterest', 'reddit', 'github', 'slack', 'discord', 'notion', 'dropbox',
  'onedrive', 'shopify', 'woocommerce', 'stripe', 'paypal', 'quickbooks', 'xero', 'sage',
  'hubspot', 'salesforce'
];

export async function generateStaticParams() {
  return PROVIDERS.map(provider => ({ provider }));
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);
    const socialConnectionId = body.socialConnectionId || searchParams.get('socialConnectionId');

    const supabase = getServiceSupabase();

    let query = supabase
      .from('social_connections')
      .select('id, provider, provider_account_id, workspace_id, organization_id, user_id, metadata, connection_status')
      .eq('provider', provider)
      .eq('organization_id', context.organization.id)
      .eq('workspace_id', context.workspace.id)
      .in('connection_status', ['CONNECTED', 'ACTIVE', 'connected', 'active']);

    if (socialConnectionId) {
      query = query.eq('id', socialConnectionId);
    }

    const { data: conns } = await query;
    if (!conns || conns.length === 0) {
      return corsJsonResponse(
        { success: false, error: `No active ${provider} connection found in this workspace.` },
        { status: 404 },
        request
      );
    }

    if (!socialConnectionId && conns.length > 1) {
      return corsJsonResponse(
        {
          success: false,
          error: `Multiple ${provider} accounts exist for this workspace. Please specify an explicit socialConnectionId.`,
        },
        { status: 400 },
        request
      );
    }

    const targetConn = conns[0];

    // Delegate Facebook syncing to FacebookPageManagementService
    if (provider === 'facebook') {
      const posts = await FacebookPageManagementService.getPagePosts({
        organizationId: context.organization.id,
        workspaceId: context.workspace.id,
        userId: context.user.id,
        pageId: targetConn.provider_account_id,
        socialConnectionId: targetConn.id,
        limit: 25,
      });

      await supabase
        .from('social_connections')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', targetConn.id);

      return corsJsonResponse({
        success: true,
        provider,
        socialConnectionId: targetConn.id,
        postsCount: posts.length,
        posts,
        syncedAt: new Date().toISOString(),
      }, undefined, request);
    }

    // Resolve token via SocialTokenManager
    let accessToken: string | null = null;
    try {
      accessToken = await SocialTokenManager.getValidToken(targetConn.id, provider as any);
    } catch {}

    if (!accessToken) {
      return corsJsonResponse(
        { success: false, error: `Token unavailable or expired for ${provider}. Please reconnect.`, tokenExpired: true },
        { status: 401 },
        request
      );
    }

    let posts: any[] = [];
    try {
      if (provider === 'instagram') {
        const version = (process.env.INSTAGRAM_GRAPH_VERSION || process.env.META_GRAPH_VERSION || 'v26.0')
          .replace(/^\/+|\/+$/g, '');
        const accountId = targetConn.provider_account_id || 'me';
        const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,comments_count,like_count';
        const params = new URLSearchParams({ fields, limit: '25' });
        const igRes = await fetch(
          `https://graph.instagram.com/${version}/${encodeURIComponent(accountId)}/media?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: AbortSignal.timeout(10000),
          }
        );
        const igData = await igRes.json().catch(() => ({}));
        if (!igRes.ok || igData.error) {
          const err: any = new Error(igData.error?.message || `Instagram sync failed (HTTP ${igRes.status}).`);
          err.statusCode = igRes.status || 502;
          throw err;
        }
        posts = (Array.isArray(igData.data) ? igData.data : []).map((media: any) => ({
          id: String(media.id || ''),
          platformPostId: String(media.id || ''),
          title: media.caption
            ? String(media.caption).split(/\r?\n/)[0].slice(0, 80)
            : `Instagram ${String(media.media_type || 'Post').toLowerCase()}`,
          body: String(media.caption || ''),
          publishedAt: media.timestamp || undefined,
          mediaUrls: [media.media_url || media.thumbnail_url].filter(Boolean),
          mediaType: String(media.media_type || '').toUpperCase() === 'VIDEO' ||
            String(media.media_type || '').toUpperCase() === 'REELS'
            ? 'video'
            : 'image',
          permalink: media.permalink || undefined,
          engagement: {
            likes: Number(media.like_count || 0),
            comments: Number(media.comments_count || 0),
            shares: 0,
            reach: 0,
          },
        }));
      } else {
        switch (provider) {
        case 'linkedin':
          posts = await linkedinAdapter.fetchPosts(accessToken);
          break;
        case 'x':
        case 'twitter':
          posts = await xAdapter.fetchTweets(accessToken);
          break;
        case 'tiktok':
          posts = await tiktokAdapter.fetchVideos(accessToken);
          break;
        case 'youtube':
        case 'google':
          posts = await youtubeAdapter.fetchVideos(accessToken);
          break;
        default:
          posts = [];
        }
      }
    } catch (fetchError: any) {
      if (fetchError.message?.includes('401') || fetchError.message?.includes('unauthorized')) {
        return corsJsonResponse({ success: false, error: 'Token expired — please reconnect this account.', tokenExpired: true }, { status: 401 }, request);
      }
      throw fetchError;
    }

    await supabase
      .from('social_connections')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', targetConn.id);

    return corsJsonResponse({
      success: true,
      provider,
      socialConnectionId: targetConn.id,
      postsCount: posts.length,
      posts,
      syncedAt: new Date().toISOString(),
    }, undefined, request);
  } catch (error: any) {
    console.error('[OAuth Sync]', error);
    return corsJsonResponse({ success: false, error: error.message || 'Sync failed' }, { status: 500 }, request);
  }
}
