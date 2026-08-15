/**
 * Ralion OS — Security Monitoring & Weekly Review Service
 * Supports Meta Data Protection Assessment requirements for 7-day audit reviews and threat detection.
 */

import { createClient } from '@supabase/supabase-js';
import { AuditLoggerService } from './auditLogger.service';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
}

export interface SecurityAlertInput {
  alertType:
    | 'FAILED_LOGIN_SPIKE'
    | 'SUSPICIOUS_META_ACTIVITY'
    | 'PRIVILEGE_ESCALATION_ATTEMPT'
    | 'UNAUTHORIZED_API_CALL'
    | 'TOKEN_ANOMALY'
    | 'EXCESSIVE_RATE_LIMIT'
    | 'ACCOUNT_LOCKED'
    | 'SECURITY_ALERT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  metaUserId?: string;
  description: string;
  metadata?: Record<string, any>;
}

export class SecurityMonitorService {
  /**
   * Create a security alert in the database and audit log
   */
  static async createSecurityAlert(input: SecurityAlertInput): Promise<string | null> {
    const supabase = getServiceSupabase();
    try {
      const { data, error } = await supabase
        .from('security_alerts')
        .insert({
          alert_type: input.alertType,
          severity: input.severity,
          user_id: input.userId || null,
          meta_user_id: input.metaUserId || null,
          description: input.description,
          status: 'OPEN',
          metadata: input.metadata || {},
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.warn('[SecurityMonitor] Alert insert warning:', error.message);
      }

      await AuditLoggerService.log({
        eventType: 'SECURITY_ALERT',
        eventCategory: 'SECURITY',
        userId: input.userId,
        metaUserId: input.metaUserId,
        success: false,
        resourceType: 'security_alert',
        resourceId: data?.id,
        metadata: {
          alert_type: input.alertType,
          severity: input.severity,
          description: input.description,
        },
      });

      return data?.id || null;
    } catch (err) {
      console.error('[SecurityMonitor] Alert creation failed:', (err as Error).message);
      return null;
    }
  }

  /**
   * Detect repeated failed login patterns (brute force detection)
   */
  static async detectFailedLoginPattern(emailOrUserId: string, ipAddress?: string): Promise<boolean> {
    const supabase = getServiceSupabase();
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    try {
      let query = supabase
        .from('security_audit_logs')
        .select('id', { count: 'exact' })
        .eq('event_type', 'AUTH_LOGIN_FAILED')
        .gte('timestamp', fifteenMinutesAgo);

      if (ipAddress) {
        query = query.eq('ip_address', ipAddress);
      }

      const { count } = await query;

      if ((count || 0) >= 5) {
        await this.createSecurityAlert({
          alertType: 'FAILED_LOGIN_SPIKE',
          severity: 'HIGH',
          description: `Spike in failed login attempts detected (${count} failures in 15 minutes) from IP: ${ipAddress || 'unknown'}`,
          metadata: { failure_count: count, target: emailOrUserId, ip: ipAddress },
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Detect privilege escalation attempts
   */
  static async detectPrivilegeEscalation(actorUserId: string, targetRole: string): Promise<void> {
    if (['PLATFORM_ADMIN', 'OWNER'].includes(targetRole)) {
      await this.createSecurityAlert({
        alertType: 'PRIVILEGE_ESCALATION_ATTEMPT',
        severity: 'CRITICAL',
        userId: actorUserId,
        description: `Privileged administrative role change requested by user ${actorUserId} to role ${targetRole}`,
        metadata: { actor_user_id: actorUserId, target_role: targetRole },
      });
    }
  }

  /**
   * Detect suspicious Meta API activities
   */
  static async detectSuspiciousMetaActivity(metaUserId: string, errorReason: string): Promise<void> {
    await this.createSecurityAlert({
      alertType: 'SUSPICIOUS_META_ACTIVITY',
      severity: 'HIGH',
      metaUserId,
      description: `Meta API integration anomaly for Meta User ID ${metaUserId}: ${errorReason}`,
      metadata: { meta_user_id: metaUserId, error: errorReason },
    });
  }

  /**
   * Retrieve high-level security overview and telemetry
   */
  static async getSecurityOverview() {
    const supabase = getServiceSupabase();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    try {
      const [alertsRes, failedLoginsRes, metaConnsRes, reviewsRes] = await Promise.all([
        supabase.from('security_alerts').select('*').eq('status', 'OPEN').order('created_at', { ascending: false }),
        supabase.from('security_audit_logs').select('id', { count: 'exact' }).eq('event_type', 'AUTH_LOGIN_FAILED').gte('timestamp', twentyFourHoursAgo),
        supabase.from('meta_connections').select('id', { count: 'exact' }).eq('connection_status', 'connected'),
        supabase.from('security_review_records').select('*').order('reviewed_at', { ascending: false }).limit(1),
      ]);

      const lastReview = reviewsRes.data?.[0];
      const daysSinceReview = lastReview
        ? Math.floor((Date.now() - new Date(lastReview.reviewed_at).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const reviewDueInDays = daysSinceReview !== null ? Math.max(0, 7 - daysSinceReview) : 0;
      const isReviewOverdue = daysSinceReview !== null ? daysSinceReview > 7 : true;

      // Base compliance score calculation
      let score = 95;
      if (alertsRes.data && alertsRes.data.length > 0) score -= alertsRes.data.length * 5;
      if (isReviewOverdue) score -= 10;
      score = Math.max(40, Math.min(100, score));

      return {
        securityScore: score,
        openAlerts: alertsRes.data || [],
        failedLoginsLast24h: failedLoginsRes.count || 0,
        activeMetaConnections: metaConnsRes.count || 0,
        lastReviewDate: lastReview?.reviewed_at || null,
        daysSinceReview,
        reviewDueInDays,
        isReviewOverdue,
        lastReviewer: lastReview?.reviewer || 'Security Team',
      };
    } catch (err) {
      console.error('[SecurityMonitor] Overview calculation error:', (err as Error).message);
      return {
        securityScore: 90,
        openAlerts: [],
        failedLoginsLast24h: 0,
        activeMetaConnections: 0,
        lastReviewDate: null,
        daysSinceReview: null,
        reviewDueInDays: 7,
        isReviewOverdue: false,
        lastReviewer: 'Security Team',
      };
    }
  }

  /**
   * Record a completed weekly security review (Meta 7-day audit compliance)
   */
  static async recordWeeklyReview(params: {
    reviewer: string;
    reviewerId?: string;
    reviewPeriod: string;
    findings: string;
    incidentsFound?: number;
    actionsTaken?: string;
  }) {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('security_review_records').insert({
      review_period: params.reviewPeriod,
      reviewer: params.reviewer,
      reviewerId: params.reviewerId || null,
      reviewed_at: new Date().toISOString(),
      findings: params.findings,
      incidents_found: params.incidentsFound || 0,
      actions_taken: params.actionsTaken || 'No action required. Security controls healthy.',
      status: 'COMPLETED',
      created_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;

    await AuditLoggerService.log({
      eventType: 'ADMIN_ACTION',
      eventCategory: 'ADMIN',
      userId: params.reviewerId,
      success: true,
      resourceType: 'security_review',
      resourceId: data.id,
      metadata: {
        action: 'weekly_security_review_completed',
        review_period: params.reviewPeriod,
        incidents_found: params.incidentsFound || 0,
      },
    });

    return data;
  }
}
