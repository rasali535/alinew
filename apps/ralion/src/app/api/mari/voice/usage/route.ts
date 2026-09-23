import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { getPrivilegedSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function boundedInteger(value: unknown, max: number): number {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(Math.floor(parsed), max));
}

/**
 * POST /api/mari/voice/usage
 *
 * Phase 2 telemetry only. This records tenant-scoped Realtime usage so
 * plan/minute economics can be attached later without guessing from provider bills.
 * It intentionally does not deduct Mari credits yet.
 */
export async function POST(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;

    const serverCtx = required.context;
    const organizationId =
      serverCtx.organization?.id ||
      serverCtx.workspace.organization_id ||
      serverCtx.workspace.id;
    const workspaceId = serverCtx.workspace.id;
    const userId = serverCtx.user.id;

    const payload = await request.json().catch(() => null) as any;
    if (!payload || typeof payload.sessionId !== 'string' || !payload.sessionId.trim()) {
      return Response.json(
        { success: false, code: 'VOICE_USAGE_INVALID', error: 'A voice session id is required.' },
        { status: 400 }
      );
    }

    const requestedOrgId = request.headers.get('x-organization-id');
    const requestedWorkspaceId = request.headers.get('x-workspace-id');
    if (
      (requestedOrgId && requestedOrgId !== organizationId && requestedOrgId !== workspaceId) ||
      (requestedWorkspaceId && requestedWorkspaceId !== workspaceId)
    ) {
      return Response.json(
        { success: false, code: 'TENANT_CONTEXT_MISMATCH', error: 'Voice usage tenant context mismatch.' },
        { status: 403 }
      );
    }

    const startedAtMs = Number(payload.startedAtMs || 0);
    const endedAtMs = Number(payload.endedAtMs || Date.now());
    const startedAt = new Date(
      Number.isFinite(startedAtMs) && startedAtMs > 0 ? startedAtMs : endedAtMs
    );
    const endedAt = new Date(
      Number.isFinite(endedAtMs) && endedAtMs > 0 ? endedAtMs : Date.now()
    );
    const derivedDuration = Math.max(0, endedAt.getTime() - startedAt.getTime());

    const row = {
      organization_id: organizationId,
      workspace_id: workspaceId,
      user_id: userId,
      session_id: payload.sessionId.trim().slice(0, 180),
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_ms: boundedInteger(payload.durationMs ?? derivedDuration, 4 * 60 * 60 * 1000),
      user_turns: boundedInteger(payload.userTurns, 10000),
      assistant_turns: boundedInteger(payload.assistantTurns, 10000),
      input_tokens: boundedInteger(payload.inputTokens, 1000000000),
      output_tokens: boundedInteger(payload.outputTokens, 1000000000),
      input_audio_tokens: boundedInteger(payload.inputAudioTokens, 1000000000),
      output_audio_tokens: boundedInteger(payload.outputAudioTokens, 1000000000),
      model: String(payload.model || process.env.MARI_VOICE_MODEL || 'gpt-realtime-2.1').slice(0, 120),
      updated_at: new Date().toISOString(),
    };

    const supabase = getPrivilegedSupabase();
    const { error } = await supabase
      .from('mari_voice_usage_sessions')
      .upsert(row, { onConflict: 'organization_id,session_id' });

    if (error) {
      throw new Error(error.message);
    }

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('[Mari Voice Usage] Failed to record usage:', error?.message || error);
    return Response.json(
      { success: false, code: 'VOICE_USAGE_UNAVAILABLE', error: 'Unable to record Mari Voice usage.' },
      { status: 500 }
    );
  }
}
