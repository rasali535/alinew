/**
 * Ralion Unified Social Media Architecture — Social Inbox Service
 * Ras Ali Labs (Pty) Ltd
 * Unified inbox stream for WhatsApp, Instagram, Facebook Messenger, LinkedIn, and X DMs.
 */

import { createClient } from '@supabase/supabase-js';
import { SocialPlatformType, SocialProviderRegistry } from '@ralion/integrations';
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
   * Get all conversations and latest messages for a user/workspace
   */
  static async getConversations(userId: string, provider?: SocialPlatformType) {
    const supabase = getServiceSupabase();
    let query = supabase
      .from('social_inbox_messages')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (provider) {
      query = query.eq('provider', provider);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Group messages by conversation_id
    const conversationMap = new Map<string, any>();
    for (const msg of data || []) {
      if (!conversationMap.has(msg.conversation_id)) {
        conversationMap.set(msg.conversation_id, {
          conversationId: msg.conversation_id,
          provider: msg.provider,
          participantName: msg.sender_name || msg.sender_id,
          participantId: msg.sender_id,
          avatarUrl: msg.sender_avatar_url,
          lastMessage: msg.message_text,
          lastTimestamp: msg.timestamp,
          unreadCount: msg.status === 'DELIVERED' && msg.direction === 'INBOUND' ? 1 : 0,
          messages: [msg],
        });
      } else {
        const conv = conversationMap.get(msg.conversation_id);
        conv.messages.push(msg);
      }
    }

    if (conversationMap.size > 0) {
      return Array.from(conversationMap.values());
    }

    // Return empty array when no conversations exist
    return [];
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

    await supabase.from('social_inbox_messages').insert({
      connection_id: params.connectionId,
      provider: params.provider,
      conversation_id: params.conversationId,
      sender_id: params.userId,
      sender_name: 'Ras Ali Labs Support',
      recipient_id: params.recipientId,
      message_text: params.messageText,
      direction: 'OUTBOUND',
      status: 'SENT',
      timestamp: new Date().toISOString(),
    });

    return result;
  }
}
