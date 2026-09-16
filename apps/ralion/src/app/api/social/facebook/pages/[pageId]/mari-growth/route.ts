import { NextRequest } from 'next/server';
import { BusinessContextService, MariUniversalCore, MARI_BUILD_VERSION, sanitizeMariModelOutput } from '@ralion/ai/server';
import { FacebookPageManagementService } from '@/lib/services/social/facebookPageManagement.service';
import { resolveFacebookPageRouteConnection } from '@/lib/services/social/facebookPageRouteAccess.service';
import { MariFacebookGrowthService, MariPageContext } from '@/lib/services/social/mariFacebookGrowth.service';
import { MariBusinessIntelligenceService } from '@/lib/services/mari/mariBusinessIntelligence.service';
import { MariCompetitiveIntelligenceService } from '@/lib/services/mari/mariCompetitiveIntelligence.service';
import { MariMarketingLearningService } from '@/lib/services/mari/mariMarketingLearning.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext, authRequiredResponse, forbiddenResponse } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';


function buildGroundedGrowthStrategyFallback(params: {
  companyName: string;
  businessIntelligence: any;
  competitiveIntelligence: any;
  marketingLearnings: any[];
}): string {
  const bi = params.businessIntelligence || {};
  const profile = bi.businessProfile || {};
  const facebook = bi.facebookIntelligence || {};
  const performance = bi.contentPerformance || {};
  const audience = bi.audienceIntelligence || {};
  const period = bi.period || {};
  const competition = params.competitiveIntelligence || {};
  const watchlist = Array.isArray(competition.watchlist) ? competition.watchlist.filter((item: any) => item?.status === 'ACTIVE') : [];
  const observations = Array.isArray(competition.recentObservations) ? competition.recentObservations : [];
  const briefing = competition.latestBriefing || null;
  const learnings = Array.isArray(params.marketingLearnings) ? params.marketingLearnings : [];
  const company = profile.companyName || params.companyName || 'your business';

  const evidence: string[] = [];
  if (profile.industry) evidence.push(`- **Business profile:** ${company} operates in ${profile.industry}.`);
  else evidence.push(`- **Business profile:** ${company} is the verified tenant business.`);
  if (profile.valueProposition) evidence.push(`- **Value proposition on record:** ${profile.valueProposition}`);
  if (Array.isArray(profile.productsAndServices) && profile.productsAndServices.length) {
    evidence.push(`- **Products/services on record:** ${profile.productsAndServices.slice(0, 6).join(', ')}.`);
  }
  if (period.start && period.end) {
    evidence.push(`- **Measured Facebook period:** ${String(period.start).slice(0, 10)} to ${String(period.end).slice(0, 10)}.`);
  }
  if (facebook.connected) {
    evidence.push(`- **Facebook Page:** ${facebook.pageName || 'Connected Page'}${facebook.followers != null ? ` with ${facebook.followers} followers` : ''}.`);
  }
  evidence.push(`- **Publishing baseline:** ${Number(performance.posts30d || 0)} posts in 30 days (about ${Number(performance.postingFrequencyPerWeek || 0).toFixed(2)} per week).`);
  const interactions = Number(performance.totalReactions30d || 0) + Number(performance.totalComments30d || 0) + Number(performance.totalShares30d || 0);
  evidence.push(`- **Visible interactions:** ${interactions} total (${Number(performance.totalReactions30d || 0)} reactions, ${Number(performance.totalComments30d || 0)} comments, ${Number(performance.totalShares30d || 0)} shares).`);
  if (performance.totalReach30d != null) {
    evidence.push(`- **Measured reach:** ${performance.totalReach30d}${performance.engagementRatePct != null ? `; engagement rate ${performance.engagementRatePct}%` : ''}.`);
  } else {
    evidence.push('- **Reach/engagement-rate limitation:** reliable reach is unavailable, so a reach-based engagement rate cannot be claimed.');
  }
  if (performance.topContentType) {
    evidence.push(`- **Observed format signal:** ${performance.topContentType} has the highest observed average engagement in this sample. This is a signal to test, not proof that the format is universally best.`);
  }
  const topPost = Array.isArray(performance.topPosts) ? performance.topPosts[0] : null;
  if (topPost) {
    evidence.push(`- **Top observed post in the window:** "${String(topPost.excerpt || '').slice(0, 180)}" with ${Number(topPost.engagement || 0)} visible interactions.`);
  }
  if (audience.commentsSampled != null) {
    evidence.push(`- **Audience evidence:** ${Number(audience.commentsSampled || 0)} comments sampled${audience.responseCoveragePct != null ? `; reply coverage ${audience.responseCoveragePct}%` : ''}.`);
  }

  const competitorLines: string[] = [];
  if (watchlist.length) {
    competitorLines.push(`- **Public competitor watchlist:** ${watchlist.map((item: any) => item.name).join(', ')}.`);
    competitorLines.push(`- **Evidence ledger:** ${observations.length} recent public-source observations are available.`);
    if (briefing?.summary) competitorLines.push(`- **Latest market briefing:** ${briefing.summary}`);
    if (Array.isArray(briefing?.marketMoves) && briefing.marketMoves.length) {
      competitorLines.push(`- **Observed market moves:** ${briefing.marketMoves.slice(0, 3).join(' | ')}`);
    }
    if (Array.isArray(briefing?.marketGaps) && briefing.marketGaps.length) {
      competitorLines.push(`- **Potential gaps to test:** ${briefing.marketGaps.slice(0, 3).join(' | ')}`);
    }
  } else {
    competitorLines.push('- No verified competitor observations are currently available in the tenant ledger, so no competitor-specific claim is made.');
  }

  const learningLines = learnings.length
    ? learnings.slice(0, 5).map((learning: any) => `- **${learning.status || 'EVIDENCE'} (${Math.round(Number(learning.confidence || 0) * 100)}% confidence; n=${Number(learning.evidenceCount || 0)}):** ${learning.claim}`)
    : ['- No evidence-backed historical marketing learnings exist yet. New campaigns should be treated as baseline experiments, not as proven playbooks.'];

  const gaps: string[] = [];
  if (performance.totalReach30d == null) gaps.push('- Reach/impression evidence is insufficient for reliable reach-based engagement comparisons.');
  gaps.push('- Historical follower snapshots are insufficient for a verified 30-day follower-growth rate.');
  if (Number(audience.customerCommentsSampled || 0) < 10) gaps.push(`- Customer-intent evidence is thin (${Number(audience.customerCommentsSampled || 0)} customer comments sampled), so audience pain-point conclusions would be premature.`);
  if (!learnings.length) gaps.push('- There is not yet enough matched experiment/outcome history to claim a repeatable winning content pattern.');
  if (!observations.length) gaps.push('- Competitor conclusions are limited until more public observations are collected.');

  const marketGap = Array.isArray(briefing?.marketGaps) && briefing.marketGaps.length ? String(briefing.marketGaps[0]) : '';
  const observedFormat = performance.topContentType || 'text';
  const verifiedOffer = String(
    profile.valueProposition ||
    (Array.isArray(profile.productsAndServices) && profile.productsAndServices.length
      ? profile.productsAndServices.slice(0, 2).join(' + ')
      : `${company}'s verified offer`)
  );

  const tests = [
    `1. **Positioning test:** Test an outcome-led message built around "${verifiedOffer}"${marketGap ? `, informed by this public-market gap: ${marketGap}` : ''}. Compare it with a simpler single-offer message; treat the result as a hypothesis until measured.`,
    `2. **Format test:** Use the observed ${observedFormat} signal as one variant, then test it against a different format with the same message and CTA. Hold the offer constant so the format comparison is interpretable.`,
    `3. **CTA test:** Compare a low-friction conversation CTA (for example, asking people to comment a keyword) with the current direct-contact path. Measure qualified replies or enquiries rather than raw reactions alone.`,
  ];

  const contentFormat = observedFormat === 'video' ? 'Short video/reel with a concise text caption' : observedFormat === 'image' ? 'Single visual with a concise proof-led caption' : 'Text-first milestone / behind-the-scenes post';
  const contentIdea = [
    `**Objective:** Test whether a clearer outcome-led expression of the verified offer earns meaningful enquiries.`,
    `**Format:** ${contentFormat}.`,
    `**Draft copy:**`,
    '',
    `What would change if the right people understood exactly what ${company} can help them achieve?`,
    '',
    `Our current focus is simple: ${verifiedOffer}.`,
    '',
    `We are testing this message against real audience response rather than calling it proven before the data says so.`,
    '',
    `Want to see how it works in practice? Comment **BUILD** and let's start the conversation.`,
  ].join('\n');

  return [
    `## Marketing Strategy for ${company}`,
    '',
    '_Grounded fallback mode: the live reasoning provider did not return in time, so this answer uses stored tenant evidence only. No missing metric or competitor result is invented._',
    '',
    '### 1. Evidence We Have',
    ...evidence,
    '',
    '#### Public Competitor Intelligence',
    ...competitorLines,
    '',
    '#### Historical Marketing Learning',
    ...learningLines,
    '',
    '### 2. What We Do Not Have Enough Evidence For',
    ...gaps,
    '',
    '### 3. What We Should Test Next',
    ...tests,
    '',
    '### 4. Facebook Content Idea',
    contentIdea,
  ].join('\n');
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
      let competitiveIntelligence: any = null;
      let marketingLearnings: any[] = [];

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

      const tenantEvidenceParams = { organizationId, workspaceId, userId };
      const [competitiveResult, learningResult] = await Promise.allSettled([
        MariCompetitiveIntelligenceService.getSnapshot(tenantEvidenceParams),
        MariMarketingLearningService.listLearnings(tenantEvidenceParams, 10),
      ]);
      if (competitiveResult.status === 'fulfilled') {
        competitiveIntelligence = competitiveResult.value;
      } else {
        console.warn('[Mari Growth API] Competitive intelligence notice:', competitiveResult.reason?.message || competitiveResult.reason);
      }
      if (learningResult.status === 'fulfilled') {
        marketingLearnings = learningResult.value;
      } else {
        console.warn('[Mari Growth API] Marketing learning notice:', learningResult.reason?.message || learningResult.reason);
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

      const genericUnavailable = /reasoning engine is temporarily unavailable/i.test(String(result.answer || ''));
      const shouldUseGroundedRouteFallback = genericUnavailable || (!result.modelSucceeded && result.detectedIntent === 'FACEBOOK_INSIGHTS');
      const finalAnswer = shouldUseGroundedRouteFallback
        ? buildGroundedGrowthStrategyFallback({ companyName, businessIntelligence, competitiveIntelligence, marketingLearnings })
        : result.answer;

      const firstAction = Array.isArray(result.suggestedActions) ? result.suggestedActions[0] : undefined;
      return corsJsonResponse({
        success: true,
        chat: {
          answer: sanitizeMariModelOutput(finalAnswer),
          recommendedAction: firstAction?.label,
          suggestedPrompt: firstAction?.payload?.prompt || firstAction?.payload?.suggestedPrompt,
          evidence: {
            contextSources: result.contextSources || [],
            responseSource: shouldUseGroundedRouteFallback ? 'local_grounded_route' : result.responseSource,
            modelSucceeded: result.modelSucceeded,
            actualModelUsed: result.actualModelUsed || null,
            fallbackReason: result.fallbackReason || null,
            modelFailureCodes: result.modelFailureCodes || {},
            groundedGrowthFallbackUsed: shouldUseGroundedRouteFallback,
            businessIntelligenceLoaded: Boolean(businessIntelligence),
            competitiveIntelligenceLoaded: Boolean(competitiveIntelligence),
            marketingLearningCount: marketingLearnings.length,
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
