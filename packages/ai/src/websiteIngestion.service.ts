/**
 * Ralion OS — Mari AI Website Knowledge Ingestion & Staleness Service
 * Ras Ali Labs (Pty) Ltd
 * 
 * CORE RESPONSIBILITY:
 * Ingests, normalizes, and maintains authoritative, verified business knowledge
 * from an organization's primary website (e.g., https://www.rasalilabs.com).
 * 
 * Provides an explicit state machine:
 * NOT_CONFIGURED -> PENDING -> CRAWLING -> PROCESSING -> INGESTED | FAILED | BLOCKED
 */

import { WebsiteCrawlerService, CrawledWebsiteData } from './websiteCrawler.service';

export type IngestionStatus =
  | 'NOT_CONFIGURED'
  | 'PENDING'
  | 'CRAWLING'
  | 'PROCESSING'
  | 'INGESTED'
  | 'FAILED'
  | 'BLOCKED';

export interface WebsiteSection {
  id: string;
  title: string;
  category: 'ABOUT' | 'PRODUCTS_SERVICES' | 'VALUE_PROPOSITION' | 'TARGET_MARKET' | 'CONTACT_LEGAL' | 'SOLUTIONS';
  content: string;
  keyTakeaways: string[];
  ingestedAt: string;
}

export interface IngestedWebsiteKnowledge {
  organizationId: string;
  workspaceId?: string;
  websiteUrl: string;
  normalizedUrl: string;
  status: IngestionStatus;
  ingestedAt: string;
  lastSuccessfulSync: string;
  title: string;
  description: string;
  headings: string[];
  productsServices: Array<{ name: string; category: string; description?: string }>;
  contactInformation: {
    emails: string[];
    phones: string[];
    addresses: string[];
  };
  socialLinks: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
  };
  source: 'WEBSITE_CRAWLER' | 'MANUAL_IMPORT' | 'PLATFORM_DEFAULT';
  contentHash: string;
  version: string;
  isStale: boolean;
  syncStatus: 'ACTIVE' | 'SYNCING' | 'STALE' | 'FAILED' | 'BLOCKED';
  provenance: 'VERIFIED' | 'USER_APPROVED';
  summary: string;
  sections: WebsiteSection[];
  errorMessage?: string;
}

// In-memory tenant website knowledge store
const websiteStore: Record<string, IngestedWebsiteKnowledge> = {};

// Verified website knowledge for Ras Ali Labs Enterprise
const RAS_ALI_LABS_VERIFIED_WEBSITE: IngestedWebsiteKnowledge = {
  organizationId: 'ras-ali-labs',
  workspaceId: 'ws_ras_ali_main',
  websiteUrl: 'https://www.rasalilabs.com',
  normalizedUrl: 'https://www.rasalilabs.com',
  status: 'INGESTED',
  ingestedAt: new Date().toISOString(),
  lastSuccessfulSync: new Date().toISOString(),
  title: 'Ras Ali Labs — Enterprise Operating System',
  description: 'Ras Ali Labs is a premier African enterprise technology firm creating Ralion OS — the sovereign enterprise operating system for African and global organizations.',
  headings: [
    'Empowering African & Global Enterprises',
    'Ralion OS Core Platform',
    'Mari AI Command Center',
    'Enterprise Cloud & Sovereignty',
  ],
  productsServices: [
    { name: 'Ralion OS Core', category: 'Enterprise Operating System' },
    { name: 'Mari AI Command Center', category: 'Artificial Intelligence' },
    { name: 'Ralion Growth Studio', category: 'Marketing Automation' },
  ],
  contactInformation: {
    emails: ['enterprise@rasalilabs.com'],
    phones: ['+267 390 0000'],
    addresses: ['Gaborone, Botswana', 'Johannesburg, South Africa'],
  },
  socialLinks: {
    facebook: 'https://facebook.com/rasalilabs',
    linkedin: 'https://linkedin.com/company/rasalilabs',
  },
  source: 'PLATFORM_DEFAULT',
  contentHash: 'hash-ral-web-2026-v4',
  version: '2026.4.1',
  isStale: false,
  syncStatus: 'ACTIVE',
  provenance: 'VERIFIED',
  summary: 'Ras Ali Labs is a premier African enterprise technology and AI solutions firm headquartered in Botswana and South Africa. Creator of Ralion OS — the sovereign enterprise operating system for African and global organizations.',
  sections: [
    {
      id: 'ws-1',
      title: 'Company Overview & Mission',
      category: 'ABOUT',
      content: 'Ras Ali Labs is an enterprise software and artificial intelligence company dedicated to empowering organizations across Africa and emerging markets with sovereign, high-performance operating software, intelligent workflows, and data sovereignty. Tagline: "Empowered to Prosper".',
      keyTakeaways: [
        'African enterprise technology leader with dual presence in Gaborone and Johannesburg',
        'Developer of Ralion OS: Enterprise CRM, Documents, Task Execution, and Intelligence',
        'Tagline: Empowered to Prosper',
      ],
      ingestedAt: new Date().toISOString(),
    },
    {
      id: 'ws-2',
      title: 'Core Products & Solutions',
      category: 'PRODUCTS_SERVICES',
      content: 'Primary offerings include Ralion OS (Unified Enterprise Operating System), Mari AI (AI Business Command Center & Growth Partner), Ralion Growth Studio (Social Media, Content Studio, and Multichannel Campaign Engine), and Vertical Industry Suites (Ralion Health, Ralion Logistics & Customs, Ralion Funeral, Ralion Trade & Retail).',
      keyTakeaways: [
        'Ralion OS Core: Integrated CRM, Ledger, Documents, and Tasks',
        'Mari AI: Proactive AI Business Growth Partner and Strategic Orchestrator',
        'Ralion Growth Studio: Automated content creation, social scheduling, and audience velocity',
        'Industry OS Modules: Tailored solutions for Logistics, Healthcare, Mining, and Public Sector',
      ],
      ingestedAt: new Date().toISOString(),
    },
    {
      id: 'ws-3',
      title: 'Value Proposition & Differentiators',
      category: 'VALUE_PROPOSITION',
      content: 'Ras Ali Labs provides sovereign business software built with native offline resilience, enterprise-grade RBAC security, zero data loss guarantees, and deep integration with regional African business workflows and payment gateways. Unlike generic SaaS, Ralion OS is engineered specifically for African commercial scale.',
      keyTakeaways: [
        'Sovereign business infrastructure with native offline desktop and web parity',
        'High SLA uptime rating (99.8%+) and enterprise security posture',
        'Tailored to SADC commercial regulations, trade corridors, and multi-currency billing (BWP, ZAR, USD)',
      ],
      ingestedAt: new Date().toISOString(),
    },
    {
      id: 'ws-4',
      title: 'Target Markets & Industries Served',
      category: 'TARGET_MARKET',
      content: 'Primary markets encompass mid-market and enterprise B2B companies across the SADC region (Botswana, South Africa, Namibia, Zambia, Zimbabwe), specializing in mining & resources, cross-border logistics, private healthcare networks, financial trade, and public sector digital transformation.',
      keyTakeaways: [
        'SADC regional enterprise commercial sector',
        'Key verticals: Logistics & Freight, Healthcare Providers, Industrial Mining, Funeral Management',
        'Focus on B2B operational efficiency, revenue expansion, and audience reach',
      ],
      ingestedAt: new Date().toISOString(),
    },
    {
      id: 'ws-5',
      title: 'Headquarters, Contacts & Corporate Governance',
      category: 'CONTACT_LEGAL',
      content: 'Ras Ali Labs operates corporate offices in Gaborone, Botswana and Johannesburg, South Africa. Fully compliant with enterprise data protection acts, sovereign hosting standards, and regional business registrations.',
      keyTakeaways: [
        'Operating in Gaborone, Botswana & Johannesburg, South Africa',
        'Website: https://www.rasalilabs.com',
        'Contact email: enterprise@rasalilabs.com',
      ],
      ingestedAt: new Date().toISOString(),
    },
  ],
};

// Durable storage key prefix
const STORAGE_PREFIX = 'ralion:';

export class WebsiteIngestionService {
  /**
   * Loads persisted record from durable storage (client localStorage or memory).
   */
  private static loadDurableRecord(orgId: string): IngestedWebsiteKnowledge | null {
    if (!orgId) return null;

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        // Direct org key only - check both namespaced and legacy key
        const raw = window.localStorage.getItem(`ralion:${orgId}:website`) || window.localStorage.getItem(`ralion_wk_${orgId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed &&
            (parsed.organizationId === orgId || parsed.workspaceId === orgId) &&
            (parsed.status === 'INGESTED' || parsed.provenance === 'VERIFIED' || parsed.websiteUrl)
          ) {
            websiteStore[orgId] = parsed;
            return parsed;
          }
        }
      } catch {}
    }
    return null;
  }

  /**
   * Persists record to durable storage (client localStorage and memory).
   */
  private static saveDurableRecord(orgId: string, record: IngestedWebsiteKnowledge): void {
    if (!orgId || !record) return;
    websiteStore[orgId] = record;

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(`ralion:${orgId}:website`, JSON.stringify(record));
      } catch {}
    }
  }

  /**
   * Retrieves the current ingested website knowledge for an organization.
   * Hydrates from durable storage if in-memory cache is empty.
   */
  static getWebsiteKnowledge(orgId: string): IngestedWebsiteKnowledge | null {
    if (!orgId) return null;

    // Check dynamic in-memory store
    if (websiteStore[orgId]) {
      const knowledge = websiteStore[orgId];
      if (knowledge.status === 'INGESTED') {
        const lastSyncMs = new Date(knowledge.lastSuccessfulSync || knowledge.ingestedAt).getTime();
        const isStale = (Date.now() - lastSyncMs) > (14 * 24 * 60 * 60 * 1000);
        knowledge.isStale = isStale;
        if (isStale) knowledge.syncStatus = 'STALE';
      }
      return knowledge;
    }

    // Check durable client storage
    const durable = this.loadDurableRecord(orgId);
    if (durable) {
      return durable;
    }

    // Strict check: Only the canonical Platform Admin UUID gets the default Ras Ali Labs profile
    if (orgId === '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf') {
      websiteStore['22e61ff6-16fe-44c7-9d67-38e2a2e91ccf'] = {
        ...RAS_ALI_LABS_VERIFIED_WEBSITE,
        organizationId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
      };
      return websiteStore['22e61ff6-16fe-44c7-9d67-38e2a2e91ccf'];
    }

    return null;
  }

  /**
   * Returns explicit ingestion status for an organization.
   */
  static getIngestionStatus(orgId: string): IngestionStatus {
    const knowledge = this.getWebsiteKnowledge(orgId);
    if (!knowledge) return 'NOT_CONFIGURED';
    return knowledge.status || (knowledge.provenance === 'VERIFIED' ? 'INGESTED' : 'NOT_CONFIGURED');
  }

  /**
   * Sets or updates the active ingestion lifecycle state for a tenant.
   */
  static setIngestionState(
    orgId: string,
    status: IngestionStatus,
    partialData?: Partial<IngestedWebsiteKnowledge>
  ): IngestedWebsiteKnowledge {
    const existing = this.getWebsiteKnowledge(orgId);
    const now = new Date().toISOString();

    const record: IngestedWebsiteKnowledge = {
      organizationId: orgId,
      workspaceId: partialData?.workspaceId || existing?.workspaceId,
      websiteUrl: partialData?.websiteUrl || existing?.websiteUrl || '',
      normalizedUrl: partialData?.normalizedUrl || existing?.normalizedUrl || '',
      status,
      ingestedAt: partialData?.ingestedAt || existing?.ingestedAt || now,
      lastSuccessfulSync: status === 'INGESTED' ? now : (existing?.lastSuccessfulSync || now),
      title: partialData?.title || existing?.title || '',
      description: partialData?.description || existing?.description || '',
      headings: partialData?.headings || existing?.headings || [],
      productsServices: partialData?.productsServices || existing?.productsServices || [],
      contactInformation: partialData?.contactInformation || existing?.contactInformation || { emails: [], phones: [], addresses: [] },
      socialLinks: partialData?.socialLinks || existing?.socialLinks || {},
      source: partialData?.source || existing?.source || 'WEBSITE_CRAWLER',
      contentHash: partialData?.contentHash || existing?.contentHash || `hash-${Date.now()}`,
      version: partialData?.version || existing?.version || '1.0.0',
      isStale: false,
      syncStatus: status === 'INGESTED' ? 'ACTIVE' : (status === 'BLOCKED' ? 'BLOCKED' : 'SYNCING'),
      provenance: status === 'INGESTED' ? 'VERIFIED' : 'USER_APPROVED',
      summary: partialData?.summary || existing?.summary || '',
      sections: partialData?.sections || existing?.sections || [],
      errorMessage: partialData?.errorMessage,
    };

    this.saveDurableRecord(orgId, record);
    return record;
  }

  /**
   * Ingests or re-indexes website knowledge for an organization using SSRF-protected crawler.
   */
  static async ingestWebsite(
    orgId: string,
    websiteUrl: string,
    options?: {
      workspaceId?: string;
      customSections?: WebsiteSection[];
      overrideName?: string;
      overrideIndustry?: string;
    }
  ): Promise<IngestedWebsiteKnowledge> {
    if (!orgId) throw new Error('organizationId is required for website ingestion');
    if (!websiteUrl || !websiteUrl.trim()) throw new Error('websiteUrl is required for website ingestion');

    const timestamp = new Date().toISOString();
    let cleanUrl = websiteUrl.trim();
    if (!cleanUrl.toLowerCase().startsWith('http')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    // 1. Mark as PENDING / CRAWLING
    this.setIngestionState(orgId, 'CRAWLING', {
      websiteUrl: cleanUrl,
      normalizedUrl: cleanUrl,
      workspaceId: options?.workspaceId,
    });

    const isRasAli = cleanUrl.includes('rasalilabs.com') && orgId === 'ras-ali-labs';

    try {
      // 2. Perform SSRF-protected crawl
      let crawled: CrawledWebsiteData;
      try {
        crawled = await WebsiteCrawlerService.crawlAndExtract(cleanUrl);
      } catch (crawlErr: any) {
        if (crawlErr.message && crawlErr.message.includes('SSRF Security Rejection')) {
          this.setIngestionState(orgId, 'BLOCKED', {
            websiteUrl: cleanUrl,
            normalizedUrl: cleanUrl,
            errorMessage: crawlErr.message,
          });
          throw crawlErr;
        }
        throw crawlErr;
      }

      // 3. Mark as PROCESSING
      this.setIngestionState(orgId, 'PROCESSING', {
        websiteUrl: crawled.normalizedUrl,
        normalizedUrl: crawled.normalizedUrl,
        title: crawled.title,
      });

      // 4. Ingest into BusinessKnowledgeProfileService and BusinessContextService
      try {
        const { BusinessKnowledgeProfileService } = require('./businessKnowledgeProfile.service');
        await BusinessKnowledgeProfileService.ingestWebsiteForTenant(orgId, crawled.normalizedUrl, {
          workspaceId: options?.workspaceId,
          overrideName: options?.overrideName,
          overrideIndustry: options?.overrideIndustry,
        });
        const { BusinessContextService } = require('./businessContext.service');
        BusinessContextService.registerTenantProfile(orgId, {
          companyName: options?.overrideName || crawled.title || orgId,
          industry: options?.overrideIndustry || 'Commercial Enterprise',
        });
      } catch (e: any) {
        console.warn('[WebsiteIngestionService] BusinessKnowledgeProfile sync notice:', e.message);
      }

      // 5. Build structured sections
      const sections: WebsiteSection[] = options?.customSections || (isRasAli ? RAS_ALI_LABS_VERIFIED_WEBSITE.sections : [
        {
          id: `ws-${Date.now()}-1`,
          title: `About ${crawled.title || orgId}`,
          category: 'ABOUT',
          content: crawled.description || `Official public business profile for ${crawled.title || orgId} accessible at ${crawled.normalizedUrl}.`,
          keyTakeaways: [
            `Primary verified website: ${crawled.normalizedUrl}`,
            `Industry focus: ${options?.overrideIndustry || 'Commercial Enterprise'}`,
          ],
          ingestedAt: timestamp,
        },
        {
          id: `ws-${Date.now()}-2`,
          title: 'Products & Services Overview',
          category: 'PRODUCTS_SERVICES',
          content: crawled.productsAndServices.map(p => p.name).join(', ') || 'Commercial solutions and client services.',
          keyTakeaways: crawled.productsAndServices.slice(0, 4).map(p => p.name).length > 0
            ? crawled.productsAndServices.slice(0, 4).map(p => p.name)
            : ['Commercial catalog ingested for customer inquiry routing'],
          ingestedAt: timestamp,
        },
        {
          id: `ws-${Date.now()}-3`,
          title: 'Value Proposition & Differentiators',
          category: 'VALUE_PROPOSITION',
          content: crawled.headings[0] || `${crawled.title || orgId} commercial services delivered with excellence.`,
          keyTakeaways: crawled.headings.slice(0, 3).length > 0
            ? crawled.headings.slice(0, 3)
            : ['Quality service delivery and verified client fulfillment'],
          ingestedAt: timestamp,
        },
        {
          id: `ws-${Date.now()}-4`,
          title: 'Contact & Channels',
          category: 'CONTACT_LEGAL',
          content: `Website: ${crawled.normalizedUrl}. Email: ${crawled.contactInfo.emails[0] || 'Inquiries online'}.`,
          keyTakeaways: [
            `Website: ${crawled.normalizedUrl}`,
            `Emails: ${crawled.contactInfo.emails.join(', ') || 'Direct web inquiries'}`,
          ],
          ingestedAt: timestamp,
        },
      ]);

      const result: IngestedWebsiteKnowledge = {
        organizationId: orgId,
        workspaceId: options?.workspaceId,
        websiteUrl: crawled.normalizedUrl,
        normalizedUrl: crawled.normalizedUrl,
        status: 'INGESTED',
        ingestedAt: timestamp,
        lastSuccessfulSync: timestamp,
        title: crawled.title || orgId,
        description: crawled.description,
        headings: crawled.headings,
        productsServices: crawled.productsAndServices,
        contactInformation: crawled.contactInfo,
        socialLinks: crawled.socialLinks,
        source: 'WEBSITE_CRAWLER',
        contentHash: crawled.contentHash,
        version: `v-${new Date().toISOString().split('T')[0]}`,
        isStale: false,
        syncStatus: 'ACTIVE',
        provenance: 'VERIFIED',
        summary: isRasAli
          ? RAS_ALI_LABS_VERIFIED_WEBSITE.summary
          : `${crawled.title || orgId} operates as a commercial business accessible at ${crawled.normalizedUrl}. ${crawled.description}`,
        sections,
      };

      this.saveDurableRecord(orgId, result);
      return result;

    } catch (err: any) {
      if (err.message && err.message.includes('SSRF Security Rejection')) {
        this.setIngestionState(orgId, 'BLOCKED', {
          websiteUrl: cleanUrl,
          normalizedUrl: cleanUrl,
          errorMessage: err.message,
        });
      } else {
        this.setIngestionState(orgId, 'FAILED', {
          websiteUrl: cleanUrl,
          normalizedUrl: cleanUrl,
          errorMessage: err.message,
        });
      }
      throw err;
    }
  }

  /**
   * Resets tenant knowledge store for clean testing.
   */
  static _resetForTesting(): void {
    for (const key of Object.keys(websiteStore)) {
      delete websiteStore[key];
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => window.localStorage.removeItem(k));
      } catch {}
    }
  }

  /**
   * Returns a high-density, concise summary of ingested website content for Mari's system prompt.
   */
  static generateWebsitePromptSnippet(orgId: string): string {
    const knowledge = this.getWebsiteKnowledge(orgId);
    if (!knowledge || knowledge.status !== 'INGESTED') {
      return `WEBSITE: Not currently ingested. (If user asks about website content, politely inform them that website knowledge is not yet synced and offer [Sync Website]).`;
    }

    const stalenessNotice = knowledge.isStale 
      ? ` [NOTICE: Knowledge is >14 days old and marked STALE. Recommend syncing if major updates occurred.]` 
      : ` [STATUS: VERIFIED & SYNCED]`;

    const sectionBulletPoints = knowledge.sections.map(s => 
      `• [${s.category}] ${s.title}: ${s.keyTakeaways.join(' | ')}`
    ).join('\n');

    return `VERIFIED WEBSITE KNOWLEDGE (${knowledge.websiteUrl})${stalenessNotice}:
Summary: ${knowledge.summary}
${sectionBulletPoints}`;
  }
}
