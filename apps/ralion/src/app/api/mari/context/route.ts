import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { BusinessContextService } from '@ralion/ai';
import { getCurrentRalionContext, authRequiredResponse } from '../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/mari/context
 * Assembles and returns the organization's 3-Layer Business Context.
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
      // Unauthenticated caller attempting to supply tenant
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

    return corsJsonResponse({
      success: true,
      context,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({
      success: false,
      error: err.message || 'Failed to assemble business context',
    }, { status: 500 }, request);
  }
}
