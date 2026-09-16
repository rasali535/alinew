/**
 * Ralion OS — Mari AI Facebook Growth Intelligence Service
 * Ras Ali Labs (Pty) Ltd
 *
 * Deterministic Facebook growth helpers used for diagnostics and experimental plans.
 * User chat is routed through MariUniversalCore by the page API. This service must
 * never present generic benchmarks, timing assumptions or predicted outcomes as
 * measured tenant facts.
 */

import { AuditLoggerService } from '../auditLogger.service';
import { NormalizedPageAnalytics } from './facebookPageManagement.service';

export interface MariPageContext {
  organizationId?: string;
  pageId: string;
  pageName: string;
  followers: number;
  followerGrowth30d: number;
  followerGrowthPercentage: number;
  totalPosts30d: number;
  engagementRate: number;
  totalReach30d: number;
  totalImpressions30d: number;
  topContentType: 'video' | 'image' | 'text';
  postingFrequencyPerWeek: number;
}

export interface MariGrowthScore {
  total: number;
  breakdown: {
    contentQuality: number;
    engagement: number;
    consistency: number;
    growthVelocity: number;
  };
  summary: string;
}

export interface MariInsightItem {
  id: string;
  type: 'PERFORMANCE_INSIGHT' | 'GROWTH_OPPORTUNITY' | 'TIMING_INSIGHT' | 'ANOMALY' | 'CONTENT_RECOMMENDATION';
  title: string;
  summary: string;
  evidence: string;
  impact: 'HIGH' | 'MEDIUM' | 'OPPORTUNITY';
  actionLabel?: string;
  actionType?: 'CREATE_CONTENT' | 'CREATE_PLAN' | 'SCHEDULE_POST' | 'VIEW_ANALYTICS';
  suggestedPrompt?: string;
}

export interface MariGrowthPlanDay {
  dayNumber: number;
  dayName: string;
  recommendedTime: string;
  contentType: 'Video Reel' | 'Graphic Poster' | 'Educational Article' | 'Product Feature';
  topic: string;
  goal: string;
  suggestedCaption: string;
  callToAction: string;
  hashtags: string[];
}

export interface MariGrowthPlanResult {
  title: string;
  pageName: string;
  objective: string;
  durationDays: number;
  days: MariGrowthPlanDay[];
  expectedImpact: string;
  generatedAt: string;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export class MariFacebookGrowthService {
  /**
   * Internal activity score. This is not an industry benchmark and should not be
   * presented as proof that a page is performing well or poorly relative to peers.
   */
  static calculateGrowthScore(analytics: NormalizedPageAnalytics): MariGrowthScore {
    if (analytics.totalPosts30d === 0 && analytics.totalReach30d === 0) {
      return {
        total: 0,
        breakdown: {
          contentQuality: 0,
          engagement: 0,
          consistency: 0,
          growthVelocity: 0,
        },
        summary: 'Mari needs more measured Page activity before a growth score is useful.',
      };
    }

    const contentQuality = clampScore(30 + Math.min(60, analytics.totalPosts30d * 5));
    const engagement = analytics.engagementRate > 0
      ? clampScore(30 + Math.min(65, analytics.engagementRate * 10))
      : 20;
    const consistency = clampScore(20 + Math.min(70, analytics.totalPosts30d * 7));
    const growthVelocity = analytics.followerGrowthPercentage > 0
      ? clampScore(30 + Math.min(60, analytics.followerGrowthPercentage * 3))
      : 30;
    const total = Math.round((contentQuality + engagement + consistency + growthVelocity) / 4);

    return {
      total,
      breakdown: { contentQuality, engagement, consistency, growthVelocity },
      summary: 'This is a Ralion activity heuristic derived from measured Page metrics, not an external industry benchmark or predicted business outcome.',
    };
  }

  /**
   * Generate deterministic insights that remain inside the evidence boundary.
   */
  static async generateGrowthInsights(params: {
    context: MariPageContext;
    userId: string;
  }): Promise<{ score: MariGrowthScore; insights: MariInsightItem[] }> {
    const score = this.calculateGrowthScore({
      ...params.context,
      totalLikes30d: 0,
      totalComments30d: 0,
      totalShares30d: 0,
      lastSyncedAt: new Date().toISOString(),
    });

    const hasData = params.context.totalPosts30d > 0 || params.context.totalReach30d > 0;
    const measuredCadence = Number(params.context.postingFrequencyPerWeek || 0);
    const topType = params.context.topContentType || 'text';

    const insights: MariInsightItem[] = hasData
      ? [
          {
            id: 'ins_1',
            type: 'PERFORMANCE_INSIGHT',
            title: `Measured Facebook Activity: ${params.context.totalPosts30d} Posts`,
            summary: 'This insight uses the Page metrics Ralion can currently verify and does not infer unavailable outcomes.',
            evidence: `Observed engagement rate: ${params.context.engagementRate}%; measured reach: ${params.context.totalReach30d}; highest observed content type: ${topType}.`,
            impact: 'HIGH',
            actionLabel: 'View Analytics',
            actionType: 'VIEW_ANALYTICS',
          },
          {
            id: 'ins_2',
            type: 'GROWTH_OPPORTUNITY',
            title: 'Test Cadence Instead of Assuming an Optimum',
            summary: `The measured publishing pace is ${measuredCadence.toFixed(1)} posts/week. Change cadence as a controlled test and compare outcomes before scaling.`,
            evidence: `Cadence is derived from ${params.context.totalPosts30d} tracked posts over the current 30-day window.`,
            impact: 'OPPORTUNITY',
            actionLabel: 'Generate Test Plan',
            actionType: 'CREATE_PLAN',
          },
          {
            id: 'ins_3',
            type: 'TIMING_INSIGHT',
            title: 'Timing Evidence Not Yet Calibrated',
            summary: 'Ralion does not currently have enough verified time-of-day outcome evidence to claim an optimal posting window for this Page.',
            evidence: 'No verified hourly or daypart performance distribution is present in the current Page context.',
            impact: 'OPPORTUNITY',
            actionLabel: 'Run Timing Test',
            actionType: 'CREATE_PLAN',
          },
        ]
      : [
          {
            id: 'ins_init',
            type: 'GROWTH_OPPORTUNITY',
            title: 'Publish and Measure Before Optimizing',
            summary: 'Mari needs real Page outcomes before making a reliable growth recommendation.',
            evidence: 'No measurable publishing or reach evidence is available in the current cycle.',
            impact: 'HIGH',
            actionLabel: 'Create First Test',
            actionType: 'CREATE_CONTENT',
            suggestedPrompt: 'Create an introductory Facebook post designed as a measurable baseline test.',
          },
        ];

    await AuditLoggerService.log({
      eventType: 'MARI_PAGE_ANALYSIS' as any,
      eventCategory: 'MARI_AI',
      userId: params.userId,
      success: true,
      resourceType: 'mari_analysis',
      resourceId: params.context.pageId,
      metadata: {
        pageName: params.context.pageName,
        growthScore: score.total,
        insightsGenerated: insights.length,
        evidenceBoundary: 'MEASURED_PAGE_METRICS_ONLY',
      },
    });

    return { score, insights };
  }

  /**
   * Generate a 7-day experiment plan. Times and formats are explicit test windows,
   * not claims about optimal timing or predicted performance.
   */
  static async generate7DayGrowthPlan(params: {
    context: MariPageContext;
    userId: string;
    focusObjective?: string;
  }): Promise<MariGrowthPlanResult> {
    const brandName = (params.context.pageName && params.context.pageName !== 'No Connected Page')
      ? params.context.pageName
      : 'your business';
    const tagSlug = brandName.replace(/[^a-zA-Z0-9]/g, '');
    const observedType = params.context.topContentType || 'text';

    const days: MariGrowthPlanDay[] = [
      {
        dayNumber: 1,
        dayName: 'Monday',
        recommendedTime: '09:30 (test window)',
        contentType: 'Educational Article',
        topic: `Customer Problem Education for ${brandName}`,
        goal: 'Establish a measurable baseline for saves, comments and clicks',
        suggestedCaption: `What recurring business problem should we unpack next? Here is one practical perspective from ${brandName}.`,
        callToAction: 'Comment with the challenge you want us to cover next.',
        hashtags: [`#${tagSlug}`, '#BusinessGrowth'],
      },
      {
        dayNumber: 2,
        dayName: 'Tuesday',
        recommendedTime: '15:30 (test window)',
        contentType: observedType === 'video' ? 'Video Reel' : 'Product Feature',
        topic: `Capability Demonstration: ${brandName}`,
        goal: 'Test product-interest signals without assuming the format is proven',
        suggestedCaption: `A quick look at how ${brandName} approaches a real customer workflow.`,
        callToAction: 'Ask for a walkthrough if this workflow is relevant to your business.',
        hashtags: [`#${tagSlug}`, '#CustomerWorkflow'],
      },
      {
        dayNumber: 3,
        dayName: 'Wednesday',
        recommendedTime: '11:00 (test window)',
        contentType: 'Graphic Poster',
        topic: `One Clear Business Insight from ${brandName}`,
        goal: 'Test save and share behaviour',
        suggestedCaption: 'One practical principle worth testing in your own operation this week.',
        callToAction: 'Save this for your next planning session.',
        hashtags: [`#${tagSlug}`, '#BusinessInsight'],
      },
      {
        dayNumber: 4,
        dayName: 'Thursday',
        recommendedTime: '16:00 (test window)',
        contentType: 'Product Feature',
        topic: `Feature-to-Outcome Explanation for ${brandName}`,
        goal: 'Test enquiry intent',
        suggestedCaption: 'Here is what this capability does, who it is for, and the problem it is designed to address.',
        callToAction: 'Message us if you want to see whether it fits your workflow.',
        hashtags: [`#${tagSlug}`, '#ProductEducation'],
      },
      {
        dayNumber: 5,
        dayName: 'Friday',
        recommendedTime: '14:30 (test window)',
        contentType: 'Video Reel',
        topic: `Behind the Work at ${brandName}`,
        goal: 'Test human and behind-the-scenes engagement',
        suggestedCaption: 'A short behind-the-scenes look at how we turn an idea into something useful for customers.',
        callToAction: 'Tell us which part of the process you want to see next.',
        hashtags: [`#${tagSlug}`, '#BehindTheScenes'],
      },
      {
        dayNumber: 6,
        dayName: 'Saturday',
        recommendedTime: '10:00 (test window)',
        contentType: 'Graphic Poster',
        topic: `Weekend Question for the ${brandName} Audience`,
        goal: 'Test conversation depth',
        suggestedCaption: 'What is the biggest growth or operational challenge on your desk right now?',
        callToAction: 'Reply in the comments; we will use the themes to shape future content.',
        hashtags: [`#${tagSlug}`, '#Community'],
      },
      {
        dayNumber: 7,
        dayName: 'Sunday',
        recommendedTime: '18:00 (test window)',
        contentType: 'Educational Article',
        topic: `Week-Ahead Planning Prompt from ${brandName}`,
        goal: 'Test high-intent planning engagement',
        suggestedCaption: 'Before the new week starts, choose one outcome you want to improve and one metric you will watch.',
        callToAction: 'Share the metric you are focusing on this week.',
        hashtags: [`#${tagSlug}`, '#WeekAhead'],
      },
    ];

    const result: MariGrowthPlanResult = {
      title: `7-Day Growth Experiment Plan: ${brandName}`,
      pageName: brandName,
      objective: params.focusObjective || 'Collect comparable audience-response evidence',
      durationDays: 7,
      days,
      expectedImpact: 'Experimental plan only — compare reach, reactions, comments, shares and enquiry signals before treating any cadence, format or timing pattern as proven.',
      generatedAt: new Date().toISOString(),
    };

    await AuditLoggerService.log({
      eventType: 'MARI_GROWTH_RECOMMENDATION' as any,
      eventCategory: 'MARI_AI',
      userId: params.userId,
      success: true,
      resourceType: 'mari_growth_plan',
      resourceId: params.context.pageId,
      metadata: {
        pageName: params.context.pageName,
        totalPlanDays: 7,
        evidenceBoundary: 'TEST_PLAN_NOT_PREDICTED_OUTCOME',
      },
    });

    return result;
  }

  /**
   * Safe deterministic fallback for legacy callers. The page API now routes user
   * questions through MariUniversalCore; this method remains intentionally cautious.
   */
  static async askMari(params: {
    context: MariPageContext;
    prompt: string;
    userId: string;
  }): Promise<{ answer: string; recommendedAction?: string; suggestedPrompt?: string }> {
    const p = params.prompt.toLowerCase();
    const brandName = (params.context.pageName && params.context.pageName !== 'No Connected Page')
      ? params.context.pageName
      : 'your business';
    const hasMeasuredData = params.context.totalPosts30d > 0 || params.context.totalReach30d > 0;
    const observedType = params.context.topContentType || 'text';
    const cadence = Number(params.context.postingFrequencyPerWeek || 0);

    if (!hasMeasuredData) {
      return {
        answer: `I do not yet have enough measured Facebook performance evidence for **${brandName}** to claim a winning format, cadence or posting time. Publish a small set of clearly different tests and I can compare the outcomes without inventing missing metrics.`,
        recommendedAction: 'Create Baseline Test',
        suggestedPrompt: `Create a measurable baseline Facebook post for ${brandName}.`,
      };
    }

    if (p.includes('performing') || p.includes('performance') || p.includes('health') || p.includes('status')) {
      return {
        answer: `For **${brandName}**, Ralion currently measures **${params.context.followers} followers**, **${params.context.totalPosts30d} posts in the 30-day window**, **${params.context.totalReach30d} measured reach**, and an engagement rate of **${params.context.engagementRate}%**. The highest observed content type is **${observedType}**, but this context does not prove that format caused better performance. Current measured cadence is **${cadence.toFixed(1)} posts/week**.`,
        recommendedAction: 'View Full Insights',
      };
    }

    if (p.includes('post') || p.includes('topic') || p.includes('idea') || p.includes('schedule')) {
      return {
        answer: `Use **${observedType}** as one test arm because it is the highest observed content type in the current Page data, not because it is a proven winner. Compare it against a clearly different format and CTA. I do not have verified time-of-day evidence in this Page context, so I will not claim an optimal posting time.`,
        recommendedAction: 'Open Content Composer',
        suggestedPrompt: `Create an original ${observedType} Facebook test for ${brandName} with one clear CTA and a measurable objective.`,
      };
    }

    if (p.includes('plan') || p.includes('7-day') || p.includes('growth')) {
      return {
        answer: `I can structure a 7-day experiment plan for **${brandName}**. The schedule and formats should be treated as hypotheses to measure, not predicted winners. Current observed cadence is **${cadence.toFixed(1)} posts/week** and the highest observed content type is **${observedType}**.`,
        recommendedAction: 'Generate 7-Day Test Plan',
      };
    }

    return {
      answer: `For **${brandName}**, I can verify ${params.context.totalPosts30d} posts in the current 30-day window, ${params.context.totalReach30d} measured reach, an engagement rate of ${params.context.engagementRate}%, and a measured cadence of ${cadence.toFixed(1)} posts/week. **${observedType}** is the highest observed content type, but I do not have evidence here for a specific share of total engagement, a universal posting frequency, or an optimal posting time. Treat the next recommendation as a controlled test and let the outcome ledger update the learning.`,
      recommendedAction: 'Create Controlled Test',
      suggestedPrompt: `Design an original Facebook content experiment for ${brandName} using our verified business context and measured Page evidence.`,
    };
  }
}
