import { NextRequest } from 'next/server';
import { SocialInboxService } from '@/lib/services/social/socialInbox.service';
import { SocialPlatformType } from '@ralion/integrations';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext, authRequiredResponse } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';
const INBOX_PROVIDERS = new Set<SocialPlatformType>(['facebook', 'instagram', 'whatsapp', 'linkedin', 'x']);

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const rawProvider = request.nextUrl.searchParams.get('provider')?.trim().toLowerCase();
    if (rawProvider && !INBOX_PROVIDERS.has(rawProvider as SocialPlatformType)) {
      return corsJsonResponse({ success: false, error: 'INVALID_PROVIDER', conversations: [] }, { status: 400 }, request);
    }
    const provider = rawProvider as SocialPlatformType | undefined;
    const context = await getCurrentRalionContext(request, { requireAuth: true });
    if (!context) {
      return authRequiredResponse(request);
    }

    const conversations = await SocialInboxService.getConversations({
      userId: context.user?.id,
      workspaceId: context.workspace?.id,
      organizationId: context.organization?.id || context.workspace?.organization_id || undefined,
      provider,
    });

    return corsJsonResponse({
      success: true,
      conversations: Array.isArray(conversations) ? conversations : [],
    }, undefined, request);
  } catch (error: any) {
    console.error('[Social Inbox API GET] Error:', error?.message || error);
    return corsJsonResponse({
      success: false,
      error: error?.message || 'Failed to retrieve social inbox conversations',
      conversations: [],
    }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getCurrentRalionContext(request, { requireAuth: true });
    if (!context) {
      return authRequiredResponse(request);
    }

    const body = await request.json().catch(() => ({}));
    const { connectionId, conversationId, recipientId, messageText } = body;
    const provider = typeof body.provider === 'string' ? body.provider.trim().toLowerCase() : 'facebook';

    if (!INBOX_PROVIDERS.has(provider as SocialPlatformType)) {
      return corsJsonResponse({ success: false, error: 'INVALID_PROVIDER' }, { status: 400 }, request);
    }
    if (typeof conversationId !== 'string' || !conversationId.trim() || typeof messageText !== 'string' || !messageText.trim()) {
      return corsJsonResponse({
        success: false,
        error: 'conversationId and messageText are required parameters.',
      }, { status: 400 }, request);
    }
    if (messageText.trim().length > 2000) {
      return corsJsonResponse({ success: false, error: 'MESSAGE_TOO_LONG' }, { status: 400 }, request);
    }

    const result = await SocialInboxService.sendReply({
      connectionId,
      provider: provider as SocialPlatformType,
      conversationId: conversationId.trim(),
      recipientId: typeof recipientId === 'string' && recipientId.trim() ? recipientId.trim() : conversationId.trim(),
      messageText: messageText.trim(),
      userId: context.user?.id || 'unknown',
      workspaceId: context.workspace?.id,
      organizationId: context.organization?.id || context.workspace?.organization_id || undefined,
      senderName: context.profile?.fullName,
    });

    return corsJsonResponse({
      success: true,
      result,
    }, undefined, request);
  } catch (error: any) {
    const status = Number(error?.statusCode || error?.status) || 500;
    const publicCode = ['TENANT_CONTEXT_REQUIRED', 'SOCIAL_CONNECTION_REQUIRED'].includes(error?.code)
      ? error.code
      : 'SOCIAL_INBOX_SEND_FAILED';
    console.error('[Social Inbox API POST] Error:', { status, code: publicCode });
    return corsJsonResponse({
      success: false,
      error: publicCode,
    }, { status }, request);
  }
}
