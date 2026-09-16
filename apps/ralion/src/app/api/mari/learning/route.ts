import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { requireRalionContext } from '../../../../lib/auth/serverAuth';
import { MariMarketingLearningService } from '../../../../lib/services/mari/mariMarketingLearning.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) { return handleCorsPreflight(request); }

/** GET /api/mari/learning — authenticated, tenant-scoped evidence-backed learnings. */
export async function GET(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;
    const tenant = {
      organizationId: ctx.organization?.id || ctx.workspace.organization_id || ctx.workspace.id,
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
    };
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
