import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getServiceSupabase, requireRalionContext } from '@/lib/auth/serverAuth';
import { writeOperationalAudit } from '@/lib/operations/audit';
import { executeWorkflowsForEvent } from '@/lib/operations/workflowEngine';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

function cleanText(value: unknown, max = 500): string {
  return String(value ?? '').trim().slice(0, max);
}

function validStatus(value: unknown) {
  const v = cleanText(value, 30).toUpperCase();
  return ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'CANCELED'].includes(v) ? v : null;
}

function validPriority(value: unknown) {
  const v = cleanText(value, 30).toUpperCase();
  return ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'].includes(v) ? v : null;
}

export async function GET(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const workspaceId = required.context.workspace.id;
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return corsJsonResponse({ success: true, tasks: data || [] }, undefined, request);
  } catch (error: any) {
    console.error('[Tasks API] GET failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to load tasks.' }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;
    const body = await request.json().catch(() => ({}));
    const title = cleanText(body.title, 180);
    if (!title) return corsJsonResponse({ success: false, error: 'Task title is required.' }, { status: 400 }, request);

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        workspace_id: ctx.workspace.id,
        title,
        description: cleanText(body.description, 4000) || null,
        project: cleanText(body.project, 180) || 'General Operations',
        status: validStatus(body.status) || 'TODO',
        priority: validPriority(body.priority) || 'MEDIUM',
        assigned_to: cleanText(body.assignedTo, 180) || null,
        due_date: body.dueDate ? String(body.dueDate).slice(0, 10) : null,
        created_by: ctx.user.id,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    await writeOperationalAudit(
      { organizationId: ctx.organization?.id, workspaceId: ctx.workspace.id, userId: ctx.user.id },
      'TASK_CREATED',
      'TASKS',
      { taskId: data.id, title: data.title }
    );
    return corsJsonResponse({ success: true, task: data }, { status: 201 }, request);
  } catch (error: any) {
    console.error('[Tasks API] POST failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to create task.' }, { status: 500 }, request);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;
    const body = await request.json().catch(() => ({}));
    const id = cleanText(body.id, 80);
    if (!id) return corsJsonResponse({ success: false, error: 'Task id is required.' }, { status: 400 }, request);

    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) patch.title = cleanText(body.title, 180);
    if (body.description !== undefined) patch.description = cleanText(body.description, 4000) || null;
    if (body.project !== undefined) patch.project = cleanText(body.project, 180) || null;
    if (body.status !== undefined) {
      const status = validStatus(body.status);
      if (!status) return corsJsonResponse({ success: false, error: 'Invalid task status.' }, { status: 400 }, request);
      patch.status = status;
    }
    if (body.priority !== undefined) {
      const priority = validPriority(body.priority);
      if (!priority) return corsJsonResponse({ success: false, error: 'Invalid task priority.' }, { status: 400 }, request);
      patch.priority = priority;
    }
    if (body.assignedTo !== undefined) patch.assigned_to = cleanText(body.assignedTo, 180) || null;
    if (body.dueDate !== undefined) patch.due_date = body.dueDate ? String(body.dueDate).slice(0, 10) : null;

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('tasks')
      .update(patch)
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return corsJsonResponse({ success: false, error: 'Task not found.' }, { status: 404 }, request);

    await writeOperationalAudit(
      { organizationId: ctx.organization?.id, workspaceId: ctx.workspace.id, userId: ctx.user.id },
      'TASK_UPDATED',
      'TASKS',
      { taskId: data.id, status: data.status }
    );

    if (patch.status === 'COMPLETED') {
      await executeWorkflowsForEvent({
        workspaceId: ctx.workspace.id,
        organizationId: ctx.organization?.id,
        userId: ctx.user.id,
        triggerEvent: 'TASK_COMPLETED',
        input: { task: data },
      });
    }

    return corsJsonResponse({ success: true, task: data }, undefined, request);
  } catch (error: any) {
    console.error('[Tasks API] PATCH failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to update task.' }, { status: 500 }, request);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;
    const id = cleanText(new URL(request.url).searchParams.get('id'), 80);
    if (!id) return corsJsonResponse({ success: false, error: 'Task id is required.' }, { status: 400 }, request);
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .select('id,title')
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return corsJsonResponse({ success: false, error: 'Task not found.' }, { status: 404 }, request);
    await writeOperationalAudit(
      { organizationId: ctx.organization?.id, workspaceId: ctx.workspace.id, userId: ctx.user.id },
      'TASK_DELETED',
      'TASKS',
      { taskId: data.id, title: data.title }
    );
    return corsJsonResponse({ success: true, id: data.id }, undefined, request);
  } catch (error: any) {
    console.error('[Tasks API] DELETE failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to delete task.' }, { status: 500 }, request);
  }
}
