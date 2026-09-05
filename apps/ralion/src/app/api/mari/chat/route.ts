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
 */
export async function POST(request: NextRequest) {
  try {
    const serverCtx = await getCurrentRalionContext(request, { requireAuth: false });
    const body = await request.json().catch(() => ({}));
    const query = body.query || body.message || body.prompt;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return corsJsonResponse({ success: false, error: 'Query prompt is required' }, { status: 400 }, request);
    }

    const rawOrgId =
      body.organizationId ||
      request.headers.get('x-organization-id') ||
      request.headers.get('x-workspace-id');

    let orgId = '';
    let workspaceId = '';
    const authenticatedUserId = serverCtx?.user.id || body.userId || 'anonymous';

    if (serverCtx) {
      orgId = (rawOrgId && rawOrgId !== 'org_default' && rawOrgId !== 'default' && rawOrgId !== 'default-org')
        ? rawOrgId
        : (serverCtx.organization?.id || serverCtx.workspace.organization_id || serverCtx.workspace.id || serverCtx.user.id);
      workspaceId = serverCtx.workspace.id;
    } else {
      orgId = (rawOrgId && rawOrgId !== 'org_default' && rawOrgId !== 'default' && rawOrgId !== 'default-org')
        ? rawOrgId
        : 'unconfigured-tenant';
      workspaceId = orgId;
    }

    // Resolve structured Canonical Business Identity
    const { BusinessIdentityResolver } = await import('@ralion/ai');
    const resolvedIdentity = BusinessIdentityResolver.resolveIdentity(orgId, {
      workspaceId,
      sessionCompanyName: body.companyName || serverCtx?.organization?.name || serverCtx?.workspace.name,
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

    // Process query through Authoritative Mari Universal Core
    const result = await MariUniversalCore.processQuery({
      prompt: query.trim(),
      organizationId: orgId,
      workspaceId: workspaceId || orgId,
      userId: authenticatedUserId,
      companyName,
      activeScreen: body.activeScreen,
      conversationHistory,
      localOverrides: body.localOverrides,
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

