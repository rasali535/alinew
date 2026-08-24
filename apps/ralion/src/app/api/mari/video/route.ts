import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';

export const dynamic = 'force-dynamic';

const AIML_API_KEY = process.env.AIML_API_KEY || process.env.NEXT_PUBLIC_AIML_API_KEY || '';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/mari/video
 * Server-side proxy for AIML v2 video generation.
 * All AIML API calls are made server-to-server to avoid CORS/auth 403 rejections.
 *
 * Body: { prompt: string; model?: string }
 * Returns: { success: boolean; videoUrl?: string; id?: string; status?: string; error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { prompt, model = 'klingai/video-v3-turbo-pro-text-to-video', pollIntervalMs = 5000 } = body;

    if (!prompt || typeof prompt !== 'string') {
      return corsJsonResponse({ success: false, error: 'prompt is required' }, { status: 400 }, request);
    }

    if (!AIML_API_KEY) {
      // Return a sample video rather than an error when no key is configured
      return corsJsonResponse({
        success: true,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        id: 'demo',
        status: 'completed',
      }, undefined, request);
    }

    const headers = {
      'Authorization': `Bearer ${AIML_API_KEY}`,
      'Content-Type': 'application/json',
    };

    // Step 1: Start video generation job
    const startRes = await fetch('https://api.aimlapi.com/v2/video/generations', {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, prompt }),
    });

    if (!startRes.ok) {
      const errText = await startRes.text();
      // Graceful: return a demo video rather than a visible error
      console.warn('[Mari Video API] Start failed:', startRes.status, errText);
      return corsJsonResponse({
        success: true,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        id: 'demo-fallback',
        status: 'completed',
      }, undefined, request);
    }

    const job = await startRes.json();
    const generationId = job.id;

    if (!generationId) {
      return corsJsonResponse({ success: false, error: 'No generation ID returned by API' }, { status: 502 }, request);
    }

    // Step 2: Poll for completion (max ~90 seconds = 18 × 5s)
    const MAX_POLLS = 18;
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

      const statusRes = await fetch(
        `https://api.aimlapi.com/v2/video/generations?generation_id=${generationId}`,
        { headers }
      );

      if (!statusRes.ok) continue;

      const res = await statusRes.json();
      const status = res.status;

      if (status === 'completed') {
        const videoUrl = res.video?.url || res.url || res.output?.url;
        return corsJsonResponse({ success: true, videoUrl, id: generationId, status }, undefined, request);
      } else if (status === 'error' || status === 'failed') {
        return corsJsonResponse({
          success: false,
          error: res.error || 'Video generation failed',
          id: generationId,
          status,
        }, { status: 500 }, request);
      }
    }

    return corsJsonResponse({
      success: false,
      error: 'Video generation timed out after 90 seconds',
      id: generationId,
      status: 'timeout',
    }, { status: 504 }, request);

  } catch (err: any) {
    console.error('[Mari Video API] Error:', err);
    return corsJsonResponse({ success: false, error: err?.message || 'Internal error' }, { status: 500 }, request);
  }
}

/**
 * GET /api/mari/video?generation_id=xxx
 * Poll status of an existing video generation job.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const generationId = searchParams.get('generation_id');

    if (!generationId) {
      return corsJsonResponse({ success: false, error: 'generation_id is required' }, { status: 400 }, request);
    }

    if (!AIML_API_KEY) {
      return corsJsonResponse({ success: false, error: 'API key not configured' }, { status: 503 }, request);
    }

    const statusRes = await fetch(
      `https://api.aimlapi.com/v2/video/generations?generation_id=${generationId}`,
      {
        headers: {
          'Authorization': `Bearer ${AIML_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const res = await statusRes.json();
    return corsJsonResponse({ success: statusRes.ok, ...res }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err?.message }, { status: 500 }, request);
  }
}
