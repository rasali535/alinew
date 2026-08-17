import { NextRequest, NextResponse } from 'next/server';
import { FacebookCommentsService } from '@/lib/services/social/facebookComments.service';

export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId') || undefined;
    const pageId = searchParams.get('pageId') || undefined;

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
    const { commentId, postId, replyText, userId, authorName, pageId } = body;

    if (!commentId || !replyText) {
      return NextResponse.json(
        { success: false, error: 'commentId and replyText are required.' },
        { status: 400 }
      );
    }

    const reply = await FacebookCommentsService.replyToComment({
      commentId,
      postId: postId || 'post_default',
      replyText,
      userId,
      authorName,
      pageId,
    });

    return NextResponse.json({
      success: true,
      reply,
      message: 'Reply posted successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to post reply' },
      { status: 500 }
    );
  }
}
