import 'server-only';

import { SocialTokenManager } from './socialTokenManager.service';
import { getPrivilegedSupabase as getServiceSupabase } from '@/lib/supabase/server';

function graphVersion(): string {
  return (process.env.INSTAGRAM_GRAPH_VERSION || process.env.META_GRAPH_VERSION || 'v26.0')
    .replace(/^\/+|\/+$/g, '');
}

function graphBase(): string {
  return `https://graph.instagram.com/${graphVersion()}`;
}

export class InstagramCommentsService {
  private static async resolveConnection(params: {
    connectionId: string;
    organizationId: string;
    workspaceId: string;
    userId: string;
  }) {
    const supabase = getServiceSupabase();
    const { data: conn, error } = await supabase
      .from('social_connections')
      .select('id,provider,provider_account_id,account_name,username,organization_id,workspace_id,user_id,connection_status')
      .eq('id', params.connectionId)
      .eq('provider', 'instagram')
      .eq('organization_id', params.organizationId)
      .eq('workspace_id', params.workspaceId)
      .eq('user_id', params.userId)
      .in('connection_status', ['CONNECTED', 'ACTIVE', 'connected', 'active'])
      .maybeSingle();

    if (error || !conn) {
      const err: any = new Error('No active Instagram connection found for the selected account.');
      err.statusCode = 403;
      throw err;
    }
    return conn;
  }

  static async getComments(params: {
    connectionId: string;
    postId: string;
    organizationId: string;
    workspaceId: string;
    userId: string;
  }) {
    await this.resolveConnection(params);
    const token = await SocialTokenManager.getValidToken(params.connectionId, 'instagram');
    if (!token) {
      const err: any = new Error('Instagram authentication expired. Please reconnect the account.');
      err.statusCode = 401;
      throw err;
    }

    const fields = 'id,text,timestamp,username,from,replies{id,text,timestamp,username,from}';
    const url = `${graphBase()}/${encodeURIComponent(params.postId)}/comments?fields=${encodeURIComponent(fields)}&limit=100`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload.error) {
      const err: any = new Error(payload.error?.message || `Instagram comments request failed (HTTP ${res.status}).`);
      err.statusCode = res.status || 502;
      throw err;
    }

    return (payload.data || []).map((comment: any) => ({
      id: String(comment.id || ''),
      postId: params.postId,
      authorName: comment.username || comment.from?.username || comment.from?.name || 'Instagram User',
      authorId: comment.from?.id,
      commentText: comment.text || '',
      createdAt: comment.timestamp || new Date().toISOString(),
      likesCount: 0,
      isPageOwner: false,
      replies: (comment.replies?.data || comment.replies || []).map((reply: any) => ({
        id: String(reply.id || ''),
        commentId: String(comment.id || ''),
        authorName: reply.username || reply.from?.username || reply.from?.name || 'Instagram User',
        replyText: reply.text || '',
        createdAt: reply.timestamp || new Date().toISOString(),
        isPageOwner: false,
      })),
    }));
  }

  static async replyToComment(params: {
    connectionId: string;
    commentId: string;
    postId: string;
    replyText: string;
    organizationId: string;
    workspaceId: string;
    userId: string;
    authorName?: string;
  }) {
    const conn = await this.resolveConnection(params);
    const token = await SocialTokenManager.getValidToken(params.connectionId, 'instagram');
    if (!token) {
      const err: any = new Error('Instagram authentication expired. Please reconnect the account.');
      err.statusCode = 401;
      throw err;
    }

    const res = await fetch(`${graphBase()}/${encodeURIComponent(params.commentId)}/replies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: params.replyText.trim() }),
      signal: AbortSignal.timeout(10000),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload.error || !payload.id) {
      const err: any = new Error(payload.error?.message || `Instagram comment reply failed (HTTP ${res.status}).`);
      err.statusCode = res.status || 502;
      throw err;
    }

    return {
      id: String(payload.id),
      externalReplyId: String(payload.id),
      commentId: params.commentId,
      postId: params.postId,
      authorName: params.authorName || conn.account_name || conn.username || 'Instagram',
      replyText: params.replyText.trim(),
      createdAt: 'Just now',
      isPageOwner: true,
      provider: 'native',
      platform: 'instagram',
    };
  }
}
