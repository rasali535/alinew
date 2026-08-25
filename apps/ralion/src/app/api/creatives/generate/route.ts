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

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

function sanitizePrompt(raw: string): string {
  return raw
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDimensionsForFormat(format?: string): { width: number; height: number } {
  switch (format) {
    case '16:9':
    case 'landscape':
      return { width: 1024, height: 576 };
    case '9:16':
    case 'story':
    case 'reel':
      return { width: 576, height: 1024 };
    case '4:5':
    case 'portrait':
      return { width: 816, height: 1020 };
    case '1:1':
    case 'square':
    default:
      return { width: 1024, height: 1024 };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      type = 'POSTER_IMAGE',
      prompt,
      title,
      format = '1:1',
      style = 'Corporate Executive',
      organizationId = 'default-org',
      campaign,
      platform,
      cta,
      mockFailure,
    } = body;

    const result = await CreativeOrchestrator.generate({
      organizationId,
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
      organizationId,
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
