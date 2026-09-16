import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { BusinessContextService, MariBriefingService } from '@ralion/ai/server';
import { requireRalionContext } from '../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/mari/briefing
 * Generates proactive executive briefing & structured insight cards from organization context.
 * Scoped strictly to the authenticated tenant.
 */
export async function POST(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const serverCtx = required.context;
    const body = await request.json().catch(() => ({}));

    const canonicalOrgId = serverCtx.organization?.id || serverCtx.workspace.organization_id || serverCtx.workspace.id;

    const requestedOrgId = body.organizationId || request.headers.get('x-organization-id');
    if (requestedOrgId && requestedOrgId !== canonicalOrgId && requestedOrgId !== serverCtx.workspace.id) {
      return corsJsonResponse(
        { success: false, code: 'TENANT_CONTEXT_MISMATCH', error: 'Forbidden: Cannot access another tenant context' },
        { status: 403 },
        request
      );
    }

    const orgId = canonicalOrgId;
    const workspaceId = serverCtx.workspace.id;
    const userId = serverCtx.user.id;
    const activeScreen = body.activeScreen;
    const forceRefresh = Boolean(body.forceRefresh);

    const context = await BusinessContextService.assembleContext(orgId, {
      organizationId: orgId,
      workspaceId,
      userId,
      activeScreen,
      forceRefresh,
      localOverrides: body.localOverrides,
    });

    const briefing = MariBriefingService.generateBriefing(context);

    return corsJsonResponse({
      success: true,
      briefing,
      contextVersion: context.version,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({
      success: false,
      error: err.message || 'Failed to generate proactive briefing',
    }, { status: 500 }, request);
  }
}
