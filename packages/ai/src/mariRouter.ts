// =====================================================================
// Mari AI Router — Intent classifier & agent dispatcher
// =====================================================================

import { runCrmAgent, CustomerContext } from './agents/crmAgent';
import { runTaskAgent, TaskContext } from './agents/taskAgent';
import { runDocumentAgent, DocumentContext } from './agents/documentAgent';
import { runReportingAgent, ReportingContext } from './agents/reportingAgent';
import { callAimlApi, buildMariSystemPrompt } from './aimlClient';
import { processMariQuery, MariQueryResponse } from './mariChat';

export type MariAgentType = 'crm' | 'task' | 'document' | 'reporting' | 'general';

export interface MariContext {
  orgName?: string;
  userName?: string;
  userRole?: string;
  // CRM data
  totalCustomers?: number;
  newCustomersThisMonth?: number;
  activeLeads?: number;
  highValueAccounts?: string[];
  // Task data
  totalTasks?: number;
  overdueTasks?: number;
  urgentTasks?: string[];
  completedToday?: number;
  // Document data
  totalDocuments?: number;
  recentUploads?: string[];
  knowledgeContext?: string;
  // Reporting data
  monthlyRevenue?: number;
  revenueGrowth?: string;
  pipelineValue?: number;
}

/**
 * Classifies the intent of a query and routes to the correct agent.
 */
export function classifyIntent(query: string): MariAgentType {
  const q = query.toLowerCase();

  if (q.match(/\b(customer|lead|crm|contact|account|client|pipeline|prospect|follow.?up)\b/)) {
    return 'crm';
  }

  if (q.match(/\b(task|todo|overdue|priority|assign|deadline|project|workflow)\b/)) {
    return 'task';
  }

  if (q.match(/\b(document|file|upload|pdf|contract|policy|manual|summarize|search)\b/)) {
    return 'document';
  }

  if (q.match(/\b(report|revenue|sales|growth|metric|performance|analytics|income|profit)\b/)) {
    return 'reporting';
  }

  return 'general';
}

/**
 * Main Mari AI entry point.
 * Routes queries to the correct specialized agent.
 */
export async function askMari(
  query: string,
  context: MariContext = {}
): Promise<{ answer: string; agent: MariAgentType; suggestedActions?: any[] }> {
  const intent = classifyIntent(query);

  try {
    let answer = '';

    switch (intent) {
      case 'crm':
        answer = await runCrmAgent(query, {
          orgName: context.orgName,
          userName: context.userName,
          userRole: context.userRole,
          totalCustomers: context.totalCustomers,
          newThisMonth: context.newCustomersThisMonth,
          activeLeads: context.activeLeads,
          highValueAccounts: context.highValueAccounts,
        });
        break;

      case 'task':
        answer = await runTaskAgent(query, {
          orgName: context.orgName,
          userName: context.userName,
          userRole: context.userRole,
          totalTasks: context.totalTasks,
          overdueTasks: context.overdueTasks,
          urgentTasks: context.urgentTasks,
          completedToday: context.completedToday,
        });
        break;

      case 'document':
        answer = await runDocumentAgent(query, {
          orgName: context.orgName,
          userName: context.userName,
          userRole: context.userRole,
          totalDocuments: context.totalDocuments,
          recentUploads: context.recentUploads,
          knowledgeContext: context.knowledgeContext,
        });
        break;

      case 'reporting':
        answer = await runReportingAgent(query, {
          orgName: context.orgName,
          userName: context.userName,
          userRole: context.userRole,
          monthlyRevenue: context.monthlyRevenue,
          revenueGrowth: context.revenueGrowth,
          pipelineValue: context.pipelineValue,
        });
        break;

      default: {
        // General query — use the full system context
        const systemPrompt = buildMariSystemPrompt({
          orgName: context.orgName,
          userName: context.userName,
          userRole: context.userRole,
        });
        answer = await callAimlApi([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ]) || processMariQuery(query, context).answer;
        break;
      }
    }

    // Build suggested actions based on intent
    const suggestedActions = buildSuggestedActions(intent, query);

    return { answer, agent: intent, suggestedActions };
  } catch (err) {
    console.error('[Mari Router] Error:', err);
    const fallback = processMariQuery(query, context);
    return { answer: fallback.answer, agent: intent, suggestedActions: fallback.suggestedActions };
  }
}

function buildSuggestedActions(agent: MariAgentType, query: string) {
  const actions: any[] = [];

  switch (agent) {
    case 'crm':
      actions.push(
        { type: 'NAVIGATE', label: 'Open Customers', payload: { route: '/ralion/customers' } },
        { type: 'NAVIGATE', label: 'View Leads Pipeline', payload: { route: '/ralion/leads' } }
      );
      break;
    case 'task':
      actions.push(
        { type: 'NAVIGATE', label: 'Open Task Board', payload: { route: '/ralion/tasks' } },
        { type: 'CREATE_TASK', label: 'Create Task', payload: { title: query } }
      );
      break;
    case 'document':
      actions.push(
        { type: 'NAVIGATE', label: 'Open Documents', payload: { route: '/ralion/documents' } }
      );
      break;
    case 'reporting':
      actions.push(
        { type: 'NAVIGATE', label: 'View Reports', payload: { route: '/ralion/reports' } },
        { type: 'GENERATE_REPORT', label: 'Generate Report', payload: { reportType: 'executive' } }
      );
      break;
    default:
      actions.push(
        { type: 'NAVIGATE', label: 'Go to Dashboard', payload: { route: '/ralion/dashboard' } }
      );
  }

  return actions;
}
