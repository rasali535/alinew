import { NextRequest } from 'next/server';
import { FacebookPageManagementService } from '@/lib/services/social/facebookPageManagement.service';
import { MariFacebookGrowthService, MariPageContext } from '@/lib/services/social/mariFacebookGrowth.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext, authRequiredResponse, forbiddenResponse, getServiceSupabase } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return [{ pageId: '477334159265235' }, { pageId: 'default' }];
}

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

    // If specific foreign pageId requested, verify ownership
    if (pageId && pageId !== 'default') {
      const supabase = getServiceSupabase();
      const { data: conn } = await supabase
        .from('social_connections')
        .select('provider_account_id, zernio_account_id, metadata')
        .eq('provider', 'facebook')
        .or(`workspace_id.eq.${serverCtx.workspace.id},user_id.eq.${serverCtx.user.id}`)
        .maybeSingle();

      const pageMatched =
        conn &&
        (conn.provider_account_id === pageId ||
          conn.zernio_account_id === pageId ||
          conn.metadata?.pageId === pageId ||
          conn.metadata?.zernioAccountId === pageId);

      if (!pageMatched) {
        return forbiddenResponse(request, 'You do not have access to this Facebook Page');
      }
    }

    const body = await request.json();

    // Retrieve normalized analytics
    const analytics = await FacebookPageManagementService.getPageAnalytics({
      organizationId: serverCtx.workspace.id,
      workspaceId: serverCtx.workspace.id,
      userId: serverCtx.user.id,
      pageId,
    });

    const context: MariPageContext = {
      organizationId: serverCtx.workspace.id,
      pageId,
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

    // Default: Get Growth Score & Strategic Insights
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
