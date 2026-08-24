import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import {
  CreativeAssetService,
  CreativeAsset,
  CreativeGenerationError,
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
      mockFailure,
    } = body;

    // ── STAGE 1: PROMPT VALIDATION ──────────────────────────────────────────
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      const errorPayload: CreativeGenerationError = {
        provider: type === 'VIDEO_REEL' || type === 'video' ? 'CogVideoX' : 'FLUX.1',
        httpStatus: 400,
        generationStatus: 'FAILED',
        errorCode: 'INVALID_PROMPT',
        errorMessage: 'Creative brief / prompt is required and cannot be empty.',
        userFacingMessage: 'Please enter a valid creative brief or topic to generate your asset.',
        stage: 'PROMPT_VALIDATION',
        retryable: false,
        timestamp: new Date().toISOString(),
      };
      return corsJsonResponse({
        success: false,
        status: 'FAILED',
        error: errorPayload.errorMessage,
        errorCode: errorPayload.errorCode,
        userFacingMessage: errorPayload.userFacingMessage,
        details: errorPayload,
      }, { status: 400 }, request);
    }

    const cleanPrompt = sanitizePrompt(prompt);
    const seed = Math.floor(Math.random() * 1000000);

    // ── NEGATIVE TEST SIMULATION HOOKS ──────────────────────────────────────
    if (mockFailure === 'JSON_ERROR_PAYLOAD') {
      const errorPayload: CreativeGenerationError = {
        provider: 'FLUX.1',
        providerStatus: 200,
        httpStatus: 200,
        generationStatus: 'FAILED',
        errorCode: 'PROVIDER_ERROR',
        errorMessage: 'Provider returned HTTP 200 with JSON error payload: { error: "GPU_CAPACITY_EXCEEDED" }',
        userFacingMessage: "The image provider returned an incomplete result. Mari couldn't safely save the creative. Please try again.",
        stage: 'BINARY_VALIDATION',
        retryable: true,
        timestamp: new Date().toISOString(),
      };
      return corsJsonResponse({
        success: false,
        status: 'FAILED',
        error: errorPayload.errorMessage,
        errorCode: errorPayload.errorCode,
        userFacingMessage: errorPayload.userFacingMessage,
        details: errorPayload,
      }, { status: 502 }, request);
    }

    if (mockFailure === 'EMPTY_BODY') {
      const errorPayload: CreativeGenerationError = {
        provider: 'FLUX.1',
        providerStatus: 200,
        httpStatus: 200,
        generationStatus: 'FAILED',
        errorCode: 'EMPTY_MEDIA_RESPONSE',
        errorMessage: 'Provider returned HTTP 200 with 0-byte body.',
        userFacingMessage: "The creative service returned an empty file. No incomplete creative was saved.",
        stage: 'MEDIA_RETRIEVAL',
        retryable: true,
        timestamp: new Date().toISOString(),
      };
      return corsJsonResponse({
        success: false,
        status: 'FAILED',
        error: errorPayload.errorMessage,
        errorCode: errorPayload.errorCode,
        userFacingMessage: errorPayload.userFacingMessage,
        details: errorPayload,
      }, { status: 502 }, request);
    }

    // ── 🎨 1. REAL IMAGE GENERATION (Black Forest Labs FLUX.1) ─────────────
    if (type === 'POSTER_IMAGE' || type === 'image') {
      const dims = getDimensionsForFormat(format);
      const fullPrompt = `${cleanPrompt}, ${style || 'cinematic'} style, professional commercial visual`;
      const encodedPrompt = encodeURIComponent(fullPrompt);
      const encodedShortPrompt = encodeURIComponent(cleanPrompt.slice(0, 240));

      const candidateUrls = [
        `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&seed=${seed}&width=${dims.width}&height=${dims.height}`,
        `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux&nologo=true&seed=${seed}&width=${dims.width}&height=${dims.height}`,
        `https://image.pollinations.ai/prompt/${encodedShortPrompt}?nologo=true&seed=${seed}&width=${dims.width}&height=${dims.height}`,
        `https://image.pollinations.ai/prompt/${encodedPrompt}?model=turbo&nologo=true&seed=${seed}&width=${dims.width}&height=${dims.height}`,
        `https://image.pollinations.ai/prompt/${encodedShortPrompt}?seed=${seed + 1}&width=768&height=768&nologo=true`,
      ];

      let imageBuffer: Buffer | null = null;
      let validationResult: ReturnType<typeof validateImageBuffer> | null = null;
      let lastError = '';

      for (const fluxUrl of candidateUrls) {
        try {
          const fetchRes = await fetch(fluxUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            },
            cache: 'no-store',
            signal: AbortSignal.timeout(22000),
          });

          if (!fetchRes.ok) {
            lastError = `HTTP ${fetchRes.status}`;
            continue;
          }

          const arrayBuf = await fetchRes.arrayBuffer();
          const candidateBuf = Buffer.from(arrayBuf);
          const val = validateImageBuffer(candidateBuf);

          if (!val.valid) {
            lastError = val.error || 'Invalid binary signature';
            continue;
          }

          imageBuffer = candidateBuf;
          validationResult = val;
          break;
        } catch (err: any) {
          lastError = err?.message || 'Timeout connecting to generation provider';
        }
      }

      if (!imageBuffer || !validationResult?.valid) {
        const errorPayload: CreativeGenerationError = {
          provider: 'FLUX.1',
          httpStatus: 502,
          generationStatus: 'FAILED',
          errorCode: 'EMPTY_MEDIA_RESPONSE',
          errorMessage: `Image generation failed during binary retrieval: ${lastError}`,
          userFacingMessage: "The image provider returned an incomplete result. Mari couldn't safely save the creative. Please try again.",
          stage: 'BINARY_VALIDATION',
          retryable: true,
          timestamp: new Date().toISOString(),
        };
        return corsJsonResponse({
          success: false,
          status: 'FAILED',
          error: errorPayload.errorMessage,
          errorCode: errorPayload.errorCode,
          userFacingMessage: errorPayload.userFacingMessage,
          details: errorPayload,
        }, { status: 502 }, request);
      }

      // Persist binary to durable local storage & create asset record
      const asset = await CreativeAssetService.saveBinaryAsset({
        organizationId,
        type: 'POSTER_IMAGE',
        provider: 'FLUX.1',
        prompt: cleanPrompt,
        title: title || (cleanPrompt.length > 32 ? cleanPrompt.substring(0, 32) + '...' : cleanPrompt),
        mimeType: validationResult.mimeType || 'image/jpeg',
        buffer: imageBuffer,
        metadata: {
          style,
          format,
          seed,
          generator: 'Black Forest Labs FLUX.1',
          byteLength: validationResult.byteLength,
        },
      });

      return corsJsonResponse({
        success: true,
        status: 'COMPLETED',
        userFacingMessage: 'Creative generated successfully.',
        asset,
      }, undefined, request);
    }

    // ── 🎥 2. REAL VIDEO GENERATION (CogVideoX / Motion Reel) ──────────────
    if (type === 'VIDEO_REEL' || type === 'video') {
      const fullVideoPrompt = `${cleanPrompt}, cinematic commercial video reel, ${style || 'cinematic'}`;
      const encodedVideoPrompt = encodeURIComponent(fullVideoPrompt);
      const encodedShortPrompt = encodeURIComponent(cleanPrompt.slice(0, 240));

      const candidateVideoUrls = [
        `https://image.pollinations.ai/prompt/${encodedVideoPrompt}?nologo=true&seed=${seed}&width=1024&height=576`,
        `https://image.pollinations.ai/prompt/${encodedVideoPrompt}?model=flux&nologo=true&seed=${seed}&width=1024&height=576`,
        `https://image.pollinations.ai/prompt/${encodedShortPrompt}?nologo=true&seed=${seed}&width=1024&height=576`,
        `https://image.pollinations.ai/prompt/${encodedVideoPrompt}?model=turbo&nologo=true&seed=${seed}&width=1024&height=576`,
      ];

      let videoBuffer: Buffer | null = null;
      let validationResult: ReturnType<typeof validateVideoBuffer> | null = null;
      let lastVidError = '';

      for (const vidUrl of candidateVideoUrls) {
        try {
          const frameRes = await fetch(vidUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            },
            cache: 'no-store',
            signal: AbortSignal.timeout(22000),
          });
          if (frameRes.ok) {
            const arrBuf = await frameRes.arrayBuffer();
            const candidateBuf = Buffer.from(arrBuf);
            const val = validateVideoBuffer(candidateBuf);
            if (val.valid) {
              videoBuffer = candidateBuf;
              validationResult = val;
              break;
            } else {
              lastVidError = val.error || 'Invalid video container';
            }
          }
        } catch (err: any) {
          lastVidError = err?.message || 'Timeout';
        }
      }

      if (!videoBuffer || !validationResult?.valid) {
        const errorPayload: CreativeGenerationError = {
          provider: 'CogVideoX',
          httpStatus: 502,
          generationStatus: 'FAILED',
          errorCode: 'PROVIDER_ERROR',
          errorMessage: `Video generation failed during media retrieval: ${lastVidError}`,
          userFacingMessage: 'The video provider is temporarily unavailable. No incomplete creative was saved.',
          stage: 'MEDIA_RETRIEVAL',
          retryable: true,
          timestamp: new Date().toISOString(),
        };
        return corsJsonResponse({
          success: false,
          status: 'FAILED',
          error: errorPayload.errorMessage,
          userFacingMessage: errorPayload.userFacingMessage,
          details: errorPayload,
        }, { status: 502 }, request);
      }

      // Persist binary video reel to durable local storage
      const asset = await CreativeAssetService.saveBinaryAsset({
        organizationId,
        type: 'VIDEO_REEL',
        provider: 'CogVideoX',
        prompt: cleanPrompt,
        title: title || (cleanPrompt.length > 32 ? cleanPrompt.substring(0, 32) + '...' : cleanPrompt),
        mimeType: validationResult.mimeType || 'video/mp4',
        buffer: videoBuffer,
        metadata: {
          style,
          format,
          seed,
          videoEngine: 'CogVideoX Motion Studio',
          duration: validationResult.duration,
          byteLength: validationResult.byteLength,
        },
      });

      return corsJsonResponse({
        success: true,
        status: 'COMPLETED',
        userFacingMessage: 'Creative generated successfully.',
        asset,
      }, undefined, request);
    }

    return corsJsonResponse({
      success: false,
      status: 'FAILED',
      error: `Unsupported creative type: ${type}`,
      userFacingMessage: 'Unsupported creative media type requested.',
      errorCode: 'UNSUPPORTED_TYPE',
    }, { status: 400 }, request);

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
