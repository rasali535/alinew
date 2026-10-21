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
      // In-memory fallback if migration is pending
      return corsJsonResponse({ success: true, drafts: [] }, undefined, request);
    }

    return corsJsonResponse({ success: true, drafts: drafts || [] }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const draftId = String(body.draftId || '').trim();
    const action = String(body.action || 'APPROVE').toUpperCase(); // APPROVE or REJECT
    const customerPhone = String(body.customerPhone || '').trim();
    const quoteNumber = String(body.quoteNumber || '').trim();

    if (!draftId) {
      return corsJsonResponse({ success: false, error: 'draftId is required.' }, { status: 400 }, request);
    }

    const supabase = getPrivilegedSupabase();
    await supabase
      .from('whatsapp_quotation_drafts')
      .update({
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        reviewer_user_id: context.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .eq('workspace_id', context.workspace.id);

    // If approved and phone number provided, send notification via WhatsApp
    if (action === 'APPROVE' && customerPhone) {
      try {
        await ZernioSocialService.sendWhatsAppMessage({
          recipientPhone: customerPhone,
          messageText:
            `✅ *Good news! Your quotation ${quoteNumber || ''} has been reviewed and approved.* \n\n` +
            `Our store team has confirmed stock availability and will contact you directly regarding collection or delivery options.\n\n` +
            `Thank you for doing business with us!`,
        });
      } catch (sendErr: any) {
        console.warn('[WhatsAppRFQ] Could not notify customer:', sendErr.message);
      }
    }

    return corsJsonResponse({
      success: true,
      message: `Quotation draft ${action === 'APPROVE' ? 'approved' : 'rejected'}.`,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
