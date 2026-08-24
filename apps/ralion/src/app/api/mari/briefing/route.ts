import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { BusinessContextService, MariBriefingService } from '@ralion/ai';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/mari/briefing
 * Generates proactive executive briefing & structured insight cards from organization context.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const orgId = body.organizationId || 'ras-ali-labs';
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
