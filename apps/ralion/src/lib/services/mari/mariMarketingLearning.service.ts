import 'server-only';

import { getPrivilegedSupabase } from '../../supabase/server';

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

function uuid(value: string, field: string) {
  const clean = String(value || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) throw new Error(`${field} must be a canonical UUID.`);
  return clean;
}

function confidenceFor(sample: number, separation: number): number {
  // Conservative by design: small samples can never become high-confidence claims.
  const sampleWeight = Math.min(1, sample / 12);
  const effectWeight = Math.min(1, Math.max(0, separation) / 0.75);
  return Number(Math.min(0.92, 0.2 + (sampleWeight * 0.45) + (effectWeight * 0.27)).toFixed(3));
}

function learningStatus(confidence: number, contradictory: boolean): MarketingLearning['status'] {
  if (contradictory) return 'CONTESTED';
  return confidence >= 0.68 ? 'SUPPORTED' : 'EMERGING';
}

export class MariMarketingLearningService {
  static async refreshFromBusinessIntelligence(params: TenantParams, snapshot: any) {
    const organizationId = uuid(params.organizationId, 'organizationId');
    const workspaceId = uuid(params.workspaceId, 'workspaceId');
    const db = getPrivilegedSupabase();
    const topPosts = Array.isArray(snapshot?.contentPerformance?.topPosts) ? snapshot.contentPerformance.topPosts : [];
    const posts30d = Number(snapshot?.contentPerformance?.posts30d || 0);
    if (posts30d < 2 || topPosts.length < 2) return { learned: 0, reason: 'INSUFFICIENT_COMPARABLE_EVIDENCE' };

    const groups = new Map<string, number[]>();
    for (const post of topPosts) {
      const type = String(post.mediaType || 'text').toLowerCase();
      const values = groups.get(type) || [];
      values.push(Number(post.engagement || 0));
      groups.set(type, values);
    }
    if (groups.size < 2) return { learned: 0, reason: 'NO_CONTENT_TYPE_COMPARISON' };

    const ranked = Array.from(groups.entries()).map(([type, values]) => ({
      type,
      count: values.length,
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    })).sort((a, b) => b.avg - a.avg);
    const best = ranked[0];
    const runner = ranked[1];
    const sample = best.count + runner.count;
    const separation = best.avg > 0 ? (best.avg - runner.avg) / best.avg : 0;
    const confidence = confidenceFor(sample, separation);
    const contradictory = separation < 0.1;
    const status = learningStatus(confidence, contradictory);
    const claim = contradictory
      ? `Recent evidence does not show a reliable content-type advantage between ${best.type} and ${runner.type}.`
      : `${best.type} content is currently associated with stronger engagement than ${runner.type} content for this workspace; continue testing before treating this as causal.`;
    const evidenceSummary = `${sample} comparable top-post observations in the current BI window; ${best.type} avg engagement ${best.avg.toFixed(1)} vs ${runner.type} ${runner.avg.toFixed(1)}. Association only; organic post selection and audience conditions may confound results.`;

    const { error } = await db.from('mari_marketing_learnings').upsert({
      organization_id: organizationId,
      workspace_id: workspaceId,
      learning_key: `content-type:${best.type}:vs:${runner.type}`,
      category: 'CONTENT_TYPE',
      claim,
      evidence_summary: evidenceSummary,
      confidence,
      evidence_count: sample,
      status,
      last_observed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,workspace_id,learning_key' });
    if (error) throw new Error(`[MariMarketingLearning] learning upsert failed: ${error.code}`);
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
