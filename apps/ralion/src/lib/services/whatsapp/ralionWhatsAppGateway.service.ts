/**
 * Ralion OS — Central Ralion WhatsApp Gateway
 * Ras Ali Labs (Pty) Ltd
 *
 * Implements the core messaging gateway connecting:
 * WhatsApp → Zernio → Ralion Messaging Gateway → Mari → Zernio → WhatsApp
 *
 * Adheres strictly to official Zernio inbox webhook API contract:
 * - payload.id (stable event identifier / idempotency key)
 * - payload.account (canonical accountId, profileId, platform)
 * - payload.message (id, platformMessageId, direction, text, attachments, sender)
 * - payload.conversation (id, platformConversationId)
 * - delivery / read / failed status events
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
  // In-memory deduplication cache for fast short-circuit (durable DB is primary)
  private static processedMessageIds = new Set<string>();

  /**
   * Checks if auto-replies are enabled for a given phone number based on configured pilot allowlist.
   * Hardcoded test numbers are strictly avoided; environment variable configuration is enforced.
   */
  static isPilotAllowed(phone: string): boolean {
    const isPublicLive = process.env.WHATSAPP_PUBLIC_AUTO_REPLY_ENABLED === 'true';
    if (isPublicLive) return true;

    const clean = phone.replace(/[^0-9+]/g, '');
    const envList = (process.env.WHATSAPP_PILOT_ALLOWLIST || '')
      .split(',')
      .map((p) => p.trim().replace(/[^0-9+]/g, ''))
      .filter(Boolean);

    return envList.includes(clean);
  }

  /**
   * Validates raw webhook HMAC-SHA256 signature against exact raw body string
   */
  static verifyWebhookSignature(rawBody: string, signature: string): boolean {
    return ZernioSocialService.verifyWebhookSignature(rawBody, signature);
  }

  /**
   * Normalizes incoming documented Zernio webhook events into stable WhatsApp message format.
   * Only returns an incoming message for `message.received` with direction === 'incoming'.
   */
  static normalizeInboundEvent(payload: any): WhatsAppIncomingMessage | null {
    if (!payload || typeof payload !== 'object') return null;

    const event = String(payload.event || payload.type || payload.event_type || '');

    // Only inbound message.received events are routed through Mari as customer messages
    if (event !== 'message.received') {
      return null;
    }

    const account = payload.account || {};
    const message = payload.message || payload.data?.message || payload.data || {};
    const conversation = payload.conversation || payload.data?.conversation || {};

    const platform = (message.platform || account.platform || payload.platform || '').toLowerCase();
    if (platform && platform !== 'whatsapp') {
      return null;
    }

    const direction = (message.direction || 'incoming').toLowerCase();
    if (direction !== 'incoming') {
      return null;
    }

    // Stable provider message identifier (canonical Zernio message ID or platformMessageId)
    const providerMessageId =
      message.id ||
      message.platformMessageId ||
      payload.id ||
      null;

    if (!providerMessageId) {
      return null;
    }

    // Sender extraction adhering to documented Zernio schema:
    // sender.phoneNumber (E.164), sender.id (phone or BSUID), or fallback
    const sender = message.sender || {};
    let senderPhone =
      sender.phoneNumber ||
      (sender.id && sender.id.startsWith('+') ? sender.id : null) ||
      (sender.id && /^\d{7,15}$/.test(sender.id) ? `+${sender.id}` : null) ||
      payload.senderPhone ||
      '';

    // Normalize phone to E.164
    if (senderPhone && !senderPhone.startsWith('+')) {
      senderPhone = `+${senderPhone.replace(/[^0-9]/g, '')}`;
    }

    const senderName = sender.name || sender.username || 'WhatsApp Customer';
    const messageText = typeof message.text === 'string' ? message.text : (message.text?.body || message.body || '');

    // Attachments extraction
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    if (Array.isArray(message.attachments) && message.attachments.length > 0) {
      const firstAtt = message.attachments[0];
      mediaUrl = firstAtt.url;
      mediaType = firstAtt.type || firstAtt.mimeType;
    } else if (message.attachment) {
      mediaUrl = message.attachment.url;
      mediaType = message.attachment.type;
    }

    const conversationId = conversation.id || conversation.platformConversationId || senderPhone;
    const timestamp = message.sentAt || payload.timestamp || new Date().toISOString();

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
   * Handles delivery status events (message.delivered, message.read, message.failed, message.sent).
   * Updates existing message records in database without treating them as new incoming customer messages.
   */
  static async handleDeliveryStatusEvent(payload: any): Promise<WebhookProcessingResult> {
    const event = String(payload.event || '');
    const message = payload.message || {};
    const providerMessageId = message.id || message.platformMessageId;

    if (!providerMessageId) {
      return { success: true, ignored: true };
    }

    let targetStatus: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' = 'DELIVERED';
    if (event === 'message.delivered') targetStatus = 'DELIVERED';
    else if (event === 'message.read') targetStatus = 'READ';
    else if (event === 'message.sent') targetStatus = 'SENT';
    else if (event === 'message.failed') targetStatus = 'FAILED';

    const deliveryError = message.error ? JSON.stringify(message.error) : null;

    try {
      const supabase = getPrivilegedSupabase();
      const { error } = await supabase
        .from('whatsapp_messages')
        .update({
          status: targetStatus,
          delivery_error: deliveryError,
        })
        .eq('provider_message_id', providerMessageId);

      if (error) {
        console.warn('[RalionWhatsAppGateway] Delivery status update warning:', error.message);
      }
      return { success: true, dispatched: false };
    } catch (err: any) {
      console.warn('[RalionWhatsAppGateway] Delivery status handler exception:', err.message);
      return { success: true, error: err.message };
    }
  }

  /**
   * Core Gateway Ingestion: Validates raw HMAC, verifies configured account ID,
   * performs durable DB idempotency, resolves database-generated UUID, and dispatches.
   */
  static async handleInboundEvent(
    rawBody: string,
    signatureHeader: string,
    preParsedPayload?: any
  ): Promise<WebhookProcessingResult> {
    // 1. Signature Verification
    const isValidSignature = this.verifyWebhookSignature(rawBody, signatureHeader);
    if (!isValidSignature && process.env.NODE_ENV === 'production') {
      return {
        success: false,
        error: 'INVALID_SIGNATURE: Webhook signature verification failed.',
      };
    }

    let payload: any = preParsedPayload;
    if (!payload) {
      try {
        payload = JSON.parse(rawBody);
      } catch (e: any) {
        return { success: false, error: `JSON_PARSE_ERROR: ${e.message}` };
      }
    }

    const eventType = String(payload.event || payload.type || '');

    // 2. Enforce Configured Central WhatsApp Account ID (No mixing sandboxes/production)
    const configuredAccountId = process.env.ZERNIO_WHATSAPP_ACCOUNT_ID?.trim();
    if (configuredAccountId) {
      const payloadAccountId = payload.account?.accountId || payload.account?.id || payload.accountId;
      if (payloadAccountId && payloadAccountId !== configuredAccountId) {
        console.warn(`[RalionWhatsAppGateway] Ignored webhook event for account ${payloadAccountId}; expected ${configuredAccountId}.`);
        return { success: true, ignored: true };
      }
    }

    // 3. Handle Delivery & Status Events
    if (['message.delivered', 'message.read', 'message.sent', 'message.failed'].includes(eventType)) {
      return await this.handleDeliveryStatusEvent(payload);
    }

    // 4. Normalization of Inbound Customer Messages
    const msg = this.normalizeInboundEvent(payload);
    if (!msg) {
      return { success: true, ignored: true };
    }

    // 5. Durable Database Idempotency (Primary control) + Memory Cache (Secondary)
    if (this.processedMessageIds.has(msg.providerMessageId)) {
      return { success: true, duplicate: true };
    }

    const supabase = getPrivilegedSupabase();
    const { data: existingMsg, error: checkError } = await supabase
      .from('whatsapp_messages')
      .select('id')
      .eq('provider_message_id', msg.providerMessageId)
      .maybeSingle();

    if (checkError) {
      console.error('[RalionWhatsAppGateway] Database idempotency check failed:', checkError.message);
      return { success: false, error: `DB_IDEMPOTENCY_ERROR: ${checkError.message}` };
    }

    if (existingMsg) {
      this.processedMessageIds.add(msg.providerMessageId);
      return { success: true, duplicate: true };
    }

    // 6. Retrieve or Create Conversation Record (using database-generated UUID)
    const conversation = await this.getOrCreateConversation(msg);
    if (!conversation) {
      return { success: false, error: 'CONVERSATION_PERSISTENCE_FAILED' };
    }

    // 7. Store Inbound Message Record with Durable Idempotency
    const storeResult = await this.storeMessageRecord({
      conversationRef: conversation.id,
      providerMessageId: msg.providerMessageId,
      direction: 'INBOUND',
      senderPhone: msg.senderPhone,
      recipientPhone: conversation.centralNumber || process.env.WHATSAPP_CENTRAL_NUMBER || '+12029087457',
      messageText: msg.messageText,
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType,
      status: 'DELIVERED',
    });

    if (storeResult.duplicate) {
      this.processedMessageIds.add(msg.providerMessageId);
      return { success: true, duplicate: true };
    }

    if (!storeResult.success) {
      return { success: false, error: storeResult.error || 'INBOUND_MESSAGE_PERSISTENCE_FAILED' };
    }

    this.processedMessageIds.add(msg.providerMessageId);
    if (this.processedMessageIds.size > 10000) {
      const firstEntries = Array.from(this.processedMessageIds).slice(0, 2000);
      firstEntries.forEach((id) => this.processedMessageIds.delete(id));
    }

    // 8. Mari Conversation Routing (Workspace & Role Verification)
    const mariResponse = await MariWhatsAppRouterService.processMessage(msg, {
      mode: conversation.mode,
      organizationId: conversation.organizationId,
      workspaceId: conversation.workspaceId,
      linkedUserId: conversation.linkedUserId,
      enquiryRef: conversation.enquiryRef,
    });

    // 9. Update Conversation Context
    if (mariResponse.mode !== conversation.mode || mariResponse.workspaceId !== conversation.workspaceId) {
      await this.updateConversationContext(conversation.id, {
        mode: mariResponse.mode,
        organizationId: mariResponse.organizationId,
        workspaceId: mariResponse.workspaceId,
      });
    }

    // 10. Outbound Reply Dispatching (Strictly Subject to Configured Pilot Allowlist)
    let replySent = false;
    const isAllowed = this.isPilotAllowed(msg.senderPhone);

    if (isAllowed && mariResponse.replyText) {
      try {
        const outRes = await ZernioSocialService.sendWhatsAppMessage({
          recipientPhone: msg.senderPhone,
          messageText: mariResponse.replyText,
          conversationId: msg.conversationId,
        });

        replySent = Boolean(outRes.success);

        // Store Outbound Message Record
        if (outRes.success) {
          await this.storeMessageRecord({
            conversationRef: conversation.id,
            providerMessageId: outRes.messageId || `out_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            direction: 'OUTBOUND',
            senderPhone: conversation.centralNumber || process.env.WHATSAPP_CENTRAL_NUMBER || '+12029087457',
            recipientPhone: msg.senderPhone,
            messageText: mariResponse.replyText,
            status: 'SENT',
          });
        }
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

  /**
   * Retrieves or creates a conversation record using the database-generated UUID.
   * Never fabricates `conv_<timestamp>` primary keys.
   */
  static async getOrCreateConversation(msg: WhatsAppIncomingMessage): Promise<{
    id: string;
    mode: WhatsAppConversationMode;
    organizationId?: string | null;
    workspaceId?: string | null;
    linkedUserId?: string | null;
    enquiryRef?: string | null;
    centralNumber?: string;
  } | null> {
    const supabase = getPrivilegedSupabase();

    // 1. Try to find existing conversation by sender phone
    const { data: conv, error: selectErr } = await supabase
      .from('whatsapp_conversations')
      .select('id, mode, organization_id, workspace_id, linked_user_id, enquiry_reference_code')
      .eq('sender_phone', msg.senderPhone)
      .maybeSingle();

    if (selectErr) {
      console.error('[RalionWhatsAppGateway] Failed to select conversation:', selectErr.message);
      return null;
    }

    if (conv) {
      // Update last_inbound_at and last_message_at for 24h window compliance
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_inbound_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conv.id);

      return {
        id: conv.id,
        mode: conv.mode as WhatsAppConversationMode,
        organizationId: conv.organization_id,
        workspaceId: conv.workspace_id,
        linkedUserId: conv.linked_user_id,
        enquiryRef: conv.enquiry_reference_code,
      };
    }

    // 2. Insert new conversation and retrieve the database-generated UUID
    const { data: created, error: insertErr } = await supabase
      .from('whatsapp_conversations')
      .insert({
        conversation_id: msg.conversationId || msg.senderPhone,
        provider_conversation_id: msg.conversationId || null,
        sender_phone: msg.senderPhone,
        sender_name: msg.senderName,
        mode: 'PUBLIC_ASSISTANT',
        last_inbound_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      })
      .select('id, mode, organization_id, workspace_id, linked_user_id, enquiry_reference_code')
      .single();

    if (insertErr) {
      // If concurrent insert created it, retry select
      if (insertErr.code === '23505') {
        const { data: retryConv } = await supabase
          .from('whatsapp_conversations')
          .select('id, mode, organization_id, workspace_id, linked_user_id, enquiry_reference_code')
          .eq('sender_phone', msg.senderPhone)
          .maybeSingle();

        if (retryConv) {
          return {
            id: retryConv.id,
            mode: retryConv.mode as WhatsAppConversationMode,
            organizationId: retryConv.organization_id,
            workspaceId: retryConv.workspace_id,
            linkedUserId: retryConv.linked_user_id,
            enquiryRef: retryConv.enquiry_reference_code,
          };
        }
      }

      console.error('[RalionWhatsAppGateway] Failed to create conversation:', insertErr.message);
      return null;
    }

    return {
      id: created.id,
      mode: created.mode as WhatsAppConversationMode,
      organizationId: created.organization_id,
      workspaceId: created.workspace_id,
      linkedUserId: created.linked_user_id,
      enquiryRef: created.enquiry_reference_code,
    };
  }

  static async updateConversationContext(
    conversationId: string,
    updates: {
      mode: WhatsAppConversationMode;
      organizationId?: string | null;
      workspaceId?: string | null;
    }
  ): Promise<boolean> {
    try {
      const supabase = getPrivilegedSupabase();
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({
          mode: updates.mode,
          organization_id: updates.organizationId || null,
          workspace_id: updates.workspaceId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) {
        console.error('[RalionWhatsAppGateway] Error updating conversation context:', error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      console.error('[RalionWhatsAppGateway] Exception updating conversation context:', err.message);
      return false;
    }
  }

  /**
   * Stores a message record in `whatsapp_messages` using the conversation UUID.
   * Handles unique constraint violations (23505) gracefully for idempotency.
   */
  static async storeMessageRecord(record: {
    conversationRef: string;
    providerMessageId: string;
    direction: 'INBOUND' | 'OUTBOUND';
    senderPhone: string;
    recipientPhone: string;
    messageText: string;
    mediaUrl?: string | null;
    mediaType?: string | null;
    status?: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  }): Promise<{ success: boolean; duplicate?: boolean; error?: string }> {
    try {
      const supabase = getPrivilegedSupabase();
      const { error } = await supabase.from('whatsapp_messages').insert({
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

      if (error) {
        if (error.code === '23505') {
          return { success: true, duplicate: true };
        }
        console.error('[RalionWhatsAppGateway] Insert message record error:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error('[RalionWhatsAppGateway] Insert message exception:', err.message);
      return { success: false, error: err.message };
    }
  }
}
