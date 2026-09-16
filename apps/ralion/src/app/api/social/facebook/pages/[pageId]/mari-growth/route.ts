import { NextRequest } from 'next/server';
import { BusinessContextService, MariUniversalCore, MARI_BUILD_VERSION, sanitizeMariModelOutput } from '@ralion/ai/server';
import { FacebookPageManagementService } from '@/lib/services/social/facebookPageManagement.service';
import { resolveFacebookPageRouteConnection } from '@/lib/services/social/facebookPageRouteAccess.service';
import { MariFacebookGrowthService, MariPageContext } from '@/lib/services/social/mariFacebookGrowth.service';
import { MariBusinessIntelligenceService } from '@/lib/services/mari/mariBusinessIntelligence.service';
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
    const workspaceId = serverCtx.workspace.id;
    const userId = serverCtx.user.id;
    const companyName = serverCtx.organization?.name || serverCtx.workspace.name || '';

    const conn = await resolveFacebookPageRouteConnection({
      organizationId,
      workspaceId,
      userId,
      pageId,
    });

    if (pageId && pageId !== 'default' && !conn) {
      return forbiddenResponse(request, 'You do not have access to this Facebook Page');
    }

    const body = await request.json().catch(() => ({}));

    if (!conn) {
      const action = body.action || 'GET_INSIGHTS';
      if (action === 'GET_PLAN') {
        return corsJsonResponse({ success: true, plan: null }, undefined, request);
      }
      if (action === 'ASK_MARI') {
        return corsJsonResponse({
          success: true,
          chat: {
            answer: 'Connect your Facebook Page to unlock real-time Mari AI audience growth intelligence.',
            recommendedAction: 'Connect Page',
          },
        }, undefined, request);
      }
      return corsJsonResponse({ success: true, score: null, insights: [] }, undefined, request);
    }

    const resolvedPageId = conn.provider_account_id || conn.metadata?.pageId || pageId;

    // Retrieve normalized analytics strictly for this tenant and exact Page.
    const analytics = await FacebookPageManagementService.getPageAnalytics({
      organizationId,
      workspaceId,
      userId,
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
            answer: 'Connect your Facebook Page to unlock real-time Mari AI audience growth intelligence.',
            recommendedAction: 'Connect Page',
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
      postingFrequencyPerWeek: Number((((analytics.totalPosts30d || 0) / (30 / 7))).toFixed(2)),
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
      const cleanPrompt = String(body.prompt || 'How is my Facebook Page performing?').trim();

      let businessContext: any = null;
      let businessIntelligence: any = null;
      let facebookPosts: any[] = [];

      try {
        facebookPosts = await FacebookPageManagementService.getPagePosts({
          organizationId,
          workspaceId,
          userId,
          pageId: resolvedPageId,
          limit: 100,
        });
      } catch (postError: any) {
        console.warn('[Mari Growth API] Facebook post evidence notice:', postError?.message || postError);
      }

      try {
        businessContext = await BusinessContextService.assembleContext(organizationId, {
          organizationId,
          workspaceId,
          userId,
          companyName,
          activeScreen: {
            route: '/growth',
            label: 'Facebook Growth Intelligence',
            entityId: resolvedPageId,
          },
        });
      } catch (contextError: any) {
        console.warn('[Mari Growth API] Business context notice:', contextError?.message || contextError);
      }

      try {
        businessIntelligence = await MariBusinessIntelligenceService.getBusinessIntelligence({
          organizationId,
          workspaceId,
          userId,
          companyName,
          businessContext: businessContext || undefined,
          facebookPage: {
            pageId: resolvedPageId,
            name: analytics.pageName,
            followersCount: analytics.followers,
            status: 'CONNECTED',
          } as any,
          facebookPosts,
        });
      } catch (intelligenceError: any) {
        console.warn('[Mari Growth API] Business intelligence notice:', intelligenceError?.message || intelligenceError);
      }

      const exactPageEvidence = [
        `Facebook Page: ${analytics.pageName}`,
        `Followers: ${analytics.followers}`,
        `Posts in measured 30-day window: ${analytics.totalPosts30d}`,
        `Measured reach: ${analytics.totalReach30d}`,
        `Measured impressions: ${analytics.totalImpressions30d}`,
        `Observed engagement rate: ${analytics.engagementRate}%`,
        `Highest observed content type: ${analytics.topContentType || 'not established'}`,
        `Measured publishing cadence: ${context.postingFrequencyPerWeek} posts/week`,
      ].join('\n');

      const intelligenceContext = businessIntelligence
        ? `\n\n${MariBusinessIntelligenceService.toPromptContext(businessIntelligence)}`
        : '';

      const contextualPrompt = `${cleanPrompt}\n\n[EXACT FACEBOOK PAGE EVIDENCE — SERVER VERIFIED]\n${exactPageEvidence}${intelligenceContext}\n\n[FACEBOOK GROWTH SURFACE RULES]\nUse the verified business context, competitive-intelligence evidence and tenant marketing-learning evidence available to Mari. Never invent an engagement share, benchmark, optimal posting frequency, timing window, growth percentage or predicted outcome. If evidence is missing, say it is missing. Treat content-type, timing and cadence patterns as hypotheses unless the evidence ledger supports them. Recommendations must be original and must not copy competitor creative or wording. Use standard Markdown only. Never prefix headings with the literal token 'svg', never emit decorative bullet tokens such as '**•**', and never escape Markdown heading markers.`;

      const result = await MariUniversalCore.processQuery({
        prompt: cleanPrompt,
        originalUserPrompt: cleanPrompt,
        contextualPrompt,
        businessContext: businessContext || undefined,
        organizationId,
        workspaceId,
        userId,
        companyName,
        activeScreen: {
          route: '/growth',
          label: 'Facebook Growth Intelligence',
          entityId: resolvedPageId,
        },
        requestId: `fb_growth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      });

      const firstAction = Array.isArray(result.suggestedActions) ? result.suggestedActions[0] : undefined;
      return corsJsonResponse({
        success: true,
        chat: {
          answer: sanitizeMariModelOutput(result.answer),
          recommendedAction: firstAction?.label,
          suggestedPrompt: firstAction?.payload?.prompt || firstAction?.payload?.suggestedPrompt,
          evidence: {
            contextSources: result.contextSources || [],
            responseSource: result.responseSource,
            modelSucceeded: result.modelSucceeded,
            businessIntelligenceLoaded: Boolean(businessIntelligence),
            buildVersion: MARI_BUILD_VERSION,
            outputSanitizer: 'MARI_UNIVERSAL_V2',
          },
        },
      }, undefined, request);
    }

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
    console.error('[Mari Growth API] Exception:', err);
    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to process Mari Growth Intelligence' },
      { status: 500 },
      request
    );
  }
}
