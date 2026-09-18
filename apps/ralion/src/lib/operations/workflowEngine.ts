import 'server-only';
import { getServiceSupabase } from '@/lib/auth/serverAuth';
import { writeOperationalAudit } from './audit';
import { FacebookCommentsService } from '@/lib/services/social/facebookComments.service';
import { SocialInboxService } from '@/lib/services/social/socialInbox.service';
import { MariWorkflowDecisionService } from '@/lib/services/mari/mariWorkflowDecision.service';

export type WorkflowTriggerEvent = 'CUSTOMER_CREATED' | 'DEAL_STAGE_CHANGED' | 'TASK_COMPLETED' | 'SOCIAL_COMMENT_RECEIVED' | 'SOCIAL_INBOX_RECEIVED' | 'MANUAL';

type WorkflowAction = {
  type?: 'CREATE_TASK' | 'CREATE_CALENDAR_EVENT' | 'AUDIT_LOG' | 'MARI_DECISION' | 'REPLY_SOCIAL_COMMENT' | 'REPLY_SOCIAL_INBOX';
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

  if (action?.type === 'MARI_DECISION') {
    const inboundMessage = cleanText(context.input?.message || context.input?.commentText || context.input?.messageText || config.message || '', 4000);
    const decision = await MariWorkflowDecisionService.decide({
      organizationId: context.organizationId || context.workspaceId,
      workspaceId: context.workspaceId,
      userId: context.userId || '',
      message: inboundMessage,
      channel: cleanText(context.input?.provider || context.input?.channel || '', 40) || undefined,
      autoApproveLowRisk: config.autoApproveLowRisk === true,
    });
    return { type: action.type, decision };
  }

  if (action?.type === 'REPLY_SOCIAL_COMMENT') {
    const replyText = cleanText(config.replyText || context.input?.replyText || '', 2000);
    const commentId = cleanText(context.input?.commentId || config.commentId || '', 200);
    const postId = cleanText(context.input?.postId || config.postId || '', 200);
    if (!replyText || !commentId || !postId) throw new Error('REPLY_SOCIAL_COMMENT requires reply text, commentId and postId.');
    const reply = await FacebookCommentsService.replyToComment({
      commentId,
      postId,
      replyText,
      userId: context.userId || undefined,
      workspaceId: context.workspaceId,
      organizationId: context.organizationId || context.workspaceId,
      pageId: cleanText(context.input?.pageId || config.pageId || '', 200) || undefined,
    });
    return { type: action.type, replyId: reply.externalReplyId, commentId, postId };
  }

  if (action?.type === 'REPLY_SOCIAL_INBOX') {
    const messageText = cleanText(config.messageText || context.input?.replyText || '', 2000);
    const conversationId = cleanText(context.input?.conversationId || config.conversationId || '', 300);
    const recipientId = cleanText(context.input?.recipientId || config.recipientId || conversationId, 300);
    const provider = cleanText(context.input?.provider || config.provider || 'facebook', 30).toLowerCase() as any;
    if (!messageText || !conversationId) throw new Error('REPLY_SOCIAL_INBOX requires message text and conversationId.');
    const result = await SocialInboxService.sendReply({
      connectionId: cleanText(context.input?.connectionId || config.connectionId || '', 200) || undefined,
      provider,
      conversationId,
      recipientId,
      messageText,
      userId: context.userId || '',
      workspaceId: context.workspaceId,
      organizationId: context.organizationId || context.workspaceId,
    });
    return { type: action.type, messageId: result.messageId, conversationId, status: result.status };
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
    for (let index = 0; index < actions.slice(0, 20).length; index += 1) {
      const action = actions[index];
      const result = await executeAction(action, context);
      results.push(result);

      if (action?.type === 'MARI_DECISION' && result?.decision?.requiresApproval) {
        const proposedAction = actions[index + 1] || {};
        const { data: approval, error: approvalError } = await supabase
          .from('workflow_approvals')
          .insert({
            workflow_run_id: run.id,
            workflow_id: workflow.id,
            workspace_id: context.workspaceId,
            organization_id: context.organizationId || null,
            status: 'PENDING',
            decision: result.decision,
            proposed_action: proposedAction,
          })
          .select('id')
          .single();
        if (approvalError) throw new Error(`Failed to create workflow approval: ${approvalError.message}`);

        await supabase.from('workflow_runs').update({
          status: 'WAITING_APPROVAL',
          output: { actions: results, approvalId: approval.id, pausedAtActionIndex: index + 1 },
        }).eq('id', run.id).eq('workspace_id', context.workspaceId);

        return { workflowId: workflow.id, runId: run.id, status: 'WAITING_APPROVAL', approvalId: approval.id, actions: results };
      }

      if (action?.type === 'MARI_DECISION' && result?.decision?.recommendedAction === 'IGNORE') {
        await supabase.from('workflow_runs').update({
          status: 'SKIPPED',
          output: { actions: results, reason: 'Mari classified the event as safe to ignore.' },
          finished_at: new Date().toISOString(),
        }).eq('id', run.id).eq('workspace_id', context.workspaceId);
        return { workflowId: workflow.id, runId: run.id, status: 'SKIPPED', actions: results };
      }
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
