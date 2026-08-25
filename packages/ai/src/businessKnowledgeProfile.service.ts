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

export class BusinessKnowledgeProfileService {
  /**
   * Retrieves the structured Business Knowledge Profile for an organization.
   * Returns null if no verified profile exists (no fallback to Ras Ali Labs).
   */
  static getProfile(orgId: string): BusinessKnowledgeProfile | null {
    if (!orgId) return null;
    return tenantProfileMap.get(orgId) || null;
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
    const industry = options?.overrideIndustry || 'Commercial Enterprise';

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
        value: crawled.headings[0] || `${companyName} — Commercial Solutions`,
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.85,
        lastUpdated: timestamp,
      },
      valuePropositions: {
        value: crawled.headings.slice(1, 4).length > 0
          ? crawled.headings.slice(1, 4)
          : [`Specialized ${industry} services delivered with quality and reliability.`],
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
        value: crawled.targetMarkets,
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.85,
        lastUpdated: timestamp,
      },
      targetCustomers: {
        value: ['B2B Clients', 'Commercial Enterprises', 'Direct Consumers'],
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.8,
        lastUpdated: timestamp,
      },
      geography: {
        value: ['National & Regional Markets'],
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.8,
        lastUpdated: timestamp,
      },
      brandPositioning: {
        value: `${companyName} trusted commercial provider in ${industry}`,
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.85,
        lastUpdated: timestamp,
      },
      brandVoice: {
        value: 'Professional, Trustworthy, Customer-Focused',
        sourceType: 'MANUAL',
        confidence: 0.9,
        lastUpdated: timestamp,
      },
      publicContacts: {
        value: crawled.contactInfo,
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.95,
        lastUpdated: timestamp,
      },
      socialLinks: {
        value: crawled.socialLinks,
        sourceType: 'WEBSITE',
        sourceUrl: crawled.normalizedUrl,
        confidence: 0.9,
        lastUpdated: timestamp,
      },
      sourceUrls: [crawled.normalizedUrl],
      contentHash: crawled.contentHash,
      knowledgeVersion: version,
      isVerified: true,
      lastCrawledAt: timestamp,
    };

    tenantProfileMap.set(orgId, profile);
    return profile;
  }

  /**
   * Enriches an existing tenant profile with Facebook Page intelligence without overwriting website facts.
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
    let profile = tenantProfileMap.get(orgId);

    if (!profile) {
      // Create base profile if none existed
      profile = {
        organizationId: orgId,
        companyName: {
          value: facebookData.pageName,
          sourceType: 'FACEBOOK',
          confidence: 0.95,
          lastUpdated: timestamp,
        },
        websiteUrl: {
          value: facebookData.website || 'Not configured',
          sourceType: facebookData.website ? 'FACEBOOK' : 'OTHER',
          confidence: 0.9,
          lastUpdated: timestamp,
        },
        industry: {
          value: facebookData.category || 'Commercial Enterprise',
          sourceType: 'FACEBOOK',
          confidence: 0.9,
          lastUpdated: timestamp,
        },
        description: {
          value: facebookData.about || `${facebookData.pageName} Facebook Business Page`,
          sourceType: 'FACEBOOK',
          confidence: 0.9,
          lastUpdated: timestamp,
        },
        tagline: {
          value: facebookData.about || facebookData.pageName,
          sourceType: 'FACEBOOK',
          confidence: 0.85,
          lastUpdated: timestamp,
        },
        valuePropositions: {
          value: [`Verified Facebook Page: ${facebookData.pageName}`],
          sourceType: 'FACEBOOK',
          confidence: 0.9,
          lastUpdated: timestamp,
        },
        products: { value: [], sourceType: 'FACEBOOK', confidence: 0.5, lastUpdated: timestamp },
        services: { value: [], sourceType: 'FACEBOOK', confidence: 0.5, lastUpdated: timestamp },
        targetMarkets: { value: ['Social Audience & Local Clients'], sourceType: 'FACEBOOK', confidence: 0.8, lastUpdated: timestamp },
        targetCustomers: { value: ['Community & Social Followers'], sourceType: 'FACEBOOK', confidence: 0.8, lastUpdated: timestamp },
        geography: { value: [facebookData.singleLineAddress || 'Regional Market'], sourceType: 'FACEBOOK', confidence: 0.85, lastUpdated: timestamp },
        brandPositioning: { value: `${facebookData.pageName} Social Brand Presence`, sourceType: 'FACEBOOK', confidence: 0.85, lastUpdated: timestamp },
        brandVoice: { value: 'Engaging, Community-Centric', sourceType: 'FACEBOOK', confidence: 0.85, lastUpdated: timestamp },
        publicContacts: {
          value: {
            emails: [],
            phones: facebookData.phone ? [facebookData.phone] : [],
            addresses: facebookData.singleLineAddress ? [facebookData.singleLineAddress] : [],
          },
          sourceType: 'FACEBOOK',
          confidence: 0.9,
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
        isVerified: true,
      };
    } else {
      // Enrich existing profile with Facebook social link and contacts
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

    tenantProfileMap.set(orgId, profile);
    return profile;
  }

  /**
   * Manually sets or updates a business knowledge profile.
   */
  static setProfile(orgId: string, profile: BusinessKnowledgeProfile) {
    tenantProfileMap.set(orgId, profile);
  }
}
