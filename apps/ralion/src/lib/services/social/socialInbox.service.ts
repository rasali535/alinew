/**
 * Ralion Unified Social Media Architecture — Social Inbox Service
 * Ras Ali Labs (Pty) Ltd
 * Unified inbox stream for WhatsApp, Instagram, Facebook Messenger, LinkedIn, and X DMs.
 */

import { createClient } from '@supabase/supabase-js';
import { SocialPlatformType, SocialProviderRegistry, ZernioSocialService } from '@ralion/integrations';
import { SocialTokenManager } from './socialTokenManager.service';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';
  if (!key) {
    throw new Error('[SocialInbox] Missing Supabase credentials in server environment.');
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export class SocialInboxService {
  /**
   * Get all conversations and latest messages for a user/workspace from live Zernio & DB cache
   */
  static async getConversations(params: {
    userId?: string;
    workspaceId?: string;
    organizationId?: string;
    provider?: SocialPlatformType;
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
    const provider = typeof params === 'object' ? params.provider : legacyProvider;

    // 1. Resolve connected tenant's Zernio profile and account mapping strictly for this workspace / user
    let profileId: string | null = null;
    let accountId: string | null = null;

    try {
      let connQuery = supabase
        .from('social_connections')
        .select('zernio_profile_id, zernio_account_id, workspace_id, user_id')
        .eq('provider', provider || 'facebook')
        .eq('connection_status', 'CONNECTED');

      if (workspaceId && workspaceId !== 'default' && workspaceId !== 'default-org') {
        connQuery = connQuery.or(`workspace_id.eq.${workspaceId},user_id.eq.${userId || workspaceId}`);
      } else if (userId && userId !== 'default-user') {
        connQuery = connQuery.eq('user_id', userId);
      } else {
        // Unscoped request -> return empty conversations (zero tenant cross-leakage)
        return [];
      }

      const { data: conns } = await connQuery.limit(1);
      const conn = Array.isArray(conns) && conns.length > 0 ? conns[0] : null;
      if (conn?.zernio_profile_id) {
        profileId = conn.zernio_profile_id;
        accountId = conn.zernio_account_id || null;
      }
    } catch {
      // Database connection fallback -> return empty conversations safely
      return [];
    }

    if (!profileId) {
      return [];
    }

    const conversationMap = new Map<string, any>();

    // 2. Query live conversations from Zernio
    if (profileId) {
      try {
        const convData = await ZernioSocialService.getInboxConversations(profileId);
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
                provider: (conv.platform || 'facebook').toLowerCase(),
                participantName: conv.participantName || 'Facebook User',
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
      if (workspaceId && workspaceId !== 'default' && workspaceId !== 'default-org') {
        query = query.or(`workspace_id.eq.${workspaceId},sender_id.eq.${userId || workspaceId}`);
      } else if (userId && userId !== 'default-user') {
        query = query.eq('sender_id', userId);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        for (const msg of data) {
          if (!msg || !msg.conversation_id) continue;
          const convId = String(msg.conversation_id);
          if (!conversationMap.has(convId)) {
            conversationMap.set(convId, {
              conversationId: convId,
              provider: msg.provider || 'facebook',
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
    const supabase = getServiceSupabase();
    const provider = params.provider || 'facebook';

    // 1. Authoritatively resolve tenant connection
    let conn: any = null;

    if (params.connectionId && !params.connectionId.startsWith('acc-') && !params.connectionId.startsWith('fb-page-')) {
      const { data } = await supabase
        .from('social_connections')
        .select('*')
        .eq('id', params.connectionId)
        .maybeSingle();
      conn = data;
    }

    if (!conn) {
      // Find active connection for this tenant/workspace/user
      const orgOrUser = params.workspaceId || params.organizationId || params.userId;
      const { data } = await supabase
        .from('social_connections')
        .select('*')
        .eq('provider', provider)
        .eq('connection_status', 'CONNECTED')
        .or(`workspace_id.eq.${orgOrUser},user_id.eq.${params.userId}`)
        .order('created_at', { ascending: false })
        .limit(1);
      conn = Array.isArray(data) && data.length > 0 ? data[0] : null;
    }

    // Fallback for Master Admin workspace
    if (!conn && (params.organizationId === 'ras-ali-labs' || params.workspaceId === 'ras-ali-labs' || params.userId === '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf')) {
      conn = {
        id: 'f8656d3c-789b-4890-bc80-83920ce91870',
        infrastructure_provider: 'zernio',
        zernio_profile_id: '6a82deac1a69158ef81cb2cd',
        zernio_account_id: '6a82df7277555aae018b92b4',
      };
    }

    const isZernio = conn?.infrastructure_provider === 'zernio' || Boolean(conn?.zernio_account_id);
    let result: any = null;

    if (isZernio) {
      const zernioProvider = SocialProviderRegistry.getZernioProvider();
      result = await zernioProvider.sendMessage('zernio_master', {
        conversationId: params.conversationId,
        recipientId: params.recipientId,
        messageText: params.messageText,
        accountId: conn?.zernio_account_id || '6a82df7277555aae018b92b4',
      });
    } else {
      // Resolve valid token
      let token = conn?.access_token;
      if (!token && conn?.id) {
        token = await SocialTokenManager.getValidToken(conn.id, provider);
      }

      if (!token) {
        // Check social_account_tokens table
        const { data: tokenRow } = await supabase
          .from('social_account_tokens')
          .select('access_token')
          .eq('user_id', params.userId)
          .eq('provider', provider)
          .maybeSingle();
        token = tokenRow?.access_token;
      }

      if (!token) {
        throw new Error(`[SocialInboxService] ${provider} authentication token expired. Please reconnect.`);
      }

      const adapter = SocialProviderRegistry.getProvider(provider, 'native');
      result = await adapter.sendMessage(token, {
        conversationId: params.conversationId,
        recipientId: params.recipientId,
        messageText: params.messageText,
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
