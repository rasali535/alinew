import { NextRequest } from 'next/server';
import { MariBusinessLearningService } from '@/lib/services/social/mariBusinessLearning.service';
import { resolveFacebookPageRouteConnection } from '@/lib/services/social/facebookPageRouteAccess.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext, authRequiredResponse, forbiddenResponse } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return [{ pageId: '477334159265235' }, { pageId: 'default' }];
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    const context = await getCurrentRalionContext(request, { requireAuth: true });
    if (!context) {
      return authRequiredResponse(request);
    }

    const organizationId = context.organization?.id || context.workspace.organization_id || context.workspace.id;
    const conn = await resolveFacebookPageRouteConnection({
      organizationId,
      workspaceId: context.workspace.id,
      userId: context.user.id,
      pageId,
    });

    if (pageId && pageId !== 'default' && !conn) {
      return forbiddenResponse(request, 'You do not have access to this Facebook Page');
    }

    if (!conn) {
      return corsJsonResponse({
        success: true,
        knowledge: null,
      }, undefined, request);
    }

    const resolvedPageId = conn.provider_account_id || conn.metadata?.pageId || pageId;
    const knowledge = MariBusinessLearningService.getBusinessKnowledge({
      organizationId,
      pageId: resolvedPageId,
      pageName: conn.account_name || conn.metadata?.pageName || context.workspace.name || 'Business Knowledge',
      connectedAt: conn.created_at || undefined,
    });

    return corsJsonResponse({
      success: true,
      knowledge,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to retrieve business knowledge' },
      { status: 500 },
      request
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    const context = await getCurrentRalionContext(request, { requireAuth: true });
    if (!context) {
      return authRequiredResponse(request);
    }

    const organizationId = context.organization?.id || context.workspace.organization_id || context.workspace.id;
    const conn = await resolveFacebookPageRouteConnection({
      organizationId,
      workspaceId: context.workspace.id,
      userId: context.user.id,
      pageId,
    });

    if (pageId && pageId !== 'default' && !conn) {
      return forbiddenResponse(request, 'You do not have access to this Facebook Page');
    }

    if (!conn) {
      return corsJsonResponse({ success: false, error: 'Connect a Facebook Page before updating business learning.' }, { status: 409 }, request);
    }

    const body = await request.json();
    const resolvedPageId = conn.provider_account_id || conn.metadata?.pageId || pageId;

    const updated = await MariBusinessLearningService.updateBrandVoice({
      organizationId,
      pageId: resolvedPageId,
      userId: context.user.id,
      customTone: body.customTone,
      customKeywords: body.customKeywords,
    });

    return corsJsonResponse({
      success: true,
      knowledge: updated,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to update business knowledge' },
      { status: 500 },
      request
    );
  }
}
