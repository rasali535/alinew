import 'server-only';
import { getServiceSupabase } from '@/lib/auth/serverAuth';
import { writeOperationalAudit } from './audit';

export type WorkflowTriggerEvent = 'CUSTOMER_CREATED' | 'DEAL_STAGE_CHANGED' | 'TASK_COMPLETED' | 'MANUAL';

type WorkflowAction = {
  type?: 'CREATE_TASK' | 'CREATE_CALENDAR_EVENT' | 'AUDIT_LOG';
  config?: Record<string, any>;
};

export interface WorkflowExecutionContext {
  workspaceId: string;
  organizationId?: string | null;
  userId?: string | null;
  triggerEvent: WorkflowTriggerEvent;
  input?: Record<string, any>;
  workflowId?: string;
}

function cleanText(value: unknown, max = 500): string {
  return String(value ?? '').trim().slice(0, max);
}

function addDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + Math.max(0, Math.min(days, 3650)));
  return d.toISOString().slice(0, 10);
}

function addMinutes(minutes: number): string {
  const d = new Date(Date.now() + Math.max(0, Math.min(minutes, 525600)) * 60_000);
  return d.toISOString();
}

async function executeAction(
  action: WorkflowAction,
  context: WorkflowExecutionContext
): Promise<Record<string, any>> {
  const supabase = getServiceSupabase();
  const config = action?.config || {};

  if (action?.type === 'CREATE_TASK') {
    const title = cleanText(config.title || `Follow up: ${context.triggerEvent}`, 180);
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        workspace_id: context.workspaceId,
        title,
        description: cleanText(config.description || '', 4000) || null,
        project: cleanText(config.project || 'Workflow Automation', 180) || 'Workflow Automation',
        status: 'TODO',
        priority: cleanText(config.priority || 'MEDIUM', 20) || 'MEDIUM',
        assigned_to: cleanText(config.assignedTo || '', 180) || null,
        due_date: addDays(Number(config.dueDays ?? 1)),
        created_by: context.userId || null,
      })
      .select('id,title,status')
      .single();
    if (error) throw new Error(`CREATE_TASK failed: ${error.message}`);
    return { type: action.type, task: data };
  }

  if (action?.type === 'CREATE_CALENDAR_EVENT') {
    const startMinutes = Number(config.startMinutesFromNow ?? 60);
    const duration = Math.max(15, Math.min(Number(config.durationMinutes ?? 30), 1440));
    const startAt = addMinutes(startMinutes);
    const endAt = new Date(new Date(startAt).getTime() + duration * 60_000).toISOString();
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        workspace_id: context.workspaceId,
        organization_id: context.organizationId || null,
        title: cleanText(config.title || `Workflow event: ${context.triggerEvent}`, 180),
        start_at: startAt,
        end_at: endAt,
        category: cleanText(config.category || 'REMINDER', 30) || 'REMINDER',
        attendees: Array.isArray(config.attendees) ? config.attendees.map((v: any) => cleanText(v, 200)).filter(Boolean).slice(0, 50) : [],
        location: cleanText(config.location || '', 500) || null,
        notes: cleanText(config.notes || '', 4000) || null,
        reminder_minutes: Number.isFinite(Number(config.reminderMinutes)) ? Math.max(0, Number(config.reminderMinutes)) : null,
        created_by: context.userId || null,
      })
      .select('id,title,start_at')
      .single();
    if (error) throw new Error(`CREATE_CALENDAR_EVENT failed: ${error.message}`);
    return { type: action.type, event: data };
  }

  if (action?.type === 'AUDIT_LOG') {
    const actionName = cleanText(config.action || 'WORKFLOW_NOTE', 120) || 'WORKFLOW_NOTE';
    const moduleName = cleanText(config.module || 'WORKFLOWS', 80) || 'WORKFLOWS';
    await writeOperationalAudit(
      {
        organizationId: context.organizationId,
        workspaceId: context.workspaceId,
        userId: context.userId,
      },
      actionName,
      moduleName,
      { workflowTrigger: context.triggerEvent, input: context.input || {}, note: cleanText(config.note || '', 2000) }
    );
    return { type: action.type, logged: true };
  }

  return { type: action?.type || 'UNKNOWN', skipped: true, reason: 'Unsupported workflow action' };
}

async function executeOneWorkflow(workflow: any, context: WorkflowExecutionContext) {
  const supabase = getServiceSupabase();
  const { data: run, error: runError } = await supabase
    .from('workflow_runs')
    .insert({
      workflow_id: workflow.id,
      workspace_id: context.workspaceId,
      trigger_event: context.triggerEvent,
      status: 'RUNNING',
      input: context.input || {},
    })
    .select('id')
    .single();

  if (runError) throw new Error(`Failed to create workflow run: ${runError.message}`);

  const results: Record<string, any>[] = [];
  try {
    const actions = Array.isArray(workflow.actions) ? workflow.actions : [];
    for (const action of actions.slice(0, 20)) {
      results.push(await executeAction(action, context));
    }

    await supabase
      .from('workflow_runs')
      .update({ status: 'SUCCEEDED', output: { actions: results }, finished_at: new Date().toISOString() })
      .eq('id', run.id)
      .eq('workspace_id', context.workspaceId);

    await supabase
      .from('workflows')
      .update({
        executions_count: Number(workflow.executions_count || 0) + 1,
        last_executed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', workflow.id)
      .eq('workspace_id', context.workspaceId);

    return { workflowId: workflow.id, runId: run.id, status: 'SUCCEEDED', actions: results };
  } catch (error: any) {
    await supabase
      .from('workflow_runs')
      .update({ status: 'FAILED', error: String(error?.message || error).slice(0, 4000), output: { actions: results }, finished_at: new Date().toISOString() })
      .eq('id', run.id)
      .eq('workspace_id', context.workspaceId);
    return { workflowId: workflow.id, runId: run.id, status: 'FAILED', error: error?.message || String(error), actions: results };
  }
}

export async function executeWorkflowsForEvent(context: WorkflowExecutionContext) {
  const supabase = getServiceSupabase();
  let query = supabase
    .from('workflows')
    .select('*')
    .eq('workspace_id', context.workspaceId)
    .eq('is_active', true);

  if (context.workflowId) query = query.eq('id', context.workflowId);
  else query = query.eq('trigger_event', context.triggerEvent);

  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to load workflows: ${error.message}`);

  const executions = [];
  for (const workflow of data || []) {
    executions.push(await executeOneWorkflow(workflow, context));
  }
  return executions;
}
