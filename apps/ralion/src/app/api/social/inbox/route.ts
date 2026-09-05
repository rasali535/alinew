import { NextRequest } from 'next/server';
import { SocialInboxService } from '@/lib/services/social/socialInbox.service';
import { SocialPlatformType } from '@ralion/integrations';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext, authRequiredResponse } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const provider = request.nextUrl.searchParams.get('provider') as SocialPlatformType | null;
    const context = await getCurrentRalionContext(request, { requireAuth: true });
    if (!context) {
      return authRequiredResponse(request);
    }

    const conversations = await SocialInboxService.getConversations({
      userId: context.user?.id,
      workspaceId: context.workspace?.id,
      organizationId: context.workspace?.id,
      provider: provider || undefined,
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
    const { connectionId, provider, conversationId, recipientId, messageText } = body;

    if (!conversationId || !messageText) {
      return corsJsonResponse({
        success: false,
        error: 'conversationId and messageText are required parameters.',
      }, { status: 400 }, request);
    }

    const result = await SocialInboxService.sendReply({
      connectionId,
      provider,
      conversationId,
      recipientId: recipientId || conversationId,
      messageText,
      userId: context.user?.id || 'unknown',
      workspaceId: context.workspace?.id,
      organizationId: context.workspace?.id,
      senderName: context.profile?.fullName,
    });

    return corsJsonResponse({
      success: true,
      result,
    }, undefined, request);
  } catch (error: any) {
    console.error('[Social Inbox API POST] Error:', error?.message || error);
    return corsJsonResponse({
      success: false,
      error: error?.message || 'Failed to send outbound reply',
    }, { status: 500 }, request);
  }
}
