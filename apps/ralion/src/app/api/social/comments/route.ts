import { NextRequest } from 'next/server';
import { FacebookCommentsService } from '@/lib/services/social/facebookComments.service';
import { InstagramCommentsService } from '@/lib/services/social/instagramComments.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext, authRequiredResponse } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId') || undefined;
    const pageId = searchParams.get('pageId') || undefined;
    const provider = (searchParams.get('provider') || 'facebook').trim().toLowerCase();
    const connectionId = searchParams.get('connectionId') || undefined;

    const context = await getCurrentRalionContext(request, { requireAuth: true });
    if (!context) {
      return authRequiredResponse(request);
    }

    if (provider === 'instagram') {
      if (!connectionId || !postId) {
        return corsJsonResponse(
          { success: false, error: 'connectionId and Instagram media postId are required.', comments: [] },
          { status: 400 },
          request
        );
      }
      const comments = await InstagramCommentsService.getComments({
        connectionId,
        postId,
        organizationId: context.organization?.id || context.workspace.id,
        workspaceId: context.workspace.id,
        userId: context.user.id,
      });
      return corsJsonResponse({
        success: true,
        provider: 'instagram',
        comments,
        total: comments.length,
      }, undefined, request);
    }

    const comments = await FacebookCommentsService.getComments({
      postId,
      pageId,
      organizationId: context.organization?.id || context.workspace.id,
      workspaceId: context.workspace.id,
      userId: context.user.id,
    });

    return corsJsonResponse({
      success: true,
      provider: 'facebook',
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
    const context = await getCurrentRalionContext(request, { requireAuth: true });
    if (!context) {
      return authRequiredResponse(request);
    }

    const body = await request.json();
    const { commentId, postId, replyText, authorName, pageId, connectionId } = body;
    const provider = typeof body.provider === 'string' ? body.provider.trim().toLowerCase() : 'facebook';

    if (!commentId || !replyText?.trim()) {
      return corsJsonResponse(
        {
          success: false,
          provider: 'resilient_network',
          platform: 'facebook',
          error: 'commentId and replyText are required.',
          statusCode: 400,
        },
        { status: 400 },
        request
      );
    }

    const effectiveAuthor = authorName || context.workspace?.name || context.organization?.name || 'Ralion Workspace';

    if (provider === 'instagram') {
      if (!connectionId || !postId) {
        return corsJsonResponse(
          { success: false, platform: 'instagram', error: 'connectionId and postId are required for Instagram comments.', statusCode: 400 },
          { status: 400 },
          request
        );
      }
      const reply = await InstagramCommentsService.replyToComment({
        connectionId,
        commentId,
        postId,
        replyText: replyText.trim(),
        userId: context.user.id,
        workspaceId: context.workspace.id,
        organizationId: context.organization?.id || context.workspace.id,
        authorName: effectiveAuthor,
      });
      return corsJsonResponse({
        success: true,
        provider: 'native',
        platform: 'instagram',
        postId: reply.postId,
        commentId: reply.commentId,
        replyId: reply.externalReplyId,
        reply,
        message: 'Reply posted successfully to Instagram.',
      }, undefined, request);
    }

    const reply = await FacebookCommentsService.replyToComment({
      commentId,
      postId: postId || commentId.split('_')[0] || 'default_post',
      replyText: replyText.trim(),
      userId: context.user.id,
      workspaceId: context.workspace.id,
      authorName: effectiveAuthor,
      pageId,
      organizationId: context.organization?.id || context.workspace.id,
    });

    return corsJsonResponse({
      success: true,
      provider: 'resilient_network',
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
        provider: 'resilient_network',
        platform: 'facebook',
        error: error.message || 'Failed to post reply to Facebook.',
        statusCode: mappedStatus,
      },
      { status: mappedStatus },
      request
    );
  }
}
