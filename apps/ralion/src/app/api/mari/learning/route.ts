import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { requireRalionContext } from '../../../../lib/auth/serverAuth';
import { MariMarketingLearningService } from '../../../../lib/services/mari/mariMarketingLearning.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) { return handleCorsPreflight(request); }

function tenantFromContext(ctx: any) {
  return {
    organizationId: ctx.organization?.id || ctx.workspace.organization_id || ctx.workspace.id,
    workspaceId: ctx.workspace.id,
    userId: ctx.user.id,
  };
}

/** GET /api/mari/learning — authenticated, tenant-scoped evidence-backed learnings. */
export async function GET(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const tenant = tenantFromContext(required.context);
    const learnings = await MariMarketingLearningService.listLearnings(tenant, 20);
    return corsJsonResponse({
      success: true,
      data: {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        learnings,
        rules: { evidenceBackedOnly: true, causalClaims: false, automaticPublishing: false },
      },
    }, undefined, request);
  } catch (error: any) {
    console.error('[Mari Learning API] GET failed:', error?.message || error);
    return corsJsonResponse({ success: false, code: 'MARI_LEARNING_FAILED', error: 'Mari could not load marketing learnings right now.' }, { status: 500 }, request);
  }
}

/**
 * POST /api/mari/learning { action: 'REFRESH' }
 * Reconciles canonical Ralion publication history with live platform evidence,
 * stores new outcome snapshots, then recalculates evidence-backed learnings.
 */
export async function POST(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim().toUpperCase();
    if (action !== 'REFRESH') {
      return corsJsonResponse({ success: false, code: 'INVALID_ACTION', error: 'Supported action: REFRESH.' }, { status: 400 }, request);
    }

    const tenant = tenantFromContext(required.context);
    const refresh = await MariMarketingLearningService.refreshFromPublishedPerformance(tenant);
    const learnings = await MariMarketingLearningService.listLearnings(tenant, 20);
    return corsJsonResponse({
      success: true,
      data: {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        refresh,
        learnings,
        rules: { evidenceBackedOnly: true, causalClaims: false, automaticPublishing: false },
      },
    }, undefined, request);
  } catch (error: any) {
    console.error('[Mari Learning API] POST failed:', error?.message || error);
    return corsJsonResponse({ success: false, code: 'MARI_LEARNING_REFRESH_FAILED', error: 'Mari could not refresh marketing learnings right now.' }, { status: 500 }, request);
  }
}
