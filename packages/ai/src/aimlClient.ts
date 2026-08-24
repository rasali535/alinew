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

const AIML_BASE_URL = 'https://api.aimlapi.com/v1';
const AIML_API_KEY = process.env.AIML_API_KEY || process.env.NEXT_PUBLIC_AIML_API_KEY || '';

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
 * Core AI/ML API call — sends messages to any supported model.
 * Default model: gemini/gemini-2.0-flash (fast, capable)
 */
export async function callAimlApi(
  messages: AimlMessage[],
  options: AimlRequestOptions = {}
): Promise<string> {
  const {
    model = 'gemini/gemini-2.0-flash',
    maxTokens = 1024,
    temperature = 0.7,
  } = options;

  if (!AIML_API_KEY) {
    console.warn('[Mari AI] No AIML_API_KEY found, using fallback engine');
    return '';
  }

  try {
    const res = await fetch(`${AIML_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIML_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Mari AI] API error:', res.status, errText);
      return '';
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  } catch (err) {
    console.error('[Mari AI] Network error:', err);
    return '';
  }
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
export async function generateHfImage(options: {
  prompt: string;
  model?: string;
  quality?: 'fast' | 'best';
}): Promise<HfGenerationResult> {
  try {
    const isBrowser = typeof window !== 'undefined';
    const base = isBrowser
      ? (window.location.origin + '/ralion')
      : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:6509/ralion');

    const res = await fetch(`${base}/api/mari/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'image',
        prompt: options.prompt,
        model: options.model,
        quality: options.quality || 'fast',
      }),
    });

    if (!res.ok) return { success: false, error: `Proxy error ${res.status}` };
    return await res.json() as HfGenerationResult;
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Generate a video via HuggingFace CogVideoX models.
 * Routes through /api/mari/generate (server-side) to keep HF_API_KEY secure.
 *
 * Model priority (fast):
 *   CogVideoX-2b → CogVideoX1.5-5B → CogVideoX-5b
 * Model priority (best):
 *   CogVideoX1.5-5B → CogVideoX-5b → CogVideoX-2b
 */
export async function generateHfVideo(options: {
  prompt: string;
  model?: string;
  quality?: 'fast' | 'best';
}): Promise<HfGenerationResult> {
  try {
    const isBrowser = typeof window !== 'undefined';
    const base = isBrowser
      ? (window.location.origin + '/ralion')
      : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:6509/ralion');

    const res = await fetch(`${base}/api/mari/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'video',
        prompt: options.prompt,
        model: options.model,
        quality: options.quality || 'fast',
      }),
    });

    if (!res.ok) return { success: false, error: `Proxy error ${res.status}` };
    return await res.json() as HfGenerationResult;
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
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
    // Determine the correct base URL depending on execution context
    const isBrowser = typeof window !== 'undefined';
    const base = isBrowser
      ? (window.location.origin + '/ralion')
      : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:6509/ralion');

    const res = await fetch(`${base}/api/mari/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: options.prompt,
        model: options.model || 'klingai/video-v3-turbo-pro-text-to-video',
        pollIntervalMs: options.pollIntervalMs || 5000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Proxy error ${res.status}: ${errText}` };
    }

    return await res.json() as VideoGenerationResult;
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}
