import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../../lib/cors';
import { WebsiteIngestionService, BusinessContextService, BusinessKnowledgeProfileService } from '@ralion/ai';
import { getCurrentRalionContext } from '../../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/mari/knowledge/website-sync
 * Retrieves the current tenant's website ingestion status and knowledge profile.
 */
export async function GET(request: NextRequest) {
  try {
    const serverCtx = await getCurrentRalionContext(request, { requireAuth: true });
    const { searchParams } = new URL(request.url);
    const requestedOrgId = searchParams.get('organizationId') || request.headers.get('x-organization-id');

    if (!serverCtx) {
      return corsJsonResponse(
        { success: false, code: 'AUTHENTICATION_REQUIRED', error: 'Authentication required' },
        { status: 401 },
        request
      );
    }

    let canonicalOrgId = serverCtx.organization?.id || serverCtx.workspace.organization_id || serverCtx.workspace.id;
    {
      if (requestedOrgId && requestedOrgId !== canonicalOrgId && requestedOrgId !== serverCtx.workspace.id) {
        return corsJsonResponse(
          { success: false, code: 'TENANT_CONTEXT_MISMATCH', error: 'Forbidden: Cannot access another tenant context' },
          { status: 403 },
          request
        );
      }
    }

    const orgId = canonicalOrgId;
    const knowledge = WebsiteIngestionService.getWebsiteKnowledge(orgId);
    const status = WebsiteIngestionService.getIngestionStatus(orgId);
    const profile = BusinessKnowledgeProfileService.getProfile(orgId);

    return corsJsonResponse({
      success: true,
      status,
      organizationId: orgId,
      websiteUrl: knowledge?.websiteUrl || '',
      normalizedUrl: knowledge?.normalizedUrl || '',
      ingestedAt: knowledge?.ingestedAt || null,
      websiteKnowledge: knowledge,
      profile: profile ? {
        businessName: profile.companyName?.value || knowledge?.title,
        industry: profile.industry?.value || 'Commercial Enterprise',
        description: profile.description?.value || knowledge?.description,
        productsServices: knowledge?.productsServices || [],
        contactInfo: knowledge?.contactInformation,
        socialLinks: knowledge?.socialLinks,
      } : null,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({
      success: false,
      error: err.message || 'Failed to retrieve website knowledge',
    }, { status: 500 }, request);
  }
}

/**
 * POST /api/mari/knowledge/website-sync
 * Triggers authoritative ingestion / sync of an organization's public website.
 */
export async function POST(request: NextRequest) {
  try {
    const serverCtx = await getCurrentRalionContext(request, { requireAuth: true });
    const body = await request.json().catch(() => ({}));
    const requestedOrgId = body.organizationId || request.headers.get('x-organization-id');

    if (!serverCtx) {
      return corsJsonResponse(
        { success: false, code: 'AUTHENTICATION_REQUIRED', error: 'Authentication required' },
        { status: 401 },
        request
      );
    }

    let canonicalOrgId = serverCtx.organization?.id || serverCtx.workspace.organization_id || serverCtx.workspace.id;
    {
      if (requestedOrgId && requestedOrgId !== canonicalOrgId && requestedOrgId !== serverCtx.workspace.id) {
        return corsJsonResponse(
          { success: false, code: 'TENANT_CONTEXT_MISMATCH', error: 'Forbidden: Cannot access another tenant context' },
          { status: 403 },
          request
        );
      }
    }

    const orgId = canonicalOrgId;
    const websiteUrl = body.websiteUrl || 'https://example.com';

    const result = await WebsiteIngestionService.ingestWebsite(orgId, websiteUrl, {
      customSections: body.customSections,
      overrideName: body.overrideName,
      overrideIndustry: body.overrideIndustry,
    });

    // Invalidate cached business context so the next query uses updated knowledge
    BusinessContextService.invalidateContext(orgId);

    const profile = BusinessKnowledgeProfileService.getProfile(orgId);

    return corsJsonResponse({
      success: true,
      status: result.status,
      organizationId: orgId,
      websiteUrl: result.websiteUrl,
      normalizedUrl: result.normalizedUrl,
      ingestedAt: result.ingestedAt,
      message: `Website knowledge for ${result.websiteUrl} successfully ingested and verified into Layer 1 Business Knowledge.`,
      profile: {
        businessName: profile?.companyName?.value || result.title,
        industry: profile?.industry?.value || 'Commercial Enterprise',
        description: profile?.description?.value || result.description,
        productsServices: result.productsServices,
        contactInfo: result.contactInformation,
        socialLinks: result.socialLinks,
      },
      websiteKnowledge: result,
    }, undefined, request);
  } catch (err: any) {
    const isSsrf = err.message && err.message.includes('SSRF Security Rejection');
    return corsJsonResponse({
      success: false,
      status: isSsrf ? 'BLOCKED' : 'FAILED',
      error: err.message || 'Failed to sync website knowledge',
    }, { status: isSsrf ? 403 : 500 }, request);
  }
}
