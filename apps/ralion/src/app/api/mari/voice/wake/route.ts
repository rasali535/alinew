import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';

export const dynamic = 'force-dynamic';

const lastWakeRequestByUser = new Map<string, number>();
const MIN_WAKE_INTERVAL_MS = 2000;
const MAX_WAKE_AUDIO_BYTES = 2 * 1024 * 1024;

function normalizeWakeTranscript(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsMariWakePhrase(value: string): boolean {
  const normalized = normalizeWakeTranscript(value);
  return /\b(?:hey|okay|ok) mari\b|\bmari wake up\b/.test(normalized);
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return corsJsonResponse(
        { success: false, code: 'OPENAI_API_KEY_MISSING', wake: false },
        { status: 503 },
        request
      );
    }

    const rateKey = `${context.user.id}:${context.workspace.id}`;
    const now = Date.now();
    const last = lastWakeRequestByUser.get(rateKey) || 0;
    if (now - last < MIN_WAKE_INTERVAL_MS) {
      return corsJsonResponse(
        { success: true, wake: false, throttled: true },
        undefined,
        request
      );
    }
    lastWakeRequestByUser.set(rateKey, now);

    const form = await request.formData();
    const audio = form.get('audio');
    if (!(audio instanceof File)) {
      return corsJsonResponse(
        { success: false, wake: false, error: 'Wake audio is required.' },
        { status: 400 },
        request
      );
    }

    if (audio.size <= 0 || audio.size > MAX_WAKE_AUDIO_BYTES) {
      return corsJsonResponse(
        { success: false, wake: false, error: 'Wake audio size is invalid.' },
        { status: 400 },
        request
      );
    }

    const upstreamForm = new FormData();
    upstreamForm.append('file', audio, audio.name || 'wake.webm');
    upstreamForm.append('model', process.env.MARI_WAKE_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe');
    upstreamForm.append('language', 'en');

    const upstream = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: upstreamForm,
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.warn(
        '[Mari Wake] Transcription provider returned non-success:',
        upstream.status,
        detail.slice(0, 240)
      );
      return corsJsonResponse(
        { success: false, wake: false, error: 'Wake transcription is temporarily unavailable.' },
        { status: 502 },
        request
      );
    }

    const payload = await upstream.json().catch(() => ({}));
    const transcript = String(payload?.text || '');
    const wake = containsMariWakePhrase(transcript);

    return corsJsonResponse(
      { success: true, wake },
      undefined,
      request
    );
  } catch (error: any) {
    console.error('[Mari Wake] Detection error:', error?.message || error);
    return corsJsonResponse(
      { success: false, wake: false, error: 'Wake detection failed.' },
      { status: 500 },
      request
    );
  }
}
