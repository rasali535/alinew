import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { executeWorkflowsForEvent } from '@/lib/operations/workflowEngine';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;
    const body = await request.json().catch(() => ({}));
    const workflowId = String(body.workflowId || '').trim();
    if (!workflowId) return corsJsonResponse({ success: false, error: 'workflowId is required.' }, { status: 400 }, request);
    const executions = await executeWorkflowsForEvent({
      workspaceId: ctx.workspace.id,
      organizationId: ctx.organization?.id,
      userId: ctx.user.id,
      triggerEvent: 'MANUAL',
      workflowId,
      input: body.input && typeof body.input === 'object' ? body.input : {},
    });
    if (!executions.length) return corsJsonResponse({ success: false, error: 'Active workflow not found.' }, { status: 404 }, request);
    return corsJsonResponse({ success: true, executions }, undefined, request);
  } catch (error: any) {
    console.error('[Workflow Execute API] failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Workflow execution failed.' }, { status: 500 }, request);
  }
}
