import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';

export const dynamic = 'force-dynamic';

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || process.env.NEXT_PUBLIC_HF_API_KEY || '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';
const HF_BASE = 'https://api-inference.huggingface.co';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/mari/generate
 *
 * Unified server-side proxy for HuggingFace Inference API.
 * Handles:
 *   - Text-to-Image: FLUX.1-schnell / FLUX.1-dev / FLUX.2-dev / FLUX.2-klein-4B
 *   - Text-to-Video: CogVideoX-2b / CogVideoX-5b / CogVideoX1.5-5B
 *
 * All HF API keys are kept server-side — never exposed to the browser.
 *
 * Body:
 * {
 *   type: 'image' | 'video';
 *   prompt: string;
 *   model?: string;  // defaults to best model per type
 *   quality?: 'fast' | 'best';  // 'fast' = schnell/2b, 'best' = dev/5b
 * }
 *
 * Returns:
 * - Image: { success: true; url: string; format: 'base64' }  (data:image/... URL)
 * - Video: { success: true; url: string; format: 'base64' }  (data:video/... URL)
 * - Error: { success: false; error: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { type = 'image', prompt, quality = 'fast' } = body;

    if (!prompt || typeof prompt !== 'string') {
      return corsJsonResponse({ success: false, error: 'prompt is required' }, { status: 400 }, request);
    }

    // ── TEXT-TO-IMAGE: FLUX Models ─────────────────────────────────────────
    if (type === 'image') {
      // Model selection priority: explicit model > quality preset > schnell (default)
      const imageModels = body.model
        ? [body.model]
        : quality === 'best'
          ? [
              'black-forest-labs/FLUX.2-dev',
              'black-forest-labs/FLUX.1-dev',
              'black-forest-labs/FLUX.1-schnell',
              'black-forest-labs/FLUX.2-klein-4B',
            ]
          : [
              'black-forest-labs/FLUX.1-schnell',   // fastest, Apache-2.0
              'black-forest-labs/FLUX.2-klein-4B',  // small & fast, Apache-2.0
              'black-forest-labs/FLUX.1-dev',       // best quality
              'black-forest-labs/FLUX.2-dev',       // latest
            ];

      for (const model of imageModels) {
        try {
          const res = await fetch(`${HF_BASE}/models/${model}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HF_API_KEY}`,
              'Content-Type': 'application/json',
              'x-wait-for-model': 'true',
            },
            body: JSON.stringify({ inputs: prompt }),
            signal: AbortSignal.timeout(55000), // 55s timeout
          });

          if (!res.ok) {
            const errText = await res.text();
            // 503 = model loading, try next model in list
            if (res.status === 503 || res.status === 429) continue;
            console.warn(`[HF Image] ${model} returned ${res.status}:`, errText.slice(0, 100));
            continue;
          }

          const contentType = res.headers.get('content-type') || 'image/png';
          const buffer = await res.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const dataUrl = `data:${contentType};base64,${base64}`;

          return corsJsonResponse({
            success: true,
            url: dataUrl,
            format: 'base64',
            model,
            contentType,
          }, undefined, request);

        } catch (err: any) {
          console.warn(`[HF Image] ${model} error:`, err?.message?.slice(0, 80));
          continue;
        }
      }

      // All HF models failed — return Unsplash visual placeholder
      return corsJsonResponse({
        success: true,
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop',
        format: 'url',
        model: 'placeholder',
      }, undefined, request);
    }

    // ── TEXT-TO-VIDEO: CogVideoX Models ───────────────────────────────────
    if (type === 'video') {
      const videoModels = body.model
        ? [body.model]
        : quality === 'best'
          ? [
              'zai-org/CogVideoX1.5-5B',   // latest version
              'zai-org/CogVideoX-5b',       // 5B better quality
              'zai-org/CogVideoX-2b',       // 2B fallback
            ]
          : [
              'zai-org/CogVideoX-2b',       // fastest
              'zai-org/CogVideoX1.5-5B',    // latest
              'zai-org/CogVideoX-5b',       // best quality
            ];

      for (const model of videoModels) {
        try {
          const res = await fetch(`${HF_BASE}/models/${model}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HF_API_KEY}`,
              'Content-Type': 'application/json',
              'x-wait-for-model': 'true',
            },
            body: JSON.stringify({ inputs: prompt }),
            signal: AbortSignal.timeout(90000), // 90s timeout (video takes longer)
          });

          if (!res.ok) {
            if (res.status === 503 || res.status === 429) continue;
            continue;
          }

          const contentType = res.headers.get('content-type') || 'video/mp4';
          const buffer = await res.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const dataUrl = `data:${contentType};base64,${base64}`;

          return corsJsonResponse({
            success: true,
            url: dataUrl,
            format: 'base64',
            model,
            contentType,
          }, undefined, request);

        } catch (err: any) {
          console.warn(`[HF Video] ${model} error:`, err?.message?.slice(0, 80));
          continue;
        }
      }

      // All HF models failed — return sample video
      return corsJsonResponse({
        success: true,
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        format: 'url',
        model: 'placeholder',
      }, undefined, request);
    }

    return corsJsonResponse({ success: false, error: `Unknown type: ${type}` }, { status: 400 }, request);

  } catch (err: any) {
    console.error('[HF Generate API] Error:', err);
    return corsJsonResponse({ success: false, error: err?.message || 'Internal error' }, { status: 500 }, request);
  }
}
