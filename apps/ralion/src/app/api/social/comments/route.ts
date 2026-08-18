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

    if (!commentId || !replyText?.trim()) {
      return corsJsonResponse(
        {
          success: false,
          provider: 'zernio',
          platform: 'facebook',
          error: 'commentId and replyText are required.',
          statusCode: 400,
        },
        { status: 400 },
        request
      );
    }

    const orgId = request.headers.get('x-organization-id') || 'default-org';
    const activeUserId = request.headers.get('x-user-id') || userId || 'default-user';

    const reply = await FacebookCommentsService.replyToComment({
      commentId,
      postId: postId || commentId.split('_')[0] || 'default_post',
      replyText: replyText.trim(),
      userId: activeUserId,
      authorName,
      pageId,
      organizationId: orgId,
    });

    return corsJsonResponse({
      success: true,
      provider: 'zernio',
      platform: 'facebook',
      postId: reply.postId,
      commentId: reply.commentId,
      replyId: reply.externalReplyId,
      reply,
      message: 'Reply posted successfully to Facebook.',
    }, undefined, request);
  } catch (error: any) {
    const status = error.status || error.statusCode || 500;
    const mappedStatus = (status >= 400 && status < 600) ? status : 500;

    return corsJsonResponse(
      {
        success: false,
        provider: 'zernio',
        platform: 'facebook',
        error: error.message || 'Failed to post reply to Facebook.',
        statusCode: mappedStatus,
      },
      { status: mappedStatus },
      request
    );
  }
}
