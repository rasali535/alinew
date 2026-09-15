/**
 * Canonical Mari AI Real Provider Token Telemetry Service
 * Ralion OS — Ras Ali Labs (Pty) Ltd
 *
 * Enforces:
 * 1. Strictly provider-reported usage (Google Gemini / AI/ML endpoints).
 * 2. Idempotent recording by requestId (never duplicates on retry or refresh).
 * 3. Authoritative cumulative usage metering per workspace/tenant.
 */

import 'server-only';

export interface TokenUsageRecord {
  id: string;
  organizationId: string;
  userId?: string;
  requestId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  timestamp: string;
}

export interface MariTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.trim().length / 4));
}

export class MariTokenTelemetryService {
  private static records = new Map<string, TokenUsageRecord[]>();
  private static recordedRequestIds = new Set<string>();

  /**
   * Records a verified provider usage event.
   * Idempotent by requestId — duplicate calls with the same requestId are ignored.
   */
  static async recordUsage(params: {
    organizationId: string;
    userId?: string;
    requestId: string;
    provider?: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens?: number;
  }): Promise<TokenUsageRecord> {
    const { organizationId, userId, requestId, provider = 'google', model, inputTokens, outputTokens } = params;
    const totalTokens = params.totalTokens ?? (inputTokens + outputTokens);

    // Idempotency: if already recorded for this requestId, return existing record
    if (this.recordedRequestIds.has(requestId)) {
      const existing = (this.records.get(organizationId) || []).find(r => r.requestId === requestId);
      if (existing) return existing;
    }

    const record: TokenUsageRecord = {
      id: `tok_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId,
      userId,
      requestId,
      provider,
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      timestamp: new Date().toISOString(),
    };

    const list = this.records.get(organizationId) || [];
    list.push(record);
    this.records.set(organizationId, list);
    this.recordedRequestIds.add(requestId);

// Durable persistence is awaited so serverless teardown cannot drop a usage event.
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.env) {
      const env = process.env;
      const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
      const serviceKey = env['SUPABASE_SECRET_KEY'] || env['SUPABASE_SERVICE_ROLE_KEY'] || env['SUPABASE_SERVICE_KEY'];
    
      if (supabaseUrl && serviceKey) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const client = createClient(supabaseUrl, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { error } = await client.from('security_audit_logs').insert({
            event_type: 'MARI_PAGE_ANALYSIS',
            event_category: 'MARI_AI',
            success: true,
            user_id: userId || null,
            actor_user_id: userId || null,
            resource_type: 'TENANT_WORKSPACE',
            resource_id: organizationId,
            metadata: {
              requestId,
              provider,
              model,
              inputTokens,
              outputTokens,
              totalTokens,
              action: 'MARI_AI_QUERY',
            },
            timestamp: record.timestamp,
            created_at: record.timestamp,
          });
          if (error) {
            console.warn('[MariTokenTelemetry] Durable usage insert failed:', error.code || 'DB_ERROR');
          }
        } catch {
          console.warn('[MariTokenTelemetry] Durable usage insert failed: PROVIDER_ERROR');
        }
      }
    }

    return record;
  }

  /**
   * Gets all usage records for an organization.
   */
  static getRecords(organizationId: string): TokenUsageRecord[] {
    return [...(this.records.get(organizationId) || [])];
  }

  /**
   * Calculates total token telemetry for an organization.
   */
  static getTotalUsage(organizationId: string): {
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    requestCount: number;
  } {
    const records = this.records.get(organizationId) || [];
    return records.reduce(
      (acc, r) => ({
        totalPromptTokens: acc.totalPromptTokens + r.inputTokens,
        totalCompletionTokens: acc.totalCompletionTokens + r.outputTokens,
        totalTokens: acc.totalTokens + r.totalTokens,
        requestCount: acc.requestCount + 1,
      }),
      { totalPromptTokens: 0, totalCompletionTokens: 0, totalTokens: 0, requestCount: 0 }
    );
  }

  /**
 * Gets durable, tenant-scoped Mari usage and merges any in-memory events
 * that have not reached the audit log yet. This survives serverless cold starts.
 */
static async getAuthoritativeUsage(organizationId: string): Promise<{
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  requestCount: number;
}> {
  const merged = new Map<string, { inputTokens: number; outputTokens: number; totalTokens: number }>();

  for (const record of this.records.get(organizationId) || []) {
    merged.set(record.requestId, {
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      totalTokens: record.totalTokens,
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const client = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await client
          .from('security_audit_logs')
          .select('id, metadata')
          .eq('event_category', 'MARI_AI')
          .eq('resource_id', organizationId)
          .range(from, from + pageSize - 1);

        if (error) break;
        const rows = data || [];
        for (const row of rows) {
          const metadata = (row as any)?.metadata || {};
          const requestId = String(metadata.requestId || (row as any)?.id || '');
          if (!requestId) continue;
          const inputTokens = Number(metadata.inputTokens || 0);
          const outputTokens = Number(metadata.outputTokens || 0);
          const totalTokens = Number(metadata.totalTokens ?? (inputTokens + outputTokens));
          merged.set(requestId, {
            inputTokens: Number.isFinite(inputTokens) ? inputTokens : 0,
            outputTokens: Number.isFinite(outputTokens) ? outputTokens : 0,
            totalTokens: Number.isFinite(totalTokens) ? totalTokens : 0,
          });
        }

        if (rows.length < pageSize) break;
        from += pageSize;
      }
    } catch {}
  }

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTokens = 0;
  for (const usage of merged.values()) {
    totalPromptTokens += usage.inputTokens;
    totalCompletionTokens += usage.outputTokens;
    totalTokens += usage.totalTokens;
  }

  return {
    totalPromptTokens,
    totalCompletionTokens,
    totalTokens,
    requestCount: merged.size,
  };
}

/**
 * Authoritative count of Mari interactions for an organization.
 */
static async getAuthoritativeUsageCount(organizationId: string): Promise<number> {
  const usage = await this.getAuthoritativeUsage(organizationId);
  return usage.requestCount;
}

  /**
   * Resets records for testing purposes.
   */
  static resetForTesting(organizationId?: string): void {
    if (organizationId) {
      const records = this.records.get(organizationId) || [];
      records.forEach(r => this.recordedRequestIds.delete(r.requestId));
      this.records.delete(organizationId);
    } else {
      this.records.clear();
      this.recordedRequestIds.clear();
    }
  }
}
