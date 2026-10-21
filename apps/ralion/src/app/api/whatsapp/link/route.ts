import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { MariWhatsAppRouterService } from '@/lib/services/whatsapp/mariWhatsAppRouter.service';
import { getPrivilegedSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * Generates a secure, expiring WhatsApp verification code for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const phone = String(body.phone || '').trim();

    if (!phone) {
      return corsJsonResponse({ success: false, error: 'Phone number is required.' }, { status: 400 }, request);
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 8) {
      return corsJsonResponse({ success: false, error: 'Valid E.164 phone number required.' }, { status: 400 }, request);
    }

    const challenge = await MariWhatsAppRouterService.generateLinkChallenge({
      userId: context.user.id,
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      phone: cleanPhone,
      userName: context.user.email || 'Ralion Member',
      organizationName: context.workspace.name || context.organization.name || 'Workspace',
    });

    const centralNumber = process.env.WHATSAPP_CENTRAL_NUMBER || '+1 202 908 7457';

    return corsJsonResponse({
      success: true,
      code: challenge.code,
      expiresAt: challenge.expiresAt,
      instructions: `Send "LINK ${challenge.code}" to Ralion WhatsApp (${centralNumber}) to verify.`,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

/**
 * Scopes unlink operations strictly to the authenticated user's own verified links.
 * Prevents arbitrary unlinking of other users' numbers.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const requestedPhone = String(body.phone || '').trim().replace(/[^0-9+]/g, '');

    const supabase = getPrivilegedSupabase();

    // Verify ownership: Find link belonging to this authenticated user
    let query = supabase
      .from('whatsapp_account_links')
      .select('id, phone_number')
      .eq('user_id', context.user.id)
      .eq('workspace_id', context.workspace.id)
      .neq('status', 'REVOKED');

    if (requestedPhone) {
      query = query.eq('phone_number', requestedPhone);
    }

    const { data: userLinks, error: listError } = await query;

    if (listError || !userLinks || userLinks.length === 0) {
      return corsJsonResponse({
        success: false,
        error: 'No active WhatsApp link found for your account in this workspace.',
      }, { status: 404 }, request);
    }

    // Revoke only the user's own verified links
    for (const link of userLinks) {
      await MariWhatsAppRouterService.revokeAccountLink(link.phone_number, context.user.id);
    }

    return corsJsonResponse({
      success: true,
      message: 'WhatsApp number unlinked successfully from your account.',
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
