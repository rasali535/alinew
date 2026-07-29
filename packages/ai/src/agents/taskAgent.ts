// =====================================================================
// Task Agent — Priority management & overdue detection
// =====================================================================

import { callAimlApi, buildMariSystemPrompt } from '../aimlClient';
import { processMariQuery } from '../mariChat';

export interface TaskContext {
  totalTasks?: number;
  overdueTasks?: number;
  urgentTasks?: string[];
  completedToday?: number;
  assignedToUser?: string[];
}

export async function runTaskAgent(
  query: string,
  context: TaskContext & { orgName?: string; userName?: string; userRole?: string }
): Promise<string> {
  const dataContext = `
Task & Operations Summary:
- Total open tasks: ${context.totalTasks ?? 'N/A'}
- Overdue tasks: ${context.overdueTasks ?? 0}
- Urgent tasks requiring immediate attention: ${context.urgentTasks?.join(', ') || 'None'}
- Completed today: ${context.completedToday ?? 0}
- Tasks assigned to current user: ${context.assignedToUser?.join(' | ') || 'None'}
  `.trim();

  const systemPrompt = buildMariSystemPrompt({
    orgName: context.orgName,
    userName: context.userName,
    userRole: context.userRole,
    dataContext,
  });

  const result = await callAimlApi([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query },
  ], { model: 'gemini/gemini-2.0-flash', maxTokens: 600 });

  if (result) return result;

  return processMariQuery(query, context).answer;
}
