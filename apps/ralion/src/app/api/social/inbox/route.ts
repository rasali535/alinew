import { NextRequest } from 'next/server';
import { SocialInboxService } from '@/lib/services/social/socialInbox.service';
import { SocialPlatformType } from '@ralion/integrations';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const provider = request.nextUrl.searchParams.get('provider') as SocialPlatformType | null;
    const userId = request.headers.get('x-user-id') || 'default-user';

    const conversations = await SocialInboxService.getConversations(userId, provider || undefined);

    return corsJsonResponse({
      success: true,
      conversations,
    }, undefined, request);
  } catch (error: any) {
    return corsJsonResponse({ success: false, error: error.message }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionId, provider, conversationId, recipientId, messageText, userId } = body;

    const result = await SocialInboxService.sendReply({
      connectionId,
      provider,
      conversationId,
      recipientId,
      messageText,
      userId: userId || 'default-user',
    });

    return corsJsonResponse({
      success: true,
      result,
    }, undefined, request);
  } catch (error: any) {
    return corsJsonResponse({ success: false, error: error.message }, { status: 500 }, request);
  }
}
