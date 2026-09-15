import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { BusinessContextService } from '@ralion/ai/server';
import { getCurrentRalionContext, authRequiredResponse } from '../../../../lib/auth/serverAuth';
import { MariCreditsService } from '@/lib/services/mari/mariCredits.service';

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
    const workspaceId = serverCtx?.workspace?.id || body.workspaceId;
    const userId = serverCtx?.user?.id || body.userId;
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

    if (serverCtx && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId)) {
      try {
        const durableCredits = await MariCreditsService.getSummary(orgId);
        context.credits = {
          totalAllocated: durableCredits.allocatedCredits,
          used: durableCredits.usedCredits,
          remaining: durableCredits.remainingCredits,
          tier: durableCredits.planId,
          planName: durableCredits.planId === 'COMMUNITY'
            ? 'Community Plan'
            : durableCredits.planId === 'STARTER'
              ? 'Starter Plan'
              : durableCredits.planId === 'PROFESSIONAL'
                ? 'Professional Plan'
                : 'Enterprise Plan',
        };
      } catch (creditErr: any) {
        console.warn('[Mari Context API] Durable credit hydration notice:', creditErr?.message || creditErr);
      }
    }

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
