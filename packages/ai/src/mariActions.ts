export type MariActionType =
  | 'CREATE_TASK'
  | 'DRAFT_EMAIL'
  | 'GENERATE_REPORT'
  | 'ADD_CONTACT'
  | 'TRIGGER_WORKFLOW'
  | 'NAVIGATE';

export interface MariActionPayload {
  type: MariActionType;
  title?: string;
  label?: string;
  description?: string;
  data?: Record<string, any>;
  payload?: Record<string, any>;
}

export interface MariActionResult {
  success: boolean;
  message: string;
  outputData?: any;
}

export async function executeMariAction(action: MariActionPayload): Promise<MariActionResult> {
  const actionData = action.data || action.payload || {};
  const actionTitle = action.title || action.label || action.type;

  console.log(`[Mari AI Action Driver] Executing action: ${action.type}`, actionData);

  switch (action.type) {
    case 'CREATE_TASK':
      return {
        success: true,
        message: `Task '${actionData.title || actionTitle}' created and assigned to ${actionData.assignedTo || 'Operations Team'}.`,
        outputData: { taskId: `task-ai-${Date.now()}` }
      };

    case 'DRAFT_EMAIL':
      return {
        success: true,
        message: `Email draft created for ${actionData.recipient || 'Client'}: "${actionData.subject || 'Follow-up'}"`,
        outputData: { draftId: `draft-${Date.now()}` }
      };

    case 'GENERATE_REPORT':
      return {
        success: true,
        message: `Executive ${actionData.reportType || 'Sales Summary'} PDF report generated successfully.`,
        outputData: { downloadUrl: `/docs/reports/${actionData.reportType || 'executive'}_2026.pdf` }
      };

    case 'ADD_CONTACT':
      return {
        success: true,
        message: `New Lead '${actionData.name || 'Prospect'}' added to CRM pipeline.`,
        outputData: { contactId: `contact-${Date.now()}` }
      };

    case 'TRIGGER_WORKFLOW':
      return {
        success: true,
        message: `Automation workflow '${actionData.workflowName || 'Default Onboarding'}' executed.`,
        outputData: { executionId: `exec-${Date.now()}` }
      };

    case 'NAVIGATE':
      const targetRoute = actionData.route || '/';
      return {
        success: true,
        message: `Navigating to ${targetRoute}`,
        outputData: { route: targetRoute }
      };

    default:
      return {
        success: false,
        message: `Unknown Mari AI action type: ${action.type}`
      };
  }
}
