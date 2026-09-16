import { NextRequest } from 'next/server';
import * as crypto from 'crypto';
import { SocialPublishingService } from '@/lib/services/social/socialPublishing.service';
import { MariMarketingPublicationBridgeService } from '@/lib/services/mari/mariMarketingPublicationBridge.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext, authRequiredResponse } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const requestId = `req_pub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  try {
    const context = await getCurrentRalionContext(request, { requireAuth: true });
    if (!context) {
      return authRequiredResponse(request);
    }

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
      title,
      content,
      body: postBody,
      mediaUrls,
      mediaItems,
      mediaTypes,
      platforms,
      scheduledFor,
      socialConnectionId,
      pageId,
      authorName,
      idempotencyKey,
      contentId,
      growthSourceId,
    } = body;

    const actualUserId = context.user.id;
    const actualWorkspaceId = context.workspace.id;
    const actualOrgId = context.organization?.id || context.workspace.organization_id || context.workspace.id;

    const actualContent = content || postBody;

    console.log('[SocialPublishAPI] Incoming publish request:', {
      requestId,
      endpoint: '/api/social/publish',
      platforms: platforms || ['facebook'],
      hasContent: Boolean(actualContent),
      contentLength: actualContent?.length || 0,
      hasMedia: Boolean((mediaUrls || mediaItems)?.length),
      isScheduled: Boolean(scheduledFor),
      hasPageId: Boolean(pageId),
      hasSocialConnectionId: Boolean(socialConnectionId),
      organizationId: actualOrgId,
      workspaceId: actualWorkspaceId,
      userId: actualUserId,
      idempotencyKey: idempotencyKey || null,
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

    const effectiveAuthor = authorName || context.workspace?.name || context.organization?.name || 'Ralion Member';

    const result = await SocialPublishingService.publish({
      userId: actualUserId,
      workspaceId: actualWorkspaceId,
      organizationId: actualOrgId,
      title: title || 'Social Post',
      body: actualContent.trim(),
      mediaUrls: mediaUrls || mediaItems || [],
      mediaTypes,
      platforms: targetPlatforms,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      authorName: effectiveAuthor,
      pageId,
      socialConnectionId,
      idempotencyKey,
    });

    const isSuccess = result.overallStatus === 'PUBLISHED' || result.overallStatus === 'QUEUED';
    const isPartial = result.overallStatus === 'PARTIALLY_PUBLISHED';
    const httpStatus = result.statusCode || (isSuccess ? 200 : isPartial ? 200 : 422);

    const primaryError =
      result.errors?.[0] ||
      (result.platformResults?.facebook as any)?.error ||
      (result.platformResults?.facebook as any)?.details?.sanitizedMessage ||
      (isSuccess || isPartial ? undefined : 'Social publishing failed');

    console.log('[SocialPublishAPI] Dispatch result:', {
      requestId,
      overallStatus: result.overallStatus,
      httpStatus,
      postId: result.postId,
      success: isSuccess || isPartial,
      conflict: result.conflict || false,
      errorsCount: result.errors?.length || 0,
      primaryError,
    });

    // Publication provenance must never turn a successful social dispatch into a failure.
    // It records the Growth/source lineage now; live outcomes are collected later.
    if (result.postId && (isSuccess || isPartial)) {
      try {
        await MariMarketingPublicationBridgeService.registerSuccessfulPublication({
          organizationId: actualOrgId,
          workspaceId: actualWorkspaceId,
          userId: actualUserId,
          socialPostId: result.postId,
          idempotencyKey: typeof idempotencyKey === 'string' ? idempotencyKey : null,
          contentId: typeof contentId === 'string' ? contentId : null,
          growthSourceId: typeof growthSourceId === 'string' ? growthSourceId : null,
        });
      } catch (learningError: any) {
        console.error('[SocialPublishAPI] Mari publication provenance warning:', learningError?.message || learningError);
      }
    }

    // Sanitize platformResults to remove internal provider markers
    const sanitizedPlatformResults: any = {};
    if (result.platformResults) {
      for (const [pKey, pVal] of Object.entries(result.platformResults)) {
        if (pVal) {
          const { zernio_account_id, zernio_profile_id, ...safeVal } = pVal as any;
          if (safeVal.provider === 'zernio') safeVal.provider = 'resilient_network';
          sanitizedPlatformResults[pKey] = safeVal;
        }
      }
    }

    return corsJsonResponse({
      success: isSuccess || isPartial,
      postId: result.postId,
      overallStatus: result.overallStatus,
      statusCode: httpStatus,
      ...(result.conflict ? { conflict: true, error: primaryError || 'Publishing conflict' } : {}),
      ...(result.conflictDetails ? { conflictDetails: result.conflictDetails } : {}),
      ...(!isSuccess && !isPartial && primaryError ? { error: primaryError } : {}),
      platformResults: sanitizedPlatformResults,
      requestId,
      ...(result.errors?.length ? { errors: result.errors } : {}),
    }, { status: httpStatus }, request);
  } catch (error: any) {
    const statusCode = error.statusCode || error.status || 500;
    console.error('[SocialPublishAPI] Execution error:', {
      requestId,
      statusCode,
      message: error.message,
    });

    return corsJsonResponse(
      {
        success: false,
        error: error.message || 'Social publishing failed',
        requestId,
      },
      { status: statusCode },
      request
    );
  }
}
