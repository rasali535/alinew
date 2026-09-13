import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import {
  CreativeAssetService,
  CreativeAsset,
  CreativeGenerationError,
  CreativeOrchestrator,
  validateImageBuffer,
  validateVideoBuffer,
} from '@ralion/ai';
import { requireRalionContext } from '../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    // 1. Require authenticated server session
    const authResult = await requireRalionContext(request);
    if (authResult.response || !authResult.context) {
      return authResult.response || corsJsonResponse(
        { success: false, error: 'AUTHENTICATION_REQUIRED', message: 'Authentication required to generate creative assets.' },
        { status: 401 },
        request
      );
    }

    const authenticatedOrgId = authResult.context.organization.id;
    const authenticatedWorkspaceId = authResult.context.workspace.id;

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

    // 2. Reject mismatched client hints
    if (body.organizationId && body.organizationId !== authenticatedOrgId) {
      return corsJsonResponse(
        { success: false, error: 'FORBIDDEN', message: 'Requested organization does not match authenticated session.' },
        { status: 403 },
        request
      );
    }

    const result = await CreativeOrchestrator.generate({
      organizationId: authenticatedOrgId,
      workspaceId: authenticatedWorkspaceId,
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
      const httpStatus = result.errorDetails?.errorCode === 'INVALID_PROMPT' ? 400 : 502;
      return corsJsonResponse({
        success: false,
        status: result.status,
        error: result.errorDetails?.errorMessage || result.userFacingMessage,
        errorCode: result.errorDetails?.errorCode || 'GENERATION_FAILED',
        userFacingMessage: result.userFacingMessage,
        details: result.errorDetails,
      }, { status: httpStatus }, request);
    }

    const assetPayload = {
      id: result.receipt.assetId,
      ...result.receipt,
      organizationId: authenticatedOrgId,
    };

    return corsJsonResponse({
      success: true,
      status: 'COMPLETED',
      userFacingMessage: result.userFacingMessage,
      asset: assetPayload,
      receipt: result.receipt,
    }, undefined, request);

  } catch (err: any) {
    console.error('[Creative Generation API] Unhandled Error:', err);
    return corsJsonResponse({
      success: false,
      status: 'FAILED',
      error: 'An unexpected internal error occurred during creative generation.',
      userFacingMessage: 'Creative generation service encountered an unexpected error. Please try again.',
      errorCode: 'INTERNAL_ERROR',
      technicalDetails: err?.message,
    }, { status: 500 }, request);
  }
}
