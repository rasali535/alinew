import 'server-only';

import { createHash, randomBytes } from 'crypto';
import { getPrivilegedSupabase } from '@/lib/supabase/server';

export const CUSTOMER_API_KEY_PREFIX = 'ralion_live_';
export const MARI_CHAT_SCOPE = 'mari:chat';
export const CUSTOMER_API_KEY_ALLOWED_SCOPES = [MARI_CHAT_SCOPE] as const;

export type CustomerApiKeyScope = (typeof CUSTOMER_API_KEY_ALLOWED_SCOPES)[number];

export interface CustomerApiKeyRecord {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  environment: 'live';
  rateLimitPerMinute: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  rotatedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  status: 'active' | 'expired' | 'revoked';
}

export interface CreatedCustomerApiKey {
  apiKey: CustomerApiKeyRecord;
  secret: string;
}

export interface AuthenticatedCustomerApiKey {
  apiKeyId: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  scopes: string[];
  createdBy: string | null;
  rateLimitPerMinute: number;
}

export interface ApiKeyRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
}

function hashApiKey(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

function generateApiKeyMaterial(): { secret: string; keyPrefix: string; keyHash: string } {
  const randomPart = randomBytes(32).toString('base64url');
  const secret = `${CUSTOMER_API_KEY_PREFIX}${randomPart}`;
  return {
    secret,
    keyPrefix: `${CUSTOMER_API_KEY_PREFIX}${randomPart.slice(0, 8)}`,
    keyHash: hashApiKey(secret),
  };
}

function normalizeScopes(scopes?: string[]): CustomerApiKeyScope[] {
  const requested = Array.isArray(scopes) ? scopes : [MARI_CHAT_SCOPE];
  const allowed = requested.filter((scope): scope is CustomerApiKeyScope =>
    CUSTOMER_API_KEY_ALLOWED_SCOPES.includes(scope as CustomerApiKeyScope)
  );
  return allowed.length > 0 ? Array.from(new Set(allowed)) : [MARI_CHAT_SCOPE];
}

function mapRow(row: any): CustomerApiKeyRecord {
  const now = Date.now();
  const expiresAt = row.expires_at || null;
  const revokedAt = row.revoked_at || null;
  const status: CustomerApiKeyRecord['status'] = revokedAt
    ? 'revoked'
    : expiresAt && Date.parse(expiresAt) <= now
      ? 'expired'
      : 'active';

  return {
    id: row.id,
    organizationId: row.organization_id,
    workspaceId: row.workspace_id,
    name: row.name,
    keyPrefix: row.key_prefix,
    scopes: Array.isArray(row.scopes) ? row.scopes : [],
    environment: 'live',
    rateLimitPerMinute: Number(row.rate_limit_per_minute || 60),
    lastUsedAt: row.last_used_at || null,
    expiresAt,
    revokedAt,
    rotatedAt: row.rotated_at || null,
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    status,
  };
}

const SAFE_SELECT = [
  'id',
  'organization_id',
  'workspace_id',
  'name',
  'key_prefix',
  'scopes',
  'environment',
  'rate_limit_per_minute',
  'last_used_at',
  'expires_at',
  'revoked_at',
  'rotated_at',
  'created_by',
  'created_at',
].join(', ');

export class DeveloperApiKeysService {
  static async list(organizationId: string, workspaceId: string): Promise<CustomerApiKeyRecord[]> {
    const supabase = getPrivilegedSupabase();
    const { data, error } = await supabase
      .from('developer_api_keys')
      .select(SAFE_SELECT)
      .eq('organization_id', organizationId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`[DeveloperApiKeys] Failed to list API keys: ${error.message}`);
    }

    return (data || []).map(mapRow);
  }

  static async create(params: {
    organizationId: string;
    workspaceId: string;
    createdBy: string;
    name: string;
    scopes?: string[];
    expiresAt?: string | null;
    rateLimitPerMinute?: number;
  }): Promise<CreatedCustomerApiKey> {
    const supabase = getPrivilegedSupabase();
    const material = generateApiKeyMaterial();
    const scopes = normalizeScopes(params.scopes);
    const rateLimitPerMinute = Math.max(1, Math.min(10000, Math.floor(params.rateLimitPerMinute || 60)));

    const { data, error } = await supabase
      .from('developer_api_keys')
      .insert({
        organization_id: params.organizationId,
        workspace_id: params.workspaceId,
        name: params.name,
        key_prefix: material.keyPrefix,
        key_hash: material.keyHash,
        scopes,
        environment: 'live',
        rate_limit_per_minute: rateLimitPerMinute,
        expires_at: params.expiresAt || null,
        created_by: params.createdBy,
      })
      .select(SAFE_SELECT)
      .single();

    if (error || !data) {
      throw new Error(`[DeveloperApiKeys] Failed to create API key: ${error?.message || 'No row returned'}`);
    }

    return { apiKey: mapRow(data), secret: material.secret };
  }

  static async revoke(params: { organizationId: string; workspaceId: string; apiKeyId: string }): Promise<CustomerApiKeyRecord | null> {
    const supabase = getPrivilegedSupabase();
    const { data, error } = await supabase
      .from('developer_api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('organization_id', params.organizationId)
      .eq('workspace_id', params.workspaceId)
      .eq('id', params.apiKeyId)
      .is('revoked_at', null)
      .select(SAFE_SELECT)
      .maybeSingle();

    if (error) {
      throw new Error(`[DeveloperApiKeys] Failed to revoke API key: ${error.message}`);
    }

    return data ? mapRow(data) : null;
  }

  static async rotate(params: {
    organizationId: string;
    workspaceId: string;
    apiKeyId: string;
    rotatedBy: string;
  }): Promise<CreatedCustomerApiKey | null> {
    const supabase = getPrivilegedSupabase();
    const material = generateApiKeyMaterial();
    const rotatedAt = new Date().toISOString();

    // Replacing the hash in one UPDATE makes the previous raw secret invalid atomically.
    const { data, error } = await supabase
      .from('developer_api_keys')
      .update({
        key_prefix: material.keyPrefix,
        key_hash: material.keyHash,
        last_used_at: null,
        rotated_at: rotatedAt,
        created_by: params.rotatedBy,
      })
      .eq('organization_id', params.organizationId)
      .eq('workspace_id', params.workspaceId)
      .eq('id', params.apiKeyId)
      .is('revoked_at', null)
      .select(SAFE_SELECT)
      .maybeSingle();

    if (error) {
      throw new Error(`[DeveloperApiKeys] Failed to rotate API key: ${error.message}`);
    }

    return data ? { apiKey: mapRow(data), secret: material.secret } : null;
  }

  static async authenticate(
    rawSecret: string,
    requiredScope: CustomerApiKeyScope = MARI_CHAT_SCOPE
  ): Promise<AuthenticatedCustomerApiKey | null> {
    if (!rawSecret || !rawSecret.startsWith(CUSTOMER_API_KEY_PREFIX)) return null;

    const keyHash = hashApiKey(rawSecret);
    const supabase = getPrivilegedSupabase();
    const { data, error } = await supabase
      .from('developer_api_keys')
      .select('id, organization_id, workspace_id, name, scopes, expires_at, revoked_at, created_by, rate_limit_per_minute')
      .eq('key_hash', keyHash)
      .is('revoked_at', null)
      .maybeSingle();

    if (error || !data) return null;
    if (data.expires_at && Date.parse(data.expires_at) <= Date.now()) return null;

    const scopes = Array.isArray(data.scopes) ? data.scopes : [];
    if (!scopes.includes(requiredScope)) return null;

    try {
      await supabase
        .from('developer_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);
    } catch {
      // Usage telemetry must never make a valid key fail authentication.
    }

    return {
      apiKeyId: data.id,
      organizationId: data.organization_id,
      workspaceId: data.workspace_id,
      name: data.name,
      scopes,
      createdBy: data.created_by || null,
      rateLimitPerMinute: Number(data.rate_limit_per_minute || 60),
    };
  }

  static async consumeRateLimit(apiKeyId: string, limit: number): Promise<ApiKeyRateLimitResult> {
    const supabase = getPrivilegedSupabase();
    const { data, error } = await supabase.rpc('ralion_consume_api_key_rate_limit', {
      p_api_key_id: apiKeyId,
      p_limit: Math.max(1, Math.floor(limit || 1)),
    });

    if (error || !data) {
      throw new Error(`[DeveloperApiKeys] Rate-limit accounting failed: ${error?.message || 'No result returned'}`);
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result) {
      throw new Error('[DeveloperApiKeys] Rate-limit accounting returned no row.');
    }

    return {
      allowed: Boolean(result.allowed),
      remaining: Number(result.remaining || 0),
      resetAt: String(result.reset_at || new Date(Date.now() + 60_000).toISOString()),
    };
  }
}
