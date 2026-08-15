import { NextRequest, NextResponse } from 'next/server';
import { SocialInboxService } from '@/lib/services/social/socialInbox.service';
import { SocialPlatformType } from '@ralion/integrations';

export async function GET(request: NextRequest) {
  try {
    const provider = request.nextUrl.searchParams.get('provider') as SocialPlatformType | null;
    const userId = request.headers.get('x-user-id') || 'default-user';

    const conversations = await SocialInboxService.getConversations(userId, provider || undefined);

    return NextResponse.json({
      success: true,
      conversations,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
