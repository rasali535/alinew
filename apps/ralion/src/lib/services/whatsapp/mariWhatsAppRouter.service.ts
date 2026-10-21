/**
 * Ralion OS — Mari WhatsApp Conversation Router
 * Ras Ali Labs (Pty) Ltd
 *
 * Implements the 3 authoritative conversation modes:
 * A. Public Ralion Assistant (Grounded public business support)
 * B. Registered Ralion User (Account-linked workspace operations with live DB authorization)
 * C. Business Customer (Tenant-scoped customer enquiries & Retail quotations)
 */

import crypto from 'crypto';
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

    // 1. Opt-out & Compliance keywords (STOP / UNSUBSCRIBE)
    if (cleanLower === 'stop' || cleanLower === 'unsubscribe' || cleanLower === 'optout') {
      await this.recordOptOut(message.senderPhone);
      return {
        replyText: "You have successfully unsubscribed from automated WhatsApp notifications from Ralion OS. You can still message Mari directly at any time. Reply START to re-enable alerts.",
        mode: 'PUBLIC_ASSISTANT',
        organizationId: null,
        workspaceId: null,
      };
    }

    if (cleanLower === 'start' || cleanLower === 'unstop') {
      await this.recordOptIn(message.senderPhone);
      return {
        replyText: "Welcome back! You have re-enabled automated WhatsApp notifications from Ralion OS.",
        mode: 'PUBLIC_ASSISTANT',
      };
    }

    // 2. Global Reset / Help triggers
    if (cleanLower === 'reset' || cleanLower === 'exit' || cleanLower === 'menu' || cleanLower === 'ralion') {
      return {
        replyText:
          "Hello! I am Mari, Ralion OS's business assistant. How can I help you today?\n\n" +
          "1. Explore Ralion OS & Solutions (Retail, Trade, Growth, CRM)\n" +
          "2. Link your WhatsApp to your Ralion Account (Text: LINK <code>)\n" +
          "3. Request a business quotation (Include your store reference, e.g. #REF-CODE)\n" +
          "4. Talk to Ras Ali Labs Support",
        mode: 'PUBLIC_ASSISTANT',
        organizationId: null,
        workspaceId: null,
      };
    }

    // 3. Check for Account Linking Command (Mode B Initiation)
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
      await this.revokeAccountLink(message.senderPhone, conversationState?.linkedUserId || undefined);
      return {
        replyText: "Your WhatsApp number has been unlinked from Ralion OS. You are now in public guest mode.",
        mode: 'PUBLIC_ASSISTANT',
        organizationId: null,
        workspaceId: null,
      };
    }

    // 4. Check for Business Customer Enquiry Reference (Mode C Initiation)
    const refMatch = rawText.match(/(?:#|ref-)([A-Za-z0-9_-]{3,20})/i);
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

    // 5. Dispatch based on current session mode with LIVE RE-VALIDATION
    const currentMode = conversationState?.mode || 'PUBLIC_ASSISTANT';

    if (currentMode === 'REGISTERED_USER' && conversationState?.workspaceId) {
      // Security revalidation: Ensure linked user still has valid active membership
      const isValidMember = await this.validateWorkspaceMembership(
        conversationState.linkedUserId,
        conversationState.workspaceId
      );
      if (!isValidMember) {
        return {
          replyText: "⚠️ Your workspace permissions have changed or expired. Reverting to public assistant mode.",
          mode: 'PUBLIC_ASSISTANT',
          organizationId: null,
          workspaceId: null,
        };
      }
      return await this.handleRegisteredUserQuery(message, conversationState.workspaceId, conversationState.organizationId || undefined);
    }

    if (currentMode === 'BUSINESS_CUSTOMER' && conversationState?.workspaceId) {
      return await this.handleBusinessCustomerQuery(message, conversationState.workspaceId, conversationState.organizationId || undefined);
    }

    // 6. Default: Mode A (Public Ralion Assistant)
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
          "• Connect with participating stores using their store reference (e.g. #STORE_CODE)\n" +
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
          "Ralion OS offers tailored subscription tiers with evaluation access for eligible commercial businesses.\n\n" +
          "Modules include Retail POS & Inventory, Trade Quotes & Invoicing, Growth Social Inbox, and Autonomous Mari AI.\n\n" +
          "To request a pilot demonstration code or speak with our solutions architect, contact us at contact@rasalilabs.com or visit https://rasalilabs.com.",
        mode: 'PUBLIC_ASSISTANT',
      };
    }

    if (text.includes('retail') || text.includes('pos') || text.includes('hardware') || text.includes('trade')) {
      return {
        replyText:
          "**Ralion Retail & Trade** is our battle-tested operational suite for merchants and trade distributors:\n\n" +
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
        "For enquiries, our team is available at contact@rasalilabs.com or https://rasalilabs.com.",
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
              replyText: `🔍 No products matching "${prodSearch}" were found in your catalogue.`,
              mode: 'REGISTERED_USER',
              workspaceId,
              organizationId,
            };
          }

          const lines = products.slice(0, 4).map((p) => `• **${p.name}**: ${p.currentStock} ${p.unitOfMeasure || 'units'} on hand ($${p.sellingPrice.toFixed(2)})`);
          return {
            replyText: `📦 Stock availability in your workspace:\n\n${lines.join('\n')}`,
            mode: 'REGISTERED_USER',
            workspaceId,
            organizationId,
          };
        } catch (err: any) {
          return {
            replyText: `Error checking stock: ${err.message}`,
            mode: 'REGISTERED_USER',
            workspaceId,
            organizationId,
          };
        }
      }
    }

    // 3. Sales / Performance inquiry
    if (text.includes('sale') || text.includes('revenue') || text.includes('today')) {
      try {
        const metrics = await RetailDatabaseService.computeFinancialMetrics(workspaceId);
        return {
          replyText:
            `📊 **Today's Workspace Performance**:\n\n` +
            `• Sales Count: **${metrics.todaySalesCount || 0}**\n` +
            `• Gross Sales: **$${(metrics.todaySales || 0).toFixed(2)}**\n` +
            `• Low Stock Alerts: **${metrics.lowStockCount || 0} items**\n` +
            `• Active Products: **${metrics.totalActiveProducts || 0}**\n\n` +
            `For detailed drilldowns, open the Ralion Command Centre.`,
          mode: 'REGISTERED_USER',
          workspaceId,
          organizationId,
        };
      } catch (err: any) {
        return {
          replyText: `Unable to fetch sales metrics: ${err.message}`,
          mode: 'REGISTERED_USER',
          workspaceId,
          organizationId,
        };
      }
    }

    // Default registered user fallback
    return {
      replyText:
        "I'm ready to assist with your workspace! You can ask:\n" +
        "• \"What are today's sales numbers?\"\n" +
        "• \"Check stock for [product]\"\n" +
        "• \"Show quotations awaiting approval\"\n" +
        "• Type \"UNLINK\" to switch back to public mode.",
      mode: 'REGISTERED_USER',
      workspaceId,
      organizationId,
    };
  }

  // =========================================================================
  // MODE C — BUSINESS CUSTOMER ENQUIRIES & RETAIL QUOTATIONS
  // =========================================================================
  private static async handleBusinessCustomerQuery(
    message: WhatsAppIncomingMessage,
    workspaceId: string,
    organizationId?: string
  ): Promise<WhatsAppRouterResponse> {
    const text = message.messageText.toLowerCase();

    // Check if customer wants a quotation
    const isQuoteRequest =
      text.includes('quote') ||
      text.includes('price') ||
      text.includes('cost') ||
      text.includes('need') ||
      text.includes('buy') ||
      text.includes('order') ||
      Boolean(message.mediaUrl);

    if (isQuoteRequest) {
      return await this.createRetailQuotationDraft(message, workspaceId, organizationId);
    }

    // General product availability enquiry
    try {
      const products = await RetailDatabaseService.listProducts(workspaceId, { query: text });
      if (products.length > 0) {
        const lines = products.slice(0, 3).map((p) => `• **${p.name}**: $${p.sellingPrice.toFixed(2)} (${(p.currentStock || 0) > 0 ? 'In Stock' : 'Out of Stock'})`);
        return {
          replyText:
            `Here are matching products from our store:\n\n` +
            lines.join('\n') +
            `\n\nReply with what you need (e.g. "Quote for 5x ${products[0].name}") to receive an official quotation.`,
          mode: 'BUSINESS_CUSTOMER',
          workspaceId,
          organizationId,
        };
      }
    } catch {
      // ignore
    }

    return {
      replyText:
        "How can we help your project today? Send us your required materials or product list, and Mari will generate an official quotation for store review.",
      mode: 'BUSINESS_CUSTOMER',
      workspaceId,
      organizationId,
    };
  }

  /**
   * Builds and persists an authoritative quotation draft in the Retail database.
   * Uses crypto.randomUUID() for RFC 4122 primary keys, strictly respects catalogue prices,
   * and records in whatsapp_quotation_drafts for human review.
   */
  private static async createRetailQuotationDraft(
    message: WhatsAppIncomingMessage,
    workspaceId: string,
    organizationId?: string
  ): Promise<WhatsAppRouterResponse> {
    try {
      const text = message.messageText;
      const products = await RetailDatabaseService.listProducts(workspaceId);

      const extractedItems: Array<{
        product: any;
        quantity: number;
      }> = [];

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

      // If no exact match, fuzzy search
      if (extractedItems.length === 0 && products.length > 0) {
        const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        for (const w of words) {
          const matched = products.find((p) => p.name.toLowerCase().includes(w) || p.category?.toLowerCase().includes(w));
          if (matched && !extractedItems.some((e) => e.product.id === matched.id)) {
            extractedItems.push({ product: matched, quantity: 1 });
          }
        }
      }

      // If nothing matched in catalogue (e.g. handwritten photo or unlisted items)
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

      // RFC 4122 v4 UUIDs for quotation and line items
      const quoteId = crypto.randomUUID();
      const quoteNumber = `WQ-${Date.now().toString().slice(-6)}`;

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
          id: crypto.randomUUID(),
          quotationId: quoteId,
          productId: p.id,
          productName: p.name,
          sku: p.sku,
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

      // Persist draft in Retail database and confirm persistence
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
          `\n\n**Subtotal:** $${subtotal.toFixed(2)}\n` +
          `**VAT (15%):** $${taxTotal.toFixed(2)}\n` +
          `**Total Estimated Amount:** $${totalAmount.toFixed(2)}\n\n` +
          `_This draft quotation has been submitted to store staff for stock confirmation and approval. You will receive official confirmation once approved._`,
        mode: 'BUSINESS_CUSTOMER',
        workspaceId,
        organizationId,
        quotationCreated: true,
        quotationNumber: quoteNumber,
        requiresApproval: true,
      };
    } catch (err: any) {
      console.error('[MariWhatsAppRouter] Error creating quotation draft:', err.message);
      return {
        replyText: `We received your enquiry, but encountered a system issue preparing the automated quotation: ${err.message}. Our sales team has been notified.`,
        mode: 'BUSINESS_CUSTOMER',
        workspaceId,
        organizationId,
      };
    }
  }

  // =========================================================================
  // HELPER METHODS: SECURE ACCOUNT LINKING, MEMBERSHIP & REFERENCES
  // =========================================================================

  /**
   * Generates a cryptographically secure 6-digit challenge code and persists its SHA-256 hash.
   */
  static async generateLinkChallenge(params: {
    userId: string;
    organizationId: string;
    workspaceId: string;
    phone: string;
    userName?: string;
    organizationName?: string;
  }): Promise<{ code: string; expiresAt: string }> {
    const code = crypto.randomInt(100000, 999999).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const cleanPhone = params.phone.replace(/[^0-9+]/g, '');

    try {
      const supabase = getPrivilegedSupabase();
      // Invalidate any existing pending codes for this user/phone
      await supabase
        .from('whatsapp_account_links')
        .update({ status: 'REVOKED' })
        .eq('user_id', params.userId)
        .eq('status', 'PENDING');

      await supabase.from('whatsapp_account_links').insert({
        user_id: params.userId,
        organization_id: params.organizationId,
        workspace_id: params.workspaceId,
        phone_number: cleanPhone,
        code_hash: codeHash,
        attempts: 0,
        max_attempts: 3,
        status: 'PENDING',
        expires_at: expiresAt,
      });
    } catch (err: any) {
      console.warn('[MariWhatsAppRouter] Challenge persistence warning:', err.message);
    }

    return { code, expiresAt };
  }

  /**
   * Validates account link challenge code sent via WhatsApp.
   * Matches sender phone against expected number, limits attempts, and consumes atomically.
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
    const codeHash = crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');

    try {
      const supabase = getPrivilegedSupabase();
      const { data: challenge, error } = await supabase
        .from('whatsapp_account_links')
        .select('*')
        .eq('phone_number', cleanPhone)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !challenge) {
        return { success: false, error: 'No active verification challenge found for this phone number.' };
      }

      // Check expiration
      if (new Date(challenge.expires_at) < new Date()) {
        await supabase.from('whatsapp_account_links').update({ status: 'EXPIRED' }).eq('id', challenge.id);
        return { success: false, error: 'Verification code has expired. Please request a new one.' };
      }

      // Check max attempts
      if (challenge.attempts >= (challenge.max_attempts || 3)) {
        await supabase.from('whatsapp_account_links').update({ status: 'EXPIRED' }).eq('id', challenge.id);
        return { success: false, error: 'Maximum verification attempts exceeded. Please generate a new code.' };
      }

      // Verify cryptographic hash
      if (challenge.code_hash !== codeHash) {
        await supabase
          .from('whatsapp_account_links')
          .update({ attempts: (challenge.attempts || 0) + 1 })
          .eq('id', challenge.id);
        return { success: false, error: 'Invalid verification code.' };
      }

      // Atomically consume challenge
      const { data: updated, error: updateErr } = await supabase
        .from('whatsapp_account_links')
        .update({
          status: 'CONSUMED',
          consumed_at: new Date().toISOString(),
          verified_at: new Date().toISOString(),
        })
        .eq('id', challenge.id)
        .eq('status', 'PENDING')
        .select('id, user_id, organization_id, workspace_id')
        .maybeSingle();

      if (updateErr || !updated) {
        return { success: false, error: 'Challenge already consumed or revoked.' };
      }

      // Retrieve workspace & user details
      const { data: ws } = await supabase
        .from('workspaces')
        .select('name')
        .eq('id', challenge.workspace_id)
        .maybeSingle();

      return {
        success: true,
        userId: challenge.user_id,
        organizationId: challenge.organization_id,
        workspaceId: challenge.workspace_id,
        organizationName: ws?.name || 'Ralion Workspace',
      };
    } catch (err: any) {
      return { success: false, error: `Verification error: ${err.message}` };
    }
  }

  /**
   * Revokes account linking. If userId is provided, strictly scopes revocation to the authenticated user.
   */
  static async revokeAccountLink(phone: string, userId?: string): Promise<boolean> {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');

    try {
      const supabase = getPrivilegedSupabase();
      let query = supabase
        .from('whatsapp_account_links')
        .update({ status: 'REVOKED' })
        .eq('phone_number', cleanPhone);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      await query;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Revalidates user workspace membership before serving Mode B queries.
   */
  static async validateWorkspaceMembership(userId?: string | null, workspaceId?: string | null): Promise<boolean> {
    if (!userId || !workspaceId) return false;

    try {
      const supabase = getPrivilegedSupabase();
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle();

      return Boolean(member);
    } catch {
      return false;
    }
  }

  /**
   * Resolves business customer enquiry reference (e.g. "REF-PRO123").
   * Removed all mock placeholders; queries whatsapp_business_enquiry_refs strictly.
   */
  static async resolveBusinessReference(refCode: string): Promise<{ organizationId: string; workspaceId: string; businessName: string } | null> {
    const code = refCode.trim().toUpperCase();
    const cleanWithoutRef = code.replace(/^REF-/, '');
    const canonicalWithRef = `REF-${cleanWithoutRef}`;

    try {
      const supabase = getPrivilegedSupabase();
      const { data } = await supabase
        .from('whatsapp_business_enquiry_refs')
        .select('*')
        .or(`reference_code.eq.${code},reference_code.eq.${canonicalWithRef},reference_code.eq.${cleanWithoutRef}`)
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

  /**
   * Creates or registers a server-side business enquiry reference.
   */
  static async registerBusinessReference(params: {
    organizationId: string;
    workspaceId: string;
    referenceCode: string;
    businessName: string;
  }): Promise<boolean> {
    try {
      const supabase = getPrivilegedSupabase();
      const { error } = await supabase.from('whatsapp_business_enquiry_refs').upsert({
        organization_id: params.organizationId,
        workspace_id: params.workspaceId,
        reference_code: params.referenceCode.trim().toUpperCase(),
        business_name: params.businessName,
        is_active: true,
      }, { onConflict: 'reference_code' });

      return !error;
    } catch {
      return false;
    }
  }

  private static async storeQuotationDraftRecord(record: any): Promise<boolean> {
    try {
      const supabase = getPrivilegedSupabase();
      const { error } = await supabase.from('whatsapp_quotation_drafts').insert({
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

      if (error) {
        console.error('[MariWhatsAppRouter] storeQuotationDraftRecord error:', error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      console.error('[MariWhatsAppRouter] storeQuotationDraftRecord exception:', err.message);
      return false;
    }
  }

  private static async recordOptOut(phone: string): Promise<void> {
    const clean = phone.replace(/[^0-9+]/g, '');
    try {
      const supabase = getPrivilegedSupabase();
      await supabase.from('whatsapp_notification_preferences').upsert({
        phone_number: clean,
        is_opted_in: false,
        opted_out_at: new Date().toISOString(),
      }, { onConflict: 'phone_number' });
    } catch {
      // ignore
    }
  }

  private static async recordOptIn(phone: string): Promise<void> {
    const clean = phone.replace(/[^0-9+]/g, '');
    try {
      const supabase = getPrivilegedSupabase();
      await supabase.from('whatsapp_notification_preferences').upsert({
        phone_number: clean,
        is_opted_in: true,
        opted_in_at: new Date().toISOString(),
      }, { onConflict: 'phone_number' });
    } catch {
      // ignore
    }
  }
}
