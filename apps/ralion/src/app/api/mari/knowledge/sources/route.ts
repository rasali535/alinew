import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../../lib/cors';
import { BusinessContextService, WebsiteIngestionService } from '@ralion/ai';
import { getCurrentRalionContext } from '../../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/mari/knowledge/sources
 * Returns all active Layer 1-3 Business Knowledge Sources with verification status,
 * sync timestamps, staleness flags, and provenance.
 * Strictly scoped to authenticated server context. Never trusts query/header IDs.
 */
export async function GET(request: NextRequest) {
  try {
    const serverCtx = await getCurrentRalionContext(request, { requireAuth: true });
    if (!serverCtx) {
      return corsJsonResponse(
        { success: false, code: 'AUTHENTICATION_REQUIRED', error: 'Authentication required to view knowledge sources.' },
        { status: 401 },
        request
      );
    }

    const canonicalOrgId = serverCtx.organization?.id || serverCtx.workspace.organization_id || serverCtx.workspace.id;
    const canonicalWorkspaceId = serverCtx.workspace.id;
    const authenticatedUserId = serverCtx.user.id;

    const { searchParams } = new URL(request.url);
    const queryOrgId = searchParams.get('orgId');
    const headerOrgId = request.headers.get('x-organization-id');
    const queryWsId = searchParams.get('workspaceId');
    const headerWsId = request.headers.get('x-workspace-id');
    const queryUserId = searchParams.get('userId');
    const headerUserId = request.headers.get('x-user-id');

    const suppliedOrgIds = [queryOrgId, headerOrgId].filter(Boolean) as string[];
    const suppliedWsIds = [queryWsId, headerWsId].filter(Boolean) as string[];
    const suppliedUserIds = [queryUserId, headerUserId].filter(Boolean) as string[];

    for (const reqOrg of suppliedOrgIds) {
      if (reqOrg !== canonicalOrgId && reqOrg !== canonicalWorkspaceId) {
        return corsJsonResponse(
          { success: false, code: 'TENANT_CONTEXT_MISMATCH', error: 'Forbidden: Cannot access another tenant context' },
          { status: 403 },
          request
        );
      }
    }

    for (const reqWs of suppliedWsIds) {
      if (reqWs !== canonicalWorkspaceId && reqWs !== canonicalOrgId) {
        return corsJsonResponse(
          { success: false, code: 'TENANT_CONTEXT_MISMATCH', error: 'Forbidden: Cannot access another workspace context' },
          { status: 403 },
          request
        );
      }
    }

    for (const reqUser of suppliedUserIds) {
      if (reqUser !== authenticatedUserId) {
        return corsJsonResponse(
          { success: false, code: 'TENANT_CONTEXT_MISMATCH', error: 'Forbidden: Cannot access another user context' },
          { status: 403 },
          request
        );
      }
    }

    const orgId = canonicalOrgId;
    const workspaceId = canonicalWorkspaceId;
    const userId = authenticatedUserId;

    const context = await BusinessContextService.assembleContext(orgId, {
      organizationId: orgId,
      workspaceId,
      userId,
    });
    const websiteKnowledge = WebsiteIngestionService.getWebsiteKnowledge(workspaceId) || WebsiteIngestionService.getWebsiteKnowledge(orgId);

    const sources = [
      {
        id: 'website',
        name: 'Website Knowledge',
        category: 'LAYER_1',
        url: websiteKnowledge?.websiteUrl || context.layer1.websiteUrl?.value || 'Not configured',
        provenance: websiteKnowledge?.provenance || 'UNVERIFIED',
        status: websiteKnowledge ? (websiteKnowledge.isStale ? 'STALE' : 'VERIFIED') : 'NOT_SYNCED',
        lastSyncedAt: websiteKnowledge?.lastSuccessfulSync || 'Never',
        sectionsCount: websiteKnowledge?.sections.length || 0,
        isStale: websiteKnowledge?.isStale || false,
        syncActionAvailable: true,
      },
      {
        id: 'profile',
        name: 'Company Profile & Registration',
        category: 'LAYER_1',
        provenance: context.layer1.companyName.provenance,
        status: 'VERIFIED',
        lastSyncedAt: context.layer1.companyName.lastVerifiedAt,
        details: `${context.layer1.companyName.value} (${context.layer1.industry.value})`,
      },
      {
        id: 'products',
        name: 'Products & Services Catalog',
        category: 'LAYER_1',
        provenance: context.layer1.productsAndServices.provenance,
        status: 'VERIFIED',
        lastSyncedAt: context.layer1.productsAndServices.lastVerifiedAt,
        count: context.layer1.productsAndServices.value.length,
      },
      {
        id: 'brand',
        name: 'Brand Voice & Guidelines',
        category: 'LAYER_1',
        provenance: context.layer1.brandVoice.provenance,
        status: 'USER_PROVIDED',
        lastSyncedAt: context.layer1.brandVoice.lastVerifiedAt,
        voice: context.layer1.brandVoice.value,
      },
      {
        id: 'crm',
        name: 'CRM Pipeline Ledger',
        category: 'LAYER_2',
        provenance: context.layer2.crm.totalPipelineValue.provenance,
        status: context.layer2.crm.isConnected ? 'LIVE_CONNECTED' : 'PENDING_DATA',
        lastSyncedAt: context.layer2.crm.totalPipelineValue.lastVerifiedAt,
        activeValue: context.layer2.crm.totalPipelineValue.value,
        activeClients: context.layer2.crm.activeCustomersCount.value,
      },
      {
        id: 'social',
        name: 'Meta Graph API (Facebook Page)',
        category: 'LAYER_2',
        provenance: context.layer2.social.connectedPageName?.provenance || 'VERIFIED',
        status: context.layer2.social.isConnected ? 'LIVE_CONNECTED' : 'DISCONNECTED',
        lastSyncedAt: context.layer2.social.connectedPageName?.lastVerifiedAt || 'Never',
        followers: context.layer2.social.followersCount?.value || 0,
      },
      {
        id: 'memory',
        name: 'Mari Growth Memory',
        category: 'LAYER_3',
        provenance: 'VERIFIED',
        status: 'ACTIVE',
        lastSyncedAt: context.assembledAt,
        acceptedCount: context.layer3.acceptedRecommendations.length,
      },
    ];

    return corsJsonResponse({
      success: true,
      organizationId: orgId,
      sources,
      summary: {
        totalSources: sources.length,
        verifiedSources: sources.filter(s => s.status.includes('VERIFIED') || s.status.includes('LIVE')).length,
        staleSources: sources.filter(s => s.isStale).length,
      },
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({
      success: false,
      error: err.message || 'Failed to fetch knowledge sources',
    }, { status: 500 }, request);
  }
}
