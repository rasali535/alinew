import { NextRequest } from 'next/server';
import { FacebookPageManagementService } from '@/lib/services/social/facebookPageManagement.service';
import { MariFacebookGrowthService, MariPageContext } from '@/lib/services/social/mariFacebookGrowth.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';

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
    const body = await request.json();
    const orgId = request.headers.get('x-organization-id') || 'default-org';
    const userId = request.headers.get('x-user-id') || 'default-user';

    // Retrieve normalized analytics
    const analytics = await FacebookPageManagementService.getPageAnalytics({
      organizationId: orgId,
      pageId,
      period: '30d',
    });

    const context: MariPageContext = {
      organizationId: orgId,
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
        userId,
        focusObjective: body.objective,
      });
      return corsJsonResponse({ success: true, plan }, undefined, request);
    }

    if (action === 'ASK_MARI') {
      const chatRes = await MariFacebookGrowthService.askMari({
        context,
        prompt: body.prompt || 'How is my page performing?',
        userId,
      });
      return corsJsonResponse({ success: true, chat: chatRes }, undefined, request);
    }

    // Default: Get Growth Score & Strategic Insights
    const insights = await MariFacebookGrowthService.generateGrowthInsights({
      context,
      userId,
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
