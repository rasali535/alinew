/**
 * Ralion OS — Facebook Comments Management Service
 * Ras Ali Labs (Pty) Ltd
 * Handles reading real post comments, syncing comment threads, and replying as the Facebook Page.
 */

import 'server-only';
import { ZernioSocialService, META_GRAPH_API_VERSION } from '@ralion/integrations/server';
import { AuditLoggerService } from '../auditLogger.service';
import { SocialTokenManager } from './socialTokenManager.service';
import { getPrivilegedSupabase as getServiceSupabase } from '@/lib/supabase/server';

export interface FacebookComment {
  id: string;
  postId: string;
  authorName: string;
  authorId?: string;
  authorAvatarUrl?: string;
  commentText: string;
  createdAt: string;
  likesCount: number;
  isPageOwner?: boolean;
  replies?: FacebookCommentReply[];
}

export interface FacebookCommentReply {
  id: string;
  commentId: string;
  authorName: string;
  authorAvatarUrl?: string;
  replyText: string;
  createdAt: string;
  isPageOwner: boolean;
}

async function resolveNativePageAccessToken(connectionId: string, pageId: string): Promise<string | null> {
  let token: string | null = null;
  try {
    token = await SocialTokenManager.getValidToken(connectionId, 'facebook');
  } catch (error: any) {
    console.warn('[FacebookCommentsService] Token resolution notice:', error?.message || error);
  }

  if (!token) return null;

  try {
    const accountsRes = await fetch(
      `https://graph.facebook.com/${META_GRAPH_API_VERSION}/me/accounts?limit=100`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (accountsRes.ok) {
      const accounts = await accountsRes.json();
      const page = (accounts?.data || []).find((item: any) => String(item?.id || '') === pageId);
      if (page?.access_token) return page.access_token;
    }
  } catch (error: any) {
    console.warn('[FacebookCommentsService] Page token resolution notice:', error?.message || error);
  }

  // Some stored Facebook connections already contain a Page-capable token.
  return token;
}

function toFacebookComment(cm: any, postId: string, pageId: string): FacebookComment {
  return {
    id: String(cm?.id || ''),
    postId,
    authorName: cm?.from?.name || cm?.authorName || 'Facebook User',
    authorId: cm?.from?.id || cm?.authorId,
    authorAvatarUrl: cm?.from?.picture?.data?.url || cm?.from?.picture || cm?.authorAvatarUrl,
    commentText: cm?.message || cm?.commentText || '',
    createdAt: cm?.created_time || cm?.createdTime || cm?.createdAt || new Date().toISOString(),
    likesCount: Number(cm?.like_count || cm?.likeCount || cm?.likesCount || 0),
    isPageOwner: String(cm?.from?.id || '') === pageId || Boolean(cm?.from?.isOwner || cm?.isPageOwner),
    replies: (cm?.comments?.data || cm?.replies?.data || cm?.replies || []).map((r: any) => ({
      id: String(r?.id || ''),
      commentId: String(cm?.id || ''),
      authorName: r?.from?.name || r?.authorName || 'Facebook User',
      authorAvatarUrl: r?.from?.picture?.data?.url || r?.from?.picture || r?.authorAvatarUrl,
      replyText: r?.message || r?.replyText || '',
      createdAt: r?.created_time || r?.createdTime || r?.createdAt || new Date().toISOString(),
      isPageOwner: String(r?.from?.id || '') === pageId || Boolean(r?.from?.isOwner || r?.isPageOwner),
    })),
  };
}

export class FacebookCommentsService {
  /**
   * Fetch all comments across published Facebook posts (or for a specific post).
   * Prefers a tenant-scoped Zernio account when available and falls back to the
   * same native Meta Page token path used by FacebookPageManagementService.
   */
  static async getComments(params: {
    postId?: string;
    pageId?: string;
    userId?: string;
    workspaceId?: string;
    organizationId?: string;
  }): Promise<FacebookComment[]> {
    const supabase = getServiceSupabase();

    // 1. Resolve the connected tenant's Facebook Page mapping strictly for this org/user/page.
    let connQuery = supabase
      .from('social_connections')
      .select('id, zernio_profile_id, zernio_account_id, provider_account_id, account_name, metadata, workspace_id, organization_id, user_id')
      .eq('provider', 'facebook')
      .in('connection_status', ['CONNECTED', 'ACTIVE', 'connected']);

    const hasOrganizationScope = Boolean(params.organizationId && params.organizationId !== 'default-org');
    const hasWorkspaceScope = Boolean(params.workspaceId && params.workspaceId !== 'default' && params.workspaceId !== 'default-org');
    const hasUserScope = Boolean(params.userId && params.userId !== 'default-user');

    if (hasOrganizationScope) connQuery = connQuery.eq('organization_id', params.organizationId!);
    if (hasUserScope) {
      connQuery = connQuery.eq('user_id', params.userId!);
    } else if (!hasOrganizationScope && hasWorkspaceScope) {
      connQuery = connQuery.eq('workspace_id', params.workspaceId!);
    }
    if (params.pageId) connQuery = connQuery.eq('provider_account_id', params.pageId);

    if (!hasOrganizationScope && !hasWorkspaceScope && !hasUserScope) {
      return [];
    }

    const { data: conns } = await connQuery.order('updated_at', { ascending: false }).limit(20);
    const conn = (conns || []).find((candidate: any) =>
      (params.pageId && String(candidate.provider_account_id || '') === params.pageId) ||
      candidate.metadata?.is_page === true ||
      candidate.metadata?.provider_account_type === 'FACEBOOK_PAGE'
    ) || null;

    if (!conn) return [];

    const profileId = conn.zernio_profile_id;
    const accountId = conn.zernio_account_id;
    const resolvedPageId = String(params.pageId || conn.provider_account_id || conn.metadata?.pageId || '');

    const comments: FacebookComment[] = [];
    const seenIds = new Set<string>();

    const addCommentIfUnique = (comment: FacebookComment) => {
      if (!comment.id || seenIds.has(comment.id)) return;
      seenIds.add(comment.id);
      comments.push(comment);
    };

    // 2. Query live comments from Zernio when this Page has a mapped Zernio account.
    if (accountId) {
      try {
        if (params.postId) {
          const res = await ZernioSocialService.getPostComments(params.postId, accountId);
          const list = res?.comments || (Array.isArray(res) ? res : []);
          list.forEach((cm: any) => addCommentIfUnique(toFacebookComment(cm, params.postId!, resolvedPageId)));
        } else if (profileId) {
          const feedData = await ZernioSocialService.getHistoricalFacebookPosts(profileId, accountId);
          const feedPosts = feedData?.data || (Array.isArray(feedData) ? feedData : []);
          const postsWithComments = feedPosts.filter((p: any) => Number(p.commentCount) > 0).slice(0, 8);

          await Promise.allSettled(
            postsWithComments.map(async (p: any) => {
              try {
                const res = await ZernioSocialService.getPostComments(p.id, accountId);
                const list = res?.comments || (Array.isArray(res) ? res : []);
                list.forEach((cm: any) => addCommentIfUnique(toFacebookComment(cm, p.id, resolvedPageId)));
              } catch {}
            })
          );
        }
      } catch (zErr) {
        console.warn('[FacebookCommentsService] Live Zernio comments fetch notice:', zErr);
      }
    }

    // 3. Native Meta fallback. This is required for Page connections that have a
    // valid Page token/profile mapping but no zernio_account_id.
    if (resolvedPageId) {
      try {
        const pageToken = await resolveNativePageAccessToken(conn.id, resolvedPageId);
        if (pageToken) {
          if (params.postId) {
            const commentFields = 'id,message,created_time,from,like_count,comments.limit(25){id,message,created_time,from,like_count}';
            const commentsRes = await fetch(
              `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(params.postId)}/comments?fields=${encodeURIComponent(commentFields)}&limit=100`,
              {
                headers: { Authorization: `Bearer ${pageToken}` },
                signal: AbortSignal.timeout(8000),
              }
            );
            if (commentsRes.ok) {
              const payload = await commentsRes.json();
              (payload?.data || []).forEach((cm: any) => addCommentIfUnique(toFacebookComment(cm, params.postId!, resolvedPageId)));
            } else {
              const metaError = await commentsRes.json().catch(() => ({}));
              console.warn('[FacebookCommentsService] Native Meta post comments notice:', metaError?.error?.message || commentsRes.status);
            }
          } else {
            const postFields = 'id,created_time,comments.limit(0).summary(true)';
            const postsRes = await fetch(
              `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(resolvedPageId)}/posts?fields=${encodeURIComponent(postFields)}&limit=50`,
              {
                headers: { Authorization: `Bearer ${pageToken}` },
                signal: AbortSignal.timeout(8000),
              }
            );

            if (postsRes.ok) {
              const postsPayload = await postsRes.json();
              const postsWithComments = (postsPayload?.data || [])
                .filter((post: any) => Number(post?.comments?.summary?.total_count || 0) > 0)
                .slice(0, 8);

              const commentFields = 'id,message,created_time,from,like_count,comments.limit(25){id,message,created_time,from,like_count}';
              await Promise.allSettled(
                postsWithComments.map(async (post: any) => {
                  const commentsRes = await fetch(
                    `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${encodeURIComponent(post.id)}/comments?fields=${encodeURIComponent(commentFields)}&limit=100`,
                    {
                      headers: { Authorization: `Bearer ${pageToken}` },
                      signal: AbortSignal.timeout(8000),
                    }
                  );
                  if (!commentsRes.ok) {
                    const metaError = await commentsRes.json().catch(() => ({}));
                    console.warn('[FacebookCommentsService] Native Meta comments notice:', metaError?.error?.message || commentsRes.status);
                    return;
                  }
                  const payload = await commentsRes.json();
                  (payload?.data || []).forEach((cm: any) => addCommentIfUnique(toFacebookComment(cm, post.id, resolvedPageId)));
                })
              );
            } else {
              const metaError = await postsRes.json().catch(() => ({}));
              console.warn('[FacebookCommentsService] Native Meta comment-post discovery notice:', metaError?.error?.message || postsRes.status);
            }
          }
        }
      } catch (metaErr: any) {
        console.warn('[FacebookCommentsService] Native Meta comments fetch notice:', metaErr?.message || metaErr);
      }
    }

    // 4. Merge with database cached comments when the optional cache exists.
    try {
      let query = supabase
        .from('social_post_comments')
        .select('*')
        .order('created_at', { ascending: false });

      if (params.organizationId && params.organizationId !== 'default-org') {
        query = query.eq('organization_id', params.organizationId);
      } else if (params.workspaceId && params.workspaceId !== 'default' && params.workspaceId !== 'default-org') {
        query = query.eq('workspace_id', params.workspaceId);
      } else if (params.userId && params.userId !== 'default-user') {
        query = query.eq('user_id', params.userId);
      }

      if (params.postId) {
        query = query.eq('post_id', params.postId);
      } else if (params.pageId) {
        query = query.eq('page_id', params.pageId);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        data.forEach((c: any) => {
          addCommentIfUnique({
            id: c.id,
            postId: c.post_id || params.postId || 'fb_post',
            authorName: c.author_name || 'Facebook User',
            authorId: c.author_id,
            authorAvatarUrl: c.author_avatar_url,
            commentText: c.comment_text || c.message || '',
            createdAt: c.created_at || new Date().toISOString(),
            likesCount: Number(c.likes_count || 0),
            isPageOwner: Boolean(c.is_page_owner),
          });
        });
      }
    } catch {
      // Database cache is optional. Native/Zernio reads remain authoritative.
    }

    return comments;
  }

  /**
   * Post a real reply to a Facebook comment via Zernio & update local DB cache
   */
  static async replyToComment(params: {
    commentId: string;
    postId: string;
    replyText: string;
    userId?: string;
    workspaceId?: string;
    authorName?: string;
    pageId?: string;
    organizationId?: string;
  }): Promise<{
    id: string;
    commentId: string;
    postId: string;
    authorName: string;
    replyText: string;
    createdAt: string;
    isPageOwner: boolean;
    provider: string;
    platform: string;
    externalReplyId: string;
  }> {
    if (!params.replyText || !params.replyText.trim()) {
      throw new Error('Reply text is required.');
    }
    if (!params.commentId) {
      throw new Error('commentId is required.');
    }
    if (!params.postId) {
      throw new Error('postId is required.');
    }

    const supabase = getServiceSupabase();

    // 1. Resolve connected tenant's Zernio profile and account mapping strictly for this workspace / user
    let connQuery = supabase
      .from('social_connections')
      .select('zernio_account_id, account_name, workspace_id, organization_id, user_id')
      .eq('provider', 'facebook')
      .eq('connection_status', 'CONNECTED');

    const hasOrganizationScope = Boolean(params.organizationId && params.organizationId !== 'default-org');
    const hasWorkspaceScope = Boolean(params.workspaceId && params.workspaceId !== 'default' && params.workspaceId !== 'default-org');
    const hasUserScope = Boolean(params.userId && params.userId !== 'default-user');

    if (hasOrganizationScope) connQuery = connQuery.eq('organization_id', params.organizationId!);
    if (hasUserScope) {
      connQuery = connQuery.eq('user_id', params.userId!);
    } else if (!hasOrganizationScope && hasWorkspaceScope) {
      connQuery = connQuery.eq('workspace_id', params.workspaceId!);
    }

    if (!hasOrganizationScope && !hasWorkspaceScope && !hasUserScope) {
      throw new Error('Authentication/workspace context required to reply to comment.');
    }

    const { data: conn } = await connQuery.maybeSingle();

    if (!conn || !conn.zernio_account_id) {
      throw new Error('No active Facebook connection found for this workspace.');
    }

    const accountId = conn.zernio_account_id;
    const pageAuthor = params.authorName || conn.account_name || 'Ralion Workspace';

    // 2. Publish reply directly to Facebook via Zernio
    const zernioRes = await ZernioSocialService.replyToComment({
      postId: params.postId,
      commentId: params.commentId,
      accountId,
      message: params.replyText.trim(),
    });

    const externalReplyId =
      zernioRes?.data?.commentId ||
      zernioRes?.commentId ||
      zernioRes?.id ||
      `rep_${Date.now()}`;

    const reply = {
      id: externalReplyId,
      externalReplyId,
      commentId: params.commentId,
      postId: params.postId,
      authorName: pageAuthor,
      replyText: params.replyText.trim(),
      createdAt: 'Just now',
      isPageOwner: true,
      provider: 'zernio',
      platform: 'facebook',
    };

    // 3. Best effort DB cache
    try {
      await supabase.from('social_post_comment_replies').insert({
        id: externalReplyId.startsWith('rep_') ? undefined : externalReplyId,
        comment_id: params.commentId,
        post_id: params.postId,
        reply_text: params.replyText.trim(),
        author_name: pageAuthor,
        external_reply_id: externalReplyId,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Database cache optional
    }

    await AuditLoggerService.log({
      eventType: 'SOCIAL_MESSAGE_SENT',
      eventCategory: 'META',
      userId: params.userId || 'default-user',
      resourceType: 'FACEBOOK_COMMENT',
      resourceId: params.commentId,
      metadata: {
        postId: params.postId,
        commentId: params.commentId,
        externalReplyId,
        pageId: params.pageId || null,
        replyLength: params.replyText.length,
      },
    });

    return reply;
  }
}
