export type MariActionType =
  | 'CREATE_TASK'
  | 'DRAFT_EMAIL'
  | 'GENERATE_REPORT'
  | 'ADD_CONTACT'
  | 'TRIGGER_WORKFLOW'
  | 'GENERATE_FLYER'
  | 'NAVIGATE';

export interface MariActionPayload {
  id?: string;
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
  code?: string;
}

export async function executeMariAction(action: MariActionPayload): Promise<MariActionResult> {
  const actionData = action.data || action.payload || {};

  switch (action.type) {
    case 'CREATE_TASK':
    case 'DRAFT_EMAIL':
    case 'GENERATE_REPORT':
    case 'ADD_CONTACT':
    case 'TRIGGER_WORKFLOW':
    case 'GENERATE_FLYER':
      return {
        success: false,
        code: 'ACTION_NOT_IMPLEMENTED',
        message: 'This action is not available through Mari yet. Nothing was created or changed. Please use the corresponding Ralion module.',
      };

    case 'NAVIGATE': {
      let targetRoute = typeof actionData === 'string' ? actionData : (actionData.route || '/growth');
      if (typeof targetRoute !== 'string' || !targetRoute.startsWith('/') || targetRoute.startsWith('//') || targetRoute.includes('\\') || targetRoute.includes('\n') || targetRoute.length > 200) {
        targetRoute = '/growth';
      }
      return {
        success: true,
        message: `Navigating to ${targetRoute}`,
        outputData: { route: targetRoute }
      };
    }

    default:
      return {
        success: false,
        code: 'INVALID_ACTION',
        message: `Unknown Mari AI action type: ${action.type}`
      };
  }
}
