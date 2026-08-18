import { NextRequest } from 'next/server';
import { SocialInboxService } from '@/lib/services/social/socialInbox.service';
import { SocialPlatformType } from '@ralion/integrations';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const provider = request.nextUrl.searchParams.get('provider') as SocialPlatformType | null;
    const context = await getCurrentRalionContext(request, { requireAuth: false });
    const orgId = context?.workspace.id || request.headers.get('x-organization-id') || undefined;
    const userId = context?.user.id || request.headers.get('x-user-id') || undefined;
    const workspaceId = context?.workspace.id || request.headers.get('x-workspace-id') || undefined;

    const conversations = await SocialInboxService.getConversations({
      userId,
      workspaceId,
      organizationId: orgId,
      provider: provider || undefined,
    });

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
    const context = await getCurrentRalionContext(request, { requireAuth: false });
    const activeUserId = context?.user.id || request.headers.get('x-user-id') || userId || 'default-user';

    const result = await SocialInboxService.sendReply({
      connectionId,
      provider,
      conversationId,
      recipientId,
      messageText,
      userId: activeUserId,
    });

    return corsJsonResponse({
      success: true,
      result,
    }, undefined, request);
  } catch (error: any) {
    return corsJsonResponse({ success: false, error: error.message }, { status: 500 }, request);
  }
}
