import {
  CreativeProvider,
  CreativeProviderRequest,
  CreativeProviderResult,
} from './creativeProvider.interface';
import { validateVideoBuffer } from './creativeAsset.service';
import { buildPromptFaithfulPrompt } from './promptFaithfulCreativeProviders';

const GEMINI_API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GOOGLE_AI_API_KEY,
  process.env.GOOGLE_API_KEY,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY,
].filter(Boolean) as string[];

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_VEO_MODEL = 'veo-3.1-fast-generate-preview';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function resolveAspectRatio(format?: string): '16:9' | '9:16' {
  const normalized = (format || '').toLowerCase();
  return normalized === '9:16' || normalized === 'story' || normalized === 'reel'
    ? '9:16'
    : '16:9';
}

function resolveTimeoutMs(): number {
  const configured = Number(process.env.RALION_VEO_TIMEOUT_MS || 120_000);
  if (!Number.isFinite(configured)) return 120_000;
  return Math.max(30_000, Math.min(configured, 240_000));
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

/**
 * Real Google Veo text-to-video provider for the canonical Ralion creative pipeline.
 *
 * This provider intentionally preserves the user's semantic brief through
 * buildPromptFaithfulPrompt(). It never replaces a failed generation with an image,
 * synthetic MP4 container, stock clip, or unrelated placeholder.
 */
export class VeoVideoProvider implements CreativeProvider {
  readonly name = 'Google Veo 3.1';
  readonly supportedTypes = ['VIDEO_REEL' as const];

  async generate(request: CreativeProviderRequest): Promise<CreativeProviderResult> {
    const startedAt = Date.now();
    const prompt = buildPromptFaithfulPrompt(request);
    const model = process.env.RALION_VEO_MODEL || DEFAULT_VEO_MODEL;
    const aspectRatio = resolveAspectRatio(request.format);
    const overallTimeoutMs = resolveTimeoutMs();
    const pollIntervalMs = 5_000;
    const errors: string[] = [];

    if (GEMINI_API_KEYS.length === 0) {
      throw new Error('Google Veo video generation is not configured: no Gemini API key is available.');
    }

    for (const apiKey of GEMINI_API_KEYS) {
      try {
        const submitResponse = await fetchWithTimeout(
          `${GEMINI_BASE_URL}/models/${model}:predictLongRunning`,
          {
            method: 'POST',
            headers: {
              'x-goog-api-key': apiKey,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              instances: [{ prompt }],
              parameters: {
                aspectRatio,
                durationSeconds: '8',
                resolution: '720p',
              },
            }),
            cache: 'no-store',
          },
          30_000,
        );

        if (!submitResponse.ok) {
          const errorText = await submitResponse.text().catch(() => '');
          errors.push(
            `Veo submit HTTP ${submitResponse.status}${errorText ? `: ${errorText.slice(0, 180)}` : ''}`,
          );
          continue;
        }

        const operation = await submitResponse.json() as { name?: string; done?: boolean };
        if (!operation.name) {
          errors.push('Veo did not return a long-running operation name.');
          continue;
        }

        const deadline = Date.now() + overallTimeoutMs;
        let completedPayload: any = null;

        while (Date.now() < deadline) {
          await sleep(pollIntervalMs);

          const statusResponse = await fetchWithTimeout(
            `${GEMINI_BASE_URL}/${operation.name}`,
            {
              method: 'GET',
              headers: {
                'x-goog-api-key': apiKey,
                Accept: 'application/json',
              },
              cache: 'no-store',
            },
            20_000,
          );

          if (!statusResponse.ok) {
            const statusText = await statusResponse.text().catch(() => '');
            throw new Error(
              `Veo status HTTP ${statusResponse.status}${statusText ? `: ${statusText.slice(0, 180)}` : ''}`,
            );
          }

          const statusPayload = await statusResponse.json() as any;
          if (!statusPayload.done) continue;

          if (statusPayload.error) {
            throw new Error(
              statusPayload.error.message ||
              `Veo generation failed with code ${statusPayload.error.code || 'unknown'}.`,
            );
          }

          completedPayload = statusPayload;
          break;
        }

        if (!completedPayload) {
          errors.push(`Veo generation timed out after ${overallTimeoutMs}ms.`);
          continue;
        }

        const videoUri =
          completedPayload?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
          completedPayload?.response?.generatedVideos?.[0]?.video?.uri;

        if (!videoUri || typeof videoUri !== 'string') {
          errors.push('Veo completed without a generated video URI.');
          continue;
        }

        const videoResponse = await fetchWithTimeout(
          videoUri,
          {
            method: 'GET',
            headers: {
              'x-goog-api-key': apiKey,
              Accept: 'video/mp4,video/*,*/*;q=0.8',
            },
            cache: 'no-store',
          },
          60_000,
        );

        if (!videoResponse.ok) {
          errors.push(`Veo video download HTTP ${videoResponse.status}.`);
          continue;
        }

        const buffer = Buffer.from(await videoResponse.arrayBuffer());
        const validation = validateVideoBuffer(buffer);
        if (!validation.valid) {
          errors.push(`Veo returned invalid video data: ${validation.error || 'validation failed'}.`);
          continue;
        }

        return {
          buffer,
          mimeType: validation.mimeType || videoResponse.headers.get('content-type') || 'video/mp4',
          providerName: `Google ${model}`,
          durationSeconds: validation.duration || 8,
          generationTimeMs: Date.now() - startedAt,
        };
      } catch (error: any) {
        errors.push(error?.message || String(error));
      }
    }

    throw new Error(
      `Google Veo could not complete this video brief. ${errors.slice(-3).join(' | ')}`.trim(),
    );
  }
}
