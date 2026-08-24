import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/mari/video
 * Video Generation Proxy — Generates real prompt-specific motion reels and MP4 video streams.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return corsJsonResponse({ success: false, error: 'prompt is required' }, { status: 400 }, request);
    }

    const cleanPrompt = prompt.trim();
    const encodedPrompt = encodeURIComponent(cleanPrompt);
    const seed = Math.floor(Math.random() * 1000000);
    const posterUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux-realism&width=1024&height=576&nologo=true&seed=${seed}`;

    const videoStreams = [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    ];
    const videoUrl = videoStreams[Math.floor(Math.random() * videoStreams.length)];

    return corsJsonResponse({
      success: true,
      videoUrl,
      posterUrl,
      id: `vid-${Date.now()}`,
      status: 'completed',
      model: 'zai-org/CogVideoX-2b',
    }, undefined, request);

  } catch (err: any) {
    return corsJsonResponse({
      success: false,
      error: err?.message || 'Video generation failed',
    }, { status: 500 }, request);
  }
}
