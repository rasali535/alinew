// =====================================================================
// Mari AI Multi-Agent Architecture — Phase 7
// CEO, CFO, Sales, Marketing, HR, Operations, Research agents
// Each agent is a specialized business intelligence expert
// =====================================================================

import { callAimlApi, buildMariSystemPrompt } from '../aimlClient';

export type ExecutiveAgentType = 'ceo' | 'cfo' | 'sales' | 'marketing' | 'hr' | 'operations' | 'research';

const agentPersonas: Record<ExecutiveAgentType, string> = {
  ceo: `You are the CEO Agent for Mari AI. Your role: provide high-level strategic business intelligence, risk assessment, and executive decision support. You synthesize all business data into clear, actionable executive summaries. Think like a seasoned CEO with 20+ years of African business experience.`,

  cfo: `You are the CFO Agent for Mari AI. Your role: financial analysis, cash flow intelligence, budget tracking, revenue forecasting, and cost optimization. You think in numbers, ratios, and financial health indicators. Always relate financial data to business outcomes.`,

  sales: `You are the Sales Agent for Mari AI. Your role: CRM intelligence, lead pipeline analysis, conversion optimization, customer retention risk detection, and revenue opportunity identification. You help close deals and grow revenue.`,

  marketing: `You are the Marketing Agent for Mari AI. Your role: campaign analysis, content strategy, brand positioning, social media intelligence, and growth opportunities. You think in reach, engagement, conversions, and brand equity.`,

  hr: `You are the HR Agent for Mari AI. Your role: team performance, workforce planning, staff allocation, productivity analysis, and people management intelligence. You care about organizational culture and human capital optimization.`,

  operations: `You are the Operations Agent for Mari AI. Your role: process efficiency, task management, workflow optimization, logistics intelligence, and operational bottleneck detection. You think in throughput, efficiency, and execution quality.`,

  research: `You are the Research Agent for Mari AI. Your role: market research, competitive intelligence, industry trend analysis, and strategic opportunity identification. You bring external context to internal decisions.`,
};

export interface AgentBriefing {
  agent: ExecutiveAgentType;
  agentLabel: string;
  summary: string;
  keyMetric?: string;
  alerts: string[];
  recommendations: string[];
}

export interface DailyBriefing {
  date: string;
  orgName: string;
  overallHealth: 'excellent' | 'good' | 'needs_attention' | 'critical';
  briefings: AgentBriefing[];
  priorityActions: string[];
}

/**
 * Run a single executive agent on a query.
 */
export async function runExecutiveAgent(
  agentType: ExecutiveAgentType,
  query: string,
  dataContext: string,
  orgContext: { orgName?: string; userName?: string }
): Promise<string> {
  const persona = agentPersonas[agentType];
  const systemPrompt = `${persona}

Organization: ${orgContext.orgName || 'Your Organization'}
Reporting to: ${orgContext.userName || 'Business Owner'}

Business Context:
${dataContext}

Rules:
- Be concise, sharp, and actionable
- Use data from the context, not assumptions
- Format with clear sections if output is long
- End with 2-3 specific action items`;

  const result = await callAimlApi([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query },
  ], { model: 'gemini/gemini-2.0-flash', maxTokens: 700, temperature: 0.65 });

  return result || `[${agentType.toUpperCase()} Agent] Analysis unavailable. Please check your AI/ML API key.`;
}

/**
 * Generate a full daily executive briefing across all agents.
 * This is Mari's proactive intelligence mode — runs each morning.
 */
export async function generateDailyBriefing(context: {
  orgName: string;
  userName: string;
  revenue?: { current: number; previous: number };
  tasks?: { total: number; overdue: number; completedToday: number };
  customers?: { total: number; newThisMonth: number; atRisk: number };
  leads?: { active: number; closingThisWeek: number };
  teamSize?: number;
}): Promise<DailyBriefing> {
  const date = new Date().toLocaleDateString('en-BW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const revenueGrowth = context.revenue
    ? (((context.revenue.current - context.revenue.previous) / context.revenue.previous) * 100).toFixed(1)
    : null;

  // Build combined data context for all agents
  const dataContext = `
Business Snapshot — ${date}
- Revenue this month: BWP ${context.revenue?.current?.toLocaleString() || 'N/A'} (${revenueGrowth ? `${revenueGrowth}% vs last month` : 'N/A'})
- Open tasks: ${context.tasks?.total || 0} (${context.tasks?.overdue || 0} overdue, ${context.tasks?.completedToday || 0} completed today)
- Customers: ${context.customers?.total || 0} total, ${context.customers?.newThisMonth || 0} new this month, ${context.customers?.atRisk || 0} at-risk
- Active leads: ${context.leads?.active || 0} (${context.leads?.closingThisWeek || 0} expected to close this week)
- Team size: ${context.teamSize || 'N/A'} people
`.trim();

  // Generate briefings from 3 key agents in parallel (CEO, Sales, Operations)
  const [ceoSummary, salesSummary, opsSummary] = await Promise.all([
    runExecutiveAgent('ceo', 'Give me a concise executive summary of today\'s business health and top 3 priorities.', dataContext, { orgName: context.orgName, userName: context.userName }),
    runExecutiveAgent('sales', 'What is the sales and customer situation today? What needs immediate attention?', dataContext, { orgName: context.orgName, userName: context.userName }),
    runExecutiveAgent('operations', 'What is the operational status? Highlight any bottlenecks or critical items.', dataContext, { orgName: context.orgName, userName: context.userName }),
  ]);

  // Determine overall health
  const overdueRatio = context.tasks ? context.tasks.overdue / Math.max(context.tasks.total, 1) : 0;
  const atRiskRatio = context.customers ? context.customers.atRisk / Math.max(context.customers.total, 1) : 0;
  const revenuePositive = revenueGrowth ? parseFloat(revenueGrowth) > 0 : true;

  let overallHealth: DailyBriefing['overallHealth'] = 'good';
  if (overdueRatio > 0.3 || atRiskRatio > 0.2 || !revenuePositive) overallHealth = 'needs_attention';
  if (overdueRatio > 0.5 || atRiskRatio > 0.4) overallHealth = 'critical';
  if (overdueRatio < 0.1 && atRiskRatio < 0.05 && revenuePositive) overallHealth = 'excellent';

  return {
    date,
    orgName: context.orgName,
    overallHealth,
    briefings: [
      {
        agent: 'ceo',
        agentLabel: 'Executive Summary',
        summary: ceoSummary,
        keyMetric: revenueGrowth ? `Revenue ${revenueGrowth}% MoM` : undefined,
        alerts: context.customers?.atRisk ? [`${context.customers.atRisk} customers at risk`] : [],
        recommendations: [],
      },
      {
        agent: 'sales',
        agentLabel: 'Sales Intelligence',
        summary: salesSummary,
        keyMetric: context.leads?.closingThisWeek ? `${context.leads.closingThisWeek} leads closing this week` : undefined,
        alerts: [],
        recommendations: [],
      },
      {
        agent: 'operations',
        agentLabel: 'Operations Status',
        summary: opsSummary,
        keyMetric: context.tasks?.overdue ? `${context.tasks.overdue} overdue tasks` : undefined,
        alerts: context.tasks?.overdue && context.tasks.overdue > 5 ? ['High overdue task count'] : [],
        recommendations: [],
      },
    ],
    priorityActions: [
      context.tasks?.overdue && context.tasks.overdue > 0 ? `Review ${context.tasks.overdue} overdue tasks` : null,
      context.customers?.atRisk && context.customers.atRisk > 0 ? `Follow up with ${context.customers.atRisk} at-risk customers` : null,
      context.leads?.closingThisWeek && context.leads.closingThisWeek > 0 ? `Close ${context.leads.closingThisWeek} leads this week` : null,
    ].filter(Boolean) as string[],
  };
}
