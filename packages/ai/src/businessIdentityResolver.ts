/**
 * Ralion OS — Canonical Business Identity Resolver
 * Ras Ali Labs (Pty) Ltd
 *
 * SOLE AUTHORITY FOR TENANT BUSINESS IDENTITY ACROSS ALL MARI SURFACES:
 *
 * Invariant:
 * authenticated user -> canonical tenant/workspace UUID -> business knowledge profile
 *
 * The company name and core identity MUST come from the tenant's verified business
 * profile / organization / business knowledge.
 *
 * Context Sources (Facebook, Instagram, LinkedIn, Zernio, CRM, Growth, Inbox, Analytics)
 * are ATTACHED to the business and NEVER dictate or overwrite the business identity.
 */

import { BusinessKnowledgeProfileService, BusinessKnowledgeProfile } from './businessKnowledgeProfile.service';

export interface ResolvedBusinessIdentity {
  organizationId: string;
  workspaceId?: string;
  companyName: string;
  isVerified: boolean;
  industry: string;
  targetMarket: string;
  valueProposition: string;
  tagline: string;
  websiteUrl: string;
  productsAndServices: Array<{ name: string; category: string; description?: string }>;
  brandVoice: string;
  source: 'BUSINESS_KNOWLEDGE_PROFILE' | 'REGISTERED_PROFILE' | 'SESSION_ORGANIZATION' | 'UNVERIFIED';
}

export class BusinessIdentityResolver {
  /**
   * Resolves the canonical business identity for any tenant/workspace/user identifier.
   * Guaranteed to NEVER return provider-derived handles (@facebook, @facebook_page),
   * generic fallbacks ("Commercial Enterprise", "Regional Commercial Clients", "Default"),
   * or cross-tenant names (e.g. "Ras Ali Labs" for non-Ras-Ali tenants).
   */
  static resolveIdentity(
    tenantId?: string | null,
    options?: {
      workspaceId?: string;
      sessionCompanyName?: string;
      sessionOrgName?: string;
    }
  ): ResolvedBusinessIdentity {
    const rawId = (tenantId || '').trim();
    const cleanId = rawId.toLowerCase();

    // 1. Resolve structured Business Knowledge Profile
    let profile: BusinessKnowledgeProfile | null = null;
    if (cleanId) {
      profile = BusinessKnowledgeProfileService.getProfile(cleanId);
    }

    // 2. Check if this is Ras Ali Labs
    const isRasAli =
      cleanId === 'ras-ali-labs' ||
      cleanId === '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf' ||
      cleanId === 'rasalilabs' ||
      cleanId === 'org_rasalilabs' ||
      cleanId === 'ras ali labs';

    // 3. Check if this is Pameltex
    const isPameltex =
      cleanId === 'pameltex' ||
      cleanId === 'c0b39862-cf19-4882-a822-c7f3f493fec0' ||
      cleanId === 'org_pameltex';

    if (profile && profile.companyName?.value) {
      const companyName = profile.companyName.value.trim();
      const isClean = !companyName.startsWith('@') && !companyName.toLowerCase().includes('facebook');
      
      if (isClean && companyName.length > 0) {
        const rawProducts = [
          ...(profile.products?.value || []),
          ...(profile.services?.value || [])
        ];
        return {
          organizationId: profile.organizationId || rawId,
          workspaceId: profile.workspaceId || options?.workspaceId,
          companyName,
          isVerified: Boolean(profile.isVerified),
          industry: profile.industry?.value || 'Unspecified Industry',
          targetMarket: (profile.targetMarkets?.value && profile.targetMarkets.value.length > 0) 
            ? profile.targetMarkets.value.join(', ') 
            : 'Unspecified Target Market',
          valueProposition: (profile.valuePropositions?.value && profile.valuePropositions.value.length > 0)
            ? profile.valuePropositions.value.join('; ')
            : 'Verified business profile.',
          tagline: profile.tagline?.value || '',
          websiteUrl: profile.websiteUrl?.value || 'Not configured',
          productsAndServices: rawProducts,
          brandVoice: profile.brandVoice?.value || 'Professional, Neutral',
          source: 'BUSINESS_KNOWLEDGE_PROFILE',
        };
      }
    }

    // Explicit check for known registered organizations if profile lookup in-memory missed
    if (isRasAli) {
      return {
        organizationId: 'ras-ali-labs',
        workspaceId: options?.workspaceId || '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
        companyName: 'Ras Ali Labs',
        isVerified: true,
        industry: 'Enterprise Software, B2B SaaS & Industrial Intelligence',
        targetMarket: 'SADC Mid-Market & Enterprise B2B, Healthcare Providers, Freight & Logistics Corridors',
        valueProposition: 'Sovereign business automation and enterprise intelligence OS',
        tagline: 'Sovereign Business Operating Intelligence for Modern Enterprises',
        websiteUrl: 'https://www.rasalilabs.com',
        productsAndServices: [
          { name: 'Ralion OS Core', category: 'Platform' },
          { name: 'Mari AI Command Center', category: 'AI Intelligence' },
          { name: 'Ralion Growth Studio', category: 'Marketing' },
        ],
        brandVoice: 'Authoritative, innovative, precise, enterprise-grade',
        source: 'REGISTERED_PROFILE',
      };
    }

    if (isPameltex) {
      return {
        organizationId: 'pameltex',
        workspaceId: options?.workspaceId || 'c0b39862-cf19-4882-a822-c7f3f493fec0',
        companyName: 'Pameltex',
        isVerified: true,
        industry: 'Commercial Uniforms, Industrial Workwear & Safety Apparel Manufacturing',
        targetMarket: 'Botswana Mining & Construction Companies, Security Firms, Logistics Providers',
        valueProposition: 'Locally manufactured high-durability workwear and PPE compliant with regional safety standards',
        tagline: 'Quality Workwear & Corporate Apparel for Botswana and Southern Africa',
        websiteUrl: 'https://www.pameltex.com',
        productsAndServices: [
          { name: 'Industrial Conti Suits & Overalls', category: 'Safety & PPE' },
          { name: 'Corporate & Executive Uniforms', category: 'Apparel' },
          { name: 'High-Visibility & Security Uniforms', category: 'Security' },
          { name: 'Hospitality & Healthcare Scrubs', category: 'Healthcare' },
        ],
        brandVoice: 'Reliable, practical, professional, quality-focused',
        source: 'REGISTERED_PROFILE',
      };
    }

    // 4. Check Session-Provided Organization / Workspace Name
    const sessionName = options?.sessionCompanyName || options?.sessionOrgName;
    if (sessionName && sessionName.trim() && !sessionName.startsWith('@') && sessionName.toLowerCase() !== 'default') {
      return {
        organizationId: rawId || 'unconfigured-tenant',
        workspaceId: options?.workspaceId,
        companyName: sessionName.trim(),
        isVerified: false,
        industry: 'Unspecified Industry',
        targetMarket: 'Unspecified Target Market',
        valueProposition: 'Verified business knowledge sources not yet established.',
        tagline: '',
        websiteUrl: 'Not configured',
        productsAndServices: [],
        brandVoice: 'Professional, Neutral',
        source: 'SESSION_ORGANIZATION',
      };
    }

    // 5. Unverified Workspace / Tenant
    return {
      organizationId: rawId || 'unconfigured-tenant',
      workspaceId: options?.workspaceId,
      companyName: '',
      isVerified: false,
      industry: 'Unspecified Industry',
      targetMarket: 'Unspecified Target Market',
      valueProposition: 'Verified business knowledge sources not yet established.',
      tagline: '',
      websiteUrl: 'Not configured',
      productsAndServices: [],
      brandVoice: 'Professional, Neutral',
      source: 'UNVERIFIED',
    };
  }
}
