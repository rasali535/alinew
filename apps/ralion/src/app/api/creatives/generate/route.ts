import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { CreativeOrchestrator } from '@ralion/ai/server';
import { requireRalionContext } from '../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  const requestId = `req_gen_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  try {
    const authResult = await requireRalionContext(request);
    if (authResult.response || !authResult.context) {
      return authResult.response || corsJsonResponse(
        {
          success: false,
          error: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to generate creative assets.',
          requestId,
        },
        { status: 401 },
        request
      );
    }

    const authenticatedOrgId = authResult.context.organization.id;
    const authenticatedWorkspaceId = authResult.context.workspace.id;
    const authenticatedUserId = authResult.context.user.id;

    const body = await request.json().catch(() => ({}));
    const {
      type = 'POSTER_IMAGE',
      prompt,
      title,
      format = '1:1',
      style = 'Corporate Executive',
      campaign,
      platform,
      cta,
      mockFailure,
    } = body;

    if (body.organizationId && body.organizationId !== authenticatedOrgId) {
      return corsJsonResponse(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Requested organization does not match authenticated session.',
          requestId,
        },
        { status: 403 },
        request
      );
    }

    if (body.workspaceId && body.workspaceId !== authenticatedWorkspaceId) {
      return corsJsonResponse(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Requested workspace does not match authenticated session.',
          requestId,
        },
        { status: 403 },
        request
      );
    }

    const result = await (CreativeOrchestrator.generate as any)({
      organizationId: authenticatedOrgId,
      workspaceId: authenticatedWorkspaceId,
      userId: authenticatedUserId,
      requestId,
      type: type === 'video' ? 'VIDEO_REEL' : (type === 'image' ? 'POSTER_IMAGE' : type),
      prompt,
      title,
      style,
      format,
      campaign,
      platform,
      cta,
      mockFailure,
    });

    if (!result.success || !result.receipt) {
      const errorCode = result.errorDetails?.errorCode || 'GENERATION_FAILED';
      const httpStatus = errorCode === 'INVALID_PROMPT'
        ? 400
        : errorCode === 'INSUFFICIENT_CREDITS'
          ? 402
          : errorCode === 'ENTITLEMENT_REQUIRED'
            ? 403
            : 502;
      return corsJsonResponse({
        success: false,
        status: result.status,
        error: result.userFacingMessage || 'Creative generation failed.',
        errorCode,
        errorStage: result.errorDetails?.stage,
        visualRelevanceScore: result.errorDetails?.visualRelevanceScore,
        attempts: result.errorDetails?.attempts,
        detectedBranding: result.errorDetails?.detectedBranding,
        missingRequiredObjects: result.errorDetails?.missingRequiredObjects,
        userFacingMessage: result.userFacingMessage,
        requestId,
      }, { status: httpStatus }, request);
    }

    const assetPayload = {
      id: result.receipt.assetId,
      ...result.receipt,
      organizationId: authenticatedOrgId,
      workspaceId: authenticatedWorkspaceId,
    };

    return corsJsonResponse({
      success: true,
      status: 'COMPLETED',
      userFacingMessage: result.userFacingMessage,
      asset: assetPayload,
      receipt: result.receipt,
      requestId,
    }, undefined, request);

  } catch (err: any) {
    console.error(`[Creative Generation API] Unhandled Error (${requestId}):`, err);
    return corsJsonResponse({
      success: false,
      status: 'FAILED',
      error: 'Creative generation service encountered an unexpected error. Please try again.',
      userFacingMessage: 'Creative generation service encountered an unexpected error. Please try again.',
      errorCode: 'INTERNAL_ERROR',
      requestId,
    }, { status: 500 }, request);
  }
}
