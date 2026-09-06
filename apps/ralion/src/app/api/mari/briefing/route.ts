import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { BusinessContextService, MariBriefingService } from '@ralion/ai';
import { getCurrentRalionContext } from '../../../../lib/auth/serverAuth';

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
    const serverCtx = await getCurrentRalionContext(request, { requireAuth: false });
    const body = await request.json().catch(() => ({}));

    let canonicalOrgId = 'unconfigured-tenant';
    if (serverCtx) {
      canonicalOrgId = serverCtx.organization?.id || serverCtx.workspace.organization_id || serverCtx.workspace.id;
    } else if (body.organizationId && body.organizationId !== 'org_demo' && body.organizationId !== 'default') {
      return corsJsonResponse(
        { success: false, code: 'AUTHENTICATION_REQUIRED', error: 'Authentication required' },
        { status: 401 },
        request
      );
    }

    const requestedOrgId = body.organizationId || request.headers.get('x-organization-id');
    if (serverCtx && requestedOrgId && requestedOrgId !== canonicalOrgId && requestedOrgId !== serverCtx.workspace.id && requestedOrgId !== serverCtx.user.id) {
      return corsJsonResponse(
        { success: false, code: 'TENANT_CONTEXT_MISMATCH', error: 'Forbidden: Cannot access another tenant context' },
        { status: 403 },
        request
      );
    }

    const orgId = canonicalOrgId;
    const activeScreen = body.activeScreen;
    const forceRefresh = Boolean(body.forceRefresh);

    const context = await BusinessContextService.assembleContext(orgId, {
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
