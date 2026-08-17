import { NextRequest, NextResponse } from 'next/server';
import { FacebookCommentsService } from '@/lib/services/social/facebookComments.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId') || undefined;
    const pageId = searchParams.get('pageId') || '477334159265235';

    const comments = await FacebookCommentsService.getComments({
      postId,
      pageId,
    });

    return NextResponse.json({
      success: true,
      comments,
      total: comments.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load comments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commentId, postId, replyText, userId } = body;

    if (!commentId || !replyText) {
      return NextResponse.json(
        { success: false, error: 'commentId and replyText are required.' },
        { status: 400 }
      );
    }

    const reply = await FacebookCommentsService.replyToComment({
      commentId,
      postId: postId || '477334159265235_1685926583538664',
      replyText,
      userId,
    });

    return NextResponse.json({
      success: true,
      reply,
      message: 'Reply posted successfully as Ras Ali Labs.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to post reply' },
      { status: 500 }
    );
  }
}
