/**
 * Ralion OS — Central Ralion WhatsApp Gateway
 * Ras Ali Labs (Pty) Ltd
 *
 * Implements the core messaging gateway connecting:
 * WhatsApp → Zernio → Ralion Messaging Gateway → Mari → Zernio → WhatsApp
 */

import { ZernioSocialService } from '@ralion/integrations/server';
import { getPrivilegedSupabase } from '../../supabase/server';
import { MariWhatsAppRouterService, WhatsAppIncomingMessage, WhatsAppConversationMode } from './mariWhatsAppRouter.service';

export interface WebhookProcessingResult {
  success: boolean;
  duplicate?: boolean;
  ignored?: boolean;
  dispatched?: boolean;
  replySent?: boolean;
  error?: string;
  conversationId?: string;
  senderPhone?: string;
  mode?: WhatsAppConversationMode;
}

export class RalionWhatsAppGatewayService {
  // In-memory deduplication cache (10,000 entries max)
  private static processedEventIds = new Set<string>();

  // Pilot Allowlist: Numbers allowed to receive live auto-replies before public launch
  private static pilotAllowlist = new Set<string>([
    '+12029087457',
    '+27814400000', // Ras Ali Labs Admin Test Range
    '+2677150423',
  ]);

  /**
   * Adds or registers a phone number for the controlled pilot allowlist
   */
  static addPilotNumber(phone: string) {
    const clean = phone.replace(/[^0-9+]/g, '');
    this.pilotAllowlist.add(clean);
  }

  /**
   * Checks if auto-replies are enabled for a given phone number
   */
  static isPilotAllowed(phone: string): boolean {
    const isPublicLive = process.env.WHATSAPP_PUBLIC_AUTO_REPLY_ENABLED === 'true';
    if (isPublicLive) return true;

    const clean = phone.replace(/[^0-9+]/g, '');
    if (this.pilotAllowlist.has(clean)) return true;

    // Also check if matches any numbers in environment variable
    const envList = (process.env.WHATSAPP_PILOT_ALLOWLIST || '').split(',').map((p) => p.trim());
    return envList.includes(clean);
  }

  /**
   * Validates raw webhook HMAC-SHA256 signature
   */
  static verifyWebhookSignature(rawBody: string, signature: string): boolean {
    return ZernioSocialService.verifyWebhookSignature(rawBody, signature);
  }

  /**
   * Normalizes incoming Zernio webhook events into stable WhatsApp message format
   */
  static normalizeInboundEvent(payload: any): WhatsAppIncomingMessage | null {
    if (!payload || typeof payload !== 'object') return null;

    const eventType = payload.event || payload.type || payload.event_type || '';
    const data = payload.data || payload;

    // Detect if this is an inbox message or conversation event
    const isMessageEvent =
      eventType.includes('message') ||
      eventType.includes('inbox') ||
      data.message !== undefined ||
      data.text !== undefined;

    if (!isMessageEvent) return null;

    const platform = (data.platform || payload.platform || '').toLowerCase();
    // Only process WhatsApp messages
    if (platform && platform !== 'whatsapp') {
      return null;
    }

    const providerMessageId =
      data.id ||
      data.messageId ||
      payload.eventId ||
      payload.id ||
      `zmsg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const senderPhone =
      data.senderId ||
      data.senderPhone ||
      data.participantId ||
      data.from ||
      payload.senderId ||
      '';

    const senderName = data.senderName || data.participantName || data.name || 'WhatsApp Visitor';
    const messageText = data.text || data.message || data.body || '';
    const mediaUrl = data.mediaUrl || data.attachmentUrl || data.attachment?.url;
    const mediaType = data.mediaType || data.attachmentType || data.attachment?.type;
    const conversationId = data.conversationId || payload.conversationId || senderPhone;
    const timestamp = data.timestamp || payload.timestamp || new Date().toISOString();

    if (!senderPhone && !messageText) {
      return null;
    }

    return {
      providerMessageId,
      senderPhone,
      senderName,
      messageText,
      mediaUrl,
      mediaType,
      conversationId,
      timestamp,
    };
  }

  /**
   * Core Gateway Ingestion: Validates, deduplicates, stores, and routes inbound WhatsApp events
   */
  static async handleInboundEvent(
    rawBody: string,
    signatureHeader: string
  ): Promise<WebhookProcessingResult> {
    // 1. Signature Verification
    const isValidSignature = this.verifyWebhookSignature(rawBody, signatureHeader);
    if (!isValidSignature && process.env.NODE_ENV === 'production') {
      return {
        success: false,
        error: 'INVALID_SIGNATURE: Webhook signature verification failed.',
      };
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (e: any) {
      return { success: false, error: `JSON_PARSE_ERROR: ${e.message}` };
    }

    // 2. Normalization
    const msg = this.normalizeInboundEvent(payload);
    if (!msg) {
      return { success: true, ignored: true };
    }

    // 3. Deduplication (Idempotency)
    if (this.processedEventIds.has(msg.providerMessageId)) {
      return { success: true, duplicate: true };
    }
    this.processedEventIds.add(msg.providerMessageId);
    if (this.processedEventIds.size > 10000) {
      // Keep cache bounded
      const firstEntries = Array.from(this.processedEventIds).slice(0, 2000);
      firstEntries.forEach((id) => this.processedEventIds.delete(id));
    }

    // 4. Retrieve or Create Conversation Record
    const conversation = await this.getOrCreateConversation(msg);

    // 5. Store Inbound Message Record
    await this.storeMessageRecord({
      conversationRef: conversation.id,
      providerMessageId: msg.providerMessageId,
      direction: 'INBOUND',
      senderPhone: msg.senderPhone,
      recipientPhone: conversation.centralNumber || '+12029087457',
      messageText: msg.messageText,
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType,
      status: 'DELIVERED',
    });

    // 6. Mari Conversation Routing
    const mariResponse = await MariWhatsAppRouterService.processMessage(msg, {
      mode: conversation.mode,
      organizationId: conversation.organizationId,
      workspaceId: conversation.workspaceId,
      linkedUserId: conversation.linkedUserId,
      enquiryRef: conversation.enquiryRef,
    });

    // 7. Update Conversation Context
    if (mariResponse.mode !== conversation.mode || mariResponse.workspaceId !== conversation.workspaceId) {
      await this.updateConversationContext(conversation.id, {
        mode: mariResponse.mode,
        organizationId: mariResponse.organizationId,
        workspaceId: mariResponse.workspaceId,
      });
    }

    // 8. Outbound Reply Dispatching (Subject to Controlled Pilot Allowlist)
    let replySent = false;
    const isAllowed = this.isPilotAllowed(msg.senderPhone);

    if (isAllowed && mariResponse.replyText) {
      try {
        const outRes = await ZernioSocialService.sendWhatsAppMessage({
          recipientPhone: msg.senderPhone,
          messageText: mariResponse.replyText,
          conversationId: msg.conversationId,
        });

        replySent = outRes.success;

        // Store Outbound Message Record
        await this.storeMessageRecord({
          conversationRef: conversation.id,
          providerMessageId: outRes.messageId || `out_${Date.now()}`,
          direction: 'OUTBOUND',
          senderPhone: conversation.centralNumber || '+12029087457',
          recipientPhone: msg.senderPhone,
          messageText: mariResponse.replyText,
          status: 'SENT',
        });
      } catch (sendErr: any) {
        console.error('[RalionWhatsAppGateway] Outbound dispatch error:', sendErr.message);
      }
    } else if (!isAllowed) {
      console.log(`[RalionWhatsAppGateway] Message from ${msg.senderPhone} stored; auto-reply suppressed (Controlled Pilot Allowlist).`);
    }

    return {
      success: true,
      dispatched: true,
      replySent,
      conversationId: conversation.id,
      senderPhone: msg.senderPhone,
      mode: mariResponse.mode,
    };
  }

  // =========================================================================
  // PERSISTENCE & CONVERSATION HELPERS
  // =========================================================================

  private static inMemoryConversations = new Map<string, any>();

  private static async getOrCreateConversation(msg: WhatsAppIncomingMessage): Promise<{
    id: string;
    mode: WhatsAppConversationMode;
    organizationId?: string | null;
    workspaceId?: string | null;
    linkedUserId?: string | null;
    enquiryRef?: string | null;
    centralNumber?: string;
  }> {
    const key = msg.senderPhone;
    if (this.inMemoryConversations.has(key)) {
      return this.inMemoryConversations.get(key);
    }

    // Try database
    try {
      const supabase = getPrivilegedSupabase();
      const { data: conv } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('sender_phone', msg.senderPhone)
        .maybeSingle();

      if (conv) {
        const record = {
          id: conv.id,
          mode: conv.mode as WhatsAppConversationMode,
          organizationId: conv.organization_id,
          workspaceId: conv.workspace_id,
          linkedUserId: conv.linked_user_id,
          enquiryRef: conv.enquiry_reference_code,
          centralNumber: '+12029087457',
        };
        this.inMemoryConversations.set(key, record);
        return record;
      }

      // Create new in DB
      const newId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await supabase.from('whatsapp_conversations').insert({
        conversation_id: msg.conversationId || msg.senderPhone,
        sender_phone: msg.senderPhone,
        sender_name: msg.senderName,
        mode: 'PUBLIC_ASSISTANT',
      });

      const newRecord = {
        id: newId,
        mode: 'PUBLIC_ASSISTANT' as WhatsAppConversationMode,
        centralNumber: '+12029087457',
      };
      this.inMemoryConversations.set(key, newRecord);
      return newRecord;
    } catch {
      // Fallback in-memory
      const fallback = {
        id: `conv_${Date.now()}`,
        mode: 'PUBLIC_ASSISTANT' as WhatsAppConversationMode,
        centralNumber: '+12029087457',
      };
      this.inMemoryConversations.set(key, fallback);
      return fallback;
    }
  }

  private static async updateConversationContext(
    conversationId: string,
    updates: {
      mode: WhatsAppConversationMode;
      organizationId?: string | null;
      workspaceId?: string | null;
    }
  ) {
    for (const [key, conv] of this.inMemoryConversations.entries()) {
      if (conv.id === conversationId) {
        this.inMemoryConversations.set(key, { ...conv, ...updates });
        break;
      }
    }

    try {
      const supabase = getPrivilegedSupabase();
      await supabase
        .from('whatsapp_conversations')
        .update({
          mode: updates.mode,
          organization_id: updates.organizationId || null,
          workspace_id: updates.workspaceId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    } catch {
      // table might not be migrated yet
    }
  }

  private static async storeMessageRecord(record: any) {
    try {
      const supabase = getPrivilegedSupabase();
      await supabase.from('whatsapp_messages').insert({
        conversation_ref: record.conversationRef,
        provider_message_id: record.providerMessageId,
        direction: record.direction,
        sender_phone: record.senderPhone,
        recipient_phone: record.recipientPhone,
        message_text: record.messageText,
        media_url: record.mediaUrl || null,
        media_type: record.mediaType || null,
        status: record.status || 'SENT',
      });
    } catch {
      // table might not be migrated yet
    }
  }
}
