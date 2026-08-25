/**
 * Ralion Unified Social Media Architecture — Social Inbox Service
 * Ras Ali Labs (Pty) Ltd
 * Unified inbox stream for WhatsApp, Instagram, Facebook Messenger, LinkedIn, and X DMs.
 */

import { createClient } from '@supabase/supabase-js';
import { SocialPlatformType, SocialProviderRegistry, ZernioSocialService } from '@ralion/integrations';
import { SocialTokenManager } from './socialTokenManager.service';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';
  return createClient(url, key);
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
    const supabase = getServiceSupabase();

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

      const { data: conn } = await connQuery.maybeSingle();
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
            convList.slice(0, 6).map(async (conv: any) => {
              const convId = conv.id;
              let messages: any[] = [];

              try {
                const msgData = await ZernioSocialService.getConversationMessages(convId, accountId || undefined);
                const rawMsgs = msgData?.messages || (Array.isArray(msgData) ? msgData : []);
                if (Array.isArray(rawMsgs)) {
                  messages = rawMsgs.map((m: any) => ({
                    id: m.id,
                    direction: m.direction === 'outgoing' ? 'OUTBOUND' : 'INBOUND',
                    sender_name: m.senderName || 'Facebook User',
                    sender_id: m.senderId,
                    message_text: m.message || '',
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
                lastMessage: conv.lastMessage || '',
                lastTimestamp: conv.updatedTime ? new Date(conv.updatedTime).toLocaleString() : 'Recent',
                unreadCount: Number(conv.unreadCount) || 0,
                messages,
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

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        for (const msg of data) {
          if (!conversationMap.has(msg.conversation_id)) {
            conversationMap.set(msg.conversation_id, {
              conversationId: msg.conversation_id,
              provider: msg.provider,
              participantName: msg.sender_name || msg.sender_id,
              participantId: msg.sender_id,
              avatarUrl: msg.sender_avatar_url,
              lastMessage: msg.message_text,
              lastTimestamp: msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'Recent',
              unreadCount: msg.status === 'DELIVERED' && msg.direction === 'INBOUND' ? 1 : 0,
              messages: [msg],
            });
          } else {
            const conv = conversationMap.get(msg.conversation_id);
            if (!conv.messages.some((m: any) => m.id === msg.id)) {
              conv.messages.push(msg);
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
    connectionId: string;
    provider: SocialPlatformType;
    conversationId: string;
    recipientId: string;
    messageText: string;
    userId: string;
    senderName?: string;
  }) {
    const supabase = getServiceSupabase();

    // Check connection infrastructure type
    const { data: conn } = await supabase
      .from('social_connections')
      .select('id, infrastructure_provider, zernio_account_id')
      .eq('id', params.connectionId)
      .maybeSingle();

    const isZernio = conn?.infrastructure_provider === 'zernio';
    let result: any;

    if (isZernio) {
      const zernioProvider = SocialProviderRegistry.getZernioProvider();
      result = await zernioProvider.sendMessage('zernio_master', {
        conversationId: params.conversationId,
        recipientId: params.recipientId,
        messageText: params.messageText,
      });
    } else {
      const token = await SocialTokenManager.getValidToken(params.connectionId, params.provider);
      if (!token) {
        throw new Error(`[SocialInboxService] ${params.provider} authentication token expired. Please reconnect.`);
      }

      const adapter = SocialProviderRegistry.getProvider(params.provider, 'native');
      result = await adapter.sendMessage(token, {
        conversationId: params.conversationId,
        recipientId: params.recipientId,
        messageText: params.messageText,
      });
    }

    if (!result.success) {
      throw new Error(`[SocialInboxService] Message send failed: ${result.error || 'Unknown error'}`);
    }

    // Persist outbound message to inbox log — non-fatal if table not yet created
    try {
      const { error: insertErr } = await supabase.from('social_inbox_messages').insert({
        connection_id: params.connectionId,
        provider: params.provider,
        conversation_id: params.conversationId,
        sender_id: params.userId,
        sender_name: params.senderName || 'Support Agent',
        recipient_id: params.recipientId,
        message_text: params.messageText,
        direction: 'OUTBOUND',
        status: 'SENT',
        timestamp: new Date().toISOString(),
      });
      if (insertErr) {
        console.warn('[SocialInboxService] Inbox message log write notice:', insertErr.message);
      }
    } catch (logErr: any) {
      console.warn('[SocialInboxService] Inbox message log write skipped:', logErr.message);
    }

    return result;
  }
}
