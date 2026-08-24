import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { executeMariAction, MariActionPayload } from '@ralion/ai';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/mari/actions
 * Executes a user-approved Mari action within authorized security boundaries.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action: MariActionPayload = body.action;

    if (!action || !action.type) {
      return corsJsonResponse({ success: false, error: 'Action payload is required' }, { status: 400 }, request);
    }

    const result = await executeMariAction(action);

    return corsJsonResponse({
      success: result.success,
      message: result.message,
      outputData: result.outputData,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({
      success: false,
      error: err.message || 'Failed to execute action',
    }, { status: 500 }, request);
  }
}
