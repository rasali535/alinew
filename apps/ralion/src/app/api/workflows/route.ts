import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getServiceSupabase, requireRalionContext } from '@/lib/auth/serverAuth';
import { writeOperationalAudit } from '@/lib/operations/audit';

export const dynamic = 'force-dynamic';

const TRIGGERS = new Set(['CUSTOMER_CREATED', 'DEAL_STAGE_CHANGED', 'TASK_COMPLETED', 'SOCIAL_COMMENT_RECEIVED', 'SOCIAL_INBOX_RECEIVED', 'MANUAL']);
const ACTIONS = new Set(['CREATE_TASK', 'CREATE_CALENDAR_EVENT', 'AUDIT_LOG', 'REPLY_SOCIAL_COMMENT', 'REPLY_SOCIAL_INBOX']);

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

function cleanText(value: unknown, max = 500): string {
  return String(value ?? '').trim().slice(0, max);
}

function normalizeTrigger(value: unknown) {
  const trigger = cleanText(value, 60).toUpperCase();
  return TRIGGERS.has(trigger) ? trigger : null;
}

function normalizeActions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((item: any) => ({
    type: cleanText(item?.type, 60).toUpperCase(),
    config: item?.config && typeof item.config === 'object' && !Array.isArray(item.config) ? item.config : {},
  })).filter(item => ACTIONS.has(item.type));
}

export async function GET(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const workspaceId = required.context.workspace.id;
    const supabase = getServiceSupabase();
    const [workflowsRes, runsRes] = await Promise.all([
      supabase.from('workflows').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      supabase.from('workflow_runs').select('*').eq('workspace_id', workspaceId).order('started_at', { ascending: false }).limit(100),
    ]);
    if (workflowsRes.error) throw new Error(workflowsRes.error.message);
    if (runsRes.error) throw new Error(runsRes.error.message);
    return corsJsonResponse({ success: true, workflows: workflowsRes.data || [], runs: runsRes.data || [] }, undefined, request);
  } catch (error: any) {
    console.error('[Workflows API] GET failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to load workflows.' }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;
    const body = await request.json().catch(() => ({}));
    const name = cleanText(body.name, 180);
    const triggerEvent = normalizeTrigger(body.triggerEvent);
    const actions = normalizeActions(body.actions);
    if (!name || !triggerEvent || actions.length === 0) {
      return corsJsonResponse({ success: false, error: 'Workflow name, supported trigger, and at least one supported action are required.' }, { status: 400 }, request);
    }
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('workflows').insert({
      workspace_id: ctx.workspace.id,
      organization_id: ctx.organization?.id || null,
      name,
      trigger_event: triggerEvent,
      actions,
      is_active: body.isActive !== false,
      created_by: ctx.user.id,
    }).select('*').single();
    if (error) throw new Error(error.message);
    await writeOperationalAudit(
      { organizationId: ctx.organization?.id, workspaceId: ctx.workspace.id, userId: ctx.user.id },
      'WORKFLOW_CREATED',
      'WORKFLOWS',
      { workflowId: data.id, name: data.name, triggerEvent: data.trigger_event }
    );
    return corsJsonResponse({ success: true, workflow: data }, { status: 201 }, request);
  } catch (error: any) {
    console.error('[Workflows API] POST failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to create workflow.' }, { status: 500 }, request);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;
    const body = await request.json().catch(() => ({}));
    const id = cleanText(body.id, 80);
    if (!id) return corsJsonResponse({ success: false, error: 'Workflow id is required.' }, { status: 400 }, request);
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) patch.name = cleanText(body.name, 180);
    if (body.triggerEvent !== undefined) {
      const trigger = normalizeTrigger(body.triggerEvent);
      if (!trigger) return corsJsonResponse({ success: false, error: 'Invalid workflow trigger.' }, { status: 400 }, request);
      patch.trigger_event = trigger;
    }
    if (body.actions !== undefined) {
      const actions = normalizeActions(body.actions);
      if (!actions.length) return corsJsonResponse({ success: false, error: 'At least one supported action is required.' }, { status: 400 }, request);
      patch.actions = actions;
    }
    if (body.isActive !== undefined) patch.is_active = Boolean(body.isActive);
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('workflows').update(patch).eq('id', id).eq('workspace_id', ctx.workspace.id).select('*').maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return corsJsonResponse({ success: false, error: 'Workflow not found.' }, { status: 404 }, request);
    await writeOperationalAudit(
      { organizationId: ctx.organization?.id, workspaceId: ctx.workspace.id, userId: ctx.user.id },
      'WORKFLOW_UPDATED',
      'WORKFLOWS',
      { workflowId: data.id, isActive: data.is_active }
    );
    return corsJsonResponse({ success: true, workflow: data }, undefined, request);
  } catch (error: any) {
    console.error('[Workflows API] PATCH failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to update workflow.' }, { status: 500 }, request);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;
    const id = cleanText(new URL(request.url).searchParams.get('id'), 80);
    if (!id) return corsJsonResponse({ success: false, error: 'Workflow id is required.' }, { status: 400 }, request);
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('workflows').delete().eq('id', id).eq('workspace_id', ctx.workspace.id).select('id,name').maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return corsJsonResponse({ success: false, error: 'Workflow not found.' }, { status: 404 }, request);
    await writeOperationalAudit(
      { organizationId: ctx.organization?.id, workspaceId: ctx.workspace.id, userId: ctx.user.id },
      'WORKFLOW_DELETED',
      'WORKFLOWS',
      { workflowId: data.id, name: data.name }
    );
    return corsJsonResponse({ success: true, id: data.id }, undefined, request);
  } catch (error: any) {
    console.error('[Workflows API] DELETE failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to delete workflow.' }, { status: 500 }, request);
  }
}
