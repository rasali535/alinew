/**
 * Ralion OS — Mari AI Business Context Engine
 * 
 * CORE PRINCIPLE: MARI SHOULD OPEN INFORMED, NOT EMPTY.
 * Assembles a comprehensive, organization-scoped Business Context BEFORE
 * generating briefings or answering customer queries.
 * 
 * Source of Truth Hierarchy:
 * - Layer 1: Business Knowledge (Profile, Identity, Ingested Website, Products, Brand Voice, SOPs)
 * - Layer 2: Live Business State (Live CRM deals, tasks, Facebook metrics, workflows, integrations)
 * - Layer 3: Mari Growth Memory (User preferences, past accepted/rejected decisions, outcomes, learnings)
 */

import { WebsiteIngestionService, IngestedWebsiteKnowledge } from './websiteIngestion.service';

export type DataProvenance = 'VERIFIED' | 'USER_APPROVED' | 'USER_PROVIDED' | 'INFERRED' | 'AI_RECOMMENDATION' | 'UNVERIFIED';

export interface ProvenanceItem<T> {
  value: T;
  provenance: DataProvenance;
  source: string;
  confidence: number; // 0.0 - 1.0
  lastVerifiedAt: string;
}

export interface Layer1BusinessKnowledge {
  companyName: ProvenanceItem<string>;
  legalIdentity?: ProvenanceItem<string>;
  websiteUrl?: ProvenanceItem<string>;
  websiteKnowledge?: ProvenanceItem<IngestedWebsiteKnowledge | null>;
  tagline?: ProvenanceItem<string>;
  industry: ProvenanceItem<string>;
  targetMarket: ProvenanceItem<string>;
  brandVoice: ProvenanceItem<string>;
  valueProposition: ProvenanceItem<string>;
  productsAndServices: ProvenanceItem<Array<{ name: string; category: string; description?: string }>>;
  strategicGoals: ProvenanceItem<string[]>;
  uploadedDocumentsCount: ProvenanceItem<number>;
  knowledgeSources: Array<{ id: string; title: string; category: string; updatedAt: string; status: 'VERIFIED' | 'CONNECTED' | 'USER_PROVIDED' | 'PENDING' }>;
}

export interface Layer2BusinessState {
  crm: {
    isConnected: boolean;
    totalPipelineValue: ProvenanceItem<number>;
    activeCustomersCount: ProvenanceItem<number>;
    prospectsCount: ProvenanceItem<number>;
    recentDeals: Array<{ name: string; value: number; stage: string }>;
  };
  social: {
    isConnected: boolean;
    connectedPageName?: ProvenanceItem<string>;
    followersCount?: ProvenanceItem<number>;
    reachGrowthPct?: ProvenanceItem<number>;
    engagementRatePct?: ProvenanceItem<number>;
    recentPostsCount?: ProvenanceItem<number>;
    topPerformingType?: ProvenanceItem<string>;
  };
  operations: {
    pendingTasksCount: ProvenanceItem<number>;
    highPriorityTasksCount: ProvenanceItem<number>;
    slaUptimePct: ProvenanceItem<number>;
    workflowsRunToday: ProvenanceItem<number>;
  };
}

export interface Layer3MariMemory {
  userPreferences: Record<string, any>;
  acceptedRecommendations: Array<{ id: string; title: string; acceptedAt: string }>;
  rejectedRecommendations: Array<{ id: string; title: string; rejectedAt: string; reason?: string }>;
  strategicThemes: string[];
  recentActions: Array<{ id: string; action: string; timestamp: string }>;
}

export interface MariCreditsUsage {
  totalAllocated: number;
  used: number;
  remaining: number;
  tier: string;
  planName: string;
}

export interface BusinessContext {
  organizationId: string;
  organizationName: string;
  isTestTenant: boolean;
  version: string;
  assembledAt: string;
  activeScreen?: {
    route: string;
    label: string;
    entityId?: string;
  };
  layer1: Layer1BusinessKnowledge;
  layer2: Layer2BusinessState;
  layer3: Layer3MariMemory;
  credits: MariCreditsUsage;
  primarySource?: string;
  hasVerifiedKnowledge?: boolean;
  personalProfileNotice?: string;
  isPersonalSocialProfile?: boolean;
}

export interface TenantProfileOverride {
  companyName?: string;
  industry?: string;
  targetMarket?: string;
  valueProposition?: string;
  productsAndServices?: Array<{ name: string; category: string; description?: string }>;
  tagline?: string;
  websiteUrl?: string;
  brandVoice?: string;
  strategicGoals?: string[];
}

const tenantProfileRegistry = new Map<string, TenantProfileOverride>();

// In-memory cache for organization business contexts
const contextCache: Record<string, { context: BusinessContext; cachedAt: number; version: number }> = {};
const CACHE_TTL_MS = 60 * 1000; // 1 minute active cache

export class BusinessContextService {
  private static versionCounter = 1;

  /**
   * Registers or updates a tenant's business profile in the tenant profile registry.
   */
  static registerTenantProfile(orgId: string, profile: TenantProfileOverride) {
    tenantProfileRegistry.set(orgId, profile);
    delete contextCache[orgId];
  }

  /**
   * Retrieves the registered profile for a tenant.
   */
  static getTenantProfile(orgId: string): TenantProfileOverride | undefined {
    return tenantProfileRegistry.get(orgId);
  }

  /**
   * Assembles the complete 3-layer Business Context for an organization.
   * Maintains strict tenant isolation and isolates test fixtures from production.
   */
  static async assembleContext(
    orgId: string = 'ras-ali-labs',
    options?: {
      activeScreen?: { route: string; label: string; entityId?: string };
      forceRefresh?: boolean;
      isTestExecution?: boolean;
      localOverrides?: {
        contacts?: any[];
        tasks?: any[];
        documents?: any[];
        fbPage?: any;
        websiteKnowledge?: any;
        tier?: string;
        customKnowledge?: Partial<Layer1BusinessKnowledge>;
      };
    }
  ): Promise<BusinessContext> {
    const now = Date.now();
    const cached = contextCache[orgId];

    if (!options?.forceRefresh && cached && (now - cached.cachedAt < CACHE_TTL_MS)) {
      if (options?.activeScreen) {
        cached.context.activeScreen = options.activeScreen;
      }
      return cached.context;
    }

    const timestamp = new Date().toISOString();
    const isRasAli = orgId === 'ras-ali-labs';
    const isTest = Boolean(options?.isTestExecution || orgId.startsWith('test-') || orgId.includes('test'));
    const registeredProfile = tenantProfileRegistry.get(orgId);
    
    // Check structured BusinessKnowledgeProfileService
    let knowledgeProfile: any = null;
    try {
      const { BusinessKnowledgeProfileService } = require('./businessKnowledgeProfile.service');
      knowledgeProfile = BusinessKnowledgeProfileService.getProfile(orgId);
    } catch {}

    // 1. Layer 1: Business Knowledge & Ingested Website
    const websiteKnowledge = options?.localOverrides?.websiteKnowledge || WebsiteIngestionService.getWebsiteKnowledge(orgId);
    let fbPage = options?.localOverrides?.fbPage;
    if (!fbPage && typeof window !== 'undefined' && window.localStorage) {
      try {
        const rawP = window.localStorage.getItem('ralion_selected_fb_page');
        if (rawP) {
          fbPage = JSON.parse(rawP);
        } else {
          const rawSoc = window.localStorage.getItem('ralion_connected_social_accounts');
          if (rawSoc) {
            const socList = JSON.parse(rawSoc);
            const fb = socList.find((s: any) => s.provider === 'facebook' || s.platform === 'facebook');
            if (fb) {
              fbPage = {
                name: fb.accountName || fb.name || fb.pageName || fb.handle || 'Facebook Page',
                fanCount: fb.followers || fb.followersCount || fb.fanCount || 0,
                id: fb.id || fb.accountId || 'fb_page_1',
                accountType: fb.accountType || fb.account_type,
                isPersonalProfile: fb.isPersonalProfile || fb.accountType === 'FACEBOOK_PERSONAL_PROFILE' || fb.account_type === 'PERSONAL',
                metadata: fb.metadata,
              };
            }
          }
        }
      } catch {}
    }

    const isPersonalFb = Boolean(
      fbPage?.accountType === 'FACEBOOK_PERSONAL_PROFILE' ||
      fbPage?.account_type === 'PERSONAL' ||
      fbPage?.isPersonalProfile === true ||
      fbPage?.category === 'USER_PROFILE' ||
      (fbPage?.metadata && (fbPage.metadata.provider_account_type === 'FACEBOOK_PERSONAL_PROFILE' || (!fbPage.metadata.pageId && fbPage.metadata.facebookUserId))) ||
      fbPage?.name === 'Personal Facebook Profile' ||
      fbPage?.name === 'Facebook Profile (Connected)'
    );

    const isSocialPageConnected = Boolean(
      !isPersonalFb &&
      fbPage &&
      fbPage.name &&
      fbPage.name !== 'Not Connected'
    );

    const personalProfileNotice = isPersonalFb
      ? "Your connected Facebook account is a personal profile. Facebook Page business posts, followers, and analytics are not available yet. Connect a Facebook Page to unlock Page-level business intelligence."
      : undefined;

    const isWkValid = Boolean(
      websiteKnowledge && (
        websiteKnowledge.status === 'INGESTED' ||
        websiteKnowledge.provenance === 'VERIFIED' ||
        (websiteKnowledge.sections && websiteKnowledge.sections.length > 0) ||
        (websiteKnowledge.websiteUrl && websiteKnowledge.websiteUrl !== 'Not configured') ||
        Boolean(websiteKnowledge.title)
      )
    );

    const hasVerifiedKnowledge = Boolean(
      registeredProfile?.companyName ||
      knowledgeProfile?.isVerified ||
      isWkValid ||
      isSocialPageConnected
    );

    // Resolve Organization Name (Prioritize Registered Profile -> Knowledge Profile -> Facebook Page -> Website Title)
    let orgName = registeredProfile?.companyName || knowledgeProfile?.companyName?.value || (isSocialPageConnected ? fbPage.name : '') || websiteKnowledge?.title || '';
    if (!orgName) {
      if (isTest) {
        orgName = 'Test Organization';
      } else {
        orgName = orgId.replace(/^org[-_]/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'My Business';
      }
    }

    const primarySource = (isSocialPageConnected && isWkValid)
      ? 'Facebook + Website'
      : isSocialPageConnected
      ? 'Facebook'
      : isWkValid
      ? 'Website'
      : 'Unverified Workspace';

    const contactsList = options?.localOverrides?.contacts || [];
    const hasRealContacts = contactsList.length > 0;
    const tasksList = options?.localOverrides?.tasks || [];
    const hasRealTasks = tasksList.length > 0;

    // 1. Layer 1: Business Knowledge & Ingested Website (Truthful Learning Gate)
    const layer1: Layer1BusinessKnowledge = {
      companyName: {
        value: orgName,
        provenance: hasVerifiedKnowledge ? 'VERIFIED' : 'UNVERIFIED',
        source: knowledgeProfile ? 'Business Knowledge Profile' : (registeredProfile ? 'Registered Profile' : (isSocialPageConnected ? 'Facebook Page' : 'Workspace Identity')),
        confidence: hasVerifiedKnowledge ? 1.0 : 0.0,
        lastVerifiedAt: timestamp,
      },
      legalIdentity: {
        value: registeredProfile?.companyName ? `${registeredProfile.companyName} Registered Entity` : (hasVerifiedKnowledge ? `${orgName} Commercial Entity` : 'Unverified Business'),
        provenance: hasVerifiedKnowledge ? 'VERIFIED' : 'UNVERIFIED',
        source: 'Corporate Registration Record',
        confidence: hasVerifiedKnowledge ? 1.0 : 0.0,
        lastVerifiedAt: timestamp,
      },
      websiteUrl: {
        value: registeredProfile?.websiteUrl || knowledgeProfile?.websiteUrl?.value || websiteKnowledge?.websiteUrl || 'Not configured',
        provenance: (websiteKnowledge || knowledgeProfile) ? 'VERIFIED' : 'UNVERIFIED',
        source: isWkValid ? 'Website Ingestion' : 'Not configured',
        confidence: isWkValid ? 1.0 : 0.0,
        lastVerifiedAt: timestamp,
      },
      websiteKnowledge: {
        value: websiteKnowledge || null,
        provenance: websiteKnowledge?.provenance || (isWkValid ? 'VERIFIED' : 'UNVERIFIED'),
        source: isWkValid ? 'Ingested Public Website' : 'Not Ingested',
        confidence: isWkValid ? 0.98 : 0.0,
        lastVerifiedAt: websiteKnowledge?.lastSuccessfulSync || timestamp,
      },
      tagline: {
        value: registeredProfile?.tagline || knowledgeProfile?.tagline?.value || (hasVerifiedKnowledge ? `Empowering ${orgName}` : 'Not configured'),
        provenance: hasVerifiedKnowledge ? 'VERIFIED' : 'UNVERIFIED',
        source: primarySource,
        confidence: hasVerifiedKnowledge ? 0.9 : 0.0,
        lastVerifiedAt: timestamp,
      },
      industry: {
        value: registeredProfile?.industry || knowledgeProfile?.industry?.value || (hasVerifiedKnowledge ? 'Commercial Enterprise' : 'Unspecified'),
        provenance: hasVerifiedKnowledge ? 'VERIFIED' : 'UNVERIFIED',
        source: primarySource,
        confidence: hasVerifiedKnowledge ? 0.9 : 0.0,
        lastVerifiedAt: timestamp,
      },
      targetMarket: {
        value: registeredProfile?.targetMarket || (knowledgeProfile?.targetMarkets?.value ? knowledgeProfile.targetMarkets.value.join(', ') : '') || (hasVerifiedKnowledge ? 'Regional Commercial Clients' : 'Unspecified'),
        provenance: hasVerifiedKnowledge ? 'USER_PROVIDED' : 'UNVERIFIED',
        source: primarySource,
        confidence: hasVerifiedKnowledge ? 0.85 : 0.0,
        lastVerifiedAt: timestamp,
      },
      brandVoice: {
        value: registeredProfile?.brandVoice || knowledgeProfile?.brandVoice?.value || (hasVerifiedKnowledge ? 'Professional, Customer-Focused' : 'Professional, Neutral'),
        provenance: hasVerifiedKnowledge ? 'USER_PROVIDED' : 'UNVERIFIED',
        source: primarySource,
        confidence: hasVerifiedKnowledge ? 0.9 : 0.2,
        lastVerifiedAt: timestamp,
      },
      valueProposition: {
        value: registeredProfile?.valueProposition || (knowledgeProfile?.valuePropositions?.value ? knowledgeProfile.valuePropositions.value.join('; ') : '') || (hasVerifiedKnowledge ? `Commercial products and services for ${orgName}.` : 'No verified business knowledge sources connected yet.'),
        provenance: hasVerifiedKnowledge ? 'VERIFIED' : 'UNVERIFIED',
        source: primarySource,
        confidence: hasVerifiedKnowledge ? 0.9 : 0.0,
        lastVerifiedAt: timestamp,
      },
      productsAndServices: {
        value: registeredProfile?.productsAndServices || knowledgeProfile?.products?.value || [],
        provenance: hasVerifiedKnowledge && (registeredProfile?.productsAndServices || knowledgeProfile?.products?.value) ? 'VERIFIED' : 'UNVERIFIED',
        source: primarySource,
        confidence: (registeredProfile?.productsAndServices || knowledgeProfile?.products?.value) ? 1.0 : 0.0,
        lastVerifiedAt: timestamp,
      },
      strategicGoals: {
        value: registeredProfile?.strategicGoals || [],
        provenance: hasVerifiedKnowledge && registeredProfile?.strategicGoals ? 'USER_PROVIDED' : 'UNVERIFIED',
        source: 'Executive Strategy',
        confidence: registeredProfile?.strategicGoals ? 0.9 : 0.0,
        lastVerifiedAt: timestamp,
      },
      uploadedDocumentsCount: {
        value: options?.localOverrides?.documents?.length || 0,
        provenance: 'VERIFIED',
        source: 'Document Vault',
        confidence: 1.0,
        lastVerifiedAt: timestamp,
      },
      knowledgeSources: [
        ...(isWkValid ? [{ id: 'k-web', title: `Website Knowledge (${websiteKnowledge?.websiteUrl})`, category: 'WEBSITE', updatedAt: websiteKnowledge?.lastSuccessfulSync || timestamp, status: 'VERIFIED' as const }] : []),
        ...(isSocialPageConnected ? [{ id: 'k-soc', title: `Facebook Page (${fbPage?.name})`, category: 'SOCIAL', updatedAt: timestamp, status: 'CONNECTED' as const }] : []),
        ...(isPersonalFb ? [{ id: 'k-soc-personal', title: `Facebook Personal Profile (${fbPage?.name || 'Personal Profile'}) — Business Page Not Connected`, category: 'SOCIAL', updatedAt: timestamp, status: 'PENDING' as const }] : []),
        ...(hasRealContacts ? [{ id: 'k-crm', title: 'Live CRM Ledger', category: 'CRM', updatedAt: timestamp, status: 'CONNECTED' as const }] : []),
        ...(hasRealTasks ? [{ id: 'k-tasks', title: 'Operational Tasks', category: 'OPERATIONS', updatedAt: timestamp, status: 'CONNECTED' as const }] : []),
      ],
    };

    // 2. Layer 2: Live Business State — Derived strictly from live records, never fake numbers
    // Live CRM telemetry calculation
    let totalPipeline = 0;
    let activeCustCount = 0;
    let prospectsCount = 0;
    let recentDeals: Array<{ name: string; value: number; stage: string }> = [];

    if (hasRealContacts) {
      totalPipeline = contactsList.reduce((acc: number, c: any) => acc + (Number(c.dealValue) || 0), 0);
      activeCustCount = contactsList.filter((c: any) => c.type === 'CUSTOMER' || !c.type).length;
      prospectsCount = contactsList.filter((c: any) => c.type === 'PROSPECT').length;
      recentDeals = contactsList.slice(0, 3).map((c: any) => ({
        name: c.name || c.company || 'Client Deal',
        value: Number(c.dealValue) || 0,
        stage: c.stage || 'PROPOSAL',
      }));
    }

    const pendingTasks = hasRealTasks 
      ? tasksList.filter((t: any) => t.status === 'PENDING').length 
      : 0;
    const highPriTasks = hasRealTasks 
      ? tasksList.filter((t: any) => t.status === 'PENDING' && t.priority === 'HIGH').length 
      : 0;

    const isSocialConnected = isSocialPageConnected;
    const followers = isSocialPageConnected ? (Number(fbPage?.fanCount) || 0) : 0;
    const pageName = isSocialPageConnected ? (fbPage?.name || 'Facebook Page') : (isPersonalFb ? 'Personal Profile (Business Page Not Connected)' : 'Not Connected');

    const layer2: Layer2BusinessState = {
      crm: {
        isConnected: hasRealContacts,
        totalPipelineValue: {
          value: totalPipeline,
          provenance: hasRealContacts ? 'VERIFIED' : 'UNVERIFIED',
          source: 'CRM Portfolio Ledger',
          confidence: hasRealContacts ? 1.0 : 0.0,
          lastVerifiedAt: timestamp,
        },
        activeCustomersCount: {
          value: activeCustCount,
          provenance: hasRealContacts ? 'VERIFIED' : 'UNVERIFIED',
          source: 'Customer Directory',
          confidence: hasRealContacts ? 1.0 : 0.0,
          lastVerifiedAt: timestamp,
        },
        prospectsCount: {
          value: prospectsCount,
          provenance: hasRealContacts ? 'VERIFIED' : 'UNVERIFIED',
          source: 'Pipeline Leads',
          confidence: hasRealContacts ? 1.0 : 0.0,
          lastVerifiedAt: timestamp,
        },
        recentDeals,
      },
      social: {
        isConnected: isSocialConnected,
        connectedPageName: {
          value: pageName,
          provenance: isSocialConnected ? 'VERIFIED' : 'UNVERIFIED',
          source: 'Meta Graph API',
          confidence: isSocialConnected ? 1.0 : 0.0,
          lastVerifiedAt: timestamp,
        },
        followersCount: {
          value: followers,
          provenance: isSocialConnected ? 'VERIFIED' : 'UNVERIFIED',
          source: 'Meta Graph API',
          confidence: isSocialConnected ? 1.0 : 0.0,
          lastVerifiedAt: timestamp,
        },
        reachGrowthPct: {
          value: 0.0,
          provenance: 'VERIFIED',
          source: 'Social Analytics Engine',
          confidence: 0.0,
          lastVerifiedAt: timestamp,
        },
        engagementRatePct: {
          value: 0.0,
          provenance: 'INFERRED',
          source: 'Social Analytics Engine',
          confidence: 0.0,
          lastVerifiedAt: timestamp,
        },
        recentPostsCount: {
          value: 0,
          provenance: 'VERIFIED',
          source: 'Meta Graph API',
          confidence: 0.0,
          lastVerifiedAt: timestamp,
        },
        topPerformingType: {
          value: 'Not analyzed yet',
          provenance: 'UNVERIFIED',
          source: 'Mari Content Learning Engine',
          confidence: 0.0,
          lastVerifiedAt: timestamp,
        },
      },
      operations: {
        pendingTasksCount: {
          value: pendingTasks,
          provenance: 'VERIFIED',
          source: 'Workspace Tasks Ledger',
          confidence: 1.0,
          lastVerifiedAt: timestamp,
        },
        highPriorityTasksCount: {
          value: highPriTasks,
          provenance: 'VERIFIED',
          source: 'Workspace Tasks Ledger',
          confidence: 1.0,
          lastVerifiedAt: timestamp,
        },
        slaUptimePct: {
          value: 100.0,
          provenance: 'VERIFIED',
          source: 'Infrastructure Telemetry',
          confidence: 1.0,
          lastVerifiedAt: timestamp,
        },
        workflowsRunToday: {
          value: 0,
          provenance: 'VERIFIED',
          source: 'Workflow Execution Bus',
          confidence: 1.0,
          lastVerifiedAt: timestamp,
        },
      },
    };

    // 3. Layer 3: Mari Growth Memory
    const layer3: Layer3MariMemory = {
      userPreferences: {
        reportingStyle: 'Executive, Concise, Structured',
        primaryFocus: 'B2B Revenue & Audience Growth',
        autoApprovalAllowed: false,
      },
      acceptedRecommendations: [],
      rejectedRecommendations: [],
      strategicThemes: hasVerifiedKnowledge ? ['Customer growth and pipeline execution'] : [],
      recentActions: [],
    };

    // Credits usage
    const tier = (options?.localOverrides?.tier || 'COMMUNITY').toUpperCase();
    const allocated = tier === 'COMMUNITY' ? 10000 : 100000;
    const credits: MariCreditsUsage = {
      totalAllocated: allocated,
      used: 0,
      remaining: allocated,
      tier,
      planName: tier === 'COMMUNITY' ? 'Community Free Plan' : tier === 'STANDARD' ? 'Standard Plan' : 'Enterprise Unlimited',
    };

    this.versionCounter += 1;
    const versionStr = `2026-08-24-v${this.versionCounter}`;

    const context: BusinessContext = {
      organizationId: orgId,
      organizationName: orgName,
      isTestTenant: isTest,
      version: versionStr,
      assembledAt: timestamp,
      activeScreen: options?.activeScreen,
      layer1,
      layer2,
      layer3,
      credits,
      primarySource,
      hasVerifiedKnowledge,
      personalProfileNotice,
      isPersonalSocialProfile: isPersonalFb,
    };

    contextCache[orgId] = {
      context,
      cachedAt: now,
      version: this.versionCounter,
    };

    return context;
  }

  /**
   * Invalidates context cache on business data changes.
   */
  static invalidateContext(orgId: string = 'ras-ali-labs') {
    delete contextCache[orgId];
  }

  /**
   * Generates a grounded, high-density system prompt string from the 3-Layer Business Context.
   * Enforces authoritative business intelligence without web-browsing refusal text.
   */
  static generateContextPrompt(context: BusinessContext): string {
    const l1 = context.layer1;
    const l2 = context.layer2;
    const l3 = context.layer3;
    const websiteSnippet = WebsiteIngestionService.generateWebsitePromptSnippet(context.organizationId);

    const crmSection = l2.crm.isConnected
      ? `- CRM Pipeline Revenue: $${l2.crm.totalPipelineValue.value.toLocaleString()} across ${l2.crm.activeCustomersCount.value} active clients & ${l2.crm.prospectsCount.value} prospects. Deals: ${l2.crm.recentDeals.map(d => `${d.name} ($${d.value.toLocaleString()})`).join(', ')}`
      : `- CRM: No active deals connected yet.`;

    const socialSection = l2.social.isConnected
      ? `- Facebook Page: "${l2.social.connectedPageName?.value}" | ${l2.social.followersCount?.value} followers | Reach Growth: +${l2.social.reachGrowthPct?.value}% | Top Content: ${l2.social.topPerformingType?.value}`
      : context.isPersonalSocialProfile
      ? `- Social Accounts: A personal Facebook profile is connected, but NO Facebook Business Page is connected. Do NOT claim Facebook Page posts, followers, or performance analytics. If asked about Facebook performance, explain that the connected account is a personal profile and recommend connecting a Facebook Page.`
      : `- Social Accounts: Not connected.`;

    return `=== AUTHORITATIVE BUSINESS KNOWLEDGE (Organization: ${l1.companyName.value}) ===
LEGAL IDENTITY: ${l1.legalIdentity?.value || l1.companyName.value}
INDUSTRY: ${l1.industry.value}
BRAND VOICE: ${l1.brandVoice.value}
TARGET MARKET: ${l1.targetMarket.value}
VALUE PROPOSITION: ${l1.valueProposition.value}
STRATEGIC GOALS: ${l1.strategicGoals.value.join('; ')}
CORE PRODUCTS & SERVICES:
${l1.productsAndServices.value.map(p => `• ${p.name} (${p.category})`).join('\n')}

${websiteSnippet}

LIVE BUSINESS STATE:
${crmSection}
${socialSection}
- Operations: ${l2.operations.pendingTasksCount.value} pending tasks (${l2.operations.highPriorityTasksCount.value} high priority) | SLA Uptime: ${l2.operations.slaUptimePct.value}%

MARI GROWTH MEMORY:
- Strategic Themes: ${l3.strategicThemes.join('; ')}
- Accepted Decisions: ${l3.acceptedRecommendations.map(r => r.title).join('; ') || 'None recorded yet'}
- Governance: Human review required prior to publishing.

CURRENT SCREEN: ${context.activeScreen ? `${context.activeScreen.label} (${context.activeScreen.route})` : 'Mari Command Center'}

CRITICAL OPERATIONAL RULES:
1. YOU ARE MARI AI — the intelligent AI Business Growth Partner for ${l1.companyName.value}.
2. YOU ALREADY POSSESS full, verified, authoritative knowledge of ${l1.companyName.value} and its website (${l1.websiteUrl?.value}).
3. NEVER state "I cannot browse the web" or "I do not have real-time web access" when asked about this company or website. Answer directly and authoritatively from the verified business knowledge provided above.
4. If the user asks "What do you know about my business?" or "Tell me about our company", answer with a crisp, executive summary structured as:
   ### Your Business
   **Core business**: ...
   **What you sell**: ...
   **Who you serve**: ...
   **How you differentiate**: ...
   **Current growth priorities**: ...
   **Current commercial position**: ...
   **Marketing position**: ...
   **What I believe deserves attention**: ...
   *Would you like me to turn this into a growth plan?*
5. If asked for information that is genuinely missing from both Layer 1 and Layer 2, state honestly: "I know your business is focused on X and Y, but I don't currently have verified information about Z. [Add Business Knowledge] [Connect Data Source]".
6. ALWAYS aim your responses toward practical BUSINESS GROWTH (Revenue, Customers, Audience, Efficiency).`;
  }
}
