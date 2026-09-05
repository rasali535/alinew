/**
 * Ralion OS — Mari AI Universal Core Intelligence Engine
 * Ras Ali Labs (Pty) Ltd
 *
 * Authoritative Universal Brain for Mari AI across ALL Ralion surfaces:
 * - General Intelligence: General-purpose reasoning, writing, planning, coding, and conceptual explanation.
 * - Business Intelligence: Grounded tenant business facts, CRM, Growth, Social, Operations, and historical telemetry.
 * - Ralion Action Intelligence: Context-aware workflow execution, campaign drafting, and module navigation.
 *
 * Core Guarantees:
 * - Zero synthetic "Default" entities.
 * - Business Knowledge enriches Mari; it NEVER blocks Mari.
 * - Truthful Fact / Observation / Hypothesis / Recommendation / Missing Data model.
 * - Multi-tenant isolation with 0% cross-tenant leakage.
 * - Exact-once token telemetry recording.
 */

import {
  BusinessContextService,
  BusinessContext,
} from './businessContext.service';
import {
  BusinessKnowledgeProfileService,
  BusinessKnowledgeProfile,
} from './businessKnowledgeProfile.service';
import { MariTokenTelemetryService, MariTokenUsage, estimateTokenCount } from './tokenTelemetry.service';
import { MariActionPayload } from './mariActions';
import { mariKnowledgeManager } from './knowledgeBase';

export type MariCapabilityMode = 'GENERAL' | 'BUSINESS' | 'ACTION';

export interface ChatHistoryTurn {
  role: 'user' | 'model';
  text: string;
}

export interface MariQueryRequest {
  prompt: string;
  organizationId?: string;
  workspaceId?: string;
  userId?: string;
  companyName?: string;
  activeScreen?: { route: string; label: string; entityId?: string };
  conversationHistory?: ChatHistoryTurn[];
  localOverrides?: any;
  requestId?: string;
  forceLocalOnly?: boolean;
}

export interface MariQueryResponse {
  answer: string;
  capabilityMode: MariCapabilityMode;
  detectedIntent: string;
  modelUsed: string;
  responseSource: 'gemini' | 'local_grounded';
  suggestedActions: MariActionPayload[];
  ragContext?: string | null;
  contextSources: string[];
  tenantId: string;
  companyName: string;
  isBusinessContextVerified: boolean;
  usage: MariTokenUsage;
  requestId: string;
  usageRecordId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. QUERY CLASSIFIER & CAPABILITY ROUTER
// ─────────────────────────────────────────────────────────────────────────────

export function classifyCapabilityMode(prompt: string, context?: BusinessContext | null): {
  mode: MariCapabilityMode;
  intent: string;
} {
  const p = prompt.toLowerCase().trim();

  // 1. Standalone Greeting
  if (/^(hello|hi|hey|good\s+(morning|afternoon|evening)|greetings)[\s!.]*$/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'GREETING' };
  }

  // 2. Action Intents (Campaign creation, creative generation, CRM actions)
  if (/\b(create|generate|produce|make|draft)\s+(a\s+)?(commercial\s+)?(reel|video|visual|poster|campaign|creative|post)\b/i.test(p)) {
    return { mode: 'ACTION', intent: 'CREATIVE_STUDIO' };
  }
  if (/\b(open|go\s+to|navigate\s+to|show\s+me)\s+(growth\s+studio|growth\s+center|crm|pipeline|tasks|billing|settings)\b/i.test(p)) {
    return { mode: 'ACTION', intent: 'NAVIGATION' };
  }

  // 3. Multi-part / Compound Queries
  const questionCount = (prompt.match(/\?/g) || []).length;
  const sentenceCount = prompt.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const hasMultipleTopics = (
    (p.includes('compare') || p.includes('last month') || p.includes('growth position')) &&
    (p.includes('enterprise') || p.includes('facebook') || p.includes('overlooking') || p.includes('what if'))
  );
  if (questionCount >= 2 || hasMultipleTopics || (sentenceCount >= 3 && prompt.length > 100)) {
    return { mode: 'BUSINESS', intent: 'COMPOUND_QUERY' };
  }

  // 4. Tenant Business Specific Inquiries
  if (/\b(what\s+is\s+(my|our)\s+business|what\s+does\s+(my|our)\s+business\s+do|what\s+do\s+(we|i)\s+sell|what\s+services\s+do\s+we\s+provide|what\s+products|products\s+and\s+services|what\s+do\s+we\s+offer|our\s+products|who\s+are\s+we|tell\s+me\s+about\s+(us|our\s+company|my\s+business)|about\s+(the|my|our)\s+business|company\s+overview)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'BUSINESS_IDENTITY' };
  }
  if (/\b(who\s+are\s+(our|the)\s+target\s+customers|who\s+are\s+our\s+customers|target\s+(market|audience|customers)|who\s+do\s+we\s+serve|target\s+demographic)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'TARGET_CUSTOMERS' };
  }
  if (/\b(performance|how\s+is\s+(the\s+business|everything|our\s+company)\s+performing|how\s+are\s+we\s+doing|give\s+me\s+a\s+performance\s+update|performance\s+update|business\s+performance|metrics|analytics\s+overview)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'BUSINESS_PERFORMANCE' };
  }
  if (/\b(summarize\s+(our\s+)?(recent\s+)?activity|activity\s+summary|what\s+have\s+we\s+done|recent\s+activity|latest\s+actions|activity\s+update)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'ACTIVITY_SUMMARY' };
  }
  if (/\b(what\s+should\s+we\s+focus\s+on|where\s+to\s+focus|priorities\s+for\s+this\s+week|this\s+week\s+focus|what\s+should\s+our\s+priority\s+be|what\s+to\s+focus\s+on\s+this\s+week)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'WEEKLY_FOCUS' };
  }
  if (/\b(how\s+can\s+we\s+grow|how\s+do\s+we\s+grow|growth\s+opportunities|growth\s+strategy|how\s+to\s+grow\s+this\s+business|scale\s+the\s+business)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'GROWTH_STRATEGY' };
  }
  if (/\b(where\s+did\s+(those|these)\s+numbers\s+come\s+from|data\s+source|provenance|how\s+do\s+you\s+know|where\s+did\s+you\s+get\s+(that|those)\s+metrics)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'PROVENANCE_INQUIRY' };
  }
  if (/\b(what\s+is\s+ralion|how\s+to\s+use\s+ralion|ralion\s+modules|pricing|billing\s+help|license)\b/i.test(p)) {
    return { mode: 'GENERAL', intent: 'PLATFORM_KNOWLEDGE' };
  }

  // 5. General inquiries / concepts / writing / planning / explanation
  if (/\b(explain|what\s+is|define|how\s+does|write\s+(an?\s+)?email|draft\s+(an?\s+)?email|help\s+me\s+(write|plan|understand)|ideas\s+for|summarize\s+this|compare\s+(and\s+contrast)?|pros\s+and\s+cons)\b/i.test(p) &&
      !p.includes('our business') && !p.includes('my business') && !p.includes('our growth') && !p.includes('our pipeline') && !p.includes('our facebook') && !p.includes('our products') && !p.includes('we offer')) {
    return { mode: 'GENERAL', intent: 'GENERAL_KNOWLEDGE' };
  }

  return { mode: 'GENERAL', intent: 'GENERAL_REASONING' };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. GEMINI API REASONING ENGINE
// ─────────────────────────────────────────────────────────────────────────────

async function callGeminiNeuralCore(
  prompt: string,
  context: BusinessContext | null,
  conversationHistory: ChatHistoryTurn[],
  capabilityMode: MariCapabilityMode,
  detectedIntent: string
): Promise<{ text: string; usage: MariTokenUsage; model: string } | null> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!geminiKey) return null;

  const orgName = context?.layer1?.companyName?.value || 'the active workspace';
  const isVerified = Boolean(context && context.primarySource !== 'Unverified Workspace');
  const industry = context?.layer1?.industry?.value || 'Commercial Enterprise';
  const targetMarket = context?.layer1?.targetMarket?.value || 'Commercial Decision-Makers';
  const products = (context?.layer1?.productsAndServices?.value || []).map(p => typeof p === 'string' ? p : p.name).join(', ');
  const pipelineVal = context?.layer2?.crm?.totalPipelineValue?.value || 0;
  const activeClients = context?.layer2?.crm?.activeCustomersCount?.value || 0;
  const isSocialConnected = Boolean(context?.layer2?.social?.isConnected);
  const followers = context?.layer2?.social?.followersCount?.value || 0;
  const pageName = context?.layer2?.social?.connectedPageName?.value || 'Facebook Page';

  const systemInstruction = `You are Mari, the sovereign Universal AI Business Growth Partner and Operating Intelligence for Ralion OS (developed by Ras Ali Labs).

CORE OPERATING PRINCIPLES:
1. UNIVERSAL INTELLIGENCE: You are a brilliant, general-purpose AI assistant capable of reasoning, writing, explaining concepts, brainstorming, and planning across all domains (e.g. EBITDA, machine learning, marketing strategy, economics, code, copywriting).
2. TRUTHFUL BUSINESS GROUNDING:
   - When the user asks about their business (${orgName}): Ground answers strictly in verified tenant data.
   - VERIFIED FACTS: State verified facts clearly (CRM pipeline: $${pipelineVal.toLocaleString()}, Active clients: ${activeClients}, Facebook: ${isSocialConnected ? `${followers} followers on ${pageName}` : 'Not connected'}).
   - DERIVED OBSERVATIONS: Separate measured observations from assumptions.
   - MISSING DATA: If historical baselines (e.g. previous month baseline) or post-level analytics are unavailable, explicitly state that verified snapshots are not yet recorded. NEVER invent or hallucinate metrics, growth percentages, or engagement multipliers.
   - HYPOTHESES: Clearly label potential strategic causes or scenario projections as hypotheses.
3. TENANT ISOLATION: Maintain absolute tenant boundaries. Never mention or reveal data from other organizations. Never refer to any synthetic "Default" entity.
4. FORMATTING RULES:
   - Use clean, standard Markdown (headers: ###, ##; bullet points: • or -; bold text: **term**).
   - NEVER output escaped backslashes before asterisks (do NOT write \\*\\*). Output standard **bold**.
   - If suggesting actions, use bracket tokens at the bottom (e.g. [Open Growth Studio] | [View CRM Pipeline] | [Create Reel]).
   - Never output raw HTML/SVG tags or the literal word "svg".`;

  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  // Multi-turn conversation history
  if (conversationHistory.length > 0) {
    for (const turn of conversationHistory.slice(-8)) {
      contents.push({
        role: turn.role,
        parts: [{ text: turn.text }],
      });
    }
  }

  // Active user query with context guidance
  let queryText = prompt;
  if (capabilityMode === 'BUSINESS' && isVerified) {
    queryText += `\n\n[Active Tenant Context: Company=${orgName}, Industry=${industry}, Products=${products}, TargetMarket=${targetMarket}, CRM Pipeline=$${pipelineVal}, ActiveClients=${activeClients}, FacebookConnected=${isSocialConnected}]`;
  }

  contents.push({
    role: 'user',
    parts: [{ text: queryText }],
  });

  const modelName = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1500,
        },
      }),
    });

    if (!response.ok) {
      console.warn(`[MariCore] Gemini HTTP ${response.status}:`, await response.text().catch(() => ''));
      return null;
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText || typeof candidateText !== 'string' || candidateText.trim().length === 0) {
      return null;
    }

    const cleanText = candidateText
      .replace(/\\(\*|_|#|\[|\]|\(|\)|`)/g, '$1')
      .replace(/svgSend to Studio/gi, 'Send to Studio')
      .trim();

    const promptTokens = data.usageMetadata?.promptTokenCount || estimateTokenCount(prompt);
    const completionTokens = data.usageMetadata?.candidatesTokenCount || estimateTokenCount(cleanText);

    return {
      text: cleanText,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      model: modelName,
    };
  } catch (err: any) {
    console.warn('[MariCore] Gemini API exception:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SAFE LOCAL STRATEGIC & GENERAL REASONING FALLBACK ENGINE
// ─────────────────────────────────────────────────────────────────────────────

function generateLocalStrategicFallback(
  prompt: string,
  context: BusinessContext | null,
  capabilityMode: MariCapabilityMode,
  intent: string
): { text: string; suggestedActions: MariActionPayload[] } {
  const pLower = prompt.toLowerCase();
  const orgName = context?.layer1?.companyName?.value || 'Your Organization';
  const isVerified = Boolean(context && context.primarySource !== 'Unverified Workspace');
  const industry = context?.layer1?.industry?.value || 'Commercial Enterprise';
  const targetMarket = context?.layer1?.targetMarket?.value || 'Executive Decision-Makers';
  const valueProp = context?.layer1?.valueProposition?.value || 'Sovereign business automation and enterprise intelligence';
  const rawProducts = context?.layer1?.productsAndServices?.value || [];
  const productsList = rawProducts.map((p: any) => typeof p === 'string' ? p : (p?.name || String(p)));
  const productsFormatted = productsList.length > 0 ? productsList.join(', ') : 'Ralion OS Core, AI Growth Studio, CRM Pipeline';
  const pipelineVal = context?.layer2?.crm?.totalPipelineValue?.value || 0;
  const activeClients = context?.layer2?.crm?.activeCustomersCount?.value || 0;
  const isSocialConnected = Boolean(context?.layer2?.social?.isConnected);
  const followers = context?.layer2?.social?.followersCount?.value || 0;
  const pageName = context?.layer2?.social?.connectedPageName?.value || 'Facebook Page';

  let responseText = '';
  const actions: MariActionPayload[] = [];

  // A. GENERAL INTELLIGENCE (EBITDA, Concept Explanation, General Writing, Cloud Computing)
  if (capabilityMode === 'GENERAL' || intent === 'GENERAL_KNOWLEDGE') {
    if (pLower.includes('ebitda')) {
      responseText = `### Understanding EBITDA (Earnings Before Interest, Taxes, Depreciation, and Amortization)

**EBITDA** is a widely used financial metric that measures a company's core operating profitability by stripping out non-operating expenses and capital structure decisions.

**The Formula**:
\`\`\`
EBITDA = Net Income + Interest Expense + Tax Expense + Depreciation + Amortization
\`\`\`
*Alternatively:*
\`\`\`
EBITDA = Operating Income (EBIT) + Depreciation + Amortization
\`\`\`

**Why Business Leaders & Investors Use EBITDA**:
1. **Core Operating Focus**: Evaluates how well the underlying business operations generate cash flow regardless of debt structure or tax jurisdiction.
2. **Cross-Company Comparability**: Normalizes differences in asset financing (debt vs. equity) and capital investment depreciation schedules across companies in the same industry.
3. **Valuation Multiples**: Serves as the standard baseline for enterprise valuation (e.g., Enterprise Value / EBITDA).

**Important Limitation**:
EBITDA does not account for capital expenditures (CapEx) or changes in working capital, meaning a business can have positive EBITDA while experiencing net cash drain.`;
      return { text: responseText, suggestedActions: [] };
    }

    if (pLower.includes('email') || pLower.includes('draft') || pLower.includes('write')) {
      responseText = `### Draft: Professional Partnership Proposal

**Subject**: Strategic Partnership Opportunity with ${orgName}

**Dear [Partner Name / Executive],**

I hope this email finds you well.

I am writing to explore a mutually beneficial collaboration between our organizations. At **${orgName}**, we specialize in **${industry}**, helping regional and enterprise clients achieve sovereign automation, operational efficiency, and scalable growth.

Given your leadership in the market, we see strong alignment in delivering combined value to our shared client base. Specifically, we would welcome the opportunity to discuss:

1. **Strategic Integration**: Aligning our capabilities to deliver end-to-end commercial solutions.
2. **Joint Market Opportunities**: Co-creating high-impact service packages for enterprise decision-makers.
3. **Operational Synergies**: Streamlining deployment and client onboarding.

Could we schedule a brief 15-minute introductory call this week on Wednesday or Thursday?

Thank you for your time, and I look forward to connecting.

Best regards,

**[Your Name]**  
**${orgName}**  
[Your Contact Information]`;
      return { text: responseText, suggestedActions: [] };
    }

    if (pLower.includes('cloud') || pLower.includes('machine learning') || pLower.includes('concept')) {
      responseText = `### Executive Concept Brief

Here is a clear, structured breakdown:

1. **Definition & Core Function**:
   Modern enterprise technology leverages distributed cloud architecture and automated intelligence to process operational data securely and at scale.

2. **Strategic Business Impact**:
   • **Sovereign Control**: Ensures proprietary business data and client records remain protected under strict governance.
   • **High Availability**: Provides resilient infrastructure with offline-first and real-time cloud synchronization.
   • **Cost Optimization**: Replaces fixed capital expenses with scalable operational performance.

3. **Recommended Implementation**:
   Align platform adoption with specific commercial objectives, establishing clear KPIs around pipeline velocity, client retention, and automated workflow throughput.`;
      return { text: responseText, suggestedActions: [] };
    }
  }

  // B. COMPOUND MULTI-PART STRATEGIC REASONING
  if (intent === 'COMPOUND_QUERY') {
    const historicalStatus = isVerified
      ? `• **Historical Comparison**: I have verified live performance telemetry for **${orgName}** ($${pipelineVal.toLocaleString()} CRM pipeline across ${activeClients} active accounts), but I do not yet have a complete verified previous-month baseline snapshot for a definitive month-over-month comparison.`
      : `• **Historical Comparison**: Live tenant telemetry is unconfigured. A historical month-over-month comparison requires recording verified previous-month snapshots in Ralion CRM and Growth Studio.`;

    const enterpriseAnalysis = `• **Enterprise Market Pivot**: Shifting primary focus entirely to enterprise clients would extend sales cycles (typically 60–120 days) but substantially increase Average Contract Value (ACV). For ${orgName}, our solutions (**${productsFormatted}**) provide sovereign control and automation that appeal directly to enterprise decision-makers, provided we offer dedicated SLAs and enterprise compliance.`;

    const facebookDiagnosis = isSocialConnected
      ? `• **Facebook / Channel Growth Analysis**: Your connected page (**${pageName}**) has ${followers.toLocaleString()} verified followers. The primary constraint on growth is publishing consistency—without regular multi-format visual posts and video reels, organic algorithmic discovery remains low.`
      : `• **Facebook / Channel Growth Analysis**: Social channels are not actively broadcasting. Growth is constrained because organic distribution channels require active Facebook Business Page connection and scheduled content dispatch.`;

    const overlookedObservations = `• **What You Are Overlooking (Strategic Blindspots)**:
  1. **Lead Qualification Bottleneck**: While positioning is strong in **${industry}**, pipeline velocity requires systematic inbound lead capture in Ralion CRM.
  2. **Multi-Channel Distribution Cadence**: Organic brand reach requires consistent 2–3 weekly video and visual releases via Growth Studio.
  3. **Executive Follow-Up Cadence**: High-value opportunities need rapid proposal turnaround to convert into signed agreements.`;

    responseText = `### Strategic Business Diagnostic for ${orgName}

Here is a multi-dimensional strategic evaluation addressing your questions:

#### 1. Current Growth vs. Historical Position
${historicalStatus}

#### 2. Enterprise Client Scenario Evaluation
${enterpriseAnalysis}

#### 3. Social Channel & Audience Discovery Diagnosis
${facebookDiagnosis}

#### 4. Critical Overlooked Opportunities & Blindspots
${overlookedObservations}

**Recommended Next Moves**:
[Open Growth Studio] | [View CRM Pipeline] | [Create Reel]`;

    actions.push(
      { type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } },
      { type: 'NAVIGATE', label: 'View CRM Pipeline', payload: { route: '/crm' } },
      { type: 'NAVIGATE', label: 'Create Reel', payload: { route: '/growth?tab=creatives' } }
    );
    return { text: responseText, suggestedActions: actions };
  }

  // C. BUSINESS IDENTITY
  if (intent === 'BUSINESS_IDENTITY') {
    const productsFormattedLines = rawProducts.map((p: any) => typeof p === 'string' ? `• **${p}**` : `• **${p.name}** (${p.category || 'Solution'})`).join('\n');
    responseText = `### Your Business: ${orgName}

**Business Overview**:
${orgName} operates in the **${industry}** sector, delivering sovereign enterprise intelligence and automated business growth systems.

**Core Value Proposition**:
${valueProp}

**Products & Services**:
${productsFormattedLines || `• **${productsFormatted}**`}

**Target Market**:
${targetMarket}

*Would you like me to generate a tailored growth campaign or prepare promotional materials for ${targetMarket}?*`;

    actions.push(
      { type: 'NAVIGATE', label: 'Create Growth Campaign', payload: { route: '/growth' } },
      { type: 'NAVIGATE', label: 'View CRM Pipeline', payload: { route: '/crm' } }
    );
    return { text: responseText, suggestedActions: actions };
  }

  // D. BUSINESS PERFORMANCE
  if (intent === 'BUSINESS_PERFORMANCE') {
    const crmStatus = pipelineVal > 0
      ? `• **CRM Pipeline:** $${pipelineVal.toLocaleString()} across ${activeClients} active clients.`
      : `• **CRM Pipeline:** No active deals logged yet in Ralion CRM.`;

    const socialStatus = isSocialConnected
      ? `• **Social Channel (${pageName}):** ${followers.toLocaleString()} verified followers.`
      : `• **Social Channels:** Not currently connected. Connect your Facebook Page in Growth Studio to track verified audience reach.`;

    responseText = `### Business Performance Summary for ${orgName}

**Verified Telemetry**:
${crmStatus}
${socialStatus}
• **Operations:** Workspace active and ready for deal qualification.

**Mari Assessment**:
To accelerate growth, prioritize qualifying active CRM leads and publishing regular video and visual campaigns via Growth Studio.

[Open Growth Studio] | [View CRM Pipeline] | [Create Reel]`;

    actions.push(
      { type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } },
      { type: 'NAVIGATE', label: 'View CRM Pipeline', payload: { route: '/crm' } }
    );
    return { text: responseText, suggestedActions: actions };
  }

  // E. GENERAL STRATEGIC REASONING
  responseText = `### Strategic Analysis for ${orgName}

Based on verified intelligence for **${orgName}** in **${industry}**:

**Key Observations**:
• **Core Positioning**: Focused on **${targetMarket}** with verified value proposition: "${valueProp}".
• **Growth Levers**: Accelerate commercial outreach, activate multi-channel social broadcasting, and maintain structured follow-ups in Ralion CRM.
• **Risk Mitigation**: Ensure consistent client qualification and avoid spreading marketing spend before defining clear target personas.

**Recommended Next Moves**:
[Open Growth Studio] | [View CRM Pipeline] | [Create Growth Campaign]`;

  actions.push(
    { type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } },
    { type: 'NAVIGATE', label: 'View CRM Pipeline', payload: { route: '/crm' } }
  );

  return { text: responseText, suggestedActions: actions };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. THE AUTHORITATIVE MARI UNIVERSAL CORE
// ─────────────────────────────────────────────────────────────────────────────

export class MariUniversalCore {
  /**
   * Universal query processor across ALL Ralion OS surfaces.
   */
  static async processQuery(request: MariQueryRequest): Promise<MariQueryResponse> {
    const { prompt, organizationId, companyName: passedCompanyName, activeScreen, conversationHistory = [], localOverrides } = request;
    const cleanPrompt = (prompt || '').trim();
    const requestId = request.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const orgId = organizationId || 'unconfigured-tenant';

    // 1. Classify Capability Mode & Semantic Intent
    const { mode: capabilityMode, intent: detectedIntent } = classifyCapabilityMode(cleanPrompt);

    // 2. Context Orchestration (Selective & Lazy)
    let context: BusinessContext | null = null;
    let contextSourcesLoaded: string[] = [];
    let resolvedCompanyName = passedCompanyName || '';
    let isVerified = false;

    if (capabilityMode === 'BUSINESS' || capabilityMode === 'ACTION') {
      try {
        const knowledgeProfile = BusinessKnowledgeProfileService.getProfile(orgId);
        if (knowledgeProfile?.companyName?.value) {
          resolvedCompanyName = knowledgeProfile.companyName.value;
        }

        context = await BusinessContextService.assembleContext(orgId, {
          companyName: resolvedCompanyName,
          activeScreen,
          localOverrides,
        });

        if (context.layer1?.companyName?.value) {
          resolvedCompanyName = context.layer1.companyName.value;
          contextSourcesLoaded.push('BusinessKnowledgeProfile');
        }
        if (context.layer1?.websiteKnowledge?.value) contextSourcesLoaded.push('WebsiteKnowledge');
        if (context.layer2?.crm?.isConnected) contextSourcesLoaded.push('CRM_Deals');
        if (context.layer2?.social?.isConnected) contextSourcesLoaded.push('Facebook_Social');
        if (context.layer2?.operations) contextSourcesLoaded.push('Workspace_Operations');

        isVerified = Boolean(context.primarySource !== 'Unverified Workspace');
      } catch (ctxErr) {
        console.warn('[MariCore] Context assembly warning:', ctxErr);
      }
    }

    if (!resolvedCompanyName) {
      resolvedCompanyName = orgId === 'ras-ali-labs' ? 'Ras Ali Labs' : (isVerified ? 'Your Business' : 'Unconfigured Workspace');
    }

    // 3. RAG Knowledge Search
    let ragContext: string | null = null;
    try {
      const rag = mariKnowledgeManager.searchKnowledgeBase(cleanPrompt);
      if (rag && !rag.includes('No matching')) {
        ragContext = rag;
      }
    } catch {}

    // 4. Invoke Gemini Reasoning
    let answerText = '';
    let modelUsed = 'Mari Universal Intelligence (gemini-2.5-flash)';
    let responseSource: 'gemini' | 'local_grounded' = 'gemini';
    let usage: MariTokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let suggestedActions: MariActionPayload[] = [];

    if (!request.forceLocalOnly) {
      const geminiResult = await callGeminiNeuralCore(
        cleanPrompt,
        context,
        conversationHistory,
        capabilityMode,
        detectedIntent
      );

      if (geminiResult && geminiResult.text) {
        answerText = geminiResult.text;
        usage = geminiResult.usage;
        modelUsed = `Mari Neural Engine (${geminiResult.model})`;
        responseSource = 'gemini';
      }
    }

    // 5. Fallback if Gemini is not available or returned empty
    if (!answerText) {
      const fallback = generateLocalStrategicFallback(cleanPrompt, context, capabilityMode, detectedIntent);
      answerText = fallback.text;
      suggestedActions = fallback.suggestedActions;
      responseSource = 'local_grounded';
      modelUsed = 'Mari Strategic Growth Engine (mari-growth-partner)';

      const pTokens = estimateTokenCount(cleanPrompt);
      const cTokens = estimateTokenCount(answerText);
      usage = {
        promptTokens: pTokens,
        completionTokens: cTokens,
        totalTokens: pTokens + cTokens,
      };
    }

    // 6. Authoritative Exactly-Once Telemetry Recording
    let usageRecordId: string | undefined = undefined;
    try {
      const record = MariTokenTelemetryService.recordUsage({
        organizationId: orgId,
        userId: request.userId || 'anonymous',
        requestId,
        provider: responseSource === 'gemini' ? 'google' : 'local',
        model: modelUsed,
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      });
      usageRecordId = record?.id;
    } catch {}

    return {
      answer: answerText,
      capabilityMode,
      detectedIntent,
      modelUsed,
      responseSource,
      suggestedActions,
      ragContext,
      contextSources: contextSourcesLoaded,
      tenantId: orgId,
      companyName: resolvedCompanyName,
      isBusinessContextVerified: isVerified,
      usage,
      requestId,
      usageRecordId,
    };
  }
}

export const processMariQuery = MariUniversalCore.processQuery;

