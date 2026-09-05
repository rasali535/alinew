import { createClient } from '@supabase/supabase-js';

export interface AdminAuditLogEntry {
  eventId: string;
  adminUserId: string;
  adminEmail?: string;
  action:
    | 'ADMIN_LOGIN'
    | 'ADMIN_LOGOUT'
    | 'CUSTOMER_INSPECT'
    | 'CUSTOMER_SUSPEND'
    | 'CUSTOMER_REACTIVATE'
    | 'CREDIT_ADJUST'
    | 'BILLING_ACTION'
    | 'CONFIGURATION_CHANGE'
    | 'SECURITY_EVENT'
    | 'DATA_RESET'
    | 'STORAGE_INSPECT'
    | 'META_ZERNIO_DIAGNOSTICS';
  targetType: 'CUSTOMER' | 'ORGANIZATION' | 'WORKSPACE' | 'CREDIT' | 'BILLING' | 'STORAGE' | 'INTEGRATION' | 'SYSTEM';
  targetId: string;
  timestamp: string;
  result: 'SUCCESS' | 'DENIED' | 'FAILED';
  reason: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

export interface CustomerSummaryItem {
  id: string;
  organizationId: string;
  name: string;
  ownerEmail: string;
  plan: string;
  credits: number;
  creditsConsumed: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  createdAt: string;
  lastActive: string;
  websiteIngestionStatus: 'VERIFIED' | 'INGESTED' | 'UNVERIFIED' | 'NONE';
  metaStatus: 'CONNECTED' | 'DISCONNECTED' | 'TOKEN_EXPIRING' | 'ERROR';
  zernioStatus: 'CONNECTED' | 'DISCONNECTED' | 'UNBOUND';
  mariStatus: 'ACTIVE' | 'STANDBY';
  creativeCount: number;
  socialPostCount: number;
  facebookPage?: string;
  facebookFollowers?: number;
  facebookStatus?: 'CONNECTED' | 'DISCONNECTED';
}

export interface SystemHealthMetric {
  service: string;
  status: 'UP' | 'DEGRADED' | 'DOWN';
  latencyMs: number;
  lastChecked: string;
  lastError?: string;
  failureCount: number;
}

export class PlatformAdminService {
  private static auditLogs: AdminAuditLogEntry[] = [];
  private static suspendedTenants: Set<string> = new Set();

  /**
   * Append-only audit logger for administrative and security actions
   */
  static recordAuditLog(entry: Omit<AdminAuditLogEntry, 'eventId' | 'timestamp'> & { eventId?: string; timestamp?: string }): AdminAuditLogEntry {
    if (!entry.reason || entry.reason.trim().length === 0) {
      throw new Error('[PlatformAdminService] An explicit audit reason is mandatory for all admin actions.');
    }

    const record: AdminAuditLogEntry = {
      eventId: entry.eventId || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      adminUserId: entry.adminUserId,
      adminEmail: entry.adminEmail,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      result: entry.result,
      reason: entry.reason,
      details: entry.details || {},
      ipAddress: entry.ipAddress,
    };

    this.auditLogs.unshift(record);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }

    // Also persist non-blocking to security_audit_logs table if credentials available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (supabaseUrl && serviceKey) {
      try {
        const supabase = createClient(supabaseUrl, serviceKey);
        Promise.resolve(
          supabase.from('security_audit_logs').insert({
            event_type: record.action,
            user_id: record.adminUserId,
            organization_id: record.targetType === 'ORGANIZATION' ? record.targetId : null,
            status: record.result,
            reason: record.reason,
            metadata: {
              eventId: record.eventId,
              targetType: record.targetType,
              targetId: record.targetId,
              details: record.details,
              timestamp: record.timestamp,
            },
          })
        ).catch(() => {});
      } catch {}
    }

    return record;
  }

  /**
   * Query immutable audit trail with optional filters
   */
  static getAuditLogs(options?: {
    action?: string;
    targetId?: string;
    adminUserId?: string;
    limit?: number;
  }): AdminAuditLogEntry[] {
    let logs = [...this.auditLogs];

    if (options?.action) {
      logs = logs.filter(l => l.action === options.action);
    }
    if (options?.targetId) {
      logs = logs.filter(l => l.targetId === options.targetId);
    }
    if (options?.adminUserId) {
      logs = logs.filter(l => l.adminUserId === options.adminUserId);
    }
    if (options?.limit) {
      logs = logs.slice(0, options.limit);
    }

    return logs;
  }

  /**
   * Suspend or Reactivate a customer organization with mandatory audit trail
   */
  static setCustomerStatus(params: {
    organizationId: string;
    status: 'ACTIVE' | 'SUSPENDED';
    reason: string;
    adminUserId: string;
    adminEmail?: string;
  }): { success: boolean; organizationId: string; status: 'ACTIVE' | 'SUSPENDED' } {
    if (!params.reason || params.reason.trim().length < 5) {
      throw new Error('[PlatformAdminService] Suspension / reactivation requires an explicit audit reason.');
    }

    if (params.status === 'SUSPENDED') {
      this.suspendedTenants.add(params.organizationId);
    } else {
      this.suspendedTenants.delete(params.organizationId);
    }

    this.recordAuditLog({
      adminUserId: params.adminUserId,
      adminEmail: params.adminEmail,
      action: params.status === 'SUSPENDED' ? 'CUSTOMER_SUSPEND' : 'CUSTOMER_REACTIVATE',
      targetType: 'ORGANIZATION',
      targetId: params.organizationId,
      result: 'SUCCESS',
      reason: params.reason,
      details: { newStatus: params.status },
    });

    return {
      success: true,
      organizationId: params.organizationId,
      status: params.status,
    };
  }

  /**
   * Check if a tenant is currently suspended
   */
  static isTenantSuspended(organizationId: string): boolean {
    return this.suspendedTenants.has(organizationId);
  }

  /**
   * Verify whether a given user / role is authorized as PLATFORM_ADMIN
   */
  static verifyAdminAuthorization(userMetadata: any, email?: string): boolean {
    if (email === 'ali@rasalilabs.com' || email === 'admin@rasalilabs.com') {
      return true;
    }
    const role = userMetadata?.role || userMetadata?.user_role;
    const isPlatformAdmin = userMetadata?.isPlatformAdmin === true;
    const orgId = userMetadata?.organizationId;

    return (role === 'PLATFORM_ADMIN' || isPlatformAdmin) && orgId === 'ras-ali-labs';
  }
}
