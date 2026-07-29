import { WorkflowRule } from '@ralion/database';

export interface WorkflowEventPayload {
  event: 'NEW_CUSTOMER' | 'DEAL_WON' | 'TASK_OVERDUE' | 'INVOICE_CREATED';
  orgId: string;
  data: Record<string, any>;
}

export function evaluateWorkflowConditions(
  rule: WorkflowRule,
  payload: WorkflowEventPayload
): boolean {
  if (!rule.isActive) return false;
  const triggerEvent = rule.trigger?.event || rule.triggerEvent;
  if (triggerEvent !== payload.event) return false;

  const conditions = rule.trigger?.conditions;
  if (!conditions || Object.keys(conditions).length === 0) return true;

  for (const [key, value] of Object.entries(conditions)) {
    if (payload.data[key] !== value) {
      return false;
    }
  }

  return true;
}
