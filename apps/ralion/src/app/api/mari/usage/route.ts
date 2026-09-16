import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { MariTokenTelemetryService } from '@ralion/ai/server';
import { MariCreditsService } from '@/lib/services/mari/mariCredits.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/mari/usage
 * Authoritative authenticated tenant-scoped Mari AI usage and credit stats.
 * Tokens are telemetry; credits are the durable product allowance.
 */
export async function GET(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const serverCtx = required.context;

    const orgId =
      serverCtx.organization?.id ||
      serverCtx.workspace.organization_id ||
      serverCtx.workspace.id;

    const [telemetry, credits] = await Promise.all([
      MariTokenTelemetryService.getAuthoritativeUsage(orgId),
      MariCreditsService.getSummary(orgId),
    ]);

    return corsJsonResponse({
      success: true,
      data: {
        organizationId: orgId,
        queryCount: telemetry.requestCount,
        totalPromptTokens: telemetry.totalPromptTokens,
        totalCompletionTokens: telemetry.totalCompletionTokens,
        totalTokens: telemetry.totalTokens,
        credits,
        timestamp: new Date().toISOString(),
      },
    }, undefined, request);
  } catch (err: any) {
    console.error('[Mari Usage API] Failed to retrieve usage:', err?.message || err);
    return corsJsonResponse({
      success: false,
      code: 'MARI_USAGE_UNAVAILABLE',
      error: 'Mari usage is temporarily unavailable. Please retry.',
    }, { status: 500 }, request);
  }
}
