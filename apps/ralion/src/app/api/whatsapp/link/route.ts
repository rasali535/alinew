import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { MariWhatsAppRouterService } from '@/lib/services/whatsapp/mariWhatsAppRouter.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const phone = String(body.phone || '').trim();

    if (!phone) {
      return corsJsonResponse({ success: false, error: 'Phone number is required.' }, { status: 400 }, request);
    }

    const challenge = MariWhatsAppRouterService.generateLinkChallenge({
      userId: context.user.id,
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      phone,
      userName: context.user.email || 'Ralion Member',
      organizationName: context.organization.name || 'Workspace',
    });

    return corsJsonResponse({
      success: true,
      code: challenge.code,
      expiresAt: challenge.expiresAt,
      instructions: `Send "LINK ${challenge.code}" to Ralion WhatsApp (+1 202 908 7457) to verify.`,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const phone = String(body.phone || '').trim();

    if (phone) {
      await MariWhatsAppRouterService.revokeAccountLink(phone);
    }

    return corsJsonResponse({ success: true, message: 'WhatsApp number unlinked successfully.' }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
