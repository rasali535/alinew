import { NextRequest } from 'next/server';
import { FacebookPageManagementService } from '@/lib/services/social/facebookPageManagement.service';
import { resolveFacebookPageRouteConnection } from '@/lib/services/social/facebookPageRouteAccess.service';
import { MariFacebookGrowthService, MariPageContext } from '@/lib/services/social/mariFacebookGrowth.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext, authRequiredResponse, forbiddenResponse } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    const serverCtx = await getCurrentRalionContext(request, { requireAuth: true });
    if (!serverCtx) {
      return authRequiredResponse(request);
    }

    const organizationId = serverCtx.organization?.id || serverCtx.workspace.organization_id || serverCtx.workspace.id;
    const conn = await resolveFacebookPageRouteConnection({
      organizationId,
      workspaceId: serverCtx.workspace.id,
      userId: serverCtx.user.id,
      pageId,
    });

    if (pageId && pageId !== 'default' && !conn) {
      return forbiddenResponse(request, 'You do not have access to this Facebook Page');
    }

    const body = await request.json();

    if (!conn) {
      const action = body.action || 'GET_INSIGHTS';
      if (action === 'GET_PLAN') {
        return corsJsonResponse({ success: true, plan: null }, undefined, request);
      }
      if (action === 'ASK_MARI') {
        return corsJsonResponse({
          success: true,
          chat: {
            text: 'Connect your Facebook Page to unlock real-time Mari AI audience growth intelligence.',
            action: 'CONNECT_PAGE',
          },
        }, undefined, request);
      }
      return corsJsonResponse({ success: true, score: null, insights: [] }, undefined, request);
    }

    const resolvedPageId = conn.provider_account_id || conn.metadata?.pageId || pageId;

    // Retrieve normalized analytics strictly for this tenant and exact Page.
    const analytics = await FacebookPageManagementService.getPageAnalytics({
      organizationId,
      workspaceId: serverCtx.workspace.id,
      userId: serverCtx.user.id,
      pageId: resolvedPageId,
    });

    if (analytics.pageName === 'No Connected Page' && analytics.followers === 0 && analytics.totalPosts30d === 0) {
      const action = body.action || 'GET_INSIGHTS';
      if (action === 'GET_PLAN') {
        return corsJsonResponse({ success: true, plan: null }, undefined, request);
      }
      if (action === 'ASK_MARI') {
        return corsJsonResponse({
          success: true,
          chat: {
            text: 'Connect your Facebook Page to unlock real-time Mari AI audience growth intelligence.',
            action: 'CONNECT_PAGE',
          },
        }, undefined, request);
      }
      return corsJsonResponse({ success: true, score: null, insights: [] }, undefined, request);
    }

    const context: MariPageContext = {
      organizationId,
      pageId: resolvedPageId,
      pageName: analytics.pageName,
      followers: analytics.followers,
      followerGrowth30d: analytics.followerGrowth30d,
      followerGrowthPercentage: analytics.followerGrowthPercentage,
      totalPosts30d: analytics.totalPosts30d,
      engagementRate: analytics.engagementRate,
      totalReach30d: analytics.totalReach30d,
      totalImpressions30d: analytics.totalImpressions30d,
      topContentType: analytics.topContentType,
      postingFrequencyPerWeek: 2,
    };

    const action = body.action || 'GET_INSIGHTS';

    if (action === 'GET_PLAN') {
      const plan = await MariFacebookGrowthService.generate7DayGrowthPlan({
        context,
        userId: serverCtx.user.id,
        focusObjective: body.objective,
      });
      return corsJsonResponse({ success: true, plan }, undefined, request);
    }

    if (action === 'ASK_MARI') {
      const chatRes = await MariFacebookGrowthService.askMari({
        context,
        prompt: body.prompt || 'How is my page performing?',
        userId: serverCtx.user.id,
      });
      return corsJsonResponse({ success: true, chat: chatRes }, undefined, request);
    }

    const insights = await MariFacebookGrowthService.generateGrowthInsights({
      context,
      userId: serverCtx.user.id,
    });

    return corsJsonResponse({
      success: true,
      score: insights.score,
      insights: insights.insights,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to process Mari Growth Intelligence' },
      { status: 500 },
      request
    );
  }
}
