/**
 * Ralion OS — Facebook Comments Management Service
 * Ras Ali Labs (Pty) Ltd
 * Handles reading real post comments, syncing comment threads, and replying as the Facebook Page.
 */

import { createClient } from '@supabase/supabase-js';
import { ZernioSocialService } from '@ralion/integrations';
import { AuditLoggerService } from '../auditLogger.service';

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

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('[FacebookComments] Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export class FacebookCommentsService {
  /**
   * Fetch all comments across published Facebook posts (or for a specific post)
   */
  static async getComments(params: {
    postId?: string;
    pageId?: string;
    userId?: string;
    workspaceId?: string;
    organizationId?: string;
  }): Promise<FacebookComment[]> {
    const supabase = getServiceSupabase();

    // 1. Resolve connected tenant's Zernio profile and account mapping strictly for this workspace / user
    let connQuery = supabase
      .from('social_connections')
      .select('zernio_profile_id, zernio_account_id, workspace_id, user_id')
      .eq('provider', 'facebook')
      .eq('connection_status', 'CONNECTED');

    if (params.workspaceId && params.workspaceId !== 'default' && params.workspaceId !== 'default-org') {
      connQuery = connQuery.or(`workspace_id.eq.${params.workspaceId},user_id.eq.${params.userId || params.workspaceId}`);
    } else if (params.userId && params.userId !== 'default-user') {
      connQuery = connQuery.eq('user_id', params.userId);
    } else {
      // Unscoped request -> return empty comments (zero cross-tenant leakage)
      return [];
    }

    const { data: conn } = await connQuery.maybeSingle();

    if (!conn || !conn.zernio_profile_id) {
      return [];
    }

    const profileId = conn.zernio_profile_id;
    const accountId = conn.zernio_account_id;

    const comments: FacebookComment[] = [];
    const seenIds = new Set<string>();

    const addCommentIfUnique = (c: FacebookComment) => {
      if (!c.id || seenIds.has(c.id)) return;
      seenIds.add(c.id);
      comments.push(c);
    };

    // 2. Query live comments from Zernio
    if (accountId) {
      try {
        if (params.postId) {
          // Specific post requested
          const res = await ZernioSocialService.getPostComments(params.postId, accountId);
          const list = res?.comments || (Array.isArray(res) ? res : []);

          list.forEach((cm: any) => {
            addCommentIfUnique({
              id: cm.id,
              postId: params.postId!,
              authorName: cm.from?.name || cm.authorName || 'Facebook User',
              authorId: cm.from?.id || cm.authorId,
              authorAvatarUrl: cm.from?.picture || cm.authorAvatarUrl,
              commentText: cm.message || cm.commentText || '',
              createdAt: cm.createdTime ? new Date(cm.createdTime).toLocaleString() : (cm.createdAt || 'Recent'),
              likesCount: Number(cm.likeCount || cm.likesCount || 0),
              isPageOwner: Boolean(cm.from?.isOwner || cm.isPageOwner),
              replies: cm.replies?.map((r: any) => ({
                id: r.id,
                commentId: cm.id,
                authorName: r.from?.name || r.authorName || 'Page Reply',
                authorAvatarUrl: r.from?.picture || r.authorAvatarUrl,
                replyText: r.message || r.replyText || '',
                createdAt: r.createdTime ? new Date(r.createdTime).toLocaleString() : (r.createdAt || 'Recent'),
                isPageOwner: true,
              })),
            });
          });
        } else {
          // General page comments request: inspect feed posts that have comments
          const feedData = await ZernioSocialService.getHistoricalFacebookPosts(profileId, accountId);
          const feedPosts = feedData?.data || (Array.isArray(feedData) ? feedData : []);

          const postsWithComments = feedPosts.filter((p: any) => Number(p.commentCount) > 0).slice(0, 8);

          await Promise.allSettled(
            postsWithComments.map(async (p: any) => {
              try {
                const res = await ZernioSocialService.getPostComments(p.id, accountId);
                const list = res?.comments || (Array.isArray(res) ? res : []);
                list.forEach((cm: any) => {
                  addCommentIfUnique({
                    id: cm.id,
                    postId: p.id,
                    authorName: cm.from?.name || cm.authorName || 'Facebook User',
                    authorId: cm.from?.id || cm.authorId,
                    authorAvatarUrl: cm.from?.picture || cm.authorAvatarUrl,
                    commentText: cm.message || cm.commentText || '',
                    createdAt: cm.createdTime ? new Date(cm.createdTime).toLocaleString() : (cm.createdAt || 'Recent'),
                    likesCount: Number(cm.likeCount || cm.likesCount || 0),
                    isPageOwner: Boolean(cm.from?.isOwner || cm.isPageOwner),
                    replies: cm.replies?.map((r: any) => ({
                      id: r.id,
                      commentId: cm.id,
                      authorName: r.from?.name || r.authorName || 'Page Reply',
                      authorAvatarUrl: r.from?.picture || r.authorAvatarUrl,
                      replyText: r.message || r.replyText || '',
                      createdAt: r.createdTime ? new Date(r.createdTime).toLocaleString() : (r.createdAt || 'Recent'),
                      isPageOwner: true,
                    })),
                  });
                });
              } catch {}
            })
          );
        }
      } catch (zErr) {
        console.warn('[FacebookCommentsService] Live comments fetch notice:', zErr);
      }
    }

    // 3. Merge with database cached comments
    try {
      let query = supabase
        .from('social_post_comments')
        .select('*')
        .order('created_at', { ascending: false });

      if (params.workspaceId && params.workspaceId !== 'default' && params.workspaceId !== 'default-org') {
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
            createdAt: c.created_at ? new Date(c.created_at).toLocaleString() : 'Recent',
            likesCount: Number(c.likes_count || 0),
            isPageOwner: Boolean(c.is_page_owner),
          });
        });
      }
    } catch {
      // Database query optional
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
      .select('zernio_account_id, account_name, workspace_id, user_id')
      .eq('provider', 'facebook')
      .eq('connection_status', 'CONNECTED');

    if (params.workspaceId && params.workspaceId !== 'default' && params.workspaceId !== 'default-org') {
      connQuery = connQuery.or(`workspace_id.eq.${params.workspaceId},user_id.eq.${params.userId || params.workspaceId}`);
    } else if (params.userId && params.userId !== 'default-user') {
      connQuery = connQuery.eq('user_id', params.userId);
    } else {
      throw new Error('Authentication/workspace context required to reply to comment.');
    }

    const { data: conn } = await connQuery.maybeSingle();

    if (!conn || !conn.zernio_account_id) {
      throw new Error('No active Facebook connection found for this workspace.');
    }

    const accountId = conn.zernio_account_id;
    const pageAuthor = params.authorName || conn.account_name || 'Ras Ali Labs';

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

