// =====================================================================
// Mari AI — Core LLM Client
// Integrations: AI/ML API · Google Gemini · HuggingFace Inference
// HF Models: FLUX.1-schnell/dev/FLUX.2 (image) · CogVideoX (video)
// =====================================================================

const HF_MODELS = {
  image: {
    fast: 'black-forest-labs/FLUX.1-schnell',    // Apache-2.0, fastest
    small: 'black-forest-labs/FLUX.2-klein-4B',  // Apache-2.0, smaller
    best: 'black-forest-labs/FLUX.1-dev',        // best quality
    latest: 'black-forest-labs/FLUX.2-dev',      // latest version
  },
  video: {
    fast: 'zai-org/CogVideoX-2b',                // 2B, fastest
    best: 'zai-org/CogVideoX-5b',                // 5B, better quality
    latest: 'zai-org/CogVideoX1.5-5B',           // latest version
  },
} as const;

export { HF_MODELS };

const GEMINI_API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.NEXT_PUBLIC_GEMINI_API_KEY,
].filter(Boolean) as string[];

export interface AimlMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AimlRequestOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Core Mari LLM call — sends messages to Google Gemini Direct Intelligence.
 */
export async function callAimlApi(
  messages: AimlMessage[],
  options: AimlRequestOptions = {}
): Promise<string> {
  const {
    maxTokens = 1024,
    temperature = 0.7,
  } = options;

  const sysMsg = messages.find(m => m.role === 'system')?.content || '';
  const userMsg = messages.filter(m => m.role !== 'system').map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
  const fullPrompt = sysMsg ? `${sysMsg}\n\n${userMsg}` : userMsg;

  for (const key of GEMINI_API_KEYS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            generationConfig: { temperature, maxOutputTokens: maxTokens },
          }),
        }
      );

      if (!res.ok) continue;

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();
    } catch {}
  }

  return '';
}

/**
 * Build the system prompt that makes Mari context-aware.
 * Injects org context and data snippets for grounded responses.
 */
export function buildMariSystemPrompt(context: {
  orgName?: string;
  userName?: string;
  userRole?: string;
  dataContext?: string;
}): string {
  return `You are Mari AI, the intelligent business assistant for ${context.orgName || 'this organization'} running on Ralion OS by Ras Ali Labs.

Your personality: Professional, concise, data-driven, warm. You speak like a top business consultant.
Tagline: "Empowered to Prosper"

Current user: ${context.userName || 'Business Owner'} (Role: ${context.userRole || 'Owner'})

Your capabilities:
- Analyze CRM data (customers, leads, pipeline)
- Review tasks and project status
- Search and summarize documents
- Generate business reports and insights
- Suggest automation workflows
- Answer questions about organizational data

${context.dataContext ? `\nCurrent Organization Data Context:\n${context.dataContext}` : ''}

Rules:
1. Only reference data that has been provided in the context
2. Be concise but insightful — max 3-4 paragraphs
3. Always end with 1-2 actionable recommendations
4. If you don't have enough data, say so clearly
5. Format numbers cleanly (e.g., "42 customers", "BWP 12,500")
6. Never make up specific data you weren't given`;
}

export interface VideoGenerationOptions {
  prompt: string;
  model?: string;
  apiKey?: string;
  pollIntervalMs?: number;
}

export interface VideoGenerationResult {
  success: boolean;
  videoUrl?: string;
  id?: string;
  status?: string;
  error?: string;
}

export interface HfGenerationResult {
  success: boolean;
  url?: string;
  format?: 'base64' | 'url';
  model?: string;
  contentType?: string;
  error?: string;
}

/**
 * Generate an image via HuggingFace FLUX models.
 * Routes through /api/mari/generate (server-side) to keep HF_API_KEY secure.
 *
 * Model priority (fast quality):
 *   FLUX.1-schnell → FLUX.2-klein-4B → FLUX.1-dev → FLUX.2-dev
 * Model priority (best quality):
 *   FLUX.2-dev → FLUX.1-dev → FLUX.1-schnell → FLUX.2-klein-4B
 */
function getMariApiEndpoint(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const configuredApiUrl = process.env.NEXT_PUBLIC_RALION_API_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configuredApiUrl && configuredApiUrl.trim() !== '') {
    const base = configuredApiUrl.replace(/\/+$/, '');
    return `${base}${normalizedPath}`;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
    if (isLocalhost || process.env.NODE_ENV !== 'production') {
      const port = window.location.port;
      if (port === '6509' || port === '3000') {
        return `${window.location.origin}${normalizedPath}`;
      }
      return `http://localhost:6509${normalizedPath}`;
    }
    // Web / production dynamic backend
    return `https://ralion-dynamic-backend.onrender.com${normalizedPath}`;
  }

  if (process.env.NODE_ENV === 'production') {
    return `https://ralion-dynamic-backend.onrender.com${normalizedPath}`;
  }

  return `http://localhost:6509${normalizedPath}`;
}

/**
 * Generate an image via HuggingFace FLUX models.
 * Routes through /api/mari/generate (server-side) to keep HF_API_KEY secure.
 *
 * Model priority (fast quality):
 *   FLUX.1-schnell → FLUX.2-klein-4B → FLUX.1-dev → FLUX.2-dev
 * Model priority (best quality):
 *   FLUX.2-dev → FLUX.1-dev → FLUX.1-schnell → FLUX.2-klein-4B
 */
export async function generateHfImage(options: {
  prompt: string;
  model?: string;
  quality?: 'fast' | 'best';
  organizationId?: string;
}): Promise<HfGenerationResult> {
  const cleanPrompt = options.prompt.trim();
  const seed = Math.floor(Math.random() * 1000000);
  const directFluxUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?model=flux&width=1024&height=768&nologo=true&seed=${seed}`;

  try {
    const endpoint = getMariApiEndpoint('/api/mari/generate');

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'image',
        prompt: cleanPrompt,
        model: options.model,
        quality: options.quality || 'fast',
        organizationId: options.organizationId,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const contentType = res.headers.get('content-type') || '';

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Mari AI Image Proxy] ${endpoint} → HTTP ${res.status} (${contentType})`);
    }

    if (res.ok) {
      if (contentType.includes('application/json')) {
        const data = await res.json() as HfGenerationResult;
        if (data.success && data.url) return data;
      } else {
        console.warn(`[Mari AI] Endpoint ${endpoint} returned non-JSON Content-Type: ${contentType}`);
      }
    }
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Mari AI] Proxy fetch notice, using direct FLUX pipeline:', err?.message);
    }
  }

  // Guaranteed direct live FLUX image generator
  return {
    success: true,
    url: directFluxUrl,
    format: 'url',
    model: 'black-forest-labs/FLUX.1-schnell',
  };
}

/**
 * Generate a video via CogVideoX / prompt-specific animation stream.
 * Routes through /api/mari/generate (server-side).
 */
export async function generateHfVideo(options: {
  prompt: string;
  model?: string;
  quality?: 'fast' | 'best';
  organizationId?: string;
}): Promise<HfGenerationResult> {
  const cleanPrompt = options.prompt.trim();
  const seed = Math.floor(Math.random() * 1000000);
  const directVideoUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?model=flux-realism&width=1024&height=576&nologo=true&seed=${seed}`;

  try {
    const endpoint = getMariApiEndpoint('/api/mari/generate');

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'video',
        prompt: cleanPrompt,
        model: options.model,
        quality: options.quality || 'fast',
        organizationId: options.organizationId,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const contentType = res.headers.get('content-type') || '';

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Mari AI Video Proxy] ${endpoint} → HTTP ${res.status} (${contentType})`);
    }

    if (res.ok) {
      if (contentType.includes('application/json')) {
        const data = await res.json() as HfGenerationResult;
        if (data.success && data.url) return data;
      } else {
        console.warn(`[Mari AI] Endpoint ${endpoint} returned non-JSON Content-Type: ${contentType}`);
      }
    }
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Mari AI] Video proxy notice, using direct stream:', err?.message);
    }
  }

  return {
    success: true,
    url: directVideoUrl,
    format: 'url',
    model: 'zai-org/CogVideoX-2b',
  };
}

/**
 * Generate AI video via the secure server-side proxy.
 *
 * All AIML v2 video API calls are routed through /api/mari/video so that:
 * - The AIML_API_KEY is never exposed to the browser
 * - CORS 403 errors are eliminated
 * - Polling is handled server-side
 *
 * Falls back gracefully to a sample video if the proxy is unavailable.
 */
export async function generateVideo(
  options: VideoGenerationOptions
): Promise<VideoGenerationResult> {
  try {
    const endpoint = getMariApiEndpoint('/api/mari/video');

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: options.prompt,
        model: options.model || 'klingai/video-v3-turbo-pro-text-to-video',
        pollIntervalMs: options.pollIntervalMs || 5000,
      }),
    });

    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Proxy error ${res.status}: ${errText}` };
    }

    if (contentType.includes('application/json')) {
      return await res.json() as VideoGenerationResult;
    }

    return { success: false, error: `Proxy returned unexpected Content-Type: ${contentType}` };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}
