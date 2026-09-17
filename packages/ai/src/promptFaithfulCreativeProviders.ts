import {
  CreativeProvider,
  CreativeProviderRequest,
  CreativeProviderResult,
} from './creativeProvider.interface';
import { validateImageBuffer, validateVideoBuffer } from './creativeAsset.service';

const DEFAULT_IMAGE_MODEL = 'black-forest-labs/FLUX.1-schnell';
const DEFAULT_VIDEO_MODEL = 'zai-org/CogVideoX-2b';

function normalizePrompt(raw: string): string {
  return raw
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\r\n/g, '\n')
    .trim();
}

/**
 * The legacy orchestrator can perform one bounded retry by appending a generated
 * "physical depiction" suffix. That retry text is machine-authored rather than
 * user-authored, so providers must not treat it as permission to invent content.
 */
export function stripGeneratedRetryExpansion(rawPrompt: string): string {
  return normalizePrompt(rawPrompt)
    .replace(/,?\s*photorealistic high-fidelity physical depiction of\s+[^\n]+$/i, '')
    .trim();
}

export function buildPromptFaithfulPrompt(request: CreativeProviderRequest): string {
  const userBrief = stripGeneratedRetryExpansion(request.prompt);
  if (!userBrief) {
    throw new Error('Creative prompt is empty after normalization.');
  }

  const style = request.style?.trim();
  if (!style) return userBrief;

  return [
    userBrief,
    '',
    `VISUAL STYLE ONLY: ${style}`,
    'FIDELITY RULE: Preserve every named subject, object, product, person, location, action and constraint from the brief. Do not add new people, products, objects, locations, logos, text, claims or actions that the brief did not request.',
  ].join('\n');
}

function resolveDimensions(request: CreativeProviderRequest): { width: number; height: number } {
  if (request.width && request.height) {
    return { width: request.width, height: request.height };
  }

  switch ((request.format || '').toLowerCase()) {
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

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readBuffer(response: Response, timeoutMs: number): Promise<Buffer> {
  const arrayBuffer = await Promise.race([
    response.arrayBuffer(),
    new Promise<ArrayBuffer>((_, reject) =>
      setTimeout(() => reject(new Error('Creative provider media stream timed out.')), timeoutMs),
    ),
  ]);
  return Buffer.from(arrayBuffer);
}

function getHuggingFaceToken(): string | undefined {
  return (
    process.env.HUGGINGFACE_API_KEY ||
    process.env.HF_API_KEY ||
    process.env.HUGGINGFACE_TOKEN ||
    undefined
  );
}

async function fetchMediaUrl(
  mediaUrl: string,
  timeoutMs: number,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const response = await fetchWithTimeout(
    mediaUrl,
    {
      method: 'GET',
      headers: { Accept: 'image/*,video/*,*/*;q=0.8' },
      cache: 'no-store',
    },
    timeoutMs,
  );

  if (!response.ok) {
    throw new Error(`Generated media download failed with HTTP ${response.status}.`);
  }

  return {
    buffer: await readBuffer(response, timeoutMs),
    mimeType: response.headers.get('content-type') || 'application/octet-stream',
  };
}

/**
 * Prompt-faithful image generation.
 *
 * Important contract:
 * - The semantic content of the user's brief is never replaced by a house scene.
 * - No synthetic raster/vector placeholder is returned as a successful AI image.
 * - Provider failure is surfaced so the orchestrator can refund credits and fail safely.
 */
export class PromptFaithfulImageProvider implements CreativeProvider {
  readonly name = 'Prompt-Faithful FLUX';
  readonly supportedTypes = ['POSTER_IMAGE' as const];

  async generate(request: CreativeProviderRequest): Promise<CreativeProviderResult> {
    const startedAt = Date.now();
    const prompt = buildPromptFaithfulPrompt(request);
    const dimensions = resolveDimensions(request);
    const seed = request.seed ?? Math.floor(Math.random() * 1_000_000);
    const timeoutMs = Math.max(8_000, Math.min(request.timeoutMs || 20_000, 30_000));
    const errors: string[] = [];

    const hfToken = getHuggingFaceToken();
    if (hfToken) {
      const model = process.env.RALION_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
      try {
        const response = await fetchWithTimeout(
          `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${hfToken}`,
              'Content-Type': 'application/json',
              Accept: 'image/*',
              'x-wait-for-model': 'true',
            },
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                width: dimensions.width,
                height: dimensions.height,
                seed,
              },
            }),
            cache: 'no-store',
          },
          timeoutMs,
        );

        if (response.ok) {
          const buffer = await readBuffer(response, timeoutMs);
          const validation = validateImageBuffer(buffer);
          if (validation.valid) {
            return {
              buffer,
              mimeType: validation.mimeType || response.headers.get('content-type') || 'image/jpeg',
              providerName: `Hugging Face ${model}`,
              generationTimeMs: Date.now() - startedAt,
            };
          }
          errors.push(`Hugging Face returned invalid image data: ${validation.error || 'validation failed'}`);
        } else {
          errors.push(`Hugging Face image provider HTTP ${response.status}`);
        }
      } catch (error: any) {
        errors.push(`Hugging Face image provider: ${error?.message || String(error)}`);
      }
    }

    const pollinationsPrompt = encodeURIComponent(prompt);
    const pollinationsCandidates = [
      `https://image.pollinations.ai/prompt/${pollinationsPrompt}?model=flux&width=${dimensions.width}&height=${dimensions.height}&seed=${seed}&nologo=true&enhance=false`,
      `https://image.pollinations.ai/prompt/${pollinationsPrompt}?model=flux&width=${dimensions.width}&height=${dimensions.height}&seed=${seed + 1}&nologo=true&enhance=false`,
    ];

    for (const url of pollinationsCandidates) {
      try {
        const response = await fetchWithTimeout(
          url,
          {
            method: 'GET',
            headers: {
              'User-Agent': 'RalionOS/1.0 prompt-faithful-creative-provider',
              Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
            },
            cache: 'no-store',
          },
          timeoutMs,
        );

        if (!response.ok) {
          errors.push(`FLUX image provider HTTP ${response.status}`);
          continue;
        }

        const buffer = await readBuffer(response, timeoutMs);
        const validation = validateImageBuffer(buffer);
        if (!validation.valid) {
          errors.push(`FLUX image validation failed: ${validation.error || 'invalid image'}`);
          continue;
        }

        return {
          buffer,
          mimeType: validation.mimeType || response.headers.get('content-type') || 'image/jpeg',
          providerName: this.name,
          generationTimeMs: Date.now() - startedAt,
        };
      } catch (error: any) {
        errors.push(`FLUX image provider: ${error?.message || String(error)}`);
      }
    }

    throw new Error(
      `No prompt-faithful image provider completed the brief. ${errors.slice(-3).join(' | ')}`.trim(),
    );
  }
}

/**
 * Real video provider. It deliberately has no locally synthesized MP4 fallback.
 * A valid generated video must come from a configured real text-to-video endpoint
 * or Hugging Face inference and must pass the existing MP4/container validator.
 */
export class PromptFaithfulVideoProvider implements CreativeProvider {
  readonly name = 'Prompt-Faithful Video';
  readonly supportedTypes = ['VIDEO_REEL' as const];

  async generate(request: CreativeProviderRequest): Promise<CreativeProviderResult> {
    const startedAt = Date.now();
    const prompt = buildPromptFaithfulPrompt(request);
    const timeoutMs = Math.max(30_000, Math.min(request.timeoutMs || 90_000, 120_000));
    const errors: string[] = [];

    const dedicatedEndpoint = process.env.RALION_VIDEO_GENERATION_ENDPOINT?.trim();
    if (dedicatedEndpoint) {
      try {
        const token = process.env.RALION_VIDEO_GENERATION_TOKEN?.trim();
        const response = await fetchWithTimeout(
          dedicatedEndpoint,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json,video/*,*/*;q=0.8',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              prompt,
              model: process.env.RALION_VIDEO_MODEL || DEFAULT_VIDEO_MODEL,
              format: request.format || '16:9',
            }),
            cache: 'no-store',
          },
          timeoutMs,
        );

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          let buffer: Buffer;
          let mimeType = contentType || 'video/mp4';

          if (contentType.includes('application/json')) {
            const payload = await response.json() as {
              url?: string;
              videoUrl?: string;
              mediaUrl?: string;
              output?: { url?: string };
            };
            const mediaUrl = payload.videoUrl || payload.mediaUrl || payload.url || payload.output?.url;
            if (!mediaUrl) {
              throw new Error('Dedicated video endpoint returned JSON without a media URL.');
            }
            const downloaded = await fetchMediaUrl(mediaUrl, timeoutMs);
            buffer = downloaded.buffer;
            mimeType = downloaded.mimeType;
          } else {
            buffer = await readBuffer(response, timeoutMs);
          }

          const validation = validateVideoBuffer(buffer);
          if (validation.valid) {
            return {
              buffer,
              mimeType: validation.mimeType || mimeType || 'video/mp4',
              providerName: this.name,
              durationSeconds: validation.duration,
              generationTimeMs: Date.now() - startedAt,
            };
          }
          errors.push(`Dedicated video validation failed: ${validation.error || 'invalid video'}`);
        } else {
          errors.push(`Dedicated video provider HTTP ${response.status}`);
        }
      } catch (error: any) {
        errors.push(`Dedicated video provider: ${error?.message || String(error)}`);
      }
    }

    const hfToken = getHuggingFaceToken();
    if (hfToken) {
      const model = process.env.RALION_VIDEO_MODEL || DEFAULT_VIDEO_MODEL;
      try {
        const response = await fetchWithTimeout(
          `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${hfToken}`,
              'Content-Type': 'application/json',
              Accept: 'video/mp4,video/*,*/*;q=0.8',
              'x-wait-for-model': 'true',
            },
            body: JSON.stringify({ inputs: prompt }),
            cache: 'no-store',
          },
          timeoutMs,
        );

        if (response.ok) {
          const buffer = await readBuffer(response, timeoutMs);
          const validation = validateVideoBuffer(buffer);
          if (validation.valid) {
            return {
              buffer,
              mimeType: validation.mimeType || response.headers.get('content-type') || 'video/mp4',
              providerName: `Hugging Face ${model}`,
              durationSeconds: validation.duration,
              generationTimeMs: Date.now() - startedAt,
            };
          }
          errors.push(`Hugging Face video validation failed: ${validation.error || 'invalid video'}`);
        } else {
          errors.push(`Hugging Face video provider HTTP ${response.status}`);
        }
      } catch (error: any) {
        errors.push(`Hugging Face video provider: ${error?.message || String(error)}`);
      }
    }

    if (!dedicatedEndpoint && !hfToken) {
      throw new Error(
        'Real video generation is not configured. Set RALION_VIDEO_GENERATION_ENDPOINT or a Hugging Face server token. Synthetic video fallbacks are disabled.',
      );
    }

    throw new Error(
      `No real prompt-faithful video provider completed the brief. ${errors.slice(-3).join(' | ')}`.trim(),
    );
  }
}
