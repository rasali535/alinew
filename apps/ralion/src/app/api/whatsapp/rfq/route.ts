import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getPrivilegedSupabase } from '@/lib/supabase/server';
import { ZernioSocialService } from '@ralion/integrations/server';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const supabase = getPrivilegedSupabase();
    const { data: drafts, error } = await supabase
      .from('whatsapp_quotation_drafts')
      .select('*')
      .eq('workspace_id', context.workspace.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return corsJsonResponse({ success: true, drafts: [] }, undefined, request);
    }

    return corsJsonResponse({ success: true, drafts: drafts || [] }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

/**
 * Authoritative Server-Side RFQ Approval and Dispatch
 * Enforces role permissions, draft ownership, atomic status transitions, and authoritative draft-backed data.
 */
export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    // 1. Enforce Server-Side Retail Approval Permissions (OWNER, ADMIN, MANAGER)
    const userRole = (context.membership?.role || '').toUpperCase();
    const allowedRoles = new Set(['OWNER', 'ADMIN', 'MANAGER']);
    if (!allowedRoles.has(userRole)) {
      return corsJsonResponse({
        success: false,
        error: 'FORBIDDEN: You do not have permission to approve or reject retail quotation drafts.',
      }, { status: 403 }, request);
    }

    const body = await request.json().catch(() => ({}));
    const draftId = String(body.draftId || '').trim();
    const action = String(body.action || 'APPROVE').toUpperCase();

    if (!draftId) {
      return corsJsonResponse({ success: false, error: 'draftId is required.' }, { status: 400 }, request);
    }

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return corsJsonResponse({ success: false, error: 'Invalid action. Must be APPROVE or REJECT.' }, { status: 400 }, request);
    }

    const supabase = getPrivilegedSupabase();

    // 2. Retrieve authoritative saved draft scoped strictly to workspace
    const { data: draft, error: fetchErr } = await supabase
      .from('whatsapp_quotation_drafts')
      .select('*')
      .eq('id', draftId)
      .eq('workspace_id', context.workspace.id)
      .maybeSingle();

    if (fetchErr || !draft) {
      return corsJsonResponse({
        success: false,
        error: 'Quotation draft not found in this workspace.',
      }, { status: 404 }, request);
    }

    // 3. Validate status & prevent duplicate approval / replay transitions
    if (draft.status !== 'AWAITING_REVIEW') {
      return corsJsonResponse({
        success: false,
        error: `INVALID_STATUS_TRANSITION: Draft status is currently ${draft.status}. Only AWAITING_REVIEW drafts may be approved or rejected.`,
      }, { status: 409 }, request);
    }

    const nextStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    // 4. Atomic status transition: update only if still AWAITING_REVIEW
    const { data: updatedDraft, error: updateErr } = await supabase
      .from('whatsapp_quotation_drafts')
      .update({
        status: nextStatus,
        reviewer_user_id: context.user.id,
        reviewed_at: new Date().toISOString(),
        notes: body.notes || draft.notes || null,
      })
      .eq('id', draftId)
      .eq('workspace_id', context.workspace.id)
      .eq('status', 'AWAITING_REVIEW')
      .select('id, status, customer_phone, retail_quotation_id')
      .maybeSingle();

    if (updateErr || !updatedDraft) {
      return corsJsonResponse({
        success: false,
        error: 'Draft state changed concurrently or update failed. Duplicate send prevented.',
      }, { status: 409 }, request);
    }

    // 5. If approved, resolve authoritative quotation from database (Never trust caller-supplied values)
    let authoritativeQuoteNumber = '';
    if (draft.retail_quotation_id) {
      const { data: rQuote } = await supabase
        .from('retail_quotations')
        .select('id, quote_number, total_amount, currency')
        .eq('id', draft.retail_quotation_id)
        .eq('workspace_id', context.workspace.id)
        .maybeSingle();

      if (rQuote) {
        authoritativeQuoteNumber = rQuote.quote_number || '';
        // Update retail quotation status to SENT
        if (action === 'APPROVE') {
          await supabase
            .from('retail_quotations')
            .update({ status: 'SENT', updated_at: new Date().toISOString() })
            .eq('id', rQuote.id);
        }
      }
    }

    // 6. Send Customer Notification via WhatsApp using draft-backed customer phone
    const destinationPhone = draft.customer_phone;
    if (action === 'APPROVE' && destinationPhone) {
      try {
        const quoteRefText = authoritativeQuoteNumber ? ` (${authoritativeQuoteNumber})` : '';
        const sendResult = await ZernioSocialService.sendWhatsAppMessage({
          recipientPhone: destinationPhone,
          messageText:
            `✅ *Good news! Your quotation${quoteRefText} has been reviewed and approved.*\n\n` +
            `Our store team has confirmed stock availability and will contact you directly regarding collection or delivery options.\n\n` +
            `Thank you for doing business with us!`,
        });

        // Record delivery record if conversation ref exists
        if (draft.conversation_id && sendResult.success) {
          await supabase.from('whatsapp_messages').insert({
            conversation_ref: draft.conversation_id,
            provider_message_id: sendResult.messageId || `out_appr_${Date.now()}`,
            direction: 'OUTBOUND',
            sender_phone: process.env.WHATSAPP_CENTRAL_NUMBER || '+12029087457',
            recipient_phone: destinationPhone,
            message_text: `Quotation${quoteRefText} approved and sent to customer.`,
            status: 'SENT',
          });
        }
      } catch (sendErr: any) {
        console.warn('[WhatsAppRFQ] Could not notify customer via WhatsApp:', sendErr.message);
      }
    }

    return corsJsonResponse({
      success: true,
      status: nextStatus,
      message: `Quotation draft ${nextStatus.toLowerCase()} successfully.`,
      quoteNumber: authoritativeQuoteNumber || undefined,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
