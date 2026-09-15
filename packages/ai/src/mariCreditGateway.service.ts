import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SubscriptionPlanId } from '@ralion/database';
import { TIER_MONTHLY_CREDITS } from './tenantCredits.service';

export interface MariResolvedPlan {
  planId: SubscriptionPlanId;
  monthlyQuota: number;
  source: 'SUBSCRIPTION' | 'LICENSE' | 'DEFAULT_COMMUNITY';
}

export interface MariCreditReservation {
  allowed: boolean;
  status: string;
  reservationId?: string;
  amount: number;
  remainingCredits: number;
  correlationId: string;
  plan: MariResolvedPlan;
}

export interface MariCreditSummary {
  organizationId: string;
  planId: string;
  monthlyQuota: number;
  allocatedCredits: number;
  usedCredits: number;
  reservedCredits: number;
  remainingCredits: number;
  planCreditsRemaining: number;
  bonusCreditsRemaining: number;
  utilizationRate: number;
  periodStart: string | null;
  periodEnd: string | null;
  lifetimeCreditsGranted: number;
  lifetimeCreditsConsumed: number;
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['ACTIVE', 'TRIAL', 'TRIALING', 'CURRENT', 'PAST_DUE']);
const ACTIVE_LICENSE_STATUSES = new Set(['ACTIVE', 'VALID']);

function normalizePlanId(value: unknown): SubscriptionPlanId | null {
  const normalized = String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized.includes('ENTERPRISE')) return 'ENTERPRISE';
  if (normalized.includes('PROFESSIONAL') || normalized === 'PRO') return 'PROFESSIONAL';
  if (normalized.includes('STARTER')) return 'STARTER';
  if (normalized.includes('COMMUNITY') || normalized.includes('FREE')) return 'COMMUNITY';
  return null;
}

function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('[MariCreditGateway] Supabase URL is not configured.');
  return url;
}

function getPrivilegedKey(): string {
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error('[MariCreditGateway] Privileged Supabase credential is not configured.');
  return key;
}

let privilegedClient: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!privilegedClient) {
    privilegedClient = createClient(getSupabaseUrl(), getPrivilegedKey(), {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }
  return privilegedClient;
}

const planCache = new Map<string, { plan: MariResolvedPlan; expiresAt: number }>();

export class MariCreditGateway {
  static async resolvePlan(organizationId: string): Promise<MariResolvedPlan> {
    if (!organizationId) throw new Error('[MariCreditGateway] organizationId is required.');

    const cached = planCache.get(organizationId);
    if (cached && cached.expiresAt > Date.now()) return cached.plan;

    const supabase = getSupabase();
    let resolved: MariResolvedPlan | null = null;

    try {
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('status, edition, created_at, updated_at, subscription_plans(name, slug)')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (!error && Array.isArray(subscriptions)) {
        for (const row of subscriptions as any[]) {
          if (!ACTIVE_SUBSCRIPTION_STATUSES.has(String(row?.status || '').toUpperCase())) continue;
          const relatedPlan = Array.isArray(row?.subscription_plans)
            ? row.subscription_plans[0]
            : row?.subscription_plans;
          const planId = normalizePlanId(row?.edition) || normalizePlanId(relatedPlan?.slug) || normalizePlanId(relatedPlan?.name);
          if (planId) {
            resolved = { planId, monthlyQuota: TIER_MONTHLY_CREDITS[planId], source: 'SUBSCRIPTION' };
            break;
          }
        }
      }
    } catch (error: any) {
      console.warn('[MariCreditGateway] Subscription plan resolution notice:', error?.message || error);
    }

    if (!resolved) {
      try {
        const { data: licenses, error } = await supabase
          .from('licenses')
          .select('plan, status, expires_at, created_at')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!error && Array.isArray(licenses)) {
          const now = Date.now();
          for (const row of licenses as any[]) {
            if (!ACTIVE_LICENSE_STATUSES.has(String(row?.status || '').toUpperCase())) continue;
            if (row?.expires_at && new Date(row.expires_at).getTime() < now) continue;
            const planId = normalizePlanId(row?.plan);
            if (planId) {
              resolved = { planId, monthlyQuota: TIER_MONTHLY_CREDITS[planId], source: 'LICENSE' };
              break;
            }
          }
        }
      } catch (error: any) {
        console.warn('[MariCreditGateway] License plan resolution notice:', error?.message || error);
      }
    }

    if (!resolved) {
      resolved = {
        planId: 'COMMUNITY',
        monthlyQuota: TIER_MONTHLY_CREDITS.COMMUNITY,
        source: 'DEFAULT_COMMUNITY',
      };
    }

    planCache.set(organizationId, { plan: resolved, expiresAt: Date.now() + 60_000 });
    return resolved;
  }

  static async reserveMariReasoning(params: {
    organizationId: string;
    userId?: string;
    requestId: string;
    amount?: number;
    reason?: string;
  }): Promise<MariCreditReservation> {
    const plan = await this.resolvePlan(params.organizationId);
    const amount = Math.max(1, Math.trunc(params.amount || 1));
    const correlationId = `mari:${params.requestId}`;

    const { data, error } = await getSupabase().rpc('ralion_reserve_credits', {
      p_org: params.organizationId,
      p_user: params.userId || null,
      p_correlation_id: correlationId,
      p_plan_id: plan.planId,
      p_monthly_quota: plan.monthlyQuota,
      p_amount: amount,
      p_source_feature: 'MARI_CHAT',
      p_provider: 'google',
      p_model: 'gemini-3.5-flash',
      p_reason: params.reason || 'Mari AI reasoning response',
      p_metadata: { billingPolicy: 'one_completed_reasoning_response_one_credit' },
    });

    if (error) throw new Error(`[MariCreditGateway] Credit reservation failed: ${error.code || error.message}`);
    const result = (data || {}) as any;

    return {
      allowed: Boolean(result.allowed),
      status: String(result.status || (result.allowed ? 'RESERVED' : 'INSUFFICIENT_CREDITS')),
      reservationId: result.reservationId || undefined,
      amount: Number(result.amount || amount),
      remainingCredits: Number(result.remainingCredits || 0),
      correlationId,
      plan,
    };
  }

  static async finalizeMariReasoning(params: {
    organizationId: string;
    correlationId: string;
    success: boolean;
    model?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<any> {
    const { data, error } = await getSupabase().rpc('ralion_finalize_credits', {
      p_org: params.organizationId,
      p_correlation_id: params.correlationId,
      p_success: params.success,
      p_provider: params.success ? 'google' : null,
      p_model: params.model || null,
      p_metadata: params.metadata || {},
    });

    if (error) throw new Error(`[MariCreditGateway] Credit finalization failed: ${error.code || error.message}`);
    return data;
  }

  static async getSummary(organizationId: string): Promise<MariCreditSummary> {
    const plan = await this.resolvePlan(organizationId);
    const { data, error } = await getSupabase().rpc('ralion_get_credit_summary', {
      p_org: organizationId,
      p_plan_id: plan.planId,
      p_monthly_quota: plan.monthlyQuota,
    });

    if (error) throw new Error(`[MariCreditGateway] Credit summary failed: ${error.code || error.message}`);
    return data as MariCreditSummary;
  }
}
