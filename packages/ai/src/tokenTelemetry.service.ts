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
