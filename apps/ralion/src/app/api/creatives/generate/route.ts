import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { CreativeOrchestrator, MariCreativeIntelligenceService } from '@ralion/ai/server';
import { requireRalionContext } from '../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

const CREATIVE_REQUEST_CACHE_TTL_MS = 10 * 60 * 1000;
const creativeRequestState = globalThis as unknown as {
  __ralionCreativeRequestPromises?: Map<string, { promise: Promise<any>; expiresAt: number }>;
};
if (!creativeRequestState.__ralionCreativeRequestPromises) {
  creativeRequestState.__ralionCreativeRequestPromises = new Map();
}
const creativeRequestPromises = creativeRequestState.__ralionCreativeRequestPromises;

function stableCreativeRequestId(input: {
  organizationId: string;
  workspaceId: string;
  userId: string;
  clientRequestId: string;
}): string {
  const digest = crypto
    .createHash('sha256')
    .update(`${input.organizationId}:${input.workspaceId}:${input.userId}:${input.clientRequestId}`)
    .digest('hex')
    .slice(0, 32);
  return `req_gen_${digest}`;
}

function pruneCreativeRequestCache(now = Date.now()) {
  for (const [key, entry] of creativeRequestPromises.entries()) {
    if (entry.expiresAt <= now) creativeRequestPromises.delete(key);
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  let requestId = `req_gen_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

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
    const rawClientRequestId = typeof body.clientRequestId === 'string' ? body.clientRequestId.trim() : '';
    if (rawClientRequestId && !/^[A-Za-z0-9_-]{8,128}$/.test(rawClientRequestId)) {
      return corsJsonResponse(
        {
          success: false,
          error: 'INVALID_CLIENT_REQUEST_ID',
          message: 'Creative request identifier is invalid.',
          requestId,
        },
        { status: 400 },
        request
      );
    }
    if (rawClientRequestId) {
      requestId = stableCreativeRequestId({
        organizationId: authenticatedOrgId,
        workspaceId: authenticatedWorkspaceId,
        userId: authenticatedUserId,
        clientRequestId: rawClientRequestId,
      });
    }

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

    const requiredVisualElements = Array.isArray(body.requiredVisualElements)
      ? body.requiredVisualElements.map((item: unknown) => String(item)).filter(Boolean)
      : typeof prompt === 'string'
        ? MariCreativeIntelligenceService.extractHardVisualRequirements(prompt)
        : [];

    pruneCreativeRequestCache();

    let cachedRequest = creativeRequestPromises.get(requestId);
    if (!cachedRequest) {
      const generationPromise = (CreativeOrchestrator.generate as any)({
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
        requiredVisualElements,
        platformAdmin: authResult.context.isPlatformAdmin === true,
      });

      cachedRequest = {
        promise: generationPromise,
        expiresAt: Date.now() + CREATIVE_REQUEST_CACHE_TTL_MS,
      };
      creativeRequestPromises.set(requestId, cachedRequest);

      generationPromise.catch(() => {
        const active = creativeRequestPromises.get(requestId);
        if (active?.promise === generationPromise) creativeRequestPromises.delete(requestId);
      });
    }

    const result = await cachedRequest.promise;

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
        copyAccuracyScore: result.errorDetails?.copyAccuracyScore,
        requiredText: result.errorDetails?.requiredText,
        missingRequiredText: result.errorDetails?.missingRequiredText,
        detectedTextErrors: result.errorDetails?.detectedTextErrors,
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
