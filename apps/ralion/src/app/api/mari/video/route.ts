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
      organizationId = 'default-org',
      model,
      style,
      title,
    } = body;

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
