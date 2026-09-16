import { NextRequest } from 'next/server';
import { BusinessContextService } from '@ralion/ai/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { requireRalionContext } from '../../../../lib/auth/serverAuth';
import { MariBusinessIntelligenceService } from '../../../../lib/services/mari/mariBusinessIntelligence.service';
import { MariMarketingLearningService } from '../../../../lib/services/mari/mariMarketingLearning.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/mari/intelligence
 * Returns a deterministic, server-derived tenant Business Intelligence snapshot
 * and refreshes evidence-backed marketing learnings from the same trusted data.
 * Client-supplied tenant IDs are never used as authority.
 */
export async function GET(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const serverCtx = required.context;

    const organizationId = serverCtx.organization?.id || serverCtx.workspace.organization_id || serverCtx.workspace.id;
    const workspaceId = serverCtx.workspace.id;
    const userId = serverCtx.user.id;
    const companyName = serverCtx.organization?.name || serverCtx.workspace.name || '';

    const businessContext = await BusinessContextService.assembleContext(organizationId, {
      organizationId,
      workspaceId,
      userId,
      companyName,
    });

    const intelligence = await MariBusinessIntelligenceService.getBusinessIntelligence({
      organizationId,
      workspaceId,
      userId,
      companyName,
      businessContext,
    });

    let learningRefresh: any = { learned: 0, reason: 'NOT_ATTEMPTED' };
    try {
      learningRefresh = await MariMarketingLearningService.refreshFromBusinessIntelligence({ organizationId, workspaceId, userId }, intelligence);
    } catch (learningError: any) {
      // BI remains available even when the learning ledger is temporarily unavailable.
      console.error('[Mari Intelligence API] Marketing learning refresh failed:', learningError?.message || learningError);
      learningRefresh = { learned: 0, reason: 'LEARNING_REFRESH_FAILED' };
    }

    return corsJsonResponse({
      success: true,
      intelligence,
      learningRefresh,
    }, undefined, request);
  } catch (error: any) {
    console.error('[Mari Intelligence API] Exception:', error);
    return corsJsonResponse({
      success: false,
      code: 'MARI_INTELLIGENCE_FAILED',
      error: "Mari couldn't build the business intelligence snapshot right now. Please retry.",
    }, { status: 500 }, request);
  }
}
