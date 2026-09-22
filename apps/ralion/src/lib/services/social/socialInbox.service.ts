/**
 * Ralion Unified Social Media Architecture — Social Inbox Service
 * Ras Ali Labs (Pty) Ltd
 * Unified inbox stream for WhatsApp, Instagram, Facebook Messenger, LinkedIn, and X DMs.
 */

import 'server-only';
import {
  SocialPlatformType,
  SocialProviderRegistry,
  ZernioSocialService,
  assertMasterZernioAuthorization,
  MASTER_PLATFORM_ZERNIO_ACCOUNT_ID,
  MASTER_PLATFORM_ZERNIO_PROFILE_ID,
} from '@ralion/integrations/server';
import { SocialTokenManager } from './socialTokenManager.service';
import { getPrivilegedSupabase as getServiceSupabase } from '@/lib/supabase/server';

export class SocialInboxService {
  /**
   * Get all conversations and latest messages for a user/workspace from live Zernio & DB cache
   */
  static async getConversations(params: {
    userId?: string;
    workspaceId?: string;
    organizationId?: string;
    provider?: SocialPlatformType;
    connectionId?: string;
  } | string, legacyProvider?: SocialPlatformType) {
    if (!params) return [];

    let supabase;
    try {
      supabase = getServiceSupabase();
    } catch (e: any) {
      console.warn('[SocialInboxService] Supabase client init notice:', e.message);
      return [];
    }

    const userId = typeof params === 'string' ? params : params.userId;
    const workspaceId = typeof params === 'object' ? params.workspaceId : undefined;
    const organizationId = typeof params === 'object' ? params.organizationId : undefined;
    const provider = typeof params === 'object' ? params.provider : legacyProvider;
    const connectionId = typeof params === 'object' ? params.connectionId : undefined;

    if (!userId || !workspaceId || !organizationId) return [];

    // 1. Resolve connected tenant's Zernio profile and account mapping strictly for this workspace / user
    let profileId: string | null = null;
    let accountId: string | null = null;

    try {
      let connQuery = supabase
        .from('social_connections')
        .select('id, provider, zernio_profile_id, zernio_account_id, workspace_id, organization_id, user_id')
        .eq('provider', provider || 'facebook')
        .in('connection_status', ['CONNECTED', 'ACTIVE', 'connected', 'active'])
        .eq('organization_id', organizationId)
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (connectionId) {
        connQuery = connQuery.eq('id', connectionId);
      }

      const { data: conns, error: connError } = await connQuery.limit(1);
      if (connError) {
        console.warn('[SocialInboxService] Connection lookup notice:', connError.message);
      }
      const conn = Array.isArray(conns) && conns.length > 0 ? conns[0] : null;
      if (conn?.zernio_profile_id) {
        profileId = conn.zernio_profile_id;
        accountId = conn.zernio_account_id || null;
      }
    } catch (e: any) {
      console.warn('[SocialInboxService] Connection lookup notice:', e?.message);
    }

    if (profileId === MASTER_PLATFORM_ZERNIO_PROFILE_ID) {
      assertMasterZernioAuthorization({
        userId,
        organizationId,
        workspaceId,
        targetProfileId: profileId,
        action: 'read_social_inbox',
      });
      accountId = accountId || MASTER_PLATFORM_ZERNIO_ACCOUNT_ID;
    }

    const conversationMap = new Map<string, any>();

    // 2. Query live conversations from Zernio
    if (profileId) {
      try {
        const convData = await ZernioSocialService.getInboxConversations(profileId, accountId || undefined);
        const convList = convData?.data || (Array.isArray(convData) ? convData : []);

        if (Array.isArray(convList) && convList.length > 0) {
          // Fetch message threads for top conversations in parallel
          await Promise.allSettled(
            convList.slice(0, 10).map(async (conv: any) => {
              if (!conv || !conv.id) return;
              const convId = String(conv.id);
              let messages: any[] = [];

              try {
                const msgData = await ZernioSocialService.getConversationMessages(convId, accountId || undefined);
                const rawMsgs = msgData?.messages || (Array.isArray(msgData) ? msgData : []);
                if (Array.isArray(rawMsgs)) {
                  messages = rawMsgs.filter(Boolean).map((m: any) => ({
                    id: m.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    direction: m.direction === 'outgoing' ? 'OUTBOUND' : 'INBOUND',
                    sender_name: m.senderName || 'Facebook User',
                    sender_id: m.senderId || 'unknown',
                    message_text: m.message || m.text || '',
                    timestamp: m.createdAt ? new Date(m.createdAt).toLocaleString() : 'Recent',
                  }));
                }
              } catch {
                // Messages fetch notice
              }

              if (messages.length === 0 && conv.lastMessage) {
                messages.push({
                  id: `msg_${convId}_last`,
                  direction: 'INBOUND',
                  sender_name: conv.participantName || 'Facebook User',
                  message_text: conv.lastMessage,
                  timestamp: conv.updatedTime ? new Date(conv.updatedTime).toLocaleString() : 'Recent',
                });
              }

              conversationMap.set(convId, {
                conversationId: convId,
                provider: (conv.platform || provider || 'facebook').toLowerCase(),
                participantName: conv.participantName || (provider === 'instagram' ? 'Instagram User' : 'Facebook User'),
                participantId: conv.participantId || convId,
                avatarUrl: conv.participantPicture || null,
                lastMessage: conv.lastMessage || (messages[messages.length - 1]?.message_text) || '',
                lastTimestamp: conv.updatedTime ? new Date(conv.updatedTime).toLocaleString() : 'Recent',
                unreadCount: Number(conv.unreadCount) || 0,
                messages: Array.isArray(messages) ? messages : [],
              });
            })
          );
        }
      } catch (zErr) {
        console.warn('[SocialInboxService] Live inbox conversations fetch notice:', zErr);
      }
    }

    // 3. Query local database for any cached / local messages
    try {
      let query = supabase
        .from('social_inbox_messages')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (provider) {
        query = query.eq('provider', provider);
      }
      if (connectionId) {
        query = query.eq('connection_id', connectionId);
      }
      query = query
        .eq('organization_id', organizationId)
        .eq('workspace_id', workspaceId);

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        for (const msg of data) {
          if (!msg || !msg.conversation_id) continue;
          const convId = String(msg.conversation_id);
          if (!conversationMap.has(convId)) {
            conversationMap.set(convId, {
              conversationId: convId,
              provider: msg.provider || provider || 'facebook',
              participantName: msg.sender_name || msg.sender_id || 'User',
              participantId: msg.sender_id || 'unknown',
              avatarUrl: msg.sender_avatar_url || null,
              lastMessage: msg.message_text || '',
              lastTimestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'Recent',
              unreadCount: msg.status === 'DELIVERED' && msg.direction === 'INBOUND' ? 1 : 0,
              messages: [msg],
            });
          } else {
            const conv = conversationMap.get(convId);
            if (conv && Array.isArray(conv.messages)) {
              if (!conv.messages.some((m: any) => m?.id === msg.id)) {
                conv.messages.push(msg);
              }
            }
          }
        }
      }
    } catch {
      // Local database query optional
    }

    return Array.from(conversationMap.values());
  }

  /**
   * Send an outbound reply message to a conversation
   */
  static async sendReply(params: {
    connectionId?: string;
    provider?: SocialPlatformType;
    conversationId: string;
    recipientId: string;
    messageText: string;
    userId: string;
    workspaceId?: string;
    organizationId?: string;
    senderName?: string;
  }) {
    if (!params.userId || !params.workspaceId || !params.organizationId) {
      const tenantError: any = new Error('[SocialInboxService] Canonical tenant context is required.');
      tenantError.statusCode = 400;
      tenantError.code = 'TENANT_CONTEXT_REQUIRED';
      throw tenantError;
    }

    const supabase = getServiceSupabase();
    const provider = params.provider || 'facebook';

    // 1. Authoritatively resolve tenant connection
    let conn: any = null;

    if (params.connectionId && !params.connectionId.startsWith('acc-') && !params.connectionId.startsWith('fb-page-')) {
      const { data } = await supabase
        .from('social_connections')
        .select('id, provider, provider_account_id, access_token, infrastructure_provider, zernio_profile_id, zernio_account_id, organization_id, workspace_id, user_id')
        .eq('id', params.connectionId)
        .eq('provider', provider)
        .eq('connection_status', 'CONNECTED')
        .eq('organization_id', params.organizationId)
        .eq('workspace_id', params.workspaceId)
        .eq('user_id', params.userId)
        .maybeSingle();
      conn = data;
    }

    if (!conn) {
      // Find active connection for this tenant/workspace/user
      const { data } = await supabase
        .from('social_connections')
        .select('id, provider, provider_account_id, access_token, infrastructure_provider, zernio_profile_id, zernio_account_id, organization_id, workspace_id, user_id')
        .eq('provider', provider)
        .eq('connection_status', 'CONNECTED')
        .eq('organization_id', params.organizationId)
        .eq('workspace_id', params.workspaceId)
        .eq('user_id', params.userId)
        .order('updated_at', { ascending: false })
        .limit(1);
      conn = Array.isArray(data) && data.length > 0 ? data[0] : null;
    }

    if (!conn) {
      const connectionError: any = new Error('[SocialInboxService] No active tenant connection is available.');
      connectionError.statusCode = 409;
      connectionError.code = 'SOCIAL_CONNECTION_REQUIRED';
      throw connectionError;
    }

    const isMasterProfile = conn.zernio_profile_id === MASTER_PLATFORM_ZERNIO_PROFILE_ID;
    if (isMasterProfile) {
      assertMasterZernioAuthorization({
        userId: params.userId,
        organizationId: params.organizationId,
        workspaceId: params.workspaceId,
        targetProfileId: conn.zernio_profile_id,
        action: 'send_inbox_reply',
      });
    }

    const resolvedZernioAccountId = conn.zernio_account_id
      || (isMasterProfile ? MASTER_PLATFORM_ZERNIO_ACCOUNT_ID : undefined);
    const isZernio = conn.infrastructure_provider === 'zernio' || Boolean(conn.zernio_profile_id);
    let result: any = null;

    if (isZernio) {
      const zernioProvider = SocialProviderRegistry.getZernioProvider();
      result = await zernioProvider.sendMessage('zernio_master', {
        conversationId: params.conversationId,
        recipientId: params.recipientId,
        messageText: params.messageText,
        accountId: resolvedZernioAccountId,
      });
    } else {
      // Resolve valid token
      let token = conn?.access_token;
      if (!token && conn?.id) {
        token = await SocialTokenManager.getValidToken(conn.id, provider);
      }

      if (!token) {
        throw new Error(`[SocialInboxService] ${provider} authentication token expired. Please reconnect.`);
      }

      const adapter = SocialProviderRegistry.getProvider(provider, 'native');
      result = await adapter.sendMessage(token, {
        conversationId: params.conversationId,
        recipientId: params.recipientId,
        messageText: params.messageText,
        accountId: conn.provider_account_id || undefined,
      });
    }

    if (!result || !result.success) {
      throw new Error(`[SocialInboxService] Message send failed: ${result?.error || 'Unknown provider error'}`);
    }

    // 2. Persist outbound message to inbox log
    const resolvedConnectionId = conn?.id || params.connectionId || `conn_${params.userId}`;
    try {
      await supabase.from('social_inbox_messages').insert({
        connection_id: resolvedConnectionId,
        organization_id: params.organizationId,
        workspace_id: params.workspaceId,
        provider,
        conversation_id: params.conversationId,
        sender_id: params.userId,
        sender_name: params.senderName || 'Support Agent',
        recipient_id: params.recipientId,
        message_text: params.messageText,
        direction: 'OUTBOUND',
        status: 'SENT',
        timestamp: new Date().toISOString(),
      });
    } catch (logErr: any) {
      console.warn('[SocialInboxService] Inbox message log write notice:', logErr.message);
    }

    return {
      success: true,
      messageId: result.messageId || `msg_${Date.now()}`,
      status: 'SENT',
      conversationId: params.conversationId,
    };
  }
}
