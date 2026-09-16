import 'server-only';

import { createHash } from 'crypto';
import { getPrivilegedSupabase } from '../../supabase/server';
import { FacebookPageManagementService, type FacebookPagePostItem } from '../social/facebookPageManagement.service';

export interface MarketingLearning {
  id: string;
  category: string;
  claim: string;
  evidenceSummary: string;
  confidence: number;
  evidenceCount: number;
  status: 'EMERGING' | 'SUPPORTED' | 'CONTESTED' | 'STALE';
  updatedAt: string;
}

interface TenantParams { organizationId: string; workspaceId: string; userId: string; }

interface LearningRefreshResult {
  matchedPublications: number;
  experimentsCreated: number;
  outcomesCreated: number;
  learned: number;
  reason?: string;
  confidence?: number;
  status?: MarketingLearning['status'];
}

function uuid(value: string, field: string) {
  const clean = String(value || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) throw new Error(`${field} must be a canonical UUID.`);
  return clean;
}

function numberOrZero(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeContentType(mediaTypes: unknown, pagePost?: FacebookPagePostItem): 'image' | 'video' | 'text' {
  const first = Array.isArray(mediaTypes) ? String(mediaTypes[0] || '').toLowerCase() : '';
  if (first.includes('video')) return 'video';
  if (first.includes('image')) return 'image';
  if (pagePost?.mediaType === 'video') return 'video';
  if (pagePost?.mediaType === 'image') return 'image';
  return 'text';
}

function metricHash(value: Record<string, unknown>): string {
  const ordered = Object.keys(value).sort().reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = value[key];
    return acc;
  }, {});
  return createHash('sha256').update(JSON.stringify(ordered)).digest('hex');
}

function confidenceFor(sample: number, separation: number, metricQuality: 'RATE' | 'RAW'): number {
  const sampleWeight = Math.min(1, sample / 16);
  const effectWeight = Math.min(1, Math.max(0, separation) / 0.75);
  const qualityCeiling = metricQuality === 'RATE' ? 0.88 : 0.58;
  const calculated = 0.18 + (sampleWeight * 0.43) + (effectWeight * 0.25);
  return Number(Math.min(qualityCeiling, calculated).toFixed(3));
}

function learningStatus(confidence: number, contradictory: boolean): MarketingLearning['status'] {
  if (contradictory) return 'CONTESTED';
  return confidence >= 0.68 ? 'SUPPORTED' : 'EMERGING';
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function pagePostLookup(posts: FacebookPagePostItem[]): Map<string, FacebookPagePostItem> {
  const map = new Map<string, FacebookPagePostItem>();
  for (const post of posts) {
    const keys = [post.platformPostId, post.id].filter(Boolean) as string[];
    for (const key of keys) if (!map.has(key)) map.set(key, post);
  }
  return map;
}

export class MariMarketingLearningService {
  /**
   * Refreshes the durable experiment/outcome ledger from canonical Ralion publication
   * history matched to live Facebook post evidence. The BI snapshot parameter remains
   * for API compatibility, but top-post samples are intentionally not used for learning.
   */
  static async refreshFromBusinessIntelligence(params: TenantParams, _snapshot: any): Promise<LearningRefreshResult> {
    return this.refreshFromPublishedPerformance(params);
  }

  static async refreshFromPublishedPerformance(params: TenantParams): Promise<LearningRefreshResult> {
    const organizationId = uuid(params.organizationId, 'organizationId');
    const workspaceId = uuid(params.workspaceId, 'workspaceId');
    const userId = uuid(params.userId, 'userId');
    const db = getPrivilegedSupabase();

    const { data: publicationRows, error: publicationError } = await db
      .from('social_posts')
      .select('id,title,body,media_types,platforms,status,platform_post_ids,platform_results,published_at,created_at,content_id')
      .eq('organization_id', organizationId)
      .eq('workspace_id', workspaceId)
      .contains('platforms', ['facebook'])
      .in('status', ['PUBLISHED', 'PARTIALLY_PUBLISHED'])
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(100);
    if (publicationError) throw new Error(`[MariMarketingLearning] publication history read failed: ${publicationError.code}`);
    if (!(publicationRows || []).length) {
      return { matchedPublications: 0, experimentsCreated: 0, outcomesCreated: 0, learned: 0, reason: 'NO_CANONICAL_PUBLICATION_HISTORY' };
    }

    let livePosts: FacebookPagePostItem[] = [];
    try {
      livePosts = await FacebookPageManagementService.getPagePosts({ organizationId, workspaceId, userId, limit: 100 });
    } catch (error: any) {
      console.warn('[MariMarketingLearning] Live Facebook evidence unavailable:', error?.message || error);
    }
    if (!livePosts.length) {
      return { matchedPublications: 0, experimentsCreated: 0, outcomesCreated: 0, learned: 0, reason: 'NO_LIVE_POST_EVIDENCE' };
    }

    const liveById = pagePostLookup(livePosts);
    let matchedPublications = 0;
    let experimentsCreated = 0;
    let outcomesCreated = 0;

    for (const publication of publicationRows || []) {
      const platformPostId = String(
        publication.platform_post_ids?.facebook ||
        publication.platform_results?.facebook?.postId ||
        publication.platform_results?.facebook?.id ||
        ''
      ).trim();
      if (!platformPostId) continue;

      const observedPost = liveById.get(platformPostId);
      if (!observedPost) continue;
      matchedPublications += 1;

      const contentType = normalizeContentType(publication.media_types, observedPost);
      const publishedAt = publication.published_at || publication.created_at || new Date().toISOString();
      let experimentId: string | null = null;

      const { data: existingExperiment, error: existingError } = await db
        .from('mari_marketing_experiments')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('workspace_id', workspaceId)
        .eq('source_type', 'SOCIAL_POST')
        .eq('source_id', publication.id)
        .maybeSingle();
      if (existingError) throw new Error(`[MariMarketingLearning] experiment lookup failed: ${existingError.code}`);

      if (existingExperiment?.id) {
        experimentId = existingExperiment.id;
        const { error: updateError } = await db.from('mari_marketing_experiments').update({
          content_type: contentType,
          status: 'COMPLETED',
          ended_at: observedPost.publishedAt || publishedAt,
          variables: {
            platform: 'facebook',
            platformPostId,
            socialPostId: publication.id,
            growthContentId: publication.content_id || null,
            title: publication.title || null,
            evidenceSource: observedPost.source,
          },
          updated_at: new Date().toISOString(),
        }).eq('id', experimentId).eq('organization_id', organizationId).eq('workspace_id', workspaceId);
        if (updateError) throw new Error(`[MariMarketingLearning] experiment update failed: ${updateError.code}`);
      } else {
        const { data: inserted, error: insertError } = await db.from('mari_marketing_experiments').insert({
          organization_id: organizationId,
          workspace_id: workspaceId,
          created_by: userId,
          source_type: 'SOCIAL_POST',
          source_id: publication.id,
          hypothesis: `Observational record for published ${contentType} content; no pre-registered causal hypothesis.`,
          content_type: contentType,
          variables: {
            platform: 'facebook',
            platformPostId,
            socialPostId: publication.id,
            growthContentId: publication.content_id || null,
            title: publication.title || null,
            evidenceSource: observedPost.source,
          },
          status: 'COMPLETED',
          started_at: publishedAt,
          ended_at: observedPost.publishedAt || publishedAt,
        }).select('id').single();
        if (insertError) {
          // A concurrent refresh may have created the stable source experiment.
          const { data: raced } = await db.from('mari_marketing_experiments').select('id')
            .eq('organization_id', organizationId).eq('workspace_id', workspaceId)
            .eq('source_type', 'SOCIAL_POST').eq('source_id', publication.id).maybeSingle();
          if (!raced?.id) throw new Error(`[MariMarketingLearning] experiment insert failed: ${insertError.code}`);
          experimentId = raced.id;
        } else {
          experimentId = inserted.id;
          experimentsCreated += 1;
        }
      }

      if (!experimentId) continue;
      const reactions = numberOrZero(observedPost.engagement?.likes);
      const comments = numberOrZero(observedPost.engagement?.comments);
      const shares = numberOrZero(observedPost.engagement?.shares);
      const reach = numberOrZero(observedPost.engagement?.reach);
      const engagement = reactions + comments + shares;
      const engagementRatePct = reach > 0 ? Number(((engagement / reach) * 100).toFixed(4)) : null;
      const rawMetrics = {
        platform: 'facebook',
        platformPostId,
        source: observedPost.source,
        reactions,
        comments,
        shares,
        reach,
        engagement,
        engagementRatePct,
      };
      const hash = metricHash(rawMetrics);

      const { data: existingOutcome, error: outcomeLookupError } = await db
        .from('mari_marketing_outcomes')
        .select('id')
        .eq('experiment_id', experimentId)
        .eq('metrics_hash', hash)
        .maybeSingle();
      if (outcomeLookupError) throw new Error(`[MariMarketingLearning] outcome lookup failed: ${outcomeLookupError.code}`);
      if (!existingOutcome?.id) {
        const ageDays = Math.max(1, Math.min(365, Math.ceil((Date.now() - Date.parse(publishedAt)) / (24 * 60 * 60 * 1000)) || 1));
        const { error: outcomeError } = await db.from('mari_marketing_outcomes').insert({
          organization_id: organizationId,
          workspace_id: workspaceId,
          experiment_id: experimentId,
          metric_window_days: ageDays,
          reach: reach || null,
          reactions,
          comments,
          shares,
          engagement,
          engagement_rate_pct: engagementRatePct,
          raw_metrics: rawMetrics,
          metrics_hash: hash,
          observed_at: new Date().toISOString(),
        });
        if (!outcomeError) outcomesCreated += 1;
        else if (outcomeError.code !== '23505') throw new Error(`[MariMarketingLearning] outcome insert failed: ${outcomeError.code}`);
      }
    }

    const derived = await this.deriveContentTypeLearning({ organizationId, workspaceId, userId });
    return {
      matchedPublications,
      experimentsCreated,
      outcomesCreated,
      learned: derived.learned,
      reason: derived.reason,
      confidence: derived.confidence,
      status: derived.status,
    };
  }

  private static async deriveContentTypeLearning(params: TenantParams): Promise<{ learned: number; reason?: string; confidence?: number; status?: MarketingLearning['status'] }> {
    const organizationId = uuid(params.organizationId, 'organizationId');
    const workspaceId = uuid(params.workspaceId, 'workspaceId');
    const db = getPrivilegedSupabase();
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data: experiments, error: experimentError } = await db.from('mari_marketing_experiments')
      .select('id,content_type,started_at')
      .eq('organization_id', organizationId).eq('workspace_id', workspaceId)
      .eq('source_type', 'SOCIAL_POST').eq('status', 'COMPLETED')
      .gte('started_at', since).limit(200);
    if (experimentError) throw new Error(`[MariMarketingLearning] experiment evidence read failed: ${experimentError.code}`);
    if (!(experiments || []).length) return { learned: 0, reason: 'NO_EXPERIMENT_EVIDENCE' };

    const experimentIds = (experiments || []).map((item: any) => item.id);
    const { data: outcomes, error: outcomeError } = await db.from('mari_marketing_outcomes')
      .select('experiment_id,engagement,engagement_rate_pct,reach,observed_at')
      .eq('organization_id', organizationId).eq('workspace_id', workspaceId)
      .in('experiment_id', experimentIds)
      .order('observed_at', { ascending: false });
    if (outcomeError) throw new Error(`[MariMarketingLearning] outcome evidence read failed: ${outcomeError.code}`);

    const latestByExperiment = new Map<string, any>();
    for (const outcome of outcomes || []) if (!latestByExperiment.has(outcome.experiment_id)) latestByExperiment.set(outcome.experiment_id, outcome);
    const evidence = (experiments || []).map((experiment: any) => ({ ...experiment, outcome: latestByExperiment.get(experiment.id) })).filter((item: any) => item.outcome);
    if (evidence.length < 4) return { learned: 0, reason: 'INSUFFICIENT_EXPERIMENT_COUNT' };

    const rateEvidence = evidence.filter((item: any) => Number(item.outcome.reach || 0) > 0 && item.outcome.engagement_rate_pct != null);
    const useRate = rateEvidence.length >= 4;
    const selected = useRate ? rateEvidence : evidence;
    const metricQuality: 'RATE' | 'RAW' = useRate ? 'RATE' : 'RAW';
    const groups = new Map<string, Array<{ id: string; value: number }>>();
    for (const item of selected) {
      const type = String(item.content_type || 'text').toLowerCase();
      const value = useRate ? numberOrZero(item.outcome.engagement_rate_pct) : numberOrZero(item.outcome.engagement);
      const values = groups.get(type) || [];
      values.push({ id: item.id, value });
      groups.set(type, values);
    }

    const comparable = Array.from(groups.entries()).filter(([, values]) => values.length >= 2).map(([type, values]) => ({
      type,
      values,
      count: values.length,
      avg: average(values.map((item) => item.value)),
    })).sort((a, b) => b.avg - a.avg);
    if (comparable.length < 2) return { learned: 0, reason: 'INSUFFICIENT_PER_TYPE_EVIDENCE' };

    const best = comparable[0];
    const runner = comparable[1];
    const sample = best.count + runner.count;
    const separation = best.avg > 0 ? Math.max(0, (best.avg - runner.avg) / best.avg) : 0;
    const contradictory = separation < 0.1;
    const confidence = confidenceFor(sample, separation, metricQuality);
    const status = learningStatus(confidence, contradictory);
    const metricLabel = useRate ? 'engagement rate' : 'raw engagement';
    const unit = useRate ? '%' : '';
    const claim = contradictory
      ? `Recent matched publication evidence does not show a reliable ${metricLabel} advantage between ${best.type} and ${runner.type} content.`
      : `${best.type} content is currently associated with higher observed ${metricLabel} than ${runner.type} content for this workspace; continue controlled testing before treating this as causal.`;
    const evidenceSummary = `${sample} matched published posts over the last 90 days; ${best.type} n=${best.count}, avg ${metricLabel} ${best.avg.toFixed(2)}${unit}; ${runner.type} n=${runner.count}, avg ${runner.avg.toFixed(2)}${unit}. ${useRate ? 'Reach-normalized engagement was available.' : 'Reach was incomplete, so raw engagement was used and confidence is capped.'} Association only.`;
    const stableTypes = [best.type, runner.type].sort();
    const supportingIds = [...best.values, ...runner.values].map((item) => item.id);

    const { error: learningError } = await db.from('mari_marketing_learnings').upsert({
      organization_id: organizationId,
      workspace_id: workspaceId,
      learning_key: `content-type:${stableTypes[0]}:vs:${stableTypes[1]}`,
      category: 'CONTENT_TYPE',
      claim,
      evidence_summary: evidenceSummary,
      confidence,
      evidence_count: sample,
      supporting_experiment_ids: supportingIds,
      contradicting_experiment_ids: [],
      status,
      last_observed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,workspace_id,learning_key' });
    if (learningError) throw new Error(`[MariMarketingLearning] learning upsert failed: ${learningError.code}`);
    return { learned: 1, confidence, status };
  }

  static async listLearnings(params: TenantParams, limit = 12): Promise<MarketingLearning[]> {
    const organizationId = uuid(params.organizationId, 'organizationId');
    const workspaceId = uuid(params.workspaceId, 'workspaceId');
    const db = getPrivilegedSupabase();
    const { data, error } = await db.from('mari_marketing_learnings').select('*')
      .eq('organization_id', organizationId).eq('workspace_id', workspaceId)
      .order('confidence', { ascending: false }).order('updated_at', { ascending: false }).limit(Math.min(30, Math.max(1, limit)));
    if (error) throw new Error(`[MariMarketingLearning] learning read failed: ${error.code}`);
    return (data || []).map((row: any) => ({
      id: row.id, category: row.category, claim: row.claim, evidenceSummary: row.evidence_summary,
      confidence: Number(row.confidence), evidenceCount: Number(row.evidence_count), status: row.status, updatedAt: row.updated_at,
    }));
  }

  static async getReasoningContext(params: TenantParams): Promise<string> {
    const learnings = await this.listLearnings(params, 10);
    if (!learnings.length) return '[TENANT MARKETING LEARNING]\nNo evidence-backed marketing learnings exist yet. Do not invent historical performance patterns.';
    const evidence = learnings.map((l) => `- [${l.status}; confidence ${l.confidence}; n=${l.evidenceCount}] ${l.claim} Evidence: ${l.evidenceSummary}`).join('\n');
    return `[TENANT MARKETING LEARNING — EVIDENCE BACKED]\n${evidence}\nSTRICT RULES:\n- Treat learnings as workspace-specific associations, not universal truths or proof of causation.\n- State uncertainty when evidence is sparse or contested.\n- Prefer a controlled experiment when confidence is low.\n- Never fabricate metrics, experiments or outcomes.\n- Use learnings to recommend original next tests, not automatic publishing.`;
  }
}
