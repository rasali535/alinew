import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import {
  MariUniversalCore,
  ChatHistoryTurn,
  BusinessKnowledgeProfileService,
} from '@ralion/ai';
import { getCurrentRalionContext } from '../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/mari/chat
 * Universal Mari Intelligence endpoint across all of Ralion OS.
 * Enforces strict JWT tenant resolution and zero cross-tenant data leakage.
 */
export async function POST(request: NextRequest) {
  try {
    const serverCtx = await getCurrentRalionContext(request, { requireAuth: false });
    const body = await request.json().catch(() => ({}));
    const query = body.query || body.message || body.prompt;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return corsJsonResponse({ success: false, error: 'Query prompt is required' }, { status: 400 }, request);
    }

    const headerOrgId = request.headers.get('x-organization-id');
    const bodyOrgId = body.organizationId;
    const headerWorkspaceId = request.headers.get('x-workspace-id');
    const bodyWorkspaceId = body.workspaceId;

    const suppliedOrgIds = [headerOrgId, bodyOrgId].filter(Boolean) as string[];
    const suppliedWorkspaceIds = [headerWorkspaceId, bodyWorkspaceId].filter(Boolean) as string[];

    let canonicalTenantId = '';
    let canonicalWorkspaceId = '';
    let authenticatedUserId = 'anonymous';

    if (serverCtx) {
      authenticatedUserId = serverCtx.user.id;
      canonicalWorkspaceId = serverCtx.workspace.id;
      canonicalTenantId = serverCtx.organization?.id || serverCtx.workspace.organization_id || serverCtx.workspace.id;

      // STRICT MULTI-TENANT CONTEXT VALIDATION:
      // Compare all supplied headers and body IDs against the authenticated user's canonical tenant
      for (const reqOrg of suppliedOrgIds) {
        if (
          reqOrg !== 'org_default' &&
          reqOrg !== 'default' &&
          reqOrg !== 'default-org' &&
          reqOrg !== 'unconfigured-tenant' &&
          reqOrg !== 'public-visitor'
        ) {
          const isOrgMatch =
            reqOrg === canonicalTenantId ||
            reqOrg === canonicalWorkspaceId ||
            reqOrg === serverCtx.user.id ||
            (reqOrg === 'ras-ali-labs' && (canonicalTenantId === '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf' || serverCtx.user.email?.endsWith('@rasalilabs.com'))) ||
            (reqOrg === 'pameltex' && canonicalTenantId === 'c0b39862-cf19-4882-a822-c7f3f493fec0') ||
            (reqOrg === 'grape' && canonicalTenantId === '8c8d6392-e457-4145-9423-f551fda3b728');

          if (!isOrgMatch) {
            console.warn('[Mari Chat API] Security Rejection: Tenant mismatch detected', {
              authenticatedUser: serverCtx.user.id,
              canonicalTenantId,
              requestedOrgId: reqOrg,
            });
            return corsJsonResponse(
              {
                success: false,
                code: 'TENANT_CONTEXT_MISMATCH',
                error: 'Forbidden: Cannot access another tenant workspace context.',
              },
              { status: 403 },
              request
            );
          }
        }
      }

      for (const reqWs of suppliedWorkspaceIds) {
        if (
          reqWs !== 'default' &&
          reqWs !== 'unconfigured-workspace' &&
          reqWs !== 'public-visitor'
        ) {
          const isWsMatch =
            reqWs === canonicalWorkspaceId ||
            reqWs === canonicalTenantId ||
            reqWs === serverCtx.user.id ||
            (reqWs === '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf' && canonicalTenantId === '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf') ||
            (reqWs === 'c0b39862-cf19-4882-a822-c7f3f493fec0' && canonicalTenantId === 'c0b39862-cf19-4882-a822-c7f3f493fec0') ||
            (reqWs === '8c8d6392-e457-4145-9423-f551fda3b728' && canonicalTenantId === '8c8d6392-e457-4145-9423-f551fda3b728');

          if (!isWsMatch) {
            console.warn('[Mari Chat API] Security Rejection: Workspace mismatch detected', {
              authenticatedUser: serverCtx.user.id,
              canonicalWorkspaceId,
              requestedWorkspaceId: reqWs,
            });
            return corsJsonResponse(
              {
                success: false,
                code: 'TENANT_CONTEXT_MISMATCH',
                error: 'Forbidden: Cannot access another workspace context.',
              },
              { status: 403 },
              request
            );
          }
        }
      }
    } else {
      // Unauthenticated callers (e.g. public website visitor)
      // Never allow unauthenticated callers to specify private tenant IDs like ras-ali-labs or 22e61ff6-...
      for (const reqOrg of suppliedOrgIds) {
        if (
          reqOrg !== 'unconfigured-tenant' &&
          reqOrg !== 'public-visitor' &&
          reqOrg !== 'default'
        ) {
          return corsJsonResponse(
            {
              success: false,
              code: 'AUTHENTICATION_REQUIRED',
              error: 'Authentication required to access tenant workspace.',
            },
            { status: 401 },
            request
          );
        }
      }
      canonicalTenantId = 'public-visitor';
      canonicalWorkspaceId = 'public-visitor';
    }

    const orgId = canonicalTenantId;
    const workspaceId = canonicalWorkspaceId;

    // Resolve structured Canonical Business Identity strictly for the authenticated tenant
    const { BusinessIdentityResolver } = await import('@ralion/ai');
    const resolvedIdentity = BusinessIdentityResolver.resolveIdentity(orgId, {
      workspaceId,
      sessionCompanyName: serverCtx?.organization?.name || serverCtx?.workspace?.name,
    });

    const companyName = resolvedIdentity.companyName;

    // Explicit telemetry logging of resolved context before reasoning
    console.log(JSON.stringify({
      level: 'INFO',
      type: 'TENANT_RESOLUTION',
      authenticatedUserId,
      organizationId: orgId,
      workspaceId: workspaceId || orgId,
      tenantKey: orgId,
      companyName: companyName || 'Unconfigured',
      isVerified: resolvedIdentity.isVerified,
      businessKnowledgeSource: resolvedIdentity.source,
    }));

    const requestId = body.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Parse conversation history
    const rawHistory = body.messages || body.conversationHistory || [];
    const conversationHistory: ChatHistoryTurn[] = Array.isArray(rawHistory)
      ? rawHistory
          .filter((m: any) => m && (m.text || m.content) && (m.sender || m.role))
          .map((m: any) => ({
            role: ((m.sender === 'USER' || m.role === 'user') ? 'user' : 'model') as 'user' | 'model',
            text: String(m.text || m.content).trim(),
          }))
          .filter((m: ChatHistoryTurn) => m.text.length > 0)
      : [];

    // Auto-resolve active Facebook Page strictly for the authenticated tenant
    let localOverrides = body.localOverrides || {};
    
    // Security check: discard any client-supplied fbPage override that belongs to a different tenant
    if (localOverrides.fbPage) {
      const fbPageOrg = localOverrides.fbPage.organizationId || localOverrides.fbPage.workspaceId;
      if (fbPageOrg && fbPageOrg !== orgId && fbPageOrg !== workspaceId && fbPageOrg !== authenticatedUserId) {
        delete localOverrides.fbPage;
      }
    }

    if (!localOverrides.fbPage && orgId !== 'public-visitor' && orgId !== 'unconfigured-tenant') {
      try {
        const { FacebookPageManagementService } = await import('../../../../lib/services/social/facebookPageManagement.service');
        const activePage = await FacebookPageManagementService.getPrimaryPage({
          organizationId: orgId,
          workspaceId: workspaceId || orgId,
          userId: authenticatedUserId,
        });

        if (activePage) {
          let recentPosts: any[] = [];
          try {
            recentPosts = await FacebookPageManagementService.getPagePosts({
              organizationId: orgId,
              workspaceId: workspaceId || orgId,
              userId: authenticatedUserId,
              pageId: activePage.pageId,
              limit: 10,
            });
          } catch (postErr: any) {
            console.warn('[Mari Chat API] Recent posts fetch notice:', postErr?.message);
          }

          localOverrides = {
            ...localOverrides,
            facebookState: 'PAGE_CONNECTED',
            fbPage: {
              id: activePage.id,
              pageId: activePage.pageId,
              name: activePage.name,
              username: activePage.username,
              category: activePage.category,
              fanCount: activePage.followersCount,
              about: activePage.about || activePage.description,
              description: activePage.description || activePage.about,
              website: activePage.website,
              contactInfo: activePage.contactInfo,
              status: activePage.status,
              recentPosts,
            },
          };
        }
      } catch (fbErr: any) {
        console.warn('[Mari Chat API] Facebook page auto-resolution note:', fbErr?.message);
      }
    }

    // Process query through Authoritative Mari Universal Core
    const result = await MariUniversalCore.processQuery({
      prompt: query.trim(),
      organizationId: orgId,
      workspaceId: workspaceId || orgId,
      userId: authenticatedUserId,
      companyName,
      activeScreen: body.activeScreen,
      conversationHistory,
      localOverrides,
      requestId,
    });

    return corsJsonResponse({
      success: true,
      answer: result.answer,
      actionsSuggested: result.suggestedActions || [],
      ragContext: result.ragContext,
      modelUsed: result.modelUsed,
      detectedIntent: result.detectedIntent,
      capabilityMode: result.capabilityMode,
      responseSource: result.responseSource,
      contextSources: result.contextSources,
      usage: result.usage,
      usageRecordId: result.usageRecordId,
      requestId: result.requestId,
      tenantId: result.tenantId,
      companyName: result.companyName,
    }, undefined, request);
  } catch (err: any) {
    console.error('[Mari Chat API] Exception:', err);
    return corsJsonResponse({
      success: false,
      error: err.message || "Mari couldn't complete that request right now. Please retry.",
    }, { status: 500 }, request);
  }
}
