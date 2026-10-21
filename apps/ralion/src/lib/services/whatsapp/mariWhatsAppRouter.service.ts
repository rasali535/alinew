/**
 * Ralion OS — Mari WhatsApp Conversation Router
 * Ras Ali Labs (Pty) Ltd
 *
 * Implements the 3 authoritative conversation modes:
 * A. Public Ralion Assistant (Grounded public business support)
 * B. Registered Ralion User (Account-linked workspace operations)
 * C. Business Customer (Tenant-scoped customer enquiries & Retail quotations)
 */

import { getPrivilegedSupabase } from '../../supabase/server';
import { RetailDatabaseService } from '../retail/retailDatabase.service';
import { RetailQuotation, RetailQuoteItem } from '@ralion/database';

export type WhatsAppConversationMode = 'PUBLIC_ASSISTANT' | 'REGISTERED_USER' | 'BUSINESS_CUSTOMER';

export interface WhatsAppIncomingMessage {
  providerMessageId: string;
  senderPhone: string;
  senderName?: string;
  messageText: string;
  mediaUrl?: string;
  mediaType?: string;
  conversationId?: string;
  timestamp?: string;
}

export interface WhatsAppRouterResponse {
  replyText: string;
  mode: WhatsAppConversationMode;
  organizationId?: string | null;
  workspaceId?: string | null;
  quotationCreated?: boolean;
  quotationNumber?: string;
  suggestedActions?: string[];
  requiresApproval?: boolean;
}

export class MariWhatsAppRouterService {
  /**
   * Main conversation routing entry point.
   */
  static async processMessage(
    message: WhatsAppIncomingMessage,
    conversationState?: {
      mode?: WhatsAppConversationMode;
      organizationId?: string | null;
      workspaceId?: string | null;
      linkedUserId?: string | null;
      enquiryRef?: string | null;
    }
  ): Promise<WhatsAppRouterResponse> {
    const rawText = (message.messageText || '').trim();
    const cleanLower = rawText.toLowerCase();

    // 1. Global Reset / Help triggers
    if (cleanLower === 'reset' || cleanLower === 'exit' || cleanLower === 'menu' || cleanLower === 'ralion') {
      return {
        replyText:
          "Hello! I am Mari, Ralion OS's business assistant. How can I help you today?\n\n" +
          "1. Explore Ralion OS & Solutions (Retail, Trade, Growth, CRM)\n" +
          "2. Link your WhatsApp to your Ralion Account (Text: LINK <code>)\n" +
          "3. Request a business quotation (Include your business reference, e.g. #REF-CODE)\n" +
          "4. Talk to Ras Ali Labs Support",
        mode: 'PUBLIC_ASSISTANT',
        organizationId: null,
        workspaceId: null,
      };
    }

    // 2. Check for Account Linking Command (Mode B Initiation)
    const linkMatch = rawText.match(/^(?:link|verify|auth)\s+([A-Z0-9]{6})$/i);
    if (linkMatch) {
      const code = linkMatch[1].toUpperCase();
      const linkResult = await this.verifyAccountLink(message.senderPhone, code);
      if (linkResult.success) {
        return {
          replyText:
            `✅ Account Verified!\n\nWelcome ${linkResult.userName || 'back'}. Your WhatsApp is now securely linked to **${linkResult.organizationName || 'your Ralion Workspace'}**.\n\n` +
            `You can now ask me:\n` +
            `• "How many quotations are awaiting approval?"\n` +
            `• "What are today's sales numbers?"\n` +
            `• "Check stock for [product name]"\n` +
            `\nTo unlink at any time, simply text "UNLINK".`,
          mode: 'REGISTERED_USER',
          organizationId: linkResult.organizationId,
          workspaceId: linkResult.workspaceId,
        };
      } else {
        return {
          replyText: `❌ Verification failed: ${linkResult.error || 'Invalid or expired code'}. Please generate a new link code in Ralion Settings → WhatsApp.`,
          mode: 'PUBLIC_ASSISTANT',
        };
      }
    }

    // Check for Unlink Command
    if (cleanLower === 'unlink') {
      await this.revokeAccountLink(message.senderPhone);
      return {
        replyText: "Your WhatsApp number has been unlinked from Ralion OS. You are now in public guest mode.",
        mode: 'PUBLIC_ASSISTANT',
        organizationId: null,
        workspaceId: null,
      };
    }

    // 3. Check for Business Customer Enquiry Reference (Mode C Initiation)
    const refMatch = rawText.match(/\b(?:ref-|#)([A-Za-z0-9_-]{3,20})\b/i);
    if (refMatch) {
      const refCode = refMatch[1].toUpperCase();
      const business = await this.resolveBusinessReference(refCode);
      if (business) {
        return {
          replyText:
            `Welcome to **${business.businessName}**!\n\n` +
            `I'm Mari, assisting ${business.businessName}. You can ask about product availability, store hours, or submit a quotation request.\n\n` +
            `To request a quotation, simply send your product list (e.g. "Quote for 10 bags cement, 5 tins white paint") or attach a photo/document of your materials list.`,
          mode: 'BUSINESS_CUSTOMER',
          organizationId: business.organizationId,
          workspaceId: business.workspaceId,
        };
      }
    }

    // 4. Dispatch based on current session mode
    const currentMode = conversationState?.mode || 'PUBLIC_ASSISTANT';

    if (currentMode === 'REGISTERED_USER' && conversationState?.workspaceId) {
      return await this.handleRegisteredUserQuery(message, conversationState.workspaceId, conversationState.organizationId || undefined);
    }

    if (currentMode === 'BUSINESS_CUSTOMER' && conversationState?.workspaceId) {
      return await this.handleBusinessCustomerQuery(message, conversationState.workspaceId, conversationState.organizationId || undefined);
    }

    // 5. Default: Mode A (Public Ralion Assistant)
    return await this.handlePublicAssistantQuery(message);
  }

  // =========================================================================
  // MODE A — PUBLIC RALION ASSISTANT
  // =========================================================================
  private static async handlePublicAssistantQuery(message: WhatsAppIncomingMessage): Promise<WhatsAppRouterResponse> {
    const text = message.messageText.toLowerCase();

    if (/^(hi|hello|hey|good day|morning|afternoon|evening)\b/.test(text)) {
      return {
        replyText:
          "Hello! I'm Mari, Ralion OS's business assistant from Ras Ali Labs. 🚀\n\n" +
          "I can help you:\n" +
          "• Learn about Ralion OS and our integrated business software\n" +
          "• Explore Retail, Trade, POS, CRM, Growth and Social systems\n" +
          "• Find participating businesses using Ralion\n" +
          "• Connect with Ras Ali Labs support\n\n" +
          "What can I help you with today?",
        mode: 'PUBLIC_ASSISTANT',
      };
    }

    if (text.includes('what is ralion') || text.includes('about ralion') || text.includes('software')) {
      return {
        replyText:
          "**Ralion OS** is a unified business operating system engineered by Ras Ali Labs (Pty) Ltd.\n\n" +
          "It integrates everything high-growth businesses need into one command centre:\n" +
          "• **Retail & Trade:** Multi-location POS, inventory tracking, quotes, invoices and supplier orders\n" +
          "• **Customers & CRM:** Lead tracking, customer lifecycle, communications and loyalty\n" +
          "• **Growth & Social:** Autonomous social publishing, multi-platform inbox, and AI creative generation\n" +
          "• **Mari AI:** Intelligent 24/7 autonomous copilot for business operations and customer support\n\n" +
          "Would you like to explore a specific module, or request a pilot demonstration?",
        mode: 'PUBLIC_ASSISTANT',
      };
    }

    if (text.includes('price') || text.includes('pricing') || text.includes('cost') || text.includes('subscription')) {
      return {
        replyText:
          "Ralion OS offers transparent tier-based plans with 30-day pilot access for eligible businesses:\n\n" +
          "• **Starter Tier:** Essential CRM, Overview & Operations\n" +
          "• **Business Tier:** Includes Retail POS, Inventory & Social Engine\n" +
          "• **Enterprise Edition:** Dedicated database isolation, custom integrations and high-volume Mari AI\n\n" +
          "To request a demo access code or speak with our solutions architect, contact us at contact@rasalilabs.com.",
        mode: 'PUBLIC_ASSISTANT',
      };
    }

    if (text.includes('retail') || text.includes('pos') || text.includes('hardware') || text.includes('trade')) {
      return {
        replyText:
          "**Ralion Retail & Trade** is our battle-tested operational suite for hardware stores, merchants, and trade distributors:\n\n" +
          "• Fast touch POS with offline-resilience and receipt printing\n" +
          "• Authoritative inventory with automated low-stock reorder points\n" +
          "• Contractor quotations with conversion to sale in one click\n" +
          "• Real-time gross profit and VAT reporting\n\n" +
          "If you are a customer of a store using Ralion, include their store reference code (e.g. #STORE_CODE) to request quotes directly on WhatsApp!",
        mode: 'PUBLIC_ASSISTANT',
      };
    }

    // Default grounded fallback
    return {
      replyText:
        "Thank you for contacting Ras Ali Labs! I am Mari, the central Ralion business assistant.\n\n" +
        "You can ask me about Ralion OS features, retail solutions, or how to link your business workspace. " +
        "For complex enquiries, our team is available at contact@rasalilabs.com or https://rasalilabs.com.",
      mode: 'PUBLIC_ASSISTANT',
    };
  }

  // =========================================================================
  // MODE B — REGISTERED RALION USER
  // =========================================================================
  private static async handleRegisteredUserQuery(
    message: WhatsAppIncomingMessage,
    workspaceId: string,
    organizationId?: string
  ): Promise<WhatsAppRouterResponse> {
    const text = message.messageText.toLowerCase();

    // 1. Quotations awaiting approval
    if (text.includes('quotation') || text.includes('quote') || text.includes('awaiting')) {
      try {
        const quotes = await RetailDatabaseService.listQuotations(workspaceId);
        const pending = quotes.filter((q) => q.status === 'DRAFT' || q.status === 'SENT');
        if (pending.length === 0) {
          return {
            replyText: "📋 There are currently **no quotations** awaiting review in your workspace. All quotations are up to date!",
            mode: 'REGISTERED_USER',
            workspaceId,
            organizationId,
          };
        }

        const lines = pending.slice(0, 5).map((q) => `• **${q.quoteNumber}** (${q.customerName}): $${q.totalAmount.toFixed(2)} [${q.status}]`);
        return {
          replyText:
            `📋 You have **${pending.length} quotation(s)** in your workspace:\n\n` +
            lines.join('\n') +
            `\n\nReview or approve them inside Ralion Retail → Quotations.`,
          mode: 'REGISTERED_USER',
          workspaceId,
          organizationId,
        };
      } catch (err: any) {
        return {
          replyText: `Unable to retrieve quotations: ${err.message}`,
          mode: 'REGISTERED_USER',
          workspaceId,
          organizationId,
        };
      }
    }

    // 2. Stock / Inventory inquiry
    if (text.includes('stock') || text.includes('inventory') || text.includes('how many')) {
      const prodSearch = text.replace(/^(check stock for|stock of|stock for|how many)\s+/i, '').trim();
      if (prodSearch.length > 2) {
        try {
          const products = await RetailDatabaseService.listProducts(workspaceId, { query: prodSearch });
          if (products.length === 0) {
            return {
              replyText: `🔍 No products matching "${prodSearch}" were found in your workspace catalogue.`,
              mode: 'REGISTERED_USER',
              workspaceId,
              organizationId,
            };
          }

          const topMatch = products[0];
          return {
            replyText:
              `📦 **Inventory Status for ${topMatch.name}:**\n` +
              `• SKU: ${topMatch.sku}\n` +
              `• Current Stock: **${topMatch.currentStock ?? 0} ${topMatch.unitOfMeasure || 'units'}**\n` +
              `• Selling Price: $${topMatch.sellingPrice.toFixed(2)}\n` +
              `• Status: ${(topMatch.currentStock ?? 0) > (topMatch.reorderLevel || 10) ? '🟢 In Stock' : '🔴 Low Stock'}`,
            mode: 'REGISTERED_USER',
            workspaceId,
            organizationId,
          };
        } catch (err: any) {
          return {
            replyText: `Could not check stock: ${err.message}`,
            mode: 'REGISTERED_USER',
            workspaceId,
            organizationId,
          };
        }
      }
    }

    // Registered user fallback
    return {
      replyText:
        "Hello! As a registered user, you can ask for:\n" +
        "• Quotations awaiting approval\n" +
        "• Stock availability for products (e.g. \"check stock for cement\")\n" +
        "• Today's sales or pending alerts\n\n" +
        "Text \"UNLINK\" to disconnect your WhatsApp account.",
      mode: 'REGISTERED_USER',
      workspaceId,
      organizationId,
    };
  }

  // =========================================================================
  // MODE C — BUSINESS CUSTOMER (Retail RFQ & Enquiries)
  // =========================================================================
  private static async handleBusinessCustomerQuery(
    message: WhatsAppIncomingMessage,
    workspaceId: string,
    organizationId?: string
  ): Promise<WhatsAppRouterResponse> {
    const text = message.messageText.trim();
    const cleanLower = text.toLowerCase();

    // Check if customer is requesting a quotation
    const isQuotationRequest =
      cleanLower.includes('quote') ||
      cleanLower.includes('quotation') ||
      cleanLower.includes('price for') ||
      cleanLower.includes('estimate') ||
      message.mediaUrl !== undefined;

    if (isQuotationRequest) {
      return await this.createRetailQuotationDraft(message, workspaceId, organizationId);
    }

    // General store enquiry
    return {
      replyText:
        "Thanks for your message! To receive an official price estimate or quotation, please list the items and quantities you require (e.g. \"5 bags cement, 10 timber planks\"), or attach an image of your bill of quantities.",
      mode: 'BUSINESS_CUSTOMER',
      workspaceId,
      organizationId,
    };
  }

  // =========================================================================
  // RETAIL QUOTATION ASSISTANT (Phase 4 Implementation)
  // =========================================================================
  private static async createRetailQuotationDraft(
    message: WhatsAppIncomingMessage,
    workspaceId: string,
    organizationId?: string
  ): Promise<WhatsAppRouterResponse> {
    try {
      const products = await RetailDatabaseService.listProducts(workspaceId);
      const text = message.messageText;

      // Extract requested products from message text
      const extractedItems: Array<{
        product: any;
        quantity: number;
      }> = [];

      // Simple regex-based product matching against catalogue
      for (const prod of products) {
        const prodNameRegex = new RegExp(`\\b(\\d+)?\\s*(?:bags?|units?|tins?|boxes?|pieces?|pcs?)?\\s*(${prod.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})\\b`, 'i');
        const match = text.match(prodNameRegex);
        if (match) {
          const qty = match[1] ? parseInt(match[1], 10) : 1;
          extractedItems.push({
            product: prod,
            quantity: Math.max(1, qty),
          });
        }
      }

      // If no exact name match was found, do a fuzzy word match
      if (extractedItems.length === 0 && products.length > 0) {
        const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        for (const w of words) {
          const matched = products.find((p) => p.name.toLowerCase().includes(w) || p.category?.toLowerCase().includes(w));
          if (matched && !extractedItems.some((e) => e.product.id === matched.id)) {
            extractedItems.push({ product: matched, quantity: 1 });
          }
        }
      }

      // If still nothing matched (e.g. photo of handwritten list or unlisted product)
      if (extractedItems.length === 0) {
        await this.storeQuotationDraftRecord({
          workspaceId,
          organizationId: organizationId || '00000000-0000-0000-0000-000000000000',
          customerPhone: message.senderPhone,
          customerName: message.senderName || 'WhatsApp Customer',
          rawEnquiryText: message.messageText,
          sourceMediaUrl: message.mediaUrl,
          extractedItems: [],
          status: 'AWAITING_REVIEW',
        });

        return {
          replyText:
            `📝 Thank you! Your quotation enquiry has been received and routed to our sales team for manual review.\n\n` +
            `We will inspect stock availability and send your official quotation shortly.`,
          mode: 'BUSINESS_CUSTOMER',
          workspaceId,
          organizationId,
          requiresApproval: true,
        };
      }

      // Build authoritative quote items
      let subtotal = 0;
      let taxTotal = 0;
      const quoteItems: RetailQuoteItem[] = [];

      for (const item of extractedItems) {
        const p = item.product;
        const qty = item.quantity;
        const unitPrice = Number(p.sellingPrice || 0);
        const taxRate = Number(p.vatRate || 0);
        const lineSubtotal = qty * unitPrice;
        const lineTax = lineSubtotal * (taxRate / 100);
        const lineTotal = lineSubtotal + lineTax;

        subtotal += lineSubtotal;
        taxTotal += lineTax;

        quoteItems.push({
          id: `qi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          quotationId: '',
          productId: p.id,
          description: p.name,
          quantity: qty,
          unitPrice,
          unitCost: Number(p.purchaseCost || 0),
          discountRate: 0,
          taxRate,
          lineTotal,
        });
      }

      const totalAmount = subtotal + taxTotal;
      const quoteNumber = `WQ-${Date.now().toString().slice(-6)}`;
      const quoteId = `quote_wa_${Date.now()}`;

      const quotationPayload: RetailQuotation = {
        id: quoteId,
        organizationId: organizationId || '00000000-0000-0000-0000-000000000000',
        workspaceId,
        quoteNumber,
        customerName: message.senderName || 'WhatsApp Customer',
        customerPhone: message.senderPhone,
        status: 'DRAFT',
        currency: 'USD',
        subtotal,
        taxTotal,
        discountTotal: 0,
        totalAmount,
        notes: `Prepared autonomously by Mari from WhatsApp enquiry: "${message.messageText.slice(0, 100)}"`,
        validUntil: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Persist draft in Retail database
      await RetailDatabaseService.createQuotation(quotationPayload, quoteItems);

      // Record in WhatsApp Quotation Inbox
      await this.storeQuotationDraftRecord({
        workspaceId,
        organizationId: organizationId || '00000000-0000-0000-0000-000000000000',
        customerPhone: message.senderPhone,
        customerName: message.senderName || 'WhatsApp Customer',
        rawEnquiryText: message.messageText,
        sourceMediaUrl: message.mediaUrl,
        extractedItems: quoteItems,
        retailQuotationId: quoteId,
        status: 'AWAITING_REVIEW',
      });

      const itemsSummary = quoteItems.map((qi) => `• ${qi.description} × ${qi.quantity} @ $${qi.unitPrice.toFixed(2)} = $${qi.lineTotal.toFixed(2)}`).join('\n');

      return {
        replyText:
          `📄 **Quotation Draft Prepared (${quoteNumber})**\n\n` +
          itemsSummary +
          `\n\n` +
          `Subtotal: $${subtotal.toFixed(2)}\n` +
          `Tax: $${taxTotal.toFixed(2)}\n` +
          `**Estimated Total: $${totalAmount.toFixed(2)}**\n\n` +
          `⚠️ *This estimate has been sent to our sales team for review and approval. An authorized team member will confirm delivery details shortly.*`,
        mode: 'BUSINESS_CUSTOMER',
        workspaceId,
        organizationId,
        quotationCreated: true,
        quotationNumber: quoteNumber,
        requiresApproval: true,
      };
    } catch (err: any) {
      console.error('[MariWhatsAppRouter] Error creating quotation draft:', err);
      return {
        replyText: `Your enquiry was received, but we could not prepare an automatic quotation. Our team will review your message directly.`,
        mode: 'BUSINESS_CUSTOMER',
        workspaceId,
        organizationId,
      };
    }
  }

  // =========================================================================
  // HELPER METHODS: ACCOUNT LINKING & REFERENCES
  // =========================================================================

  private static inMemoryLinks = new Map<string, {
    userId: string;
    organizationId: string;
    workspaceId: string;
    code: string;
    phone: string;
    expiresAt: number;
    userName?: string;
    organizationName?: string;
  }>();

  /**
   * Generates a 6-digit link challenge code inside Ralion Settings
   */
  static generateLinkChallenge(params: {
    userId: string;
    organizationId: string;
    workspaceId: string;
    phone: string;
    userName?: string;
    organizationName?: string;
  }): { code: string; expiresAt: string } {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    this.inMemoryLinks.set(params.phone.replace(/[^0-9+]/g, ''), {
      ...params,
      code,
      expiresAt,
    });
    this.inMemoryLinks.set(code, {
      ...params,
      code,
      expiresAt,
    });

    return { code, expiresAt: new Date(expiresAt).toISOString() };
  }

  /**
   * Validates account link challenge code sent via WhatsApp
   */
  static async verifyAccountLink(
    phone: string,
    code: string
  ): Promise<{
    success: boolean;
    userId?: string;
    organizationId?: string;
    workspaceId?: string;
    userName?: string;
    organizationName?: string;
    error?: string;
  }> {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const challenge = this.inMemoryLinks.get(code) || this.inMemoryLinks.get(cleanPhone);

    if (!challenge || challenge.code !== code) {
      return { success: false, error: 'Invalid verification code.' };
    }

    if (Date.now() > challenge.expiresAt) {
      return { success: false, error: 'Verification code has expired. Please request a new one.' };
    }

    // Persist verified link in DB if available
    try {
      const supabase = getPrivilegedSupabase();
      await supabase.from('whatsapp_account_links').upsert({
        user_id: challenge.userId,
        organization_id: challenge.organizationId,
        workspace_id: challenge.workspaceId,
        phone_number: cleanPhone,
        verification_code: code,
        status: 'VERIFIED',
        verified_at: new Date().toISOString(),
        expires_at: new Date(challenge.expiresAt).toISOString(),
      }, { onConflict: 'phone_number' });
    } catch (e) {
      // Continue even if DB table is pending migration
    }

    return {
      success: true,
      userId: challenge.userId,
      organizationId: challenge.organizationId,
      workspaceId: challenge.workspaceId,
      userName: challenge.userName,
      organizationName: challenge.organizationName,
    };
  }

  static async revokeAccountLink(phone: string): Promise<boolean> {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    this.inMemoryLinks.delete(cleanPhone);

    try {
      const supabase = getPrivilegedSupabase();
      await supabase
        .from('whatsapp_account_links')
        .update({ status: 'REVOKED' })
        .eq('phone_number', cleanPhone);
    } catch {
      // ignore table missing
    }

    return true;
  }

  private static inMemoryRefs = new Map<string, {
    organizationId: string;
    workspaceId: string;
    businessName: string;
  }>([
    ['PROINSIGHT', {
      organizationId: 'proinsight-org',
      workspaceId: 'proinsight-ws',
      businessName: 'Proinsight Hardware & Building Supplies',
    }],
    ['REF-PRO123', {
      organizationId: 'proinsight-org',
      workspaceId: 'proinsight-ws',
      businessName: 'Proinsight Hardware & Building Supplies',
    }],
  ]);

  static registerBusinessReference(refCode: string, data: { organizationId: string; workspaceId: string; businessName: string }) {
    this.inMemoryRefs.set(refCode.toUpperCase(), data);
  }

  static async resolveBusinessReference(refCode: string): Promise<{ organizationId: string; workspaceId: string; businessName: string } | null> {
    const code = refCode.toUpperCase();
    if (this.inMemoryRefs.has(code)) {
      return this.inMemoryRefs.get(code)!;
    }

    try {
      const supabase = getPrivilegedSupabase();
      const { data } = await supabase
        .from('whatsapp_business_enquiry_refs')
        .select('*')
        .eq('reference_code', code)
        .eq('is_active', true)
        .maybeSingle();

      if (data) {
        return {
          organizationId: data.organization_id,
          workspaceId: data.workspace_id,
          businessName: data.business_name,
        };
      }
    } catch {
      // ignore
    }

    return null;
  }

  private static async storeQuotationDraftRecord(record: any) {
    try {
      const supabase = getPrivilegedSupabase();
      await supabase.from('whatsapp_quotation_drafts').insert({
        organization_id: record.organizationId,
        workspace_id: record.workspaceId,
        customer_phone: record.customerPhone,
        customer_name: record.customerName,
        raw_enquiry_text: record.rawEnquiryText,
        source_media_url: record.sourceMediaUrl || null,
        extracted_items: record.extractedItems,
        retail_quotation_id: record.retailQuotationId || null,
        status: record.status || 'AWAITING_REVIEW',
      });
    } catch {
      // database table may not yet be migrated in production
    }
  }
}
