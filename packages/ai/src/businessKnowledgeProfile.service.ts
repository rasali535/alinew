/**
 * Ralion OS — Tenant Business Knowledge Profile Service
 * Ras Ali Labs (Pty) Ltd
 *
 * Core Responsibilities:
 * - Authoritative model for Tenant Business Knowledge Profiles with complete provenance.
 * - Dual Namespace Management: PLATFORM_KNOWLEDGE (global) vs TENANT_KNOWLEDGE (tenant-scoped).
 * - Progressive Enrichment: Website (Day 1) -> Facebook -> Instagram -> LinkedIn -> CRM.
 * - Zero Ras Ali Labs fallback: Unconfigured tenants explicitly return unverified state.
 */

import { WebsiteCrawlerService, CrawledWebsiteData } from './websiteCrawler.service';

export type KnowledgeSourceType =
  | 'WEBSITE'
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'LINKEDIN'
  | 'USER_INPUT'
  | 'MANUAL'
  | 'PLATFORM'
  | 'OTHER';

export interface ProvenanceField<T> {
  value: T;
  sourceType: KnowledgeSourceType;
  sourceUrl?: string;
  sourceLabel?: string;
  confidence: number;
  lastUpdated: string;
}

export interface BusinessKnowledgeProfile {
  organizationId: string;
  workspaceId?: string;
  companyName: ProvenanceField<string>;
  websiteUrl: ProvenanceField<string>;
  industry: ProvenanceField<string>;
  description: ProvenanceField<string>;
  tagline: ProvenanceField<string>;
  valuePropositions: ProvenanceField<string[]>;
  products: ProvenanceField<Array<{ name: string; category: string; description?: string }>>;
  services: ProvenanceField<Array<{ name: string; category: string; description?: string }>>;
  targetMarkets: ProvenanceField<string[]>;
  targetCustomers: ProvenanceField<string[]>;
  geography: ProvenanceField<string[]>;
  brandPositioning: ProvenanceField<string>;
  brandVoice: ProvenanceField<string>;
  publicContacts: ProvenanceField<{
    emails: string[];
    phones: string[];
    addresses: string[];
  }>;
  socialLinks: ProvenanceField<{
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
  }>;
  sourceUrls: string[];
  contentHash: string;
  knowledgeVersion: number;
  isVerified: boolean;
  lastCrawledAt?: string;
  lastEnrichedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM KNOWLEDGE BASE (Available to ALL tenants for Ralion OS help/billing)
// ─────────────────────────────────────────────────────────────────────────────
export const PLATFORM_KNOWLEDGE = {
  name: 'Ralion OS Platform Intelligence',
  version: '2026.4',
  documentation: {
    coreModules: ['CRM & Pipeline', 'Task Execution', 'Document Vault', 'Billing & Ledger', 'Growth Studio'],
    mariCapabilities: [
      'Autonomous Business Growth Partner',
      'Strategic Revenue & CRM Diagnostics',
      'Multichannel Creative Generation (Images, Posters, Reels)',
      'Meta / Facebook / Instagram / LinkedIn / X Unified Publishing',
      'Audience Reach & Velocity Tracking',
    ],
    billingTiers: [
      { tier: 'PROFESSIONAL', modulesLimit: 3, priceBwp: 450, priceUsd: 35 },
      { tier: 'BUSINESS', modulesLimit: 5, priceBwp: 850, priceUsd: 65 },
      { tier: 'ENTERPRISE', modulesLimit: 99, priceBwp: 2200, priceUsd: 165 },
    ],
  },
  supportContacts: {
    portalUrl: 'https://rasalilabs.com/support',
    email: 'support@rasalilabs.com',
  },
};

// In-memory tenant knowledge profile store
const tenantProfileMap = new Map<string, BusinessKnowledgeProfile>();

// Seed Ras Ali Labs as a distinct, registered organization
tenantProfileMap.set('ras-ali-labs', {
  organizationId: 'ras-ali-labs',
  companyName: {
    value: 'Ras Ali Labs',
    sourceType: 'WEBSITE',
    sourceUrl: 'https://www.rasalilabs.com',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  websiteUrl: {
    value: 'https://www.rasalilabs.com',
    sourceType: 'WEBSITE',
    sourceUrl: 'https://www.rasalilabs.com',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  industry: {
    value: 'Enterprise Software, B2B SaaS & Industrial Intelligence',
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  description: {
    value: 'Ras Ali Labs is a premier African enterprise technology and AI solutions firm creating Ralion OS — the sovereign enterprise operating system for African and global organizations.',
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  tagline: {
    value: 'Empowering African and Global Enterprises to Prosper Through Sovereign Intelligent OS',
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  valuePropositions: {
    value: [
      'Sovereign enterprise infrastructure with native offline desktop and web parity',
      'Enterprise RBAC security with zero data loss guarantees',
      'Tailored to SADC commercial regulations and trade corridors',
    ],
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  products: {
    value: [
      { name: 'Ralion OS Core', category: 'Enterprise Operating System' },
      { name: 'Mari AI Command Center', category: 'Artificial Intelligence' },
      { name: 'Ralion Growth Studio', category: 'Marketing Automation' },
    ],
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  services: {
    value: [
      { name: 'Enterprise Cloud Deployment', category: 'Infrastructure' },
      { name: 'Custom AI Agent Engineering', category: 'AI Services' },
    ],
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  targetMarkets: {
    value: ['SADC Mid-Market & Enterprise B2B', 'Healthcare Providers', 'Freight & Logistics Corridors'],
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  targetCustomers: {
    value: ['Chief Technology Officers', 'Operations Executives', 'SME Business Owners'],
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  geography: {
    value: ['Botswana', 'South Africa', 'Namibia', 'Zambia', 'Zimbabwe'],
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  brandPositioning: {
    value: 'African Tech Sovereign Excellence & Intelligent Automation',
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  brandVoice: {
    value: 'Professional, Authoritative, Innovative, African Excellence',
    sourceType: 'MANUAL',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  publicContacts: {
    value: {
      emails: ['enterprise@rasalilabs.com'],
      phones: ['+267 390 0000'],
      addresses: ['Gaborone, Botswana', 'Johannesburg, South Africa'],
    },
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  socialLinks: {
    value: {
      facebook: 'https://facebook.com/rasalilabs',
      linkedin: 'https://linkedin.com/company/rasalilabs',
    },
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  sourceUrls: ['https://www.rasalilabs.com'],
  contentHash: 'hash-ral-default-v4',
  knowledgeVersion: 1,
  isVerified: true,
  lastCrawledAt: new Date().toISOString(),
});

// Seed Pameltex as distinct Tenant B organization
tenantProfileMap.set('pameltex', {
  organizationId: 'pameltex',
  companyName: {
    value: 'Pameltex',
    sourceType: 'WEBSITE',
    sourceUrl: 'https://www.pameltex.com',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  websiteUrl: {
    value: 'https://www.pameltex.com',
    sourceType: 'WEBSITE',
    sourceUrl: 'https://www.pameltex.com',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  industry: {
    value: 'Commercial Uniforms, Industrial Workwear & Safety Apparel Manufacturing',
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  description: {
    value: 'Pameltex is a premier Botswana manufacturer and distributor of high-quality corporate uniforms, industrial workwear, and protective clothing.',
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  tagline: {
    value: 'Quality Workwear & Corporate Apparel for Botswana and Southern Africa',
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  valuePropositions: {
    value: [
      'Locally manufactured high-durability workwear and PPE compliant with regional safety standards',
      'Custom corporate branding and embroidery for enterprise workforces',
      'Rapid turnaround and wholesale supply for mining, logistics, security, and healthcare sectors',
    ],
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  products: {
    value: [
      { name: 'Industrial Conti Suits & Overalls', category: 'Safety & PPE' },
      { name: 'Corporate & Executive Uniforms', category: 'Apparel' },
      { name: 'High-Visibility & Security Uniforms', category: 'Security' },
      { name: 'Hospitality & Healthcare Scrubs', category: 'Healthcare' },
    ],
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  services: {
    value: [
      { name: 'Custom Garment Branding & Embroidery', category: 'Customization' },
      { name: 'Bulk Corporate Wardrobe Management', category: 'Supply Chain' },
    ],
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  targetMarkets: {
    value: ['Botswana Mining & Construction Companies', 'Security Firms & Logistics Providers', 'Government & Corporate Enterprises'],
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  targetCustomers: {
    value: ['Procurement Managers', 'Safety & HSE Officers', 'HR & Operations Directors'],
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  geography: {
    value: ['Botswana', 'SADC Region'],
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  brandPositioning: {
    value: 'Trusted Botswana Workwear & PPE Manufacturer',
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  brandVoice: {
    value: 'Reliable, Practical, Professional, Quality-focused',
    sourceType: 'MANUAL',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  publicContacts: {
    value: {
      emails: ['info@pameltex.com'],
      phones: ['+267 390 0000'],
      addresses: ['Gaborone, Botswana'],
    },
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  socialLinks: {
    value: {
      facebook: 'https://facebook.com/pameltex',
    },
    sourceType: 'WEBSITE',
    confidence: 1.0,
    lastUpdated: new Date().toISOString(),
  },
  sourceUrls: ['https://www.pameltex.com'],
  contentHash: 'hash-pameltex-v1',
  knowledgeVersion: 1,
  isVerified: true,
  lastCrawledAt: new Date().toISOString(),
});

// Durable storage key prefix for business profiles
const PROFILE_STORAGE_PREFIX = 'ralion_bkp_';

export class BusinessKnowledgeProfileService {
  /**
   * Loads persisted profile from durable storage.
   */
  private static loadDurableProfile(orgId: string): BusinessKnowledgeProfile | null {
    if (!orgId) return null;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(`${PROFILE_STORAGE_PREFIX}${orgId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.organizationId === orgId) {
            tenantProfileMap.set(orgId, parsed);
            return parsed;
          }
        }
      } catch {}
    }
    return null;
  }

  /**
   * Saves profile to durable storage.
   */
  private static saveDurableProfile(orgId: string, profile: BusinessKnowledgeProfile): void {
    if (!orgId || !profile) return;
    tenantProfileMap.set(orgId, profile);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(`${PROFILE_STORAGE_PREFIX}${orgId}`, JSON.stringify(profile));
      } catch {}
    }
  }

  /**
   * Retrieves the structured Business Knowledge Profile for an organization.
   * Returns null if no verified profile exists (no fallback to Ras Ali Labs).
   */
  static getProfile(orgId: string): BusinessKnowledgeProfile | null {
    if (!orgId) return null;
    const cleanId = orgId.trim().toLowerCase();
    if (cleanId === 'ras-ali-labs' || cleanId === '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf' || cleanId === 'rasalilabs' || cleanId === 'org_rasalilabs' || cleanId === 'ras ali labs') {
      return tenantProfileMap.get('ras-ali-labs') || null;
    }
    if (cleanId === 'pameltex' || cleanId === 'c0b39862-cf19-4882-a822-c7f3f493fec0' || cleanId === 'org_pameltex' || cleanId === 'pameltex ') {
      return tenantProfileMap.get('pameltex') || null;
    }
    const inMem = tenantProfileMap.get(orgId) || tenantProfileMap.get(cleanId);
    if (inMem) return inMem;
    return this.loadDurableProfile(orgId);
  }

  /**
   * Lists all structured Business Knowledge Profiles across all tenants.
   */
  static listProfiles(): BusinessKnowledgeProfile[] {
    return Array.from(tenantProfileMap.values());
  }

  /**
   * Ingests and structures a business website for a tenant.
   */
  static async ingestWebsiteForTenant(
    orgId: string,
    rawUrl: string,
    options?: { workspaceId?: string; overrideName?: string; overrideIndustry?: string }
  ): Promise<BusinessKnowledgeProfile> {
    const timestamp = new Date().toISOString();
    const crawled = await WebsiteCrawlerService.crawlAndExtract(rawUrl);

    const existing = tenantProfileMap.get(orgId);
    const version = (existing?.knowledgeVersion || 0) + 1;

    const companyName = options?.overrideName || crawled.title || orgId;
    const industry = options?.overrideIndustry || crawled.industry || 'Unspecified Industry';

    const profile: BusinessKnowledgeProfile = {
      organizationId: orgId,
      workspaceId: options?.workspaceId || existing?.workspaceId,
      companyName: {
        value: companyName,
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.95,
        lastUpdated: timestamp,
      },
      websiteUrl: {
        value: crawled.normalizedUrl,
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 1.0,
        lastUpdated: timestamp,
      },
      industry: {
        value: industry,
        sourceType: options?.overrideIndustry ? 'USER_INPUT' : 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.9,
        lastUpdated: timestamp,
      },
      description: {
        value: crawled.description,
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.95,
        lastUpdated: timestamp,
      },
      tagline: {
        value: crawled.headings[0] || `${companyName}`,
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.85,
        lastUpdated: timestamp,
      },
      valuePropositions: {
        value: crawled.headings.slice(1, 4).length > 0
          ? crawled.headings.slice(1, 4)
          : [`${companyName} verified web solutions and services.`],
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.9,
        lastUpdated: timestamp,
      },
      products: {
        value: crawled.productsAndServices.filter(p => p.category.includes('Product') || p.category.includes('Solution')),
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.9,
        lastUpdated: timestamp,
      },
      services: {
        value: crawled.productsAndServices,
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.9,
        lastUpdated: timestamp,
      },
      targetMarkets: {
        value: crawled.targetMarkets.length > 0 ? crawled.targetMarkets : ['Direct Clients & Regional Markets'],
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.85,
        lastUpdated: timestamp,
      },
      targetCustomers: {
        value: ['Enterprise & Commercial Clients'],
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.8,
        lastUpdated: timestamp,
      },
      geography: {
        value: ['Regional Market'],
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.8,
        lastUpdated: timestamp,
      },
      brandPositioning: {
        value: `${companyName} Verified Web Presence`,
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.9,
        lastUpdated: timestamp,
      },
      brandVoice: {
        value: 'Professional, Informative, Customer-Centric',
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.85,
        lastUpdated: timestamp,
      },
      publicContacts: {
        value: crawled.contacts,
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.95,
        lastUpdated: timestamp,
      },
      socialLinks: {
        value: crawled.socialLinks,
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.95,
        lastUpdated: timestamp,
      },
      sourceUrls: [crawled.normalizedUrl],
      contentHash: `hash-${orgId}-${version}`,
      knowledgeVersion: version,
      isVerified: true,
      lastCrawledAt: timestamp,
    };

    this.saveDurableProfile(orgId, profile);
    return profile;
  }

  /**
   * Enriches an existing tenant profile with Facebook Page intelligence without overwriting canonical business identity.
   * Invariant: Facebook is an attached context source, NOT a business identity authority.
   */
  static enrichWithFacebook(
    orgId: string,
    facebookData: {
      pageId: string;
      pageName: string;
      category?: string;
      about?: string;
      website?: string;
      followersCount?: number;
      phone?: string;
      singleLineAddress?: string;
    }
  ): BusinessKnowledgeProfile {
    const timestamp = new Date().toISOString();
    let profile = this.getProfile(orgId);

    if (!profile) {
      // Create minimal base profile without fabricating false company identity
      profile = {
        organizationId: orgId,
        companyName: {
          value: orgId.startsWith('org-') ? orgId.replace(/^org-/, '').replace(/[-_]/g, ' ') : orgId,
          sourceType: 'OTHER',
          confidence: 0.5,
          lastUpdated: timestamp,
        },
        websiteUrl: {
          value: facebookData.website || 'Not configured',
          sourceType: facebookData.website ? 'FACEBOOK' : 'OTHER',
          confidence: 0.8,
          lastUpdated: timestamp,
        },
        industry: {
          value: facebookData.category || 'Unspecified Industry',
          sourceType: 'FACEBOOK',
          confidence: 0.7,
          lastUpdated: timestamp,
        },
        description: {
          value: facebookData.about || `Connected Facebook Page: ${facebookData.pageName}`,
          sourceType: 'FACEBOOK',
          confidence: 0.8,
          lastUpdated: timestamp,
        },
        tagline: {
          value: facebookData.about || '',
          sourceType: 'FACEBOOK',
          confidence: 0.7,
          lastUpdated: timestamp,
        },
        valuePropositions: {
          value: [],
          sourceType: 'FACEBOOK',
          confidence: 0.5,
          lastUpdated: timestamp,
        },
        products: { value: [], sourceType: 'FACEBOOK', confidence: 0.5, lastUpdated: timestamp },
        services: { value: [], sourceType: 'FACEBOOK', confidence: 0.5, lastUpdated: timestamp },
        targetMarkets: { value: [], sourceType: 'FACEBOOK', confidence: 0.5, lastUpdated: timestamp },
        targetCustomers: { value: [], sourceType: 'FACEBOOK', confidence: 0.5, lastUpdated: timestamp },
        geography: { value: facebookData.singleLineAddress ? [facebookData.singleLineAddress] : [], sourceType: 'FACEBOOK', confidence: 0.8, lastUpdated: timestamp },
        brandPositioning: { value: `${facebookData.pageName} Social Brand Presence`, sourceType: 'FACEBOOK', confidence: 0.8, lastUpdated: timestamp },
        brandVoice: { value: 'Professional, Engaging', sourceType: 'FACEBOOK', confidence: 0.8, lastUpdated: timestamp },
        publicContacts: {
          value: {
            emails: [],
            phones: facebookData.phone ? [facebookData.phone] : [],
            addresses: facebookData.singleLineAddress ? [facebookData.singleLineAddress] : [],
          },
          sourceType: 'FACEBOOK',
          confidence: 0.8,
          lastUpdated: timestamp,
        },
        socialLinks: {
          value: { facebook: `https://facebook.com/${facebookData.pageId}` },
          sourceType: 'FACEBOOK',
          confidence: 1.0,
          lastUpdated: timestamp,
        },
        sourceUrls: [`https://facebook.com/${facebookData.pageId}`],
        contentHash: `hash-fb-${Date.now().toString(36)}`,
        knowledgeVersion: 1,
        isVerified: false,
      };
    } else {
      // Enrich existing profile ONLY with social links, contact details, and attached info
      // NEVER overwrite companyName, industry, products, or value propositions with Facebook data!
      profile.socialLinks = {
        value: {
          ...profile.socialLinks.value,
          facebook: `https://facebook.com/${facebookData.pageId}`,
        },
        sourceType: 'FACEBOOK',
        confidence: 1.0,
        lastUpdated: timestamp,
      };

      if (facebookData.about && (!profile.description.value || profile.description.sourceType !== 'WEBSITE')) {
        profile.description = {
          value: facebookData.about,
          sourceType: 'FACEBOOK',
          confidence: 0.9,
          lastUpdated: timestamp,
        };
      }

      profile.lastEnrichedAt = timestamp;
      profile.knowledgeVersion += 1;
    }

    this.saveDurableProfile(orgId, profile);
    return profile;
  }

  /**
   * Manually sets or updates a business knowledge profile.
   */
  static setProfile(orgId: string, profile: BusinessKnowledgeProfile) {
    this.saveDurableProfile(orgId, profile);
  }

  /**
   * Resets tenant profile store for clean testing.
   */
  static _resetForTesting(): void {
    tenantProfileMap.clear();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(PROFILE_STORAGE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => window.localStorage.removeItem(k));
      } catch {}
    }
  }

  /**
   * Returns list of all company names across active tenant profiles and known entities.
   */
  static listAllCompanyNames(): string[] {
    const names = new Set<string>([
      'Ras Ali Labs',
      'Beta Healthcare',
      'Alpha Logistics',
      'Apex Health Logistics',
      'Skyline Media Group',
      'Foundations Academy',
    ]);
    for (const profile of tenantProfileMap.values()) {
      if (profile.companyName?.value) {
        names.add(profile.companyName.value);
      }
    }
    return Array.from(names);
  }
}
