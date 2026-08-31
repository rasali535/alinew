import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { CreativeOrchestrator } from '@ralion/ai';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/mari/video
 * Canonical Video Generation Proxy — Routes through CreativeOrchestrator.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      prompt,
      model,
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

    const result = await CreativeOrchestrator.generate({
      organizationId,
      type: 'VIDEO_REEL',
      prompt: cleanPrompt,
      title,
      style,
    });

    if (!result.success || !result.receipt) {
      console.error('[API /api/mari/video] Generation failed:', JSON.stringify(result, null, 2));
      const httpStatus = result.errorDetails?.errorCode === 'INVALID_PROMPT' ? 400 : 502;
      return corsJsonResponse({
        success: false,
        error: result.errorDetails?.errorMessage || result.userFacingMessage,
        details: result.errorDetails,
      }, { status: httpStatus }, request);
    }

    const receipt = result.receipt;

    return corsJsonResponse({
      success: true,
      videoUrl: receipt.mediaUrl,
      url: receipt.mediaUrl,
      publicUrl: receipt.publicUrl,
      posterUrl: receipt.mediaUrl,
      id: receipt.assetId,
      assetId: receipt.assetId,
      status: 'completed',
      model: model || 'zai-org/CogVideoX-2b',
      receipt,
    }, undefined, request);

  } catch (err: any) {
    return corsJsonResponse({
      success: false,
      error: err?.message || 'Video generation failed',
    }, { status: 500 }, request);
  }
}
