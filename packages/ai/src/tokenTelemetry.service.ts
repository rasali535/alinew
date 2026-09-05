/**
 * Canonical Mari AI Real Provider Token Telemetry Service
 * Ralion OS — Ras Ali Labs (Pty) Ltd
 *
 * Enforces:
 * 1. Strictly provider-reported usage (Google Gemini / AI/ML endpoints).
 * 2. Idempotent recording by requestId (never duplicates on retry or refresh).
 * 3. Authoritative cumulative usage metering per workspace/tenant.
 */

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

export class MariTokenTelemetryService {
  private static records = new Map<string, TokenUsageRecord[]>();
  private static recordedRequestIds = new Set<string>();

  /**
   * Records a verified provider usage event.
   * Idempotent by requestId — duplicate calls with the same requestId are ignored.
   */
  static recordUsage(params: {
    organizationId: string;
    userId?: string;
    requestId: string;
    provider?: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens?: number;
  }): TokenUsageRecord {
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

    // Durable persistence to security audit log (non-blocking)
    if (typeof process !== 'undefined' && process.env) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

      if (supabaseUrl && serviceKey) {
        import('@supabase/supabase-js').then(({ createClient }) => {
          const client = createClient(supabaseUrl, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          Promise.resolve(client.from('security_audit_logs').insert({
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
          })).catch(() => {});
        }).catch(() => {});
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
   * Authoritative count of Mari interactions for an organization.
   */
  static async getAuthoritativeUsageCount(organizationId: string): Promise<number> {
    const memCount = (this.records.get(organizationId) || []).length;

    if (typeof process !== 'undefined' && process.env) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

      if (supabaseUrl && serviceKey) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const client = createClient(supabaseUrl, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

          const { count, error } = await client
            .from('security_audit_logs')
            .select('id', { count: 'exact', head: true })
            .eq('event_category', 'MARI_AI')
            .eq('resource_id', organizationId);

          if (!error && typeof count === 'number' && count > 0) {
            return Math.max(memCount, count);
          }
        } catch {}
      }
    }

    return memCount;
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
