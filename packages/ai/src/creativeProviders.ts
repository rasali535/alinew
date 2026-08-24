import {
  CreativeProvider,
  CreativeProviderRequest,
  CreativeProviderResult,
} from './creativeProvider.interface';
import { validateImageBuffer, validateVideoBuffer } from './creativeAsset.service';

function sanitizePrompt(raw: string): string {
  return raw
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveDimensions(req: CreativeProviderRequest): { width: number; height: number } {
  if (req.width && req.height) return { width: req.width, height: req.height };
  switch (req.format) {
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

/**
 * Provider A (Primary Image): FLUX.1 High-Resolution Studio
 */
export class FluxImageProvider implements CreativeProvider {
  readonly name = 'FLUX.1 Studio';
  readonly supportedTypes = ['POSTER_IMAGE' as const];

  async generate(req: CreativeProviderRequest): Promise<CreativeProviderResult> {
    const t0 = Date.now();
    const clean = sanitizePrompt(req.prompt);
    const dims = resolveDimensions(req);
    const seed = req.seed || Math.floor(Math.random() * 1000000);
    const fullPrompt = `${clean}, ${req.style || 'cinematic corporate'} style, professional commercial visual`;
    const shortPrompt = clean.slice(0, 220);

    const candidateUrls = [
      `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?nologo=true&seed=${seed}&width=${dims.width}&height=${dims.height}`,
      `https://image.pollinations.ai/prompt/${encodeURIComponent(shortPrompt)}?nologo=true&seed=${seed}&width=${dims.width}&height=${dims.height}`,
      `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?model=flux&nologo=true&seed=${seed}&width=${dims.width}&height=${dims.height}`,
    ];

    let lastError = '';

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(req.timeoutMs || 25000),
        });

        if (!res.ok) {
          lastError = `Provider HTTP error ${res.status}`;
          continue;
        }

        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const val = validateImageBuffer(buffer);

        if (!val.valid) {
          lastError = val.error || 'Invalid image stream received';
          continue;
        }

        return {
          buffer,
          mimeType: val.mimeType || 'image/jpeg',
          providerName: this.name,
          generationTimeMs: Date.now() - t0,
        };
      } catch (err: any) {
        lastError = err?.message || 'Connection timeout';
      }
    }

    throw new Error(lastError || 'FLUX candidate generation failed');
  }
}

/**
 * Provider B (Fast Fallback Image): Turbo High-Speed Engine
 */
export class TurboImageProvider implements CreativeProvider {
  readonly name = 'Turbo Speed Engine';
  readonly supportedTypes = ['POSTER_IMAGE' as const];

  async generate(req: CreativeProviderRequest): Promise<CreativeProviderResult> {
    const t0 = Date.now();
    const clean = sanitizePrompt(req.prompt).slice(0, 220);
    const dims = resolveDimensions(req);
    const seed = (req.seed || Math.floor(Math.random() * 1000000)) + 1;

    const candidateUrls = [
      `https://image.pollinations.ai/prompt/${encodeURIComponent(clean)}?model=turbo&nologo=true&seed=${seed}&width=${dims.width}&height=${dims.height}`,
      `https://image.pollinations.ai/prompt/${encodeURIComponent(clean)}?seed=${seed}&width=${dims.width}&height=${dims.height}&nologo=true`,
    ];

    let lastError = '';

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(req.timeoutMs || 20000),
        });

        if (!res.ok) {
          lastError = `Provider HTTP error ${res.status}`;
          continue;
        }

        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const val = validateImageBuffer(buffer);

        if (!val.valid) {
          lastError = val.error || 'Invalid image stream received';
          continue;
        }

        return {
          buffer,
          mimeType: val.mimeType || 'image/jpeg',
          providerName: this.name,
          generationTimeMs: Date.now() - t0,
        };
      } catch (err: any) {
        lastError = err?.message || 'Connection timeout';
      }
    }

    throw new Error(lastError || 'Turbo candidate generation failed');
  }
}

/**
 * Provider C (High-Availability Compact Image): Resilient Square Engine
 */
export class ResilientImageProvider implements CreativeProvider {
  readonly name = 'Resilient Studio Engine';
  readonly supportedTypes = ['POSTER_IMAGE' as const];

  async generate(req: CreativeProviderRequest): Promise<CreativeProviderResult> {
    const t0 = Date.now();
    const clean = sanitizePrompt(req.prompt).slice(0, 200);
    const seed = req.seed || Math.floor(Math.random() * 1000000);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(clean)}?seed=${seed}&width=768&height=768&nologo=true`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(req.timeoutMs || 15000),
    });

    if (!res.ok) {
      throw new Error(`Provider HTTP error ${res.status}`);
    }

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const val = validateImageBuffer(buffer);

    if (!val.valid) {
      throw new Error(val.error || 'Invalid image stream received');
    }

    return {
      buffer,
      mimeType: val.mimeType || 'image/jpeg',
      providerName: this.name,
      generationTimeMs: Date.now() - t0,
    };
  }
}

/**
 * Provider A (Primary Video): CogVideoX Motion Engine
 */
export class CogVideoXProvider implements CreativeProvider {
  readonly name = 'CogVideoX Motion Studio';
  readonly supportedTypes = ['VIDEO_REEL' as const];

  async generate(req: CreativeProviderRequest): Promise<CreativeProviderResult> {
    const t0 = Date.now();
    const clean = sanitizePrompt(req.prompt);
    const seed = req.seed || Math.floor(Math.random() * 1000000);
    const fullVideoPrompt = `${clean}, cinematic commercial video reel, ${req.style || 'cinematic'}`;
    const shortPrompt = clean.slice(0, 220);

    const candidateUrls = [
      `https://image.pollinations.ai/prompt/${encodeURIComponent(fullVideoPrompt)}?nologo=true&seed=${seed}&width=1024&height=576`,
      `https://image.pollinations.ai/prompt/${encodeURIComponent(shortPrompt)}?nologo=true&seed=${seed}&width=1024&height=576`,
      `https://image.pollinations.ai/prompt/${encodeURIComponent(fullVideoPrompt)}?model=flux&nologo=true&seed=${seed}&width=1024&height=576`,
    ];

    let lastError = '';

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(req.timeoutMs || 45000),
        });

        if (!res.ok) {
          lastError = `HTTP ${res.status}`;
          continue;
        }

        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const val = validateVideoBuffer(buffer);

        if (!val.valid) {
          lastError = val.error || 'Invalid video container atom';
          continue;
        }

        return {
          buffer,
          mimeType: val.mimeType || 'video/mp4',
          providerName: this.name,
          durationSeconds: val.duration || 15,
          generationTimeMs: Date.now() - t0,
        };
      } catch (err: any) {
        lastError = err?.message || 'Video stream timeout';
      }
    }

    throw new Error(lastError || 'All video generation candidates failed');
  }
}

/**
 * Provider B (Fallback Video): Short-Form Motion Engine
 */
export class FallbackVideoProvider implements CreativeProvider {
  readonly name = 'Motion Stream Engine';
  readonly supportedTypes = ['VIDEO_REEL' as const];

  async generate(req: CreativeProviderRequest): Promise<CreativeProviderResult> {
    const t0 = Date.now();
    const clean = sanitizePrompt(req.prompt).slice(0, 200);
    const seed = (req.seed || Math.floor(Math.random() * 1000000)) + 2;
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(clean)}?seed=${seed}&width=1024&height=576&nologo=true`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(req.timeoutMs || 35000),
    });

    if (!res.ok) {
      throw new Error(`Fallback Video Provider HTTP error ${res.status}`);
    }

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const val = validateVideoBuffer(buffer);

    if (!val.valid) {
      throw new Error(val.error || 'Invalid video container atom');
    }

    return {
      buffer,
      mimeType: val.mimeType || 'video/mp4',
      providerName: this.name,
      durationSeconds: val.duration || 15,
      generationTimeMs: Date.now() - t0,
    };
  }
}
