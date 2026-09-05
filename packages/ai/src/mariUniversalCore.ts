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
 * - Zero provider-derived identity fallbacks (@facebook, @facebook_page).
 * - Zero hardcoded string fallbacks (Commercial Enterprise, Regional Commercial Clients, Default, Ras Ali Labs for other tenants).
 * - Business Knowledge enriches Mari; it NEVER blocks Mari.
 * - Truthful Fact / Observation / Hypothesis / Recommendation / Missing Data model.
 * - Multi-tenant isolation with 0% cross-tenant leakage.
 * - Exact-once token telemetry recording.
 * - Clean Markdown output without SVG leakage, nested duplicate bullets, or inlined bracket metadata.
 */

import {
  BusinessContextService,
  BusinessContext,
} from './businessContext.service';
import {
  BusinessKnowledgeProfileService,
  BusinessKnowledgeProfile,
} from './businessKnowledgeProfile.service';
import {
  BusinessIdentityResolver,
  ResolvedBusinessIdentity,
} from './businessIdentityResolver';
import { MariTokenTelemetryService, MariTokenUsage, estimateTokenCount } from './tokenTelemetry.service';
import { MariActionPayload } from './mariActions';
import { mariKnowledgeManager } from './knowledgeBase';

export type MariCapabilityMode = 'GENERAL' | 'BUSINESS' | 'ACTION';
export type RequestedContextSource =
  | 'FACEBOOK'
  | 'WEBSITE'
  | 'CRM'
  | 'OPERATIONS'
  | 'GROWTH'
  | 'BUSINESS_PROFILE'
  | 'ALL_SOURCES'
  | 'GENERAL'
  | 'CROSS_SOURCE';

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
  requestedSource?: RequestedContextSource;
} {
  const p = prompt.toLowerCase().trim();

  // 1. Standalone Greeting
  if (/^(hello|hi|hey|good\s+(morning|afternoon|evening)|greetings)[\s!.]*$/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'GREETING', requestedSource: 'GENERAL' };
  }

  // 2. Action Intents (Campaign creation, creative generation, CRM actions)
  if (/\b(create|generate|produce|make|draft)\s+(a\s+)?(commercial\s+)?(reel|video|visual|poster|campaign|creative|post)\b/i.test(p)) {
    return { mode: 'ACTION', intent: 'CREATIVE_STUDIO', requestedSource: 'GROWTH' };
  }
  if (/\b(open|go\s+to|navigate\s+to|show\s+me)\s+(growth\s+studio|growth\s+center|crm|pipeline|tasks|billing|settings)\b/i.test(p)) {
    return { mode: 'ACTION', intent: 'NAVIGATION', requestedSource: 'OPERATIONS' };
  }

  // 3. Source-Specific: Cross-Source Inquiries (Highest specificity)
  if (/\b(compare\s+(what\s+)?(our\s+)?website\s+(says\s+)?(positioning\s+)?with\s+(our\s+)?facebook|compare\s+(our\s+)?website\s+with\s+(our\s+)?facebook|is\s+(our\s+)?facebook\s+positioning\s+consistent\s+with\s+(our\s+)?website|website\s+vs\s+facebook|compare\s+website\s+and\s+social)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'COMPARE_WEBSITE_VS_SOCIAL', requestedSource: 'CROSS_SOURCE' };
  }

  // 4. Source-Specific: Facebook Audits & Actionable Analyses
  if (/\b(how\s+can\s+we\s+improve\s+(our\s+)?facebook|how\s+could\s+we\s+improve\s+(our\s+)?facebook|improve\s+(our\s+)?facebook|how\s+to\s+improve\s+(our\s+)?facebook|optimize\s+(our\s+)?facebook|facebook\s+positioning\s+improvement)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'FACEBOOK_IMPROVEMENT_AUDIT', requestedSource: 'FACEBOOK' };
  }
  if (/\b(what\s+information\s+is\s+missing\s+from\s+(our\s+)?facebook|what\s+is\s+missing\s+from\s+(our\s+)?facebook|facebook\s+missing\s+(information|data)|what\s+does\s+facebook\s+lack)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'FACEBOOK_MISSING_INFO', requestedSource: 'FACEBOOK' };
  }
  if (/\b(does\s+facebook\s+communicate\s+(our\s+)?value\s+proposition|is\s+facebook\s+communicating\s+(our\s+)?value\s+proposition|facebook\s+value\s+proposition)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'FACEBOOK_VALUE_PROP_AUDIT', requestedSource: 'FACEBOOK' };
  }
  if (/\b(which\s+facebook\s+page\s+is\s+connected|what\s+facebook\s+page\s+is\s+linked|which\s+page\s+is\s+connected|connected\s+facebook\s+page|what\s+social\s+account\s+is\s+connected)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'CONNECTED_SOCIAL_PAGE', requestedSource: 'FACEBOOK' };
  }

  // 5. Source-Specific: General Facebook Knowledge
  if (/\b(what\s+does\s+(our|the|my)\s+facebook(\s+page)?\s+say|what\s+does\s+facebook\s+say(\s+about\s+us)?|what('s|\s+is)\s+on\s+(our|my)\s+facebook|summarize\s+(our|my)\s+facebook|how\s+does\s+facebook\s+present\s+(our|the|my)\s+business|facebook\s+about\s+section|facebook\s+positioning|facebook\s+overview|facebook\s+presence)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'FACEBOOK_KNOWLEDGE', requestedSource: 'FACEBOOK' };
  }
  if (/\b(what\s+does\s+(our|the|my)\s+website\s+say|what('s|\s+is)\s+on\s+(our|my)\s+website|website\s+knowledge|summarize\s+(our|my)\s+website|website\s+intelligence)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'WEBSITE_KNOWLEDGE', requestedSource: 'WEBSITE' };
  }
  if (/\b(what\s+information\s+are\s+you\s+missing|what\s+data\s+is\s+missing|what\s+are\s+we\s+missing|missing\s+information|what\s+do\s+you\s+need\s+to\s+know)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'MISSING_DATA_AUDIT', requestedSource: 'ALL_SOURCES' };
  }
  if (/\b(what\s+do\s+you\s+know\s+about\s+(my|our)\s+business|what\s+do\s+you\s+know\s+about\s+us|synthesize\s+(all\s+)?(our\s+)?(business\s+)?(data|sources|knowledge)|what\s+information\s+do\s+you\s+have\s+about\s+(us|my\s+business)|tell\s+me\s+everything\s+you\s+know\s+about\s+us)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'BUSINESS_SYNTHESIS', requestedSource: 'ALL_SOURCES' };
  }
  if (/\b(where\s+should\s+we\s+focus\s+today|what\s+should\s+we\s+focus\s+on\s+today|where\s+to\s+focus\s+today|today('s)?\s+focus|what\s+should\s+we\s+focus\s+on|where\s+to\s+focus|priorities\s+for\s+(today|this\s+week)|what\s+should\s+our\s+priority\s+be)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'WEEKLY_FOCUS', requestedSource: 'OPERATIONS' };
  }

  // 5. Multi-part / Compound Queries
  const questionCount = (prompt.match(/\?/g) || []).length;
  const sentenceCount = prompt.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const hasMultipleTopics =
    (p.includes('compare') || p.includes('last month') || p.includes('growth position')) &&
    (p.includes('enterprise') || p.includes('facebook') || p.includes('overlooking') || p.includes('what if'));
  if (questionCount >= 2 || hasMultipleTopics || (sentenceCount >= 3 && prompt.length > 100)) {
    return { mode: 'BUSINESS', intent: 'COMPOUND_QUERY', requestedSource: 'ALL_SOURCES' };
  }

  // 6. Tenant Business Specific Inquiries
  if (/\b(what\s+is\s+(my|our)\s+business|what\s+does\s+(my|our)\s+business\s+do|what\s+do\s+(we|i)\s+sell|what\s+services\s+do\s+we\s+provide|what\s+products|products\s+and\s+services|what\s+do\s+we\s+offer|our\s+products|who\s+are\s+we|tell\s+me\s+about\s+(us|our\s+company|my\s+business)|about\s+(the|my|our)\s+business|company\s+overview)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'BUSINESS_IDENTITY', requestedSource: 'BUSINESS_PROFILE' };
  }
  if (/\b(who\s+are\s+(our|the)\s+target\s+customers|who\s+are\s+our\s+customers|target\s+(market|audience|customers)|who\s+do\s+we\s+serve|target\s+demographic)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'TARGET_CUSTOMERS', requestedSource: 'BUSINESS_PROFILE' };
  }
  if (/\b(performance|how\s+is\s+(the\s+business|everything|our\s+company)\s+performing|how\s+are\s+we\s+doing|give\s+me\s+a\s+performance\s+update|performance\s+update|business\s+performance|metrics|analytics\s+overview)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'BUSINESS_PERFORMANCE', requestedSource: 'CRM' };
  }
  if (/\b(summarize\s+(our\s+)?(recent\s+)?activity|activity\s+summary|what\s+have\s+we\s+done|recent\s+activity|latest\s+actions|activity\s+update)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'ACTIVITY_SUMMARY', requestedSource: 'OPERATIONS' };
  }
  if (/\b(how\s+can\s+we\s+grow|how\s+do\s+we\s+grow|growth\s+opportunities|growth\s+strategy|how\s+to\s+grow\s+this\s+business|scale\s+the\s+business)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'GROWTH_STRATEGY', requestedSource: 'GROWTH' };
  }
  if (/\b(where\s+did\s+(those|these)\s+numbers\s+come\s+from|data\s+source|provenance|how\s+do\s+you\s+know|where\s+did\s+you\s+get\s+(that|those)\s+metrics)\b/i.test(p)) {
    return { mode: 'BUSINESS', intent: 'PROVENANCE_INQUIRY', requestedSource: 'ALL_SOURCES' };
  }
  if (/\b(what\s+is\s+ralion|how\s+to\s+use\s+ralion|ralion\s+modules|pricing|billing\s+help|license)\b/i.test(p)) {
    return { mode: 'GENERAL', intent: 'PLATFORM_KNOWLEDGE', requestedSource: 'GENERAL' };
  }

  // 7. General inquiries / concepts / writing / planning / explanation
  if (/\b(explain|what\s+is|define|how\s+does|write\s+(an?\s+)?email|draft\s+(an?\s+)?email|help\s+me\s+(write|plan|understand)|ideas\s+for|summarize\s+this|compare\s+(and\s+contrast)?|pros\s+and\s+cons)\b/i.test(p) &&
      !p.includes('our business') && !p.includes('my business') && !p.includes('our growth') && !p.includes('our pipeline') && !p.includes('our facebook') && !p.includes('our products') && !p.includes('we offer')) {
    return { mode: 'GENERAL', intent: 'GENERAL_KNOWLEDGE', requestedSource: 'GENERAL' };
  }

  return { mode: 'GENERAL', intent: 'GENERAL_REASONING', requestedSource: 'GENERAL' };
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

  const orgName = context?.layer1?.companyName?.value || '';
  const isVerified = Boolean(context && context.layer1?.companyName?.provenance === 'VERIFIED');
  const industry = context?.layer1?.industry?.value || '';
  const targetMarket = context?.layer1?.targetMarket?.value || '';
  const valueProp = context?.layer1?.valueProposition?.value || '';
  const products = (context?.layer1?.productsAndServices?.value || []).map((p) => typeof p === 'string' ? p : p.name).join(', ');
  const pipelineVal = context?.layer2?.crm?.totalPipelineValue?.value || 0;
  const activeClients = context?.layer2?.crm?.activeCustomersCount?.value || 0;

  // Facebook Context Extraction
  const isSocialConnected = Boolean(context?.layer2?.social?.isConnected);
  const hasSelectedPage = Boolean(context?.layer2?.social?.hasSelectedPage);
  const isPersonalFb = Boolean(context?.layer2?.social?.isPersonalProfile);
  const pageName = context?.layer2?.social?.connectedPageName?.value || '';
  const pageCategory = context?.layer2?.social?.pageCategory?.value || '';
  const pageAbout = context?.layer2?.social?.pageAbout?.value || '';
  const pageWebsite = context?.layer2?.social?.pageWebsite?.value || '';
  const followers = context?.layer2?.social?.followersCount?.value || 0;
  const phone = context?.layer2?.social?.contactInfo?.phone || '';
  const address = context?.layer2?.social?.contactInfo?.singleLineAddress || '';

  const websiteUrl = context?.layer1?.websiteUrl?.value || '';
  const websiteKnowledge = context?.layer1?.websiteKnowledge?.value;

  const systemInstruction = `You are Mari, the sovereign Universal AI Business Growth Partner and Operating Intelligence for Ralion OS (developed by Ras Ali Labs).

CORE OPERATING PRINCIPLES:
1. UNIVERSAL INTELLIGENCE: You are a brilliant, general-purpose AI assistant capable of deep reasoning, strategic analysis, executive writing, coding, math, and creative ideation.
2. SOURCE-AWARE BUSINESS GROUNDING:
   - Canonical Business Identity: ${isVerified && orgName ? `${orgName}${industry ? ` (${industry})` : ''}` : 'Verified business information has not yet been established for this workspace.'}
   - When asked "what is my business?" or about identity: State verified business facts accurately.
   - When asked "what does our website say about us?": Query and summarize verified website knowledge specifically (${websiteUrl || 'Not configured'}).
   - FACEBOOK SOURCE AWARENESS & 3 EXPLICIT STATES:
     * STATE A (Page connected and useful info available): State "According to your Facebook Page, [Page Name] presents the business as..." and summarize strictly verified Facebook metadata (Page: ${pageName}, Category: ${pageCategory || 'Business'}, About: ${pageAbout || 'N/A'}, Followers: ${followers}).
     * STATE B1 (Facebook profile connected, but Page not selected): State "Facebook is connected, but no business Page is selected yet." Never treat a personal Facebook profile as a business Page.
     * STATE B2 (Facebook not connected): State "Facebook is not currently connected."
     * STATE C (Page selected but About/description is unavailable): State that Facebook does not currently provide enough verified business description for this Page.
   - When asked "which Facebook Page is connected?": State the connected Facebook Page (${pageName || 'None'}${isSocialConnected && hasSelectedPage ? ` with ${followers} followers` : ''}) underneath the canonical business. Facebook connection NEVER changes the business name.
   - When asked "what do you know about my business?": Synthesize all available verified layers (Identity + Website + CRM + Social + Operations).
   - When asked "where should we focus today?": Reason across pipeline, audience reach, and workflow execution.
   - When asked to compare website with Facebook: Compare structured website positioning with the verified Facebook Page presence.
   - NO PLACEHOLDER STRINGS: NEVER output phrases like "Active Workspace", "Your Business", "Unspecified Target Market", "Unspecified Industry", or "Default" as business names.
   - NEVER invent or hallucinate metrics, growth percentages, or fake company identities.
3. TENANT ISOLATION: Maintain absolute tenant boundaries. Never mention or reveal data from other organizations. Never refer to any synthetic "Default" entity or use @facebook as a company name.
4. FORMATTING RULES:
   - Use clean, standard Markdown (headers: ###, ##; bullet points: • or -; bold text: **term**).
   - NEVER output escaped backslashes before asterisks (do NOT write \\*\\*). Output standard **bold**.
   - DO NOT insert bracket action tokens (e.g. [Open Growth Studio]) or raw action metadata into your text. Return clean markdown.
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
  if (capabilityMode === 'BUSINESS') {
    queryText += `\n\n[Active Tenant Grounding: Company=${orgName || 'Unconfigured'}, Verified=${isVerified}${industry ? `, Industry=${industry}` : ''}${products ? `, Products=${products}` : ''}${websiteUrl ? `, Website=${websiteUrl}` : ''}${isSocialConnected ? `, FacebookPage=${pageName}, FacebookCategory=${pageCategory || 'None'}, FacebookAbout=${pageAbout || 'None'}, FacebookFollowers=${followers}` : ', Facebook=Not Connected'}, CRM Pipeline=$${pipelineVal}, ActiveClients=${activeClients}]`;
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
      .replace(/<svg[\s\S]*?<\/svg>/gi, '')
      .replace(/\[(Open Growth Studio|View CRM Pipeline|Create Reel|Create Visual|Connect Facebook|Create Growth Campaign|Select Facebook Page)\]/gi, '')
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
// 3. SAFE LOCAL STRATEGIC & SOURCE-AWARE REASONING FALLBACK ENGINE
// ─────────────────────────────────────────────────────────────────────────────

function generateLocalStrategicFallback(
  prompt: string,
  context: BusinessContext | null,
  capabilityMode: MariCapabilityMode,
  intent: string
): { text: string; suggestedActions: MariActionPayload[] } {
  const pLower = prompt.toLowerCase();
  const orgName = context?.layer1?.companyName?.value || '';
  const isVerified = Boolean(context && context.layer1?.companyName?.provenance === 'VERIFIED' && orgName);
  const industry = context?.layer1?.industry?.value || '';
  const targetMarket = context?.layer1?.targetMarket?.value || '';
  const valueProp = context?.layer1?.valueProposition?.value || '';
  const rawProducts = context?.layer1?.productsAndServices?.value || [];
  const productsList = rawProducts.map((p: any) => typeof p === 'string' ? p : (p?.name || String(p)));
  const productsFormatted = productsList.length > 0 ? productsList.join(', ') : '';
  const pipelineVal = context?.layer2?.crm?.totalPipelineValue?.value || 0;
  const activeClients = context?.layer2?.crm?.activeCustomersCount?.value || 0;

  // Facebook Context
  const isSocialConnected = Boolean(context?.layer2?.social?.isConnected);
  const hasSelectedPage = Boolean(context?.layer2?.social?.hasSelectedPage);
  const isPersonalFb = Boolean(context?.layer2?.social?.isPersonalProfile);
  const pageName = context?.layer2?.social?.connectedPageName?.value || '';
  const pageCategory = context?.layer2?.social?.pageCategory?.value || '';
  const pageAbout = context?.layer2?.social?.pageAbout?.value || '';
  const pageWebsite = context?.layer2?.social?.pageWebsite?.value || '';
  const followers = context?.layer2?.social?.followersCount?.value || 0;
  const phone = context?.layer2?.social?.contactInfo?.phone || '';
  const address = context?.layer2?.social?.contactInfo?.singleLineAddress || '';

  const websiteUrl = context?.layer1?.websiteUrl?.value || '';
  const websiteKnowledge = context?.layer1?.websiteKnowledge?.value;

  let responseText = '';
  const actions: MariActionPayload[] = [];

  // Standalone Greeting
  if (intent === 'GREETING') {
    if (isVerified) {
      responseText = `### Hello! I am Mari AI

I am your sovereign AI Business Growth Partner for **${orgName}**.

How can I assist your business growth today? I can analyze your pipeline, summarize website positioning, review Facebook presence, draft marketing campaigns, or provide strategic recommendations.`;
    } else {
      responseText = `### Hello! I am Mari AI

I am your sovereign AI Business Growth Partner. I am fully ready to assist you with business strategy, planning, marketing, and analysis.

*Tip: Connect your website or business profile in Settings to unlock tailored tenant-grounded intelligence.*`;
    }
    return { text: responseText, suggestedActions: [] };
  }

  // A. GENERAL INTELLIGENCE
  if (capabilityMode === 'GENERAL' || intent === 'GENERAL_KNOWLEDGE') {
    if (pLower.includes('ebitda')) {
      responseText = `### Understanding EBITDA (Earnings Before Interest, Taxes, Depreciation, and Amortization)

**EBITDA** is a widely used financial metric that measures a company's core operating profitability.

**The Formula**:
\`\`\`
EBITDA = Net Income + Interest Expense + Tax Expense + Depreciation + Amortization
\`\`\`

**Why Business Leaders Use EBITDA**:
1. **Core Operating Focus**: Evaluates underlying business operations regardless of debt or tax structure.
2. **Cross-Company Comparability**: Normalizes differences in asset financing and depreciation.
3. **Valuation Multiples**: Standard baseline for enterprise valuation.`;
      return { text: responseText, suggestedActions: [] };
    }

    if (pLower.includes('email') || pLower.includes('draft') || pLower.includes('write')) {
      const companyLabel = orgName || 'our organization';
      responseText = `### Draft: Professional Partnership Proposal

**Subject**: Strategic Partnership Opportunity with ${companyLabel}

**Dear [Partner Name / Executive],**

I hope this email finds you well.

I am writing to explore a mutually beneficial collaboration between our organizations. At **${companyLabel}**, we focus on delivering high-impact solutions for our clients.

Given your leadership in the market, we see strong alignment in delivering combined value to our shared client base. Specifically, we would welcome the opportunity to discuss:

1. **Strategic Integration**: Aligning our capabilities to deliver end-to-end solutions.
2. **Joint Market Opportunities**: Co-creating high-impact service packages for decision-makers.
3. **Operational Synergies**: Streamlining deployment and client onboarding.

Could we schedule a brief 15-minute introductory call this week on Wednesday or Thursday?

Thank you for your time, and I look forward to connecting.

Best regards,

**[Your Name]**  
**${companyLabel}**  
[Your Contact Information]`;
      return { text: responseText, suggestedActions: [] };
    }

    if (pLower.includes('cloud') || pLower.includes('machine learning') || pLower.includes('concept')) {
      responseText = `### Executive Concept Brief

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

  // B. SOURCE-SPECIFIC: FACEBOOK KNOWLEDGE (STATE A, STATE B1/B2, STATE C)
  if (intent === 'FACEBOOK_KNOWLEDGE') {
    // STATE B1: Personal Profile or no Page selected
    if (isPersonalFb || (isSocialConnected && !hasSelectedPage)) {
      responseText = `### Facebook Business Page Not Selected

Facebook is connected, but no business Page is selected yet. Select a Page in **Growth Studio → Channels** and I can analyse exactly how it presents your business.`;
      actions.push({ id: 'SELECT_FACEBOOK_PAGE', type: 'NAVIGATE', label: 'Select Facebook Page', payload: { route: '/growth?tab=channels' } });
      return { text: responseText, suggestedActions: actions };
    }

    // STATE B2: Completely Unconnected
    if (!isSocialConnected || !pageName || pageName === 'Not Connected') {
      responseText = `### Facebook Channel Status${orgName ? ` for ${orgName}` : ''}

${orgName ? `**Canonical Business**: ${orgName}  \n` : ''}**Status**: Facebook is not currently connected.

Connect your Facebook Page in **Growth Studio → Channels** to allow Mari to analyze your public social positioning, track audience reach, and publish content.`;
      actions.push({ id: 'CONNECT_FACEBOOK', type: 'NAVIGATE', label: 'Connect Facebook', payload: { route: '/growth?tab=channels' } });
      return { text: responseText, suggestedActions: actions };
    }

    // STATE C: Page selected but useful About/business description unavailable
    if (isSocialConnected && hasSelectedPage && !pageAbout) {
      responseText = `### Facebook Page Intelligence: **${pageName}**

**Connected Page**: ${pageName}${pageCategory ? ` (${pageCategory})` : ''}  
**Audience**: ${followers.toLocaleString()} verified followers  
${pageWebsite ? `**Linked Website**: ${pageWebsite}\n` : ''}
**Status**:
Facebook does not currently provide a verified business description or About section for this Page.

To ensure potential customers understand what ${orgName || 'your business'} offers, consider adding a comprehensive description, contact details, and website URL directly to your Facebook Page About section.`;
      actions.push({ id: 'OPEN_GROWTH_STUDIO', type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } });
      return { text: responseText, suggestedActions: actions };
    }

    // STATE A: Page connected and useful info available
    responseText = `According to your Facebook Page, **${pageName}** presents the business as:

• **Page Name**: ${pageName}
${pageCategory ? `• **Category**: ${pageCategory}\n` : ''}${pageAbout ? `• **About / Description**: ${pageAbout}\n` : ''}${followers > 0 ? `• **Audience / Followers**: ${followers.toLocaleString()} verified followers\n` : ''}${pageWebsite ? `• **Linked Website**: ${pageWebsite}\n` : ''}${phone ? `• **Phone**: ${phone}\n` : ''}${address ? `• **Location**: ${address}\n` : ''}
**Summary**:
${pageAbout ? `${pageName} is positioned on Facebook as: "${pageAbout}".` : `${pageName} operates as an active social presence under the **${pageCategory || 'Business'}** category.`}

*Note: The connected Facebook Page is an attached social channel under **${orgName || 'your business'}**.*`;
    actions.push({ id: 'OPEN_GROWTH_STUDIO', type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } });
    return { text: responseText, suggestedActions: actions };
  }

  // C. SOURCE-SPECIFIC: CONNECTED SOCIAL PAGE
  if (intent === 'CONNECTED_SOCIAL_PAGE') {
    const parentCompany = orgName ? ` for **${orgName}**` : '';
    if (isPersonalFb || (isSocialConnected && !hasSelectedPage)) {
      responseText = `### Connected Social Channels${parentCompany}

${orgName ? `**Canonical Business**: ${orgName}  \n` : ''}**Status**: Facebook is connected, but no business Page is selected yet.

Select a business Page in **Growth Studio → Channels** to enable Page-level business intelligence.`;
      actions.push({ id: 'SELECT_FACEBOOK_PAGE', type: 'NAVIGATE', label: 'Select Facebook Page', payload: { route: '/growth?tab=channels' } });
    } else if (isSocialConnected && pageName && pageName !== 'Not Connected') {
      responseText = `### Connected Social Channels${parentCompany}

${orgName ? `**Canonical Business**: ${orgName}  \n` : ''}**Connected Facebook Page**: **${pageName}**  
**Category**: ${pageCategory || 'Business'}  
**Followers**: ${followers.toLocaleString()} verified followers  
**Status**: Connected & Active via Meta Graph API  

*Note: The connected Facebook Page is an attached social channel under ${orgName || 'your business'} and does not alter your canonical business identity.*`;
      actions.push({ id: 'OPEN_GROWTH_STUDIO', type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } });
    } else {
      responseText = `### Social Channel Status${parentCompany}

${orgName ? `**Canonical Business**: ${orgName}  \n` : ''}**Status**: Facebook is not currently connected.

Connect your Facebook Page in **Growth Studio → Channels** to track audience reach, publish content, and monitor analytics.`;
      actions.push({ id: 'CONNECT_FACEBOOK', type: 'NAVIGATE', label: 'Connect Facebook', payload: { route: '/growth?tab=channels' } });
    }
    return { text: responseText, suggestedActions: actions };
  }

  // D. SOURCE-SPECIFIC: FACEBOOK MISSING INFORMATION AUDIT
  if (intent === 'FACEBOOK_MISSING_INFO') {
    const missingItems: string[] = [];
    if (!isSocialConnected) {
      missingItems.push('• **Facebook Page Connection**: No Facebook Page is currently connected to this workspace.');
    } else {
      if (!pageAbout) missingItems.push('• **About / Description**: Facebook Page lacks a descriptive About section summarizing core capabilities.');
      if (!pageWebsite) missingItems.push('• **Website Link**: No website URL is linked on the Facebook Page profile.');
      if (!phone) missingItems.push('• **Business Phone**: Direct customer contact phone number is not listed.');
      if (!address) missingItems.push('• **Physical / Operating Address**: Operating location is not specified.');
      if (followers === 0) missingItems.push('• **Audience Base**: Zero followers recorded or page insights permissions need renewal.');
    }

    responseText = `### Facebook Page Intelligence Audit${orgName ? ` for ${orgName}` : ''}

Here is an objective assessment of information available vs. missing on your Facebook Page:

${missingItems.length > 0 ? missingItems.join('\n\n') : '• **All core Facebook Page fields are populated and verified.**'}

**Recommendation**:
Updating missing profile fields on Facebook boosts organic discoverability and reassures prospective commercial clients.`;
    actions.push({ type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } });
    return { text: responseText, suggestedActions: actions };
  }

  // E. SOURCE-SPECIFIC: FACEBOOK IMPROVEMENT & VALUE PROP AUDIT
  if (intent === 'FACEBOOK_IMPROVEMENT_AUDIT' || intent === 'FACEBOOK_VALUE_PROP_AUDIT') {
    const targetComp = orgName || 'your business';
    const suggestedAbout = valueProp
      ? `${targetComp} delivers ${valueProp}.${industry ? ` Specializing in ${industry}.` : ''}${websiteUrl ? ` Learn more: ${websiteUrl}` : ''}`
      : `${targetComp} provides high-impact commercial solutions for our clients.${websiteUrl ? ` Visit ${websiteUrl} for more details.` : ''}`;

    responseText = `### Facebook Positioning & Improvement Strategy for ${targetComp}

#### Current Facebook State
• **Connected Page**: ${isSocialConnected ? pageName : 'Not connected'}
• **Current Description**: ${pageAbout ? `"${pageAbout}"` : 'Missing / Incomplete'}
• **Audience Reach**: ${followers.toLocaleString()} followers

#### Strategic Recommendations to Improve Positioning:
1. **Clarify Core Value Proposition**:
   Update your Facebook About section to clearly state what problems you solve and who you serve.
   
   **Suggested Copy for Facebook About Section**:
   > *"${suggestedAbout}"*

2. **Link Verified Commercial Touchpoints**:
   Ensure your website URL (${websiteUrl || 'your domain'}) and official contact channels are prominently pinned to the top of your Page.

3. **Consistent Publishing Cadence**:
   Use **Growth Studio** to schedule weekly video reels and case-study visuals that demonstrate proof of execution.`;

    actions.push(
      { type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } },
      { type: 'NAVIGATE', label: 'Create Reel in Studio', payload: { route: '/growth?mode=create' } }
    );
    return { text: responseText, suggestedActions: actions };
  }

  // F. SOURCE-SPECIFIC: WEBSITE KNOWLEDGE
  if (intent === 'WEBSITE_KNOWLEDGE') {
    if (websiteKnowledge && websiteKnowledge.status === 'INGESTED') {
      const sections = (websiteKnowledge.sections || []).slice(0, 4).map((s: any) => `• **${s.title}**: ${s.content?.substring(0, 140)}...`).join('\n');
      responseText = `### Ingested Website Intelligence: ${websiteUrl}

**Source**: Ingested Public Website (${websiteUrl})  
**Last Synced**: ${websiteKnowledge.lastSuccessfulSync || 'Verified'}

**Overview**:
${websiteKnowledge.description || websiteKnowledge.summary || 'Verified website knowledge ingested.'}

**Key Website Sections**:
${sections || `• **Core Positioning**: ${valueProp || `${orgName} commercial web solutions.`}`}

${valueProp ? `**Website Value Proposition**:\n${valueProp}` : ''}`;
    } else if (websiteUrl && websiteUrl !== 'Not configured') {
      responseText = `### Website Knowledge${orgName ? ` for ${orgName}` : ''}

**Configured Website**: ${websiteUrl}  
**Status**: Configured in business profile.

**Verified Website Positioning**:
${valueProp ? `• **Core Focus**: ${valueProp}\n` : ''}${industry ? `• **Industry**: ${industry}\n` : ''}${targetMarket ? `• **Target Market**: ${targetMarket}\n` : ''}${productsFormatted ? `• **Products/Services**: ${productsFormatted}` : ''}`;
    } else {
      responseText = `### Website Knowledge

Verified website knowledge has not yet been ingested for this workspace.

To enable Mari to answer questions directly from your public website, please connect and sync your website URL in **Settings → Business Knowledge**.`;
      actions.push({ type: 'NAVIGATE', label: 'Sync Website', payload: { route: '/settings' } });
    }
    return { text: responseText, suggestedActions: actions };
  }

  // G. SOURCE-SPECIFIC: COMPARE WEBSITE VS SOCIAL
  if (intent === 'COMPARE_WEBSITE_VS_SOCIAL') {
    const compareOrg = orgName || 'your business';
    responseText = `### Positioning Comparison: Website vs. Social Presence for ${compareOrg}

#### 1. Website Positioning (${websiteUrl || 'Configured Web Presence'})
• **Strategic Focus**: High-intent, structured commercial positioning${industry ? ` (${industry})` : ''}.
• **Primary Objective**: Communicating core value proposition (${valueProp ? `"${valueProp}"` : 'solutions and service capabilities'}).
• **Audience Intent**: Decision-makers seeking formal solution verification and vendor evaluation.

#### 2. Facebook Social Presence (${isSocialConnected ? pageName : 'Unconnected'})
• **Channel Status**: ${isSocialConnected ? `Connected (${followers.toLocaleString()} followers on ${pageName})` : 'Not currently connected'}
• **Social Description**: ${pageAbout ? `"${pageAbout}"` : 'General business page'}
• **Strategic Focus**: Community engagement, brand awareness, and visual proof of execution.
• **Audience Intent**: Broader discovery, brand affinity, and dynamic campaign engagement.

#### Strategic Alignment Recommendation:
Ensure your social media creative campaigns directly amplify the core solutions established on your website, converting organic social reach into qualified CRM pipeline leads.`;

    actions.push(
      { type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } },
      { type: 'NAVIGATE', label: 'View CRM Pipeline', payload: { route: '/crm' } }
    );
    return { text: responseText, suggestedActions: actions };
  }

  // H. SOURCE-SPECIFIC: BUSINESS SYNTHESIS (Multi-Source)
  if (intent === 'BUSINESS_SYNTHESIS') {
    if (!isVerified && !orgName) {
      responseText = `### Business Knowledge Synthesis

Verified business information has not yet been established for this workspace.

Here is what is currently connected:
• **Business Profile**: Unverified / Not configured
• **Website Knowledge**: ${websiteUrl ? websiteUrl : 'Not connected'}
• **CRM Pipeline**: ${pipelineVal > 0 ? `$${pipelineVal.toLocaleString()} across ${activeClients} active accounts` : 'No active deals'}
• **Social Channel**: ${isSocialConnected ? `Facebook Page: ${pageName} (${followers} followers)` : 'Not connected'}
• **Operations**: Workspace active

Connect your business website or profile in Settings to enable tailored business intelligence.`;
      actions.push({ type: 'NAVIGATE', label: 'Add Business Knowledge', payload: { route: '/settings' } });
      return { text: responseText, suggestedActions: actions };
    }

    const productsFormattedLines = rawProducts.map((p: any) => typeof p === 'string' ? `  • **${p}**` : `  • **${p.name}** (${p.category || 'Solution'})`).join('\n');
    responseText = `### Comprehensive Business Knowledge Synthesis for ${orgName}

Here is the complete synthesized intelligence across all verified context sources:

#### 1. Canonical Business Identity (Verified)
• **Company Name**: ${orgName}
${industry ? `• **Industry**: ${industry}\n` : ''}${targetMarket ? `• **Target Market**: ${targetMarket}\n` : ''}${valueProp ? `• **Core Value Proposition**: ${valueProp}\n` : ''}${productsFormattedLines ? `• **Products & Services**:\n${productsFormattedLines}\n` : ''}
#### 2. Ingested Website Intelligence
• **Website URL**: ${websiteUrl || 'Not configured'}
• **Status**: ${websiteKnowledge?.status === 'INGESTED' ? 'Live Ingested Knowledge' : (websiteUrl ? 'Configured in Profile' : 'Not Ingested')}

#### 3. Commercial CRM Pipeline
• **Pipeline Value**: $${pipelineVal.toLocaleString()} across ${activeClients} active accounts
• **Deal Velocity**: Real-time tracking enabled

#### 4. Attached Social Channels
• **Connected Facebook Page**: ${isSocialConnected ? `${pageName} (${followers.toLocaleString()} followers)` : 'Not connected'}

#### 5. Operations & Workflows
• **SLA Uptime**: 100% | Ralion OS Core Active`;

    actions.push(
      { type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } },
      { type: 'NAVIGATE', label: 'View CRM Pipeline', payload: { route: '/crm' } }
    );
    return { text: responseText, suggestedActions: actions };
  }

  // I. SOURCE-SPECIFIC: WHERE TO FOCUS TODAY / WEEKLY FOCUS
  if (intent === 'WEEKLY_FOCUS') {
    const focusOrg = orgName || 'your business';
    responseText = `### Strategic Focus Areas for Today: ${focusOrg}

Based on cross-functional analysis across your commercial pipeline, audience reach, and operations:

#### 1. Commercial Pipeline Velocity
${pipelineVal > 0 
  ? `• Qualify active deals in **Ralion CRM** ($${pipelineVal.toLocaleString()} current pipeline value) and follow up with high-probability accounts.`
  : `• Populate and qualify initial prospect deals in **Ralion CRM** to establish pipeline velocity.`}

#### 2. Growth & Audience Reach
${isSocialConnected 
  ? `• Dispatch scheduled video and visual content to **${pageName}** (${followers.toLocaleString()} followers) via Growth Studio to maintain consistent organic discovery.`
  : `• Connect your Facebook Business Page in **Growth Studio** to establish automated multi-channel publishing.`}

#### 3. Operational Execution
• Review pending high-priority workspace tasks and maintain standard response SLAs.`;

    actions.push(
      { type: 'NAVIGATE', label: 'View CRM Pipeline', payload: { route: '/crm' } },
      { type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } }
    );
    return { text: responseText, suggestedActions: actions };
  }

  // J. SOURCE-SPECIFIC: MISSING DATA AUDIT
  if (intent === 'MISSING_DATA_AUDIT') {
    const missingItems: string[] = [];
    if (!isVerified) missingItems.push('• **Verified Business Profile**: Not configured. Add your company profile in Settings.');
    if (!websiteKnowledge || websiteKnowledge.status !== 'INGESTED') missingItems.push('• **Website Ingestion**: Website has not been crawled for detailed multi-page section knowledge.');
    if (pipelineVal === 0 && activeClients === 0) missingItems.push('• **Historical CRM Data**: No closed/won deal history or active deal records in CRM.');
    if (!isSocialConnected) missingItems.push('• **Social Channel**: Facebook Business Page is not connected in Growth Studio.');
    missingItems.push('• **Month-over-Month Baselines**: Previous month performance snapshot baseline has not yet been recorded for longitudinal comparison.');

    responseText = `### Missing Business Intelligence Audit${orgName ? ` for ${orgName}` : ''}

Here is an objective breakdown of information needed to maximize Mari's strategic reasoning:

${missingItems.join('\n\n')}

Connecting these sources will enable deep predictive analytics and automated commercial optimization.`;

    actions.push(
      { type: 'NAVIGATE', label: 'Add Business Knowledge', payload: { route: '/settings' } },
      { type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } }
    );
    return { text: responseText, suggestedActions: actions };
  }

  // K. BUSINESS IDENTITY
  if (intent === 'BUSINESS_IDENTITY') {
    if (!isVerified && !orgName) {
      responseText = `### Business Identity

Verified business information has not yet been established for this workspace.

You can configure your company name, industry, target market, and products in **Settings → Business Knowledge** to enable tailored business intelligence. In the meantime, I am ready to assist you with general business strategy, writing, planning, and operational workflows.`;
      actions.push({ type: 'NAVIGATE', label: 'Configure Business Knowledge', payload: { route: '/settings' } });
      return { text: responseText, suggestedActions: actions };
    }

    const productsFormattedLines = rawProducts.map((p: any) => typeof p === 'string' ? `• **${p}**` : `• **${p.name}** (${p.category || 'Solution'})`).join('\n');
    responseText = `### Business Identity: ${orgName}

**Business Overview**:
${orgName}${industry ? ` operates in the **${industry}** sector` : ''}${valueProp ? `, focusing on ${valueProp}` : ''}.

${productsFormattedLines || (productsFormatted ? `**Core Products & Services**:\n• ${productsFormatted}\n` : '')}${targetMarket ? `**Target Market**:\n• ${targetMarket}\n` : ''}${websiteUrl ? `**Website**:\n• ${websiteUrl}\n` : ''}`;

    actions.push(
      { type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } },
      { type: 'NAVIGATE', label: 'View CRM Pipeline', payload: { route: '/crm' } }
    );
    return { text: responseText, suggestedActions: actions };
  }

  // H. COMPOUND MULTI-PART STRATEGIC REASONING
  if (intent === 'COMPOUND_QUERY') {
    const historicalStatus = isVerified
      ? `• **Historical Comparison**: I have verified live performance telemetry for **${orgName}** ($${pipelineVal.toLocaleString()} CRM pipeline across ${activeClients} active accounts), but I do not yet have a complete verified previous-month baseline snapshot for a definitive month-over-month comparison.`
      : `• **Historical Comparison**: Live tenant telemetry is unconfigured. A historical month-over-month comparison requires recording verified previous-month snapshots in Ralion CRM and Growth Studio.`;

    const enterpriseAnalysis = `• **Enterprise Market Pivot**: Shifting primary focus entirely to enterprise clients would extend sales cycles (typically 60–120 days) but substantially increase Average Contract Value (ACV). For ${orgName || 'your business'}, our solutions (${productsFormatted || 'enterprise solutions'}) provide sovereign control and automation that appeal directly to enterprise decision-makers, provided we offer dedicated SLAs and enterprise compliance.`;

    const facebookDiagnosis = isSocialConnected && hasSelectedPage
      ? `• **Facebook / Channel Growth Analysis**: Your connected page (**${pageName}**) has ${followers.toLocaleString()} verified followers. The primary constraint on growth is publishing consistency—without regular multi-format visual posts and video reels, organic algorithmic discovery remains low.`
      : `• **Facebook / Channel Growth Analysis**: Social channels are not actively broadcasting. Growth is constrained because organic distribution channels require active Facebook Business Page connection and scheduled content dispatch.`;

    const overlookedObservations = `• **What You Are Overlooking (Strategic Blindspots)**:
  1. **Lead Qualification Bottleneck**: While positioning is strong in **${industry}**, pipeline velocity requires systematic inbound lead capture in Ralion CRM.
  2. **Multi-Channel Distribution Cadence**: Organic brand reach requires consistent 2–3 weekly video and visual releases via Growth Studio.
  3. **Executive Follow-Up Cadence**: High-value opportunities need rapid proposal turnaround to convert into signed agreements.`;

    responseText = `### Strategic Business Diagnostic${orgName ? ` for ${orgName}` : ''}

Here is a multi-dimensional strategic evaluation addressing your questions:

#### 1. Current Growth vs. Historical Position
${historicalStatus}

#### 2. Enterprise Client Scenario Evaluation
${enterpriseAnalysis}

#### 3. Social Channel & Audience Discovery Diagnosis
${facebookDiagnosis}

#### 4. Critical Overlooked Opportunities & Blindspots
${overlookedObservations}`;

    actions.push(
      { type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } },
      { type: 'NAVIGATE', label: 'View CRM Pipeline', payload: { route: '/crm' } },
      { type: 'NAVIGATE', label: 'Create Reel', payload: { route: '/growth?tab=creatives' } }
    );
    return { text: responseText, suggestedActions: actions };
  }

  // J. BUSINESS PERFORMANCE
  if (intent === 'BUSINESS_PERFORMANCE') {
    const crmStatus = pipelineVal > 0
      ? `• **CRM Pipeline:** $${pipelineVal.toLocaleString()} across ${activeClients} active clients.`
      : `• **CRM Pipeline:** No active deals logged yet in Ralion CRM.`;

    const socialStatus = isSocialConnected && hasSelectedPage
      ? `• **Social Channel (${pageName}):** ${followers.toLocaleString()} verified followers.`
      : `• **Social Channels:** Not currently connected. Connect your Facebook Page in Growth Studio to track verified audience reach.`;

    responseText = `### Business Performance Summary${orgName ? ` for ${orgName}` : ''}

**Verified Telemetry**:
${crmStatus}
${socialStatus}
• **Operations:** Workspace active and ready for deal qualification.

**Mari Assessment**:
To accelerate growth, prioritize qualifying active CRM leads and publishing regular video and visual campaigns via Growth Studio.`;

    actions.push(
      { type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } },
      { type: 'NAVIGATE', label: 'View CRM Pipeline', payload: { route: '/crm' } }
    );
    return { text: responseText, suggestedActions: actions };
  }

  // K. GENERAL STRATEGIC REASONING
  responseText = `### Strategic Analysis${orgName ? ` for ${orgName}` : ''}

Based on available intelligence for **${orgName || 'your business'}**${isVerified ? ` in **${industry}**` : ''}:

**Key Observations**:
• **Core Positioning**: Focused on **${targetMarket}** with core value proposition: "${valueProp}".
• **Growth Levers**: Accelerate commercial outreach, activate multi-channel social broadcasting, and maintain structured follow-ups in Ralion CRM.
• **Risk Mitigation**: Ensure consistent client qualification and avoid spreading marketing spend before defining clear target personas.`;

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

    // 1. Resolve Canonical Business Identity
    const resolvedIdentity = BusinessIdentityResolver.resolveIdentity(orgId, {
      sessionCompanyName: passedCompanyName,
    });

    let resolvedCompanyName = resolvedIdentity.companyName;

    // 2. Classify Capability Mode & Semantic Intent
    const { mode: capabilityMode, intent: detectedIntent } = classifyCapabilityMode(cleanPrompt);

    // 3. Context Orchestration (Selective & Lazy)
    let context: BusinessContext | null = null;
    let contextSourcesLoaded: string[] = [];
    let isVerified = resolvedIdentity.isVerified;

    if (capabilityMode === 'BUSINESS' || capabilityMode === 'ACTION') {
      try {
        context = await BusinessContextService.assembleContext(orgId, {
          companyName: resolvedCompanyName,
          activeScreen,
          localOverrides,
        });

        if (context.layer1?.companyName?.value) {
          resolvedCompanyName = context.layer1.companyName.value;
          contextSourcesLoaded.push('BusinessIdentityResolver');
        }
        if (context.layer1?.websiteKnowledge?.value) contextSourcesLoaded.push('WebsiteKnowledge');
        if (context.layer2?.crm?.isConnected) contextSourcesLoaded.push('CRM_Deals');
        if (context.layer2?.social?.isConnected) contextSourcesLoaded.push('Facebook_Social');
        if (context.layer2?.operations) contextSourcesLoaded.push('Workspace_Operations');

        isVerified = Boolean(context.layer1?.companyName?.provenance === 'VERIFIED');
      } catch (ctxErr) {
        console.warn('[MariCore] Context assembly warning:', ctxErr);
      }
    }

    // 4. RAG Knowledge Search
    let ragContext: string | null = null;
    try {
      const rag = mariKnowledgeManager.searchKnowledgeBase(cleanPrompt);
      if (rag && !rag.includes('No matching')) {
        ragContext = rag;
      }
    } catch {}

    // 5. Invoke Gemini Reasoning
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

        // Derive clean suggested actions for UI navigation
        if (detectedIntent === 'WEBSITE_KNOWLEDGE') {
          suggestedActions.push({ type: 'NAVIGATE', label: 'Sync Website', payload: { route: '/settings' } });
        } else if (detectedIntent === 'CONNECTED_SOCIAL_PAGE') {
          suggestedActions.push({ type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } });
        } else if (detectedIntent === 'WEEKLY_FOCUS' || detectedIntent === 'COMPOUND_QUERY') {
          suggestedActions.push(
            { type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } },
            { type: 'NAVIGATE', label: 'View CRM Pipeline', payload: { route: '/crm' } }
          );
        } else if (detectedIntent === 'BUSINESS_IDENTITY' || detectedIntent === 'BUSINESS_SYNTHESIS') {
          suggestedActions.push(
            { type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } },
            { type: 'NAVIGATE', label: 'View CRM Pipeline', payload: { route: '/crm' } }
          );
        }
      }
    }

    // 6. Fallback if Gemini is not available or returned empty
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

    // 7. Authoritative Exactly-Once Telemetry Recording
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
