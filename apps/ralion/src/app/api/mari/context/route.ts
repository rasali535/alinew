import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { BusinessContextService } from '@ralion/ai';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/mari/context
 * Assembles and returns the organization's 3-Layer Business Context.
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
