import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { getCurrentRalionContext, authRequiredResponse } from '@/lib/auth/serverAuth';
import { MariCreditGateway, MariTokenTelemetryService } from '@ralion/ai/server';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/mari/usage
 * Authoritative authenticated tenant-scoped Mari AI usage stats.
 * The durable tenant credit wallet is the billing source of truth; token
 * telemetry is retained as operational observability only.
 */
export async function GET(request: NextRequest) {
  try {
    const serverCtx = await getCurrentRalionContext(request, { requireAuth: true });
    if (!serverCtx) {
      return authRequiredResponse(request, 'Authentication required to view Mari usage.');
    }

    const orgId =
      serverCtx.organization?.id ||
      serverCtx.workspace.organization_id ||
      serverCtx.workspace.id;

    const [telemetry, credits] = await Promise.all([
      MariTokenTelemetryService.getAuthoritativeUsage(orgId),
      MariCreditGateway.getSummary(orgId),
    ]);

    return corsJsonResponse({
      success: true,
      data: {
        organizationId: orgId,
        credits,
        monthlyQuota: credits.monthlyQuota,
        usedCredits: credits.usedCredits,
        remainingCredits: credits.remainingCredits,
        reservedCredits: credits.reservedCredits,
        bonusCreditsRemaining: credits.bonusCreditsRemaining,
        utilizationRate: credits.utilizationRate,
        periodStart: credits.periodStart,
        periodEnd: credits.periodEnd,
        queryCount: telemetry.requestCount,
        totalPromptTokens: telemetry.totalPromptTokens,
        totalCompletionTokens: telemetry.totalCompletionTokens,
        totalTokens: telemetry.totalTokens,
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
