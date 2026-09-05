import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { getCurrentRalionContext, authRequiredResponse } from '@/lib/auth/serverAuth';
import { MariTokenTelemetryService } from '@ralion/ai';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/mari/usage
 * Authoritative tenant-scoped Mari AI usage stats.
 */
export async function GET(request: NextRequest) {
  try {
    const serverCtx = await getCurrentRalionContext(request, { requireAuth: false });
    const orgId =
      request.nextUrl.searchParams.get('organizationId') ||
      serverCtx?.workspace.id ||
      serverCtx?.user.id ||
      request.headers.get('x-organization-id') ||
      request.headers.get('x-workspace-id') ||
      'ras-ali-labs';

    const count = await MariTokenTelemetryService.getAuthoritativeUsageCount(orgId);
    const telemetry = MariTokenTelemetryService.getTotalUsage(orgId);

    return corsJsonResponse({
      success: true,
      data: {
        organizationId: orgId,
        queryCount: Math.max(count, telemetry.requestCount),
        totalPromptTokens: telemetry.totalPromptTokens,
        totalCompletionTokens: telemetry.totalCompletionTokens,
        totalTokens: telemetry.totalTokens,
        timestamp: new Date().toISOString(),
      },
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({
      success: false,
      error: err.message || 'Failed to retrieve Mari usage',
    }, { status: 500 }, request);
  }
}
