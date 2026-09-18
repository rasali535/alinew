import 'server-only';

import { BusinessContextService } from '@ralion/ai/server';
import { MariKnowledgeRetrievalService } from './mariKnowledgeRetrieval.service';
import { WorkflowOutcomeLearningService } from '@/lib/operations/workflowOutcomeLearning.service';

export type WorkflowIntent = 'SALES_ENQUIRY' | 'SUPPORT' | 'COMPLAINT' | 'PRICING' | 'BOOKING' | 'PRAISE' | 'SPAM' | 'GENERAL';
export type WorkflowRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export interface MariWorkflowDecision {
  intent: WorkflowIntent;
  confidence: number;
  risk: WorkflowRisk;
  requiresApproval: boolean;
  recommendedAction: 'RESPOND' | 'CREATE_TASK' | 'ESCALATE' | 'IGNORE';
  proposedResponse: string | null;
  reason: string;
  contextSources: string[];
}

function text(value: unknown, max = 1600) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function classify(message: string): { intent: WorkflowIntent; confidence: number; risk: WorkflowRisk } {
  const m = message.toLowerCase();
  if (/\b(refund|lawyer|legal|sue|fraud|scam|angry|complaint|terrible|unacceptable|disappointed)\b/.test(m)) return { intent: 'COMPLAINT', confidence: .92, risk: 'HIGH' };
  if (/\b(price|pricing|cost|how much|quote|quotation|fee)\b/.test(m)) return { intent: 'PRICING', confidence: .9, risk: 'MEDIUM' };
  if (/\b(book|booking|appointment|reserve|availability|available)\b/.test(m)) return { intent: 'BOOKING', confidence: .88, risk: 'MEDIUM' };
  if (/\b(buy|purchase|interested|demo|sign up|contact me|need this|want this)\b/.test(m)) return { intent: 'SALES_ENQUIRY', confidence: .86, risk: 'MEDIUM' };
  if (/\b(help|support|problem|issue|not working|error|broken|trouble)\b/.test(m)) return { intent: 'SUPPORT', confidence: .88, risk: 'MEDIUM' };
  if (/\b(love|great|amazing|excellent|thank|thanks|awesome|well done)\b/.test(m)) return { intent: 'PRAISE', confidence: .84, risk: 'LOW' };
  if (/https?:\/\/|\b(free money|crypto giveaway|click here)\b/.test(m)) return { intent: 'SPAM', confidence: .82, risk: 'LOW' };
  return { intent: 'GENERAL', confidence: .62, risk: 'MEDIUM' };
}

export class MariWorkflowDecisionService {
  static async decide(params: { organizationId: string; workspaceId: string; userId: string; message: string; channel?: string; autoApproveLowRisk?: boolean; }) : Promise<MariWorkflowDecision> {
    const message = text(params.message);
    if (!message) throw new Error('Mari workflow decision requires an inbound message.');

    const base = classify(message);
    let business: any = null;
    try {
      business = await BusinessContextService.assembleContext(params.organizationId, {
        organizationId: params.organizationId,
        workspaceId: params.workspaceId,
        userId: params.userId,
      });
    } catch {}

    const knowledge = await MariKnowledgeRetrievalService.retrieve({ workspaceId: params.workspaceId, query: message, limit: 5 }).catch(() => ({ chunks: [], documentsConsulted: [] }));
    const learned = await WorkflowOutcomeLearningService.summarize(params.workspaceId).catch(() => ({ total: 0, measured: 0, successful: 0, successRate: null, recent: [] as any[] }));
    const company = text(business?.layer1?.companyName?.value || business?.organizationName || '', 180);
    const products = Array.isArray(business?.layer1?.productsAndServices?.value) ? business.layer1.productsAndServices.value.map((x:any)=>text(typeof x === 'string' ? x : x?.name || x?.title, 160)).filter(Boolean).slice(0,8) : [];

    const sources = ['WORKFLOW_EVENT'];
    if (business) sources.push('BUSINESS_CONTEXT');
    if (knowledge.chunks.length) sources.push('TENANT_KNOWLEDGE');
    if (learned.measured > 0) sources.push('WORKFLOW_OUTCOMES');

    // Phase 2 safety contract: deterministic classification is allowed without paid
    // reasoning. It never invents prices, policies, availability or commitments.
    let proposedResponse: string | null = null;
    if (base.intent === 'PRAISE') proposedResponse = company ? `Thank you for the kind words! — ${company}` : 'Thank you for the kind words!';
    if (base.intent === 'GENERAL' && base.confidence >= .8) proposedResponse = company ? `Thanks for reaching out to ${company}. How can we help?` : 'Thanks for reaching out. How can we help?';
    if (base.intent === 'SALES_ENQUIRY' && products.length) proposedResponse = `Thanks for your interest. We can help with ${products.slice(0,3).join(', ')}. Tell us a little more about what you need and our team can assist.`;

    const safeAuto = base.risk === 'LOW' && base.confidence >= .8 && Boolean(proposedResponse) && params.autoApproveLowRisk === true;
    return {
      intent: base.intent,
      confidence: base.confidence,
      risk: base.risk,
      requiresApproval: !safeAuto,
      recommendedAction: base.intent === 'SPAM' ? 'IGNORE' : base.risk === 'HIGH' ? 'ESCALATE' : proposedResponse ? 'RESPOND' : 'CREATE_TASK',
      proposedResponse,
      reason: base.risk === 'HIGH'
        ? 'Sensitive interaction requires human review.'
        : proposedResponse
          ? `A response can be grounded in verified tenant context.${learned.measured > 0 ? ` Prior measured workflow outcomes: ${learned.successful}/${learned.measured} successful (${learned.successRate}%).` : ''}`
          : 'No safe grounded response can be produced automatically.',
      contextSources: sources,
    };
  }
}
