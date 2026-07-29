// =====================================================================
// Reporting Agent — Business insights & metrics analysis
// =====================================================================

import { callAimlApi, buildMariSystemPrompt } from '../aimlClient';
import { processMariQuery } from '../mariChat';

export interface ReportingContext {
  monthlyRevenue?: number;
  revenueGrowth?: string;
  topProducts?: string[];
  customerGrowth?: string;
  openDeals?: number;
  pipelineValue?: number;
}

export async function runReportingAgent(
  query: string,
  context: ReportingContext & { orgName?: string; userName?: string; userRole?: string }
): Promise<string> {
  const dataContext = `
Business Performance Metrics:
- Monthly revenue: ${context.monthlyRevenue ? `BWP ${context.monthlyRevenue.toLocaleString()}` : 'N/A'}
- Revenue growth: ${context.revenueGrowth ?? 'N/A'}
- Customer growth: ${context.customerGrowth ?? 'N/A'}
- Open deals: ${context.openDeals ?? 'N/A'}
- Total pipeline value: ${context.pipelineValue ? `BWP ${context.pipelineValue.toLocaleString()}` : 'N/A'}
- Top performing products/services: ${context.topProducts?.join(', ') || 'N/A'}
  `.trim();

  const systemPrompt = buildMariSystemPrompt({
    orgName: context.orgName,
    userName: context.userName,
    userRole: context.userRole,
    dataContext,
  });

  const result = await callAimlApi([
    { role: 'system', content: systemPrompt + '\n\nWhen generating reports, use bullet points and clear section headers.' },
    { role: 'user', content: query },
  ], { model: 'gemini/gemini-2.0-flash', maxTokens: 900 });

  if (result) return result;

  return processMariQuery(query, context).answer;
}
