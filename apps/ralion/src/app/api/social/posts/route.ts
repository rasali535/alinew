import { NextRequest } from 'next/server';
import * as crypto from 'crypto';
import { SocialPublishingService } from '@/lib/services/social/socialPublishing.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  return corsJsonResponse({
    success: true,
    message: 'Ralion Unified Social Posts API ready.',
  }, undefined, request);
}

export async function POST(request: NextRequest) {
  const requestId = `req_post_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return corsJsonResponse(
        { success: false, error: 'Invalid JSON request body.', requestId },
        { status: 400 },
        request
      );
    }

    const {
      userId,
      workspaceId,
      organizationId,
      title,
      content,
      body: postBody,
      mediaItems,
      mediaUrls,
      mediaTypes,
      platforms,
      scheduledFor,
      socialConnectionId,
      pageId,
      authorName,
      idempotencyKey,
    } = body;

    const actualContent = content || postBody;

    console.log('[SocialPostsAPI] Incoming post request:', {
      requestId,
      endpoint: '/api/social/posts',
      platforms: platforms || ['facebook'],
      hasContent: Boolean(actualContent),
      contentLength: actualContent?.length || 0,
      hasMedia: Boolean((mediaUrls || mediaItems)?.length),
      isScheduled: Boolean(scheduledFor),
      hasPageId: Boolean(pageId),
      hasSocialConnectionId: Boolean(socialConnectionId),
      timestamp: new Date().toISOString(),
    });

    if (!actualContent || typeof actualContent !== 'string' || actualContent.trim().length === 0) {
      return corsJsonResponse(
        {
          success: false,
          error: 'Post content is required before publishing.',
          requestId,
        },
        { status: 400 },
        request
      );
    }

    const targetPlatforms = Array.isArray(platforms) && platforms.length > 0
      ? platforms
      : ['facebook'];

    const result = await SocialPublishingService.publish({
      userId: userId || 'default-user',
      workspaceId,
      organizationId,
      title: title || 'Social Post',
      body: actualContent.trim(),
      mediaUrls: mediaUrls || mediaItems || [],
      mediaTypes,
      platforms: targetPlatforms,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      authorName: authorName || 'Ras Ali Labs',
      pageId,
      socialConnectionId,
      idempotencyKey,
    });

    const isSuccess = result.overallStatus === 'PUBLISHED' || result.overallStatus === 'QUEUED';
    const isPartial = result.overallStatus === 'PARTIALLY_PUBLISHED';

    console.log('[SocialPostsAPI] Dispatch result:', {
      requestId,
      overallStatus: result.overallStatus,
      postId: result.postId,
      success: isSuccess || isPartial,
      errorsCount: result.errors?.length || 0,
    });

    const httpStatus = isSuccess ? 200 : isPartial ? 200 : 422;

    return corsJsonResponse({
      success: isSuccess || isPartial,
      postId: result.postId,
      overallStatus: result.overallStatus,
      platformResults: result.platformResults,
      result,
      requestId,
      ...(result.errors?.length ? { errors: result.errors } : {}),
    }, { status: httpStatus }, request);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    console.error('[SocialPostsAPI] Execution error:', {
      requestId,
      statusCode,
      message: error.message,
    });

    return corsJsonResponse(
      {
        success: false,
        error: error.message || 'Failed to publish post',
        requestId,
      },
      { status: statusCode },
      request
    );
  }
}
