import 'server-only';

import { getPrivilegedSupabase } from '@/lib/supabase/server';

export type MariCreditPlanId = 'COMMUNITY' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export const MARI_MONTHLY_CREDIT_QUOTAS: Record<MariCreditPlanId, number> = {
  COMMUNITY: 250,
  STARTER: 1000,
  PROFESSIONAL: 5000,
  ENTERPRISE: 25000,
};

export const MARI_REASONING_CREDIT_COST = 1;

export interface MariCreditSummary {
  organizationId: string;
  planId: MariCreditPlanId;
  monthlyQuota: number;
  allocatedCredits: number;
  usedCredits: number;
  reservedCredits: number;
  remainingCredits: number;
  planCreditsRemaining: number;
  bonusCreditsRemaining: number;
  utilizationRate: number;
  periodStart: string;
  periodEnd: string;
  lifetimeCreditsGranted: number;
  lifetimeCreditsConsumed: number;
}

export interface MariCreditReservation {
  allowed: boolean;
  status: 'RESERVED' | 'CHARGED' | 'RELEASED' | 'INSUFFICIENT_CREDITS' | string;
  reservationId?: string;
  amount: number;
  remainingCredits: number;
  planId: MariCreditPlanId;
  monthlyQuota: number;
}

export interface MariCreditFinalizeResult {
  success: boolean;
  status: 'CHARGED' | 'RELEASED' | 'NOT_FOUND' | string;
  creditsDeducted: number;
  remainingCredits: number;
}

const PLATFORM_ADMIN_ORGANIZATION_ID =
  process.env.RALION_PLATFORM_ADMIN_ORGANIZATION_ID || '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';

function normalizePlan(value: unknown): MariCreditPlanId | null {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return null;
  if (raw.includes('ENTERPRISE')) return 'ENTERPRISE';
  if (raw.includes('PROFESSIONAL') || raw === 'PRO') return 'PROFESSIONAL';
  if (raw.includes('STARTER') || raw.includes('STANDARD') || raw.includes('BUSINESS')) return 'STARTER';
  if (raw.includes('COMMUNITY') || raw.includes('FREE')) return 'COMMUNITY';
  return null;
}

function isActiveStatus(value: unknown): boolean {
  const status = String(value || '').trim().toUpperCase();
  return ['ACTIVE', 'TRIALING', 'TRIAL', 'PAID'].includes(status);
}

export class MariCreditsService {
  static async resolvePlanId(organizationId: string): Promise<MariCreditPlanId> {
    if (!organizationId) return 'COMMUNITY';
    if (organizationId === PLATFORM_ADMIN_ORGANIZATION_ID) return 'ENTERPRISE';

    const supabase = getPrivilegedSupabase();

    try {
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('status, edition, plan_id, updated_at')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (!error && Array.isArray(subscriptions)) {
        for (const subscription of subscriptions) {
          if (!isActiveStatus(subscription.status)) continue;

          const directPlan = normalizePlan(subscription.edition);
          if (directPlan) return directPlan;

          if (subscription.plan_id) {
            const { data: plan } = await supabase
              .from('subscription_plans')
              .select('name, slug')
              .eq('id', subscription.plan_id)
              .maybeSingle();
            const resolved = normalizePlan(plan?.slug || plan?.name);
            if (resolved) return resolved;
          }
        }
      }
    } catch (error: any) {
      console.warn('[MariCredits] Subscription plan resolution notice:', error?.message || error);
    }

    try {
      const { data: licenses, error } = await supabase
        .from('licenses')
        .select('status, plan, expires_at, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && Array.isArray(licenses)) {
        const now = Date.now();
        for (const license of licenses) {
          if (!isActiveStatus(license.status)) continue;
          if (license.expires_at && Date.parse(license.expires_at) <= now) continue;
          const resolved = normalizePlan(license.plan);
          if (resolved) return resolved;
        }
      }
    } catch (error: any) {
      console.warn('[MariCredits] License plan resolution notice:', error?.message || error);
    }

    return 'COMMUNITY';
  }

  static async getSummary(organizationId: string): Promise<MariCreditSummary> {
    const planId = await this.resolvePlanId(organizationId);
    const monthlyQuota = MARI_MONTHLY_CREDIT_QUOTAS[planId];
    const supabase = getPrivilegedSupabase();
    const { data, error } = await supabase.rpc('ralion_get_credit_summary', {
      p_org: organizationId,
      p_plan_id: planId,
      p_monthly_quota: monthlyQuota,
    });

    if (error || !data) {
      throw new Error(`[MariCredits] Failed to load durable credit summary: ${error?.message || 'No data returned'}`);
    }

    return data as MariCreditSummary;
  }

  static async reserveReasoning(params: {
    organizationId: string;
    userId?: string;
    requestId: string;
    provider?: string;
    model?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<MariCreditReservation> {
    const planId = await this.resolvePlanId(params.organizationId);
    const monthlyQuota = MARI_MONTHLY_CREDIT_QUOTAS[planId];
    const supabase = getPrivilegedSupabase();
    const { data, error } = await supabase.rpc('ralion_reserve_credits', {
      p_org: params.organizationId,
      p_user: params.userId || null,
      p_correlation_id: params.requestId,
      p_plan_id: planId,
      p_monthly_quota: monthlyQuota,
      p_amount: MARI_REASONING_CREDIT_COST,
      p_source_feature: 'MARI_CHAT',
      p_provider: params.provider || 'google',
      p_model: params.model || 'gemini-3.5-flash',
      p_reason: params.reason || 'Mari AI reasoning request',
      p_metadata: params.metadata || {},
    });

    if (error || !data) {
      throw new Error(`[MariCredits] Failed to reserve credits: ${error?.message || 'No data returned'}`);
    }

    return {
      ...(data as any),
      planId,
      monthlyQuota,
      amount: Number((data as any).amount || MARI_REASONING_CREDIT_COST),
      remainingCredits: Number((data as any).remainingCredits || 0),
    } as MariCreditReservation;
  }

  static async finalizeReasoning(params: {
    organizationId: string;
    requestId: string;
    success: boolean;
    provider?: string | null;
    model?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<MariCreditFinalizeResult> {
    const supabase = getPrivilegedSupabase();
    const { data, error } = await supabase.rpc('ralion_finalize_credits', {
      p_org: params.organizationId,
      p_correlation_id: params.requestId,
      p_success: params.success,
      p_provider: params.provider || null,
      p_model: params.model || null,
      p_metadata: params.metadata || {},
    });

    if (error || !data) {
      throw new Error(`[MariCredits] Failed to finalize credit reservation: ${error?.message || 'No data returned'}`);
    }

    return {
      ...(data as any),
      creditsDeducted: Number((data as any).creditsDeducted || 0),
      remainingCredits: Number((data as any).remainingCredits || 0),
    } as MariCreditFinalizeResult;
  }
}
