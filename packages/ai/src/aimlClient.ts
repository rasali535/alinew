// =====================================================================
// Mari AI — Core LLM Client using AI/ML API
// Model Gateway: https://api.aimlapi.com (supports Gemini, GPT, etc.)
// =====================================================================

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

/**
 * Generate AI video using AIML API v2 video generation service.
 * Default model: klingai/video-v3-turbo-pro-text-to-video
 */
export async function generateVideo(
  options: VideoGenerationOptions
): Promise<VideoGenerationResult> {
  const apiKey = options.apiKey || AIML_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'No AIML_API_KEY provided' };
  }

  const model = options.model || 'klingai/video-v3-turbo-pro-text-to-video';
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  try {
    const startRes = await fetch('https://api.aimlapi.com/v2/video/generations', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        prompt: options.prompt,
      }),
    });

    if (!startRes.ok) {
      const errText = await startRes.text();
      return { success: false, error: `API error ${startRes.status}: ${errText}` };
    }

    const job = await startRes.json();
    const generationId = job.id;
    if (!generationId) {
      return { success: false, error: 'No generation ID returned by API' };
    }

    const pollInterval = options.pollIntervalMs || 5000;
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const statusRes = await fetch(
        `https://api.aimlapi.com/v2/video/generations?generation_id=${generationId}`,
        { headers }
      );

      if (!statusRes.ok) continue;

      const res = await statusRes.json();
      const status = res.status;

      if (status === 'completed') {
        const videoUrl = res.video?.url || res.url || res.output?.url;
        return { success: true, videoUrl, id: generationId, status };
      } else if (status === 'error' || status === 'failed') {
        return { success: false, error: res.error || 'Video generation failed', id: generationId, status };
      }
    }
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}
