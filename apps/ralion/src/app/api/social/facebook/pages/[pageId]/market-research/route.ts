import { NextRequest } from 'next/server';
import { MariCompetitiveIntelligenceService } from '@/lib/services/social/mariCompetitiveIntelligence.service';
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
        report: null,
      }, undefined, request);
    }

    const resolvedPageId = conn.provider_account_id || conn.metadata?.pageId || pageId;
    const report = MariCompetitiveIntelligenceService.getMarketResearchReport({
      pageId: resolvedPageId,
      organizationId,
    });

    await MariCompetitiveIntelligenceService.auditMarketResearchAccess({
      userId: context.user.id,
      pageId: resolvedPageId,
    });

    return corsJsonResponse({
      success: true,
      report,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to generate market research report' },
      { status: 500 },
      request
    );
  }
}
