import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { CreativeOrchestrator } from '@ralion/ai';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/mari/generate
 *
 * Canonical Mari AI Media Generation Engine:
 * Routes all generation requests through the unified CreativeOrchestrator pipeline,
 * guaranteeing tenant credit accounting, semantic validation, and durable CreativeAsset creation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      type = 'image',
      prompt,
      quality = 'fast',
      format,
      style,
      title,
    } = body;

    const organizationId =
      body.organizationId ||
      request.headers.get('x-organization-id') ||
      request.headers.get('x-workspace-id') ||
      request.headers.get('x-user-id');

    if (!organizationId || organizationId === 'default-org') {
      return corsJsonResponse(
        {
          success: false,
          error: 'Unauthorized: A valid authenticated organizationId is required. Defaulting to default-org is forbidden.',
          errorCode: 'TENANT_UNAUTHORIZED',
        },
        { status: 401 },
        request
      );
    }

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return corsJsonResponse({ success: false, error: 'prompt is required' }, { status: 400 }, request);
    }

    const cleanPrompt = prompt.trim();
    const assetType = type === 'video' ? 'VIDEO_REEL' : 'POSTER_IMAGE';

    const result = await CreativeOrchestrator.generate({
      organizationId,
      type: assetType,
      prompt: cleanPrompt,
      title,
      style,
      format,
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

    const receipt = result.receipt;

    return corsJsonResponse({
      success: true,
      status: 'COMPLETED',
      assetId: receipt.assetId,
      url: receipt.mediaUrl,
      publicUrl: receipt.publicUrl,
      directUrl: receipt.mediaUrl,
      format: 'url',
      model: assetType === 'VIDEO_REEL' ? 'zai-org/CogVideoX-2b' : 'black-forest-labs/FLUX.1-schnell',
      prompt: cleanPrompt,
      receipt,
    }, undefined, request);

  } catch (err: any) {
    console.error('[Mari Generate API] Error:', err);
    return corsJsonResponse({ success: false, error: err?.message || 'Internal error' }, { status: 500 }, request);
  }
}
