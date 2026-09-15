import 'server-only';

import { BusinessContextService } from '@ralion/ai/server';
import {
  FacebookPageManagementService,
  type FacebookPageDescriptor,
  type FacebookPagePostItem,
  type NormalizedPageAnalytics,
} from '../social/facebookPageManagement.service';
import {
  FacebookCommentsService,
  type FacebookComment,
} from '../social/facebookComments.service';

export type MariIntelligenceSource =
  | 'WEBSITE'
  | 'BUSINESS_PROFILE'
  | 'FACEBOOK_PAGE'
  | 'FACEBOOK_POSTS'
  | 'FACEBOOK_COMMENTS';

export interface MariBusinessIntelligenceSnapshot {
  version: '1.0';
  organizationId: string;
  workspaceId: string;
  generatedAt: string;
  period: {
    days: 30;
    start: string;
    end: string;
  };
  businessProfile: {
    companyName: string;
    industry: string | null;
    targetMarket: string | null;
    valueProposition: string | null;
    productsAndServices: string[];
  };
  websiteIntelligence: {
    connected: boolean;
    url: string | null;
    summary: string | null;
    knowledgeAvailable: boolean;
    provenance: string | null;
    lastVerifiedAt: string | null;
  };
  facebookIntelligence: {
    connected: boolean;
    pageId: string | null;
    pageName: string | null;
    username: string | null;
    followers: number | null;
    followerGrowth30dPct: null;
    analyticsAvailable: boolean;
    provenance: string | null;
  };
  contentPerformance: {
    posts30d: number;
    totalReactions30d: number;
    totalComments30d: number;
    totalShares30d: number;
    totalReach30d: number | null;
    totalEngagement30d: number;
    engagementRatePct: number | null;
    averageEngagementPerPost: number | null;
    postingFrequencyPerWeek: number;
    topContentType: 'image' | 'video' | 'text' | null;
    topPosts: Array<{
      id: string;
      excerpt: string;
      publishedAt: string;
      permalink?: string;
      mediaType: 'image' | 'video' | 'text';
      reactions: number;
      comments: number;
      shares: number;
      reach: number | null;
      engagement: number;
    }>;
  };
  audienceIntelligence: {
    commentsSampled: number;
    customerCommentsSampled: number;
    questionsDetected: number;
    unansweredQuestions: number;
    leadSignals: number;
    responseCoveragePct: number | null;
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
      method: 'DETERMINISTIC_KEYWORD_HEURISTIC';
    };
    topThemes: Array<{ theme: string; mentions: number }>;
  };
  growthMetrics: {
    followerGrowth30dPct: null;
    engagementRatePct: number | null;
    postingFrequencyPerWeek: number;
    commentsPerPost: number | null;
    responseCoveragePct: number | null;
    historicalGrowthStatus: 'INSUFFICIENT_HISTORICAL_DATA';
  };
  opportunities: string[];
  risks: string[];
  recommendations: string[];
  dataFreshness: {
    businessContextAssembledAt: string | null;
    facebookLastSyncedAt: string | null;
    generatedAt: string;
  };
  sources: MariIntelligenceSource[];
}

interface IntelligenceParams {
  organizationId: string;
  workspaceId: string;
  userId: string;
  companyName?: string;
  businessContext?: any;
  facebookPage?: FacebookPageDescriptor | null;
  facebookPosts?: FacebookPagePostItem[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function canonicalUuid(value: string, field: string): string {
  const clean = (value || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
    throw new Error(`${field} must be a canonical UUID.`);
  }
  return clean;
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanText(value: unknown, max = 500): string {
  if (value == null) return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.replace(/\s+/g, ' ').trim().slice(0, max);
}

function isWithinPeriod(dateValue: string | undefined, startMs: number, endMs: number): boolean {
  if (!dateValue) return false;
  const time = Date.parse(dateValue);
  return Number.isFinite(time) && time >= startMs && time <= endMs;
}

function postEngagement(post: FacebookPagePostItem): number {
  return numberValue(post.engagement?.likes) + numberValue(post.engagement?.comments) + numberValue(post.engagement?.shares);
}

function isQuestion(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  return normalized.includes('?') || /^(how|what|when|where|why|who|which|can|could|do|does|is|are|will|would|may|price|cost)\b/.test(normalized);
}

function isLeadSignal(text: string): boolean {
  return /\b(price|pricing|cost|how much|quote|quotation|book|booking|buy|purchase|order|interested|available|availability|sign up|signup|subscribe|demo|contact me|call me|need this|want this|where can i get|how do i get)\b/i.test(text);
}

function classifySentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const lower = text.toLowerCase();
  const positive = [
    'love', 'great', 'amazing', 'excellent', 'good', 'awesome', 'perfect', 'thank', 'thanks',
    'helpful', 'impressive', 'nice', 'brilliant', 'happy', 'interested', 'well done',
  ];
  const negative = [
    'bad', 'terrible', 'awful', 'poor', 'hate', 'angry', 'disappointed', 'problem', 'issue',
    'broken', 'not working', 'scam', 'refund', 'complaint', 'unhappy', 'frustrated', 'late',
  ];
  const positiveHits = positive.filter((word) => lower.includes(word)).length;
  const negativeHits = negative.filter((word) => lower.includes(word)).length;
  if (positiveHits > negativeHits) return 'positive';
  if (negativeHits > positiveHits) return 'negative';
  return 'neutral';
}

const THEME_RULES: Array<{ theme: string; pattern: RegExp }> = [
  { theme: 'Pricing & quotes', pattern: /\b(price|pricing|cost|how much|quote|quotation|fee|fees)\b/i },
  { theme: 'Buying intent', pattern: /\b(buy|purchase|order|book|booking|interested|sign up|signup|subscribe|demo|need this|want this)\b/i },
  { theme: 'Product or service information', pattern: /\b(what is|how does|features?|services?|products?|package|plan|plans|include|includes)\b/i },
  { theme: 'Availability & access', pattern: /\b(available|availability|where|location|open|hours|when can|access|get started)\b/i },
  { theme: 'Support & troubleshooting', pattern: /\b(help|support|problem|issue|not working|error|fix|trouble)\b/i },
  { theme: 'Complaints & dissatisfaction', pattern: /\b(complaint|refund|disappointed|unhappy|angry|terrible|poor|bad service|frustrated)\b/i },
  { theme: 'Contact requests', pattern: /\b(contact|call me|phone|email|whatsapp|inbox|dm|message me)\b/i },
];

function extractWebsiteSummary(websiteKnowledge: any): string | null {
  if (!websiteKnowledge) return null;
  const candidates = [
    websiteKnowledge.summary,
    websiteKnowledge.description,
    websiteKnowledge.businessSummary,
    websiteKnowledge.companyDescription,
  ];
  for (const candidate of candidates) {
    const text = cleanText(candidate, 900);
    if (text) return text;
  }
  return null;
}

function getProducts(context: any): string[] {
  const raw = context?.layer1?.productsAndServices?.value;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: any) => cleanText(typeof item === 'string' ? item : item?.name || item?.title || '', 160))
    .filter(Boolean)
    .slice(0, 20);
}

export class MariBusinessIntelligenceService {
  static async getBusinessIntelligence(params: IntelligenceParams): Promise<MariBusinessIntelligenceSnapshot> {
    const organizationId = canonicalUuid(params.organizationId, 'organizationId');
    const workspaceId = canonicalUuid(params.workspaceId, 'workspaceId');
    const userId = canonicalUuid(params.userId, 'userId');
    const generatedAt = new Date();
    const endMs = generatedAt.getTime();
    const startMs = endMs - (30 * DAY_MS);

    const context = params.businessContext || await BusinessContextService.assembleContext(organizationId, {
      organizationId,
      workspaceId,
      userId,
      companyName: params.companyName,
    });

    let page: FacebookPageDescriptor | null = params.facebookPage ?? null;
    if (params.facebookPage === undefined) {
      try {
        page = await FacebookPageManagementService.getPrimaryPage({ organizationId, workspaceId, userId });
      } catch (error: any) {
        console.warn('[MariBusinessIntelligence] Facebook page resolution notice:', error?.message || error);
      }
    }

    let posts: FacebookPagePostItem[] = Array.isArray(params.facebookPosts) ? params.facebookPosts : [];
    if (params.facebookPosts === undefined && page) {
      try {
        posts = await FacebookPageManagementService.getPagePosts({
          organizationId,
          workspaceId,
          userId,
          pageId: page.pageId,
          limit: 50,
        });
      } catch (error: any) {
        console.warn('[MariBusinessIntelligence] Facebook posts notice:', error?.message || error);
      }
    }

    let analytics: NormalizedPageAnalytics | null = null;
    if (page) {
      try {
        analytics = await FacebookPageManagementService.getPageAnalytics({
          organizationId,
          workspaceId,
          userId,
          pageId: page.pageId,
          prefetchedPosts: posts,
        });
      } catch (error: any) {
        console.warn('[MariBusinessIntelligence] Facebook analytics notice:', error?.message || error);
      }
    }

    let comments: FacebookComment[] = [];
    if (page) {
      try {
        comments = await FacebookCommentsService.getComments({
          organizationId,
          workspaceId,
          userId,
          pageId: page.pageId,
        });
      } catch (error: any) {
        console.warn('[MariBusinessIntelligence] Facebook comments notice:', error?.message || error);
      }
    }

    const periodPosts = posts.filter((post) =>
      post.status === 'published' && isWithinPeriod(post.publishedAt, startMs, endMs)
    );

    const totalReactions = periodPosts.reduce((sum, post) => sum + numberValue(post.engagement?.likes), 0);
    const totalComments = periodPosts.reduce((sum, post) => sum + numberValue(post.engagement?.comments), 0);
    const totalShares = periodPosts.reduce((sum, post) => sum + numberValue(post.engagement?.shares), 0);
    const totalReach = periodPosts.reduce((sum, post) => sum + numberValue(post.engagement?.reach), 0);
    const totalEngagement = totalReactions + totalComments + totalShares;
    const engagementRatePct = totalReach > 0 ? Number(((totalEngagement / totalReach) * 100).toFixed(2)) : null;
    const averageEngagementPerPost = periodPosts.length > 0 ? Number((totalEngagement / periodPosts.length).toFixed(2)) : null;
    const postingFrequencyPerWeek = Number(((periodPosts.length / 30) * 7).toFixed(2));

    const rankedPosts = [...periodPosts]
      .sort((a, b) => postEngagement(b) - postEngagement(a))
      .slice(0, 5)
      .map((post) => ({
        id: post.platformPostId || post.id,
        excerpt: cleanText(post.body || post.title || 'Facebook post', 180),
        publishedAt: post.publishedAt,
        permalink: post.permalink,
        mediaType: post.mediaType || 'text',
        reactions: numberValue(post.engagement?.likes),
        comments: numberValue(post.engagement?.comments),
        shares: numberValue(post.engagement?.shares),
        reach: numberValue(post.engagement?.reach) > 0 ? numberValue(post.engagement?.reach) : null,
        engagement: postEngagement(post),
      }));

    const contentTypes: Array<'image' | 'video' | 'text'> = ['image', 'video', 'text'];
    const topContentType = contentTypes
      .map((mediaType) => {
        const matching = periodPosts.filter((post) => (post.mediaType || 'text') === mediaType);
        return {
          mediaType,
          count: matching.length,
          average: matching.length > 0
            ? matching.reduce((sum, post) => sum + postEngagement(post), 0) / matching.length
            : -1,
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => b.average - a.average)[0]?.mediaType || null;

    const customerComments = comments.filter((comment) => !comment.isPageOwner);
    const questions = customerComments.filter((comment) => isQuestion(comment.commentText));
    const unansweredQuestions = questions.filter((comment) =>
      !(comment.replies || []).some((reply) => reply.isPageOwner)
    );
    const answeredCustomerComments = customerComments.filter((comment) =>
      (comment.replies || []).some((reply) => reply.isPageOwner)
    );
    const leadSignals = customerComments.filter((comment) => isLeadSignal(comment.commentText));
    const responseCoveragePct = customerComments.length > 0
      ? Number(((answeredCustomerComments.length / customerComments.length) * 100).toFixed(1))
      : null;

    const sentiment = { positive: 0, neutral: 0, negative: 0 };
    customerComments.forEach((comment) => {
      sentiment[classifySentiment(comment.commentText)] += 1;
    });

    const themeCounts = new Map<string, number>();
    customerComments.forEach((comment) => {
      THEME_RULES.forEach(({ theme, pattern }) => {
        if (pattern.test(comment.commentText)) {
          themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
        }
      });
    });
    const topThemes = Array.from(themeCounts.entries())
      .map(([theme, mentions]) => ({ theme, mentions }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 6);

    const websiteKnowledgeItem = context?.layer1?.websiteKnowledge;
    const websiteKnowledge = websiteKnowledgeItem?.value;
    const websiteUrl = cleanText(context?.layer1?.websiteUrl?.value || '', 400) || null;
    const websiteSummary = extractWebsiteSummary(websiteKnowledge);
    const websiteConnected = Boolean(websiteUrl || websiteKnowledge);

    const companyName = cleanText(
      context?.layer1?.companyName?.value || params.companyName || context?.organizationName || '',
      180
    ) || 'Unconfigured business';

    const opportunities: string[] = [];
    const risks: string[] = [];
    const recommendations: string[] = [];

    if (unansweredQuestions.length > 0) {
      opportunities.push(`${unansweredQuestions.length} sampled customer question${unansweredQuestions.length === 1 ? '' : 's'} do not yet show a Page-owner reply.`);
      recommendations.push('Review and respond to unanswered Facebook customer questions, prioritising purchase and pricing intent first.');
    }
    if (leadSignals.length > 0) {
      opportunities.push(`${leadSignals.length} sampled Facebook comment${leadSignals.length === 1 ? '' : 's'} contain buying or enquiry intent.`);
      recommendations.push('Route high-intent Facebook conversations into CRM follow-up instead of treating them as engagement only.');
    }
    if (rankedPosts[0]) {
      opportunities.push(`The strongest recent post in the measured sample generated ${rankedPosts[0].engagement} visible interactions.`);
      recommendations.push('Reuse the topic and format of the strongest recent post as an evidence-led content pattern, then compare the next result.');
    }
    if (periodPosts.length === 0 && page) {
      risks.push('No published Facebook posts were found in the last 30 days from the currently available data.');
      recommendations.push('Restore a consistent publishing cadence and measure each post against the next 30-day baseline.');
    } else if (postingFrequencyPerWeek < 1) {
      risks.push(`Publishing cadence is below one measured Facebook post per week (${postingFrequencyPerWeek}/week).`);
      recommendations.push('Increase publishing consistency before drawing strong conclusions from content-format performance.');
    }
    if (sentiment.negative > 0) {
      risks.push(`${sentiment.negative} sampled customer comment${sentiment.negative === 1 ? '' : 's'} contain negative-language signals that should be reviewed by a person.`);
    }
    if (!websiteConnected) {
      risks.push('Website knowledge is not currently available to the intelligence snapshot.');
      recommendations.push('Connect or refresh website knowledge so Mari can compare owned messaging with customer response.');
    }
    if (page && totalReach === 0) {
      risks.push('Facebook reach data is unavailable for the measured posts, so engagement rate cannot be calculated reliably.');
    }

    const sources: MariIntelligenceSource[] = ['BUSINESS_PROFILE'];
    if (websiteConnected) sources.push('WEBSITE');
    if (page) sources.push('FACEBOOK_PAGE');
    if (posts.length > 0) sources.push('FACEBOOK_POSTS');
    if (comments.length > 0) sources.push('FACEBOOK_COMMENTS');

    return {
      version: '1.0',
      organizationId,
      workspaceId,
      generatedAt: generatedAt.toISOString(),
      period: {
        days: 30,
        start: new Date(startMs).toISOString(),
        end: generatedAt.toISOString(),
      },
      businessProfile: {
        companyName,
        industry: cleanText(context?.layer1?.industry?.value || '', 240) || null,
        targetMarket: cleanText(context?.layer1?.targetMarket?.value || '', 400) || null,
        valueProposition: cleanText(context?.layer1?.valueProposition?.value || '', 600) || null,
        productsAndServices: getProducts(context),
      },
      websiteIntelligence: {
        connected: websiteConnected,
        url: websiteUrl,
        summary: websiteSummary,
        knowledgeAvailable: Boolean(websiteKnowledge),
        provenance: websiteKnowledgeItem?.provenance || null,
        lastVerifiedAt: websiteKnowledgeItem?.lastVerifiedAt || null,
      },
      facebookIntelligence: {
        connected: Boolean(page),
        pageId: page?.pageId || null,
        pageName: page?.name || null,
        username: page?.username || null,
        followers: page ? (analytics?.followers ?? page.followersCount ?? null) : null,
        followerGrowth30dPct: null,
        analyticsAvailable: Boolean(analytics?.analyticsAvailable),
        provenance: analytics?.provenance || null,
      },
      contentPerformance: {
        posts30d: periodPosts.length,
        totalReactions30d: totalReactions,
        totalComments30d: totalComments,
        totalShares30d: totalShares,
        totalReach30d: totalReach > 0 ? totalReach : null,
        totalEngagement30d: totalEngagement,
        engagementRatePct,
        averageEngagementPerPost,
        postingFrequencyPerWeek,
        topContentType,
        topPosts: rankedPosts,
      },
      audienceIntelligence: {
        commentsSampled: comments.length,
        customerCommentsSampled: customerComments.length,
        questionsDetected: questions.length,
        unansweredQuestions: unansweredQuestions.length,
        leadSignals: leadSignals.length,
        responseCoveragePct,
        sentiment: {
          ...sentiment,
          method: 'DETERMINISTIC_KEYWORD_HEURISTIC',
        },
        topThemes,
      },
      growthMetrics: {
        followerGrowth30dPct: null,
        engagementRatePct,
        postingFrequencyPerWeek,
        commentsPerPost: periodPosts.length > 0 ? Number((totalComments / periodPosts.length).toFixed(2)) : null,
        responseCoveragePct,
        historicalGrowthStatus: 'INSUFFICIENT_HISTORICAL_DATA',
      },
      opportunities,
      risks,
      recommendations: Array.from(new Set(recommendations)).slice(0, 8),
      dataFreshness: {
        businessContextAssembledAt: context?.assembledAt || null,
        facebookLastSyncedAt: analytics?.lastSyncedAt || null,
        generatedAt: generatedAt.toISOString(),
      },
      sources,
    };
  }

  static toPromptContext(snapshot: MariBusinessIntelligenceSnapshot): string {
    const topPosts = snapshot.contentPerformance.topPosts.slice(0, 3)
      .map((post, index) => `${index + 1}. ${post.excerpt || 'Post'} — ${post.engagement} interactions${post.reach ? `, reach ${post.reach}` : ''}`)
      .join(' | ');
    const themes = snapshot.audienceIntelligence.topThemes
      .map((item) => `${item.theme} (${item.mentions})`)
      .join(', ');

    return [
      '[DETERMINISTIC MARI BUSINESS INTELLIGENCE — DO NOT INVENT MISSING METRICS]',
      `Measured period: ${snapshot.period.start.slice(0, 10)} to ${snapshot.period.end.slice(0, 10)} (30 days)`,
      `Sources: ${snapshot.sources.join(', ')}`,
      `Website knowledge: ${snapshot.websiteIntelligence.knowledgeAvailable ? 'available' : 'not available'}`,
      `Facebook Page: ${snapshot.facebookIntelligence.connected ? snapshot.facebookIntelligence.pageName : 'not connected'}`,
      `Facebook followers: ${snapshot.facebookIntelligence.followers ?? 'not available'}`,
      'Follower growth 30d: not available yet — historical snapshots are required; never state this as 0%.',
      `Posts in measured 30d: ${snapshot.contentPerformance.posts30d}`,
      `Visible interactions in measured 30d: ${snapshot.contentPerformance.totalEngagement30d} (${snapshot.contentPerformance.totalReactions30d} reactions, ${snapshot.contentPerformance.totalComments30d} comments, ${snapshot.contentPerformance.totalShares30d} shares)`,
      `Reach in measured 30d: ${snapshot.contentPerformance.totalReach30d ?? 'not available'}`,
      `Engagement rate: ${snapshot.contentPerformance.engagementRatePct == null ? 'not calculable without reach' : `${snapshot.contentPerformance.engagementRatePct}%`}`,
      `Posting frequency: ${snapshot.contentPerformance.postingFrequencyPerWeek} posts/week`,
      `Best measured content type: ${snapshot.contentPerformance.topContentType || 'not enough data'}`,
      `Top recent posts: ${topPosts || 'not enough data'}`,
      `Customer comments sampled: ${snapshot.audienceIntelligence.customerCommentsSampled}`,
      `Questions detected: ${snapshot.audienceIntelligence.questionsDetected}; unanswered in sample: ${snapshot.audienceIntelligence.unansweredQuestions}`,
      `Buying/enquiry intent signals: ${snapshot.audienceIntelligence.leadSignals}`,
      `Page reply coverage in sampled customer comments: ${snapshot.audienceIntelligence.responseCoveragePct == null ? 'not enough data' : `${snapshot.audienceIntelligence.responseCoveragePct}%`}`,
      `Comment sentiment heuristic: ${snapshot.audienceIntelligence.sentiment.positive} positive, ${snapshot.audienceIntelligence.sentiment.neutral} neutral, ${snapshot.audienceIntelligence.sentiment.negative} negative. Treat this as a keyword heuristic, not a definitive emotion judgment.`,
      `Customer themes: ${themes || 'not enough comment data'}`,
      `Evidence-based opportunities: ${snapshot.opportunities.join(' | ') || 'none established from current data'}`,
      `Risks/data gaps: ${snapshot.risks.join(' | ') || 'none established from current data'}`,
      `Recommended next moves: ${snapshot.recommendations.join(' | ') || 'collect more measured data before making a strong recommendation'}`,
      'When answering performance/growth questions, cite these measured figures naturally. Clearly separate facts, deterministic metrics, heuristic comment signals, and recommendations.',
    ].join('\n');
  }
}
