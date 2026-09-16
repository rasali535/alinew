import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { BusinessContextService } from '@ralion/ai/server';
import { requireRalionContext } from '../../../../lib/auth/serverAuth';
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

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId)) {
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
