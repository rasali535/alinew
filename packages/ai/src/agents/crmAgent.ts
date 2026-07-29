// =====================================================================
// CRM Agent — Customer intelligence & lead analysis
// =====================================================================

import { callAimlApi, buildMariSystemPrompt } from '../aimlClient';
import { processMariQuery } from '../mariChat';

export interface CustomerContext {
  totalCustomers?: number;
  newThisMonth?: number;
  activeLeads?: number;
  highValueAccounts?: string[];
  recentActivity?: string[];
}

export async function runCrmAgent(
  query: string,
  context: CustomerContext & { orgName?: string; userName?: string; userRole?: string }
): Promise<string> {
  const dataContext = `
CRM Summary:
- Total customers: ${context.totalCustomers ?? 'N/A'}
- New customers this month: ${context.newThisMonth ?? 'N/A'}
- Active leads in pipeline: ${context.activeLeads ?? 'N/A'}
- High-value accounts: ${context.highValueAccounts?.join(', ') || 'None listed'}
- Recent activity: ${context.recentActivity?.join(' | ') || 'No recent activity'}
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

  // Fallback to rule-based
  return processMariQuery(query, context).answer;
}
