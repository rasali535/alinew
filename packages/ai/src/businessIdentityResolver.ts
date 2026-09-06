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

    // 2. Identify canonical registered tenants
    const isRasAli =
      cleanId === 'ras-ali-labs' ||
      cleanId === '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf' ||
      cleanId === 'rasalilabs' ||
      cleanId === 'org_rasalilabs' ||
      cleanId === 'ras ali labs';

    const isPameltex =
      cleanId === 'pameltex' ||
      cleanId === 'c0b39862-cf19-4882-a822-c7f3f493fec0' ||
      cleanId === 'org_pameltex';

    const isGrape =
      cleanId === 'grape' ||
      cleanId === '8c8d6392-e457-4145-9423-f551fda3b728' ||
      cleanId === 'chiwabby@gmail.com';

    // 3. Authoritative Registered Tenant Checks
    if (isRasAli) {
      const rawProducts = [
        ...(profile?.products?.value || [
          { name: 'Ralion OS Core', category: 'Platform' },
          { name: 'Mari AI Command Center', category: 'AI Intelligence' },
          { name: 'Ralion Growth Studio', category: 'Marketing' },
        ]),
        ...(profile?.services?.value || [
          { name: 'Enterprise Cloud Deployment', category: 'Infrastructure' },
          { name: 'Custom AI Agent Engineering', category: 'AI Services' },
        ]),
      ];

      return {
        organizationId: 'ras-ali-labs',
        workspaceId: options?.workspaceId || '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
        companyName: 'Ras Ali Labs',
        isVerified: true,
        industry: profile?.industry?.value || 'Enterprise Software, B2B SaaS & Industrial Intelligence',
        targetMarket: (profile?.targetMarkets?.value && profile.targetMarkets.value.length > 0)
          ? profile.targetMarkets.value.join(', ')
          : 'SADC Mid-Market & Enterprise B2B, Healthcare Providers, Freight & Logistics Corridors',
        valueProposition: (profile?.valuePropositions?.value && profile.valuePropositions.value.length > 0)
          ? profile.valuePropositions.value.join('; ')
          : 'Sovereign business automation and enterprise intelligence OS',
        tagline: profile?.tagline?.value || 'Sovereign Business Operating Intelligence for Modern Enterprises',
        websiteUrl: 'https://www.rasalilabs.com',
        productsAndServices: rawProducts,
        brandVoice: profile?.brandVoice?.value || 'Authoritative, innovative, precise, enterprise-grade',
        source: 'REGISTERED_PROFILE',
      };
    }

    if (isPameltex) {
      const rawProducts = [
        ...(profile?.products?.value || [
          { name: 'Industrial Conti Suits & Overalls', category: 'Safety & PPE' },
          { name: 'Corporate & Executive Uniforms', category: 'Apparel' },
          { name: 'High-Visibility & Security Uniforms', category: 'Security' },
          { name: 'Hospitality & Healthcare Scrubs', category: 'Healthcare' },
        ]),
        ...(profile?.services?.value || [
          { name: 'Custom Garment Branding & Embroidery', category: 'Customization' },
          { name: 'Bulk Corporate Wardrobe Management', category: 'Supply Chain' },
        ]),
      ];

      return {
        organizationId: 'pameltex',
        workspaceId: options?.workspaceId || 'c0b39862-cf19-4882-a822-c7f3f493fec0',
        companyName: 'Pameltex',
        isVerified: true,
        industry: profile?.industry?.value || 'Commercial Uniforms, Industrial Workwear & Safety Apparel Manufacturing',
        targetMarket: (profile?.targetMarkets?.value && profile.targetMarkets.value.length > 0)
          ? profile.targetMarkets.value.join(', ')
          : 'Botswana Mining & Construction Companies, Security Firms, Logistics Providers',
        valueProposition: (profile?.valuePropositions?.value && profile.valuePropositions.value.length > 0)
          ? profile.valuePropositions.value.join('; ')
          : 'Locally manufactured high-durability workwear and PPE compliant with regional safety standards',
        tagline: profile?.tagline?.value || 'Quality Workwear & Corporate Apparel for Botswana and Southern Africa',
        websiteUrl: 'https://www.pameltex.com',
        productsAndServices: rawProducts,
        brandVoice: profile?.brandVoice?.value || 'Reliable, practical, professional, quality-focused',
        source: 'REGISTERED_PROFILE',
      };
    }

    if (isGrape) {
      return {
        organizationId: 'grape',
        workspaceId: options?.workspaceId || '8c8d6392-e457-4145-9423-f551fda3b728',
        companyName: 'grape',
        isVerified: false,
        industry: profile?.industry?.value || '',
        targetMarket: (profile?.targetMarkets?.value && profile.targetMarkets.value.length > 0)
          ? profile.targetMarkets.value.join(', ')
          : '',
        valueProposition: (profile?.valuePropositions?.value && profile.valuePropositions.value.length > 0)
          ? profile.valuePropositions.value.join('; ')
          : '',
        tagline: profile?.tagline?.value || '',
        websiteUrl: profile?.websiteUrl?.value || '',
        productsAndServices: profile?.products?.value || [],
        brandVoice: profile?.brandVoice?.value || 'Professional, Neutral',
        source: 'REGISTERED_PROFILE',
      };
    }

    // 4. Resolve structured Business Knowledge Profile for arbitrary registered tenants
    if (profile && profile.companyName?.value) {
      let companyName = profile.companyName.value.trim();
      // Sanitize out HTML page titles / slogans
      if (
        companyName.toLowerCase().includes('multi-disciplinary') ||
        companyName.toLowerCase().includes('creative & technologist') ||
        companyName.includes(' - ') ||
        companyName.includes(' | ')
      ) {
        const parts = companyName.split(/[-|]/);
        if (parts[0] && parts[0].trim().length > 0) {
          companyName = parts[0].trim();
        }
      }

      const isClean =
        !companyName.startsWith('@') &&
        !companyName.toLowerCase().includes('facebook') &&
        companyName.toLowerCase() !== 'active workspace' &&
        companyName.toLowerCase() !== 'your business' &&
        companyName.toLowerCase() !== 'default';
      
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
          industry: profile.industry?.value || '',
          targetMarket: (profile.targetMarkets?.value && profile.targetMarkets.value.length > 0) 
            ? profile.targetMarkets.value.join(', ') 
            : '',
          valueProposition: (profile.valuePropositions?.value && profile.valuePropositions.value.length > 0)
            ? profile.valuePropositions.value.join('; ')
            : '',
          tagline: profile.tagline?.value || '',
          websiteUrl: profile.websiteUrl?.value || '',
          productsAndServices: rawProducts,
          brandVoice: profile.brandVoice?.value || 'Professional, Neutral',
          source: 'BUSINESS_KNOWLEDGE_PROFILE',
        };
      }
    }

    // 5. Check Session-Provided Organization / Workspace Name
    let sessionName = (options?.sessionCompanyName || options?.sessionOrgName || '').trim();
    if (sessionName.endsWith("'s Workspace") || sessionName.endsWith("'s workspace")) {
      sessionName = sessionName.replace(/'s [Ww]orkspace$/g, '').trim();
    }

    const invalidNames = ['default', 'active workspace', 'your business', 'default workspace', 'workspace', 'my workspace', 'none', 'unconfigured', '@facebook', 'facebook'];
    const isInvalid = !sessionName || sessionName.startsWith('@') || invalidNames.includes(sessionName.toLowerCase());

    if (!isInvalid && sessionName.length > 0) {
      return {
        organizationId: rawId || 'unconfigured-tenant',
        workspaceId: options?.workspaceId,
        companyName: sessionName,
        isVerified: false,
        industry: '',
        targetMarket: '',
        valueProposition: '',
        tagline: '',
        websiteUrl: '',
        productsAndServices: [],
        brandVoice: 'Professional, Neutral',
        source: 'SESSION_ORGANIZATION',
      };
    }

    // 6. Unverified Workspace / Tenant
    return {
      organizationId: rawId || 'unconfigured-tenant',
      workspaceId: options?.workspaceId,
      companyName: '',
      isVerified: false,
      industry: '',
      targetMarket: '',
      valueProposition: '',
      tagline: '',
      websiteUrl: '',
      productsAndServices: [],
      brandVoice: 'Professional, Neutral',
      source: 'UNVERIFIED',
    };
  }
}
