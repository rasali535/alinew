/**
 * Ralion OS — Enterprise Security Audit Logging Engine
 *
 * Security events are persisted in the canonical public.audit_logs table.
 * Event-specific fields that are not first-class audit_logs columns are kept in
 * sanitized metadata so we retain the security evidence without maintaining a
 * second, divergent audit table.
 *
 * CRITICAL RULE: NEVER log passwords, access tokens, refresh tokens, or API secrets.
 */

import { getPrivilegedSupabase as getServiceSupabase } from '@/lib/supabase/server';

export type SecurityEventType =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_LOGOUT'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET'
  | 'META_CONNECT'
  | 'META_DISCONNECT'
  | 'META_AUTHORIZATION'
  | 'META_TOKEN_CREATED'
  | 'META_TOKEN_REFRESHED'
  | 'META_TOKEN_REVOKED'
  | 'META_PROFILE_SYNC'
  | 'META_API_REQUEST'
  | 'META_API_FAILURE'
  | 'ZERNIO_PROFILE_CREATED'
  | 'SOCIAL_ACCOUNT_CONNECT_STARTED'
  | 'SOCIAL_ACCOUNT_CONNECTED'
  | 'SOCIAL_ACCOUNT_DISCONNECTED'
  | 'SOCIAL_ACCOUNT_HEALTH_CHECK'
  | 'SOCIAL_POST_CREATED'
  | 'SOCIAL_POST_SCHEDULED'
  | 'SOCIAL_POST_PUBLISHED'
  | 'SOCIAL_POST_FAILED'
  | 'SOCIAL_WEBHOOK_RECEIVED'
  | 'SOCIAL_ANALYTICS_SYNC'
  | 'SOCIAL_MESSAGE_RECEIVED'
  | 'SOCIAL_MESSAGE_SENT'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_REVOKED'
  | 'ROLE_CHANGED'
  | 'ADMIN_LOGIN'
  | 'ADMIN_ACTION'
  | 'SECURITY_ALERT'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'FACEBOOK_PAGE_CONNECTED'
  | 'FACEBOOK_PAGE_DISCONNECTED'
  | 'FACEBOOK_PAGE_CONNECTION_BLOCKED'
  | 'MARI_PAGE_ANALYSIS'
  | 'MARI_GROWTH_RECOMMENDATION';

export type SecurityEventCategory =
  | 'AUTH'
  | 'META'
  | 'ADMIN'
  | 'SECURITY'
  | 'DATA_ACCESS'
  | 'RBAC'
  | 'MARI_AI';

export interface SecurityLogParams {
  eventType: SecurityEventType;
  eventCategory?: SecurityEventCategory;
  organizationId?: string;
  workspaceId?: string;
  userId?: string;
  actorUserId?: string;
  metaUserId?: string;
  success?: boolean;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /key/i,
  /credential/i,
  /hash/i,
  /signature/i,
];

export function sanitizeMetadata(data: any, depth = 0): any {
  if (depth > 5) return '[TRUNCATED_DEPTH]';
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeMetadata(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      sanitized[key] = '[REDACTED_SENSITIVE_DATA]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMetadata(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export class AuditLoggerService {
  private static resolveCategory(eventType: SecurityEventType): SecurityEventCategory {
    if (eventType.startsWith('AUTH_') || eventType.startsWith('MFA_') || eventType.startsWith('PASSWORD_')) {
      return 'AUTH';
    }
    if (eventType.startsWith('META_')) {
      return 'META';
    }
    if (eventType.startsWith('ADMIN_')) {
      return 'ADMIN';
    }
    if (eventType.startsWith('PERMISSION_') || eventType.startsWith('ROLE_')) {
      return 'RBAC';
    }
    if (eventType.startsWith('MARI_')) {
      return 'MARI_AI';
    }
    return 'SECURITY';
  }

  static async log(params: SecurityLogParams): Promise<boolean> {
    const timestamp = params.timestamp ? params.timestamp.toISOString() : new Date().toISOString();
    const eventCategory = params.eventCategory || this.resolveCategory(params.eventType);
    const sanitizedMetadata = sanitizeMetadata(params.metadata || {});

    const metadata = sanitizeMetadata({
      ...sanitizedMetadata,
      success: params.success !== false,
      actorUserId: params.actorUserId || params.userId || null,
      metaUserId: params.metaUserId || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      resourceType: params.resourceType || null,
      resourceId: params.resourceId || null,
      securityEventCategory: eventCategory,
    });

    try {
      const supabase = getServiceSupabase();
      const { error } = await supabase.from('audit_logs').insert({
        organization_id: params.organizationId || null,
        workspace_id: params.workspaceId || null,
        user_id: params.userId || null,
        action: params.eventType,
        module: eventCategory,
        metadata,
        created_at: timestamp,
      });

      if (error) {
        console.warn('[AuditLogger] Supabase audit write notice:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[AuditLogger] Security log dispatch error:', (err as Error).message);
      return false;
    }
  }

  static async getLogs(filters: {
    limit?: number;
    offset?: number;
    eventType?: string;
    eventCategory?: SecurityEventCategory;
    userId?: string;
    metaUserId?: string;
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
  } = {}) {
    const supabase = getServiceSupabase();
    const limit = Math.min(Math.max(filters.limit || 50, 1), 200);
    const offset = Math.max(filters.offset || 0, 0);

    let query = supabase
      .from('audit_logs')
      .select('id,organization_id,workspace_id,user_id,action,module,metadata,created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.eventType) query = query.eq('action', filters.eventType);
    if (filters.eventCategory) query = query.eq('module', filters.eventCategory);
    if (filters.userId) query = query.eq('user_id', filters.userId);
    if (filters.metaUserId) query = query.contains('metadata', { metaUserId: filters.metaUserId });
    if (filters.success !== undefined) query = query.contains('metadata', { success: filters.success });
    if (filters.startDate) query = query.gte('created_at', filters.startDate.toISOString());
    if (filters.endDate) query = query.lte('created_at', filters.endDate.toISOString());

    const { data, count, error } = await query;
    if (error) throw error;

    const logs = (data || []).map((row: any) => ({
      ...row,
      event_type: row.action,
      event_category: row.module,
      success: row.metadata?.success !== false,
      actor_user_id: row.metadata?.actorUserId || row.user_id || null,
      meta_user_id: row.metadata?.metaUserId || null,
      ip_address: row.metadata?.ipAddress || null,
      user_agent: row.metadata?.userAgent || null,
      resource_type: row.metadata?.resourceType || null,
      resource_id: row.metadata?.resourceId || null,
      timestamp: row.created_at,
    }));

    return { logs, total: count || 0 };
  }
}
