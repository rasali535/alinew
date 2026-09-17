import 'server-only';
import { createHash, randomBytes } from 'crypto';
import { getServiceSupabase } from '../../auth/serverAuth';

export type MariApiScope = 'intelligence:read' | 'knowledge:read' | 'analysis:run';

export interface MariApiKeyRecord {
  id: string;
  organizationId: string;
  workspaceId: string;
  createdBy: string | null;
  name: string;
  keyPrefix: string;
  scopes: MariApiScope[];
  status: 'ACTIVE' | 'REVOKED';
  monthlyRequestLimit: number;
  monthlyCreditLimit: number;
  expiresAt: string | null;
  lastUsedAt: string | null;
  requestCount: number;
  createdAt: string;
}

export interface MariApiAuthContext extends MariApiKeyRecord {
  monthlyRequestsUsed: number;
  monthlyCreditsUsed: number;
  monthlyRequestsRemaining: number;
  monthlyCreditsRemaining: number;
}

const ALLOWED_SCOPES: MariApiScope[] = ['intelligence:read', 'knowledge:read', 'analysis:run'];

function hashKey(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function hashIp(value: string, keyId: string): string {
  return createHash('sha256').update(`${keyId}:${value}`).digest('hex');
}

function mapKey(row: any): MariApiKeyRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    workspaceId: row.workspace_id,
    createdBy: row.created_by || null,
    name: row.name,
    keyPrefix: row.key_prefix,
    scopes: Array.isArray(row.scopes) ? row.scopes : [],
    status: row.status,
    monthlyRequestLimit: Number(row.monthly_request_limit || 0),
    monthlyCreditLimit: Number(row.monthly_credit_limit || 0),
    expiresAt: row.expires_at || null,
    lastUsedAt: row.last_used_at || null,
    requestCount: Number(row.request_count || 0),
    createdAt: row.created_at,
  };
}

export class MariApiKeyService {
  static normalizeScopes(scopes?: string[]): MariApiScope[] {
    const source = Array.isArray(scopes) && scopes.length > 0
      ? scopes
      : ['intelligence:read', 'knowledge:read'];
    return Array.from(new Set(source.filter((scope): scope is MariApiScope => ALLOWED_SCOPES.includes(scope as MariApiScope))));
  }

  static async createKey(params: {
    organizationId: string;
    workspaceId: string;
    createdBy: string;
    name: string;
    scopes?: string[];
    monthlyRequestLimit?: number;
    monthlyCreditLimit?: number;
    expiresAt?: string | null;
  }): Promise<{ apiKey: string; record: MariApiKeyRecord }> {
    const db = getServiceSupabase();
    const secret = `mari_live_${randomBytes(30).toString('base64url')}`;
    const scopes = this.normalizeScopes(params.scopes);
    if (!scopes.length) throw new Error('At least one valid Mari API scope is required.');

    const monthlyRequestLimit = Math.max(1, Math.min(Number(params.monthlyRequestLimit || 1000), 1000000));
    const monthlyCreditLimit = Math.max(1, Math.min(Number(params.monthlyCreditLimit || 1000), 1000000));
    const name = String(params.name || '').trim().slice(0, 120);
    if (!name) throw new Error('API key name is required.');

    const row = {
      organization_id: params.organizationId,
      workspace_id: params.workspaceId,
      created_by: params.createdBy,
      name,
      key_prefix: secret.slice(0, 18),
      key_hash: hashKey(secret),
      scopes,
      status: 'ACTIVE',
      monthly_request_limit: monthlyRequestLimit,
      monthly_credit_limit: monthlyCreditLimit,
      expires_at: params.expiresAt || null,
    };

    const { data, error } = await db
      .from('mari_api_keys')
      .insert(row)
      .select('*')
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to create Mari API key.');
    return { apiKey: secret, record: mapKey(data) };
  }

  static async listKeys(params: { organizationId: string; workspaceId: string }): Promise<MariApiKeyRecord[]> {
    const db = getServiceSupabase();
    const { data, error } = await db
      .from('mari_api_keys')
      .select('*')
      .eq('organization_id', params.organizationId)
      .eq('workspace_id', params.workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapKey);
  }

  static async revokeKey(params: { keyId: string; organizationId: string; workspaceId: string }): Promise<void> {
    const db = getServiceSupabase();
    const { error } = await db
      .from('mari_api_keys')
      .update({ status: 'REVOKED', updated_at: new Date().toISOString() })
      .eq('id', params.keyId)
      .eq('organization_id', params.organizationId)
      .eq('workspace_id', params.workspaceId);
    if (error) throw new Error(error.message);
  }

  static async authenticate(rawKey: string, requiredScope?: MariApiScope, requestIp?: string | null): Promise<MariApiAuthContext> {
    if (!rawKey || !rawKey.startsWith('mari_live_')) {
      const err = new Error('Invalid Mari API key.');
      (err as any).code = 'MARI_API_KEY_INVALID';
      throw err;
    }

    const db = getServiceSupabase();
    const { data, error } = await db
      .from('mari_api_keys')
      .select('*')
      .eq('key_hash', hashKey(rawKey))
      .maybeSingle();

    if (error || !data || data.status !== 'ACTIVE') {
      const err = new Error('Invalid or revoked Mari API key.');
      (err as any).code = 'MARI_API_KEY_INVALID';
      throw err;
    }

    if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
      const err = new Error('Mari API key has expired.');
      (err as any).code = 'MARI_API_KEY_EXPIRED';
      throw err;
    }

    const record = mapKey(data);
    if (requiredScope && !record.scopes.includes(requiredScope)) {
      const err = new Error(`Mari API key is missing required scope: ${requiredScope}`);
      (err as any).code = 'MARI_API_SCOPE_DENIED';
      throw err;
    }

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const { data: usageRows, error: usageError } = await db
      .from('mari_api_usage')
      .select('credits_used')
      .eq('api_key_id', record.id)
      .gte('created_at', monthStart.toISOString());
    if (usageError) throw new Error(usageError.message);

    const monthlyRequestsUsed = usageRows?.length || 0;
    const monthlyCreditsUsed = (usageRows || []).reduce((sum: number, row: any) => sum + Number(row.credits_used || 0), 0);

    if (monthlyRequestsUsed >= record.monthlyRequestLimit) {
      const err = new Error('Mari API monthly request limit reached.');
      (err as any).code = 'MARI_API_REQUEST_LIMIT_REACHED';
      throw err;
    }
    if (monthlyCreditsUsed >= record.monthlyCreditLimit) {
      const err = new Error('Mari API monthly credit limit reached.');
      (err as any).code = 'MARI_API_CREDIT_LIMIT_REACHED';
      throw err;
    }

    await db
      .from('mari_api_keys')
      .update({
        last_used_at: new Date().toISOString(),
        last_used_ip_hash: requestIp ? hashIp(requestIp, record.id) : data.last_used_ip_hash,
        request_count: Number(data.request_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    return {
      ...record,
      monthlyRequestsUsed,
      monthlyCreditsUsed,
      monthlyRequestsRemaining: Math.max(0, record.monthlyRequestLimit - monthlyRequestsUsed),
      monthlyCreditsRemaining: Math.max(0, record.monthlyCreditLimit - monthlyCreditsUsed),
    };
  }

  static async recordUsage(params: {
    apiKeyId: string;
    organizationId: string;
    workspaceId: string;
    requestId: string;
    endpoint: string;
    statusCode: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    creditsUsed?: number;
    ragChunks?: number;
    model?: string | null;
    latencyMs?: number;
  }): Promise<void> {
    const db = getServiceSupabase();
    const { error } = await db.from('mari_api_usage').upsert({
      api_key_id: params.apiKeyId,
      organization_id: params.organizationId,
      workspace_id: params.workspaceId,
      request_id: params.requestId,
      endpoint: params.endpoint,
      status_code: params.statusCode,
      prompt_tokens: Math.max(0, Number(params.promptTokens || 0)),
      completion_tokens: Math.max(0, Number(params.completionTokens || 0)),
      total_tokens: Math.max(0, Number(params.totalTokens || 0)),
      credits_used: Math.max(0, Number(params.creditsUsed || 0)),
      rag_chunks: Math.max(0, Number(params.ragChunks || 0)),
      model: params.model || null,
      latency_ms: Math.max(0, Number(params.latencyMs || 0)),
    }, { onConflict: 'api_key_id,request_id' });
    if (error) throw new Error(error.message);
  }
}
