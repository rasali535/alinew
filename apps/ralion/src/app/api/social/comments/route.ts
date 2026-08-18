import { NextRequest } from 'next/server';
import { FacebookCommentsService } from '@/lib/services/social/facebookComments.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId') || undefined;
    const pageId = searchParams.get('pageId') || undefined;

    const comments = await FacebookCommentsService.getComments({
      postId,
      pageId,
    });

    return corsJsonResponse({
      success: true,
      comments,
      total: comments.length,
    }, undefined, request);
  } catch (error: any) {
    return corsJsonResponse(
      { success: false, error: error.message || 'Failed to load comments' },
      { status: 500 },
      request
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commentId, postId, replyText, userId, authorName, pageId } = body;

    if (!commentId || !replyText) {
      return corsJsonResponse(
        { success: false, error: 'commentId and replyText are required.' },
        { status: 400 },
        request
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

    return corsJsonResponse({
      success: true,
      reply,
      message: 'Reply posted successfully.',
    }, undefined, request);
  } catch (error: any) {
    return corsJsonResponse(
      { success: false, error: error.message || 'Failed to post reply' },
      { status: 500 },
      request
    );
  }
}
