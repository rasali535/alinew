import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DurableBillingDatabaseService } from '@ralion/database/server';
import { CreditSourceFeature, SubscriptionPlanId } from '@ralion/database';
import { TIER_MONTHLY_CREDITS } from './tenantCredits.service';

const DEFAULT_SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';

function getCreditsSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('[DurableCredits] SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function canonicalUuid(value?: string | null): string | null {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
    ? value.trim()
    : null;
}

export interface DurableCreditPlanContext {
  planId: SubscriptionPlanId;
  monthlyQuota: number;
}

export interface DurableCreditSummary {
  organizationId: string;
  planId: SubscriptionPlanId;
  monthlyQuota: number;
  allocatedCredits: number;
  usedCredits: number;
  reservedCredits: number;
  remainingCredits: number;
  planCreditsRemaining: number;
  bonusCreditsRemaining: number;
  utilizationRate: number;
  periodStart?: string;
  periodEnd?: string;
  lifetimeCreditsGranted?: number;
  lifetimeCreditsConsumed?: number;
}

export class DurableTenantCreditsService {
  static async resolvePlan(organizationId: string): Promise<DurableCreditPlanContext> {
    const sub = await DurableBillingDatabaseService.getSubscription(organizationId);
    let planId = sub.planId;
    const now = new Date();
    const periodEnd = new Date(sub.currentPeriodEnd);

    if (
      sub.status === 'PAST_DUE' ||
      sub.status === 'SUSPENDED' ||
      sub.status === 'EXPIRED' ||
      (sub.status === 'CANCELED' && now > periodEnd)
    ) {
      planId = 'COMMUNITY';
    }

    return {
      planId,
      monthlyQuota: TIER_MONTHLY_CREDITS[planId] ?? TIER_MONTHLY_CREDITS.COMMUNITY,
    };
  }

  static async getSummary(organizationId: string, explicitPlan?: DurableCreditPlanContext): Promise<DurableCreditSummary> {
    const plan = explicitPlan || await this.resolvePlan(organizationId);
    const supabase = getCreditsSupabase();
    const { data, error } = await supabase.rpc('ralion_get_credit_summary', {
      p_org: organizationId,
      p_plan_id: plan.planId,
      p_monthly_quota: plan.monthlyQuota,
    });
    if (error) throw new Error(`[DurableCredits] Failed to load credit summary: ${error.message}`);

    return {
      organizationId: String(data?.organizationId || organizationId),
      planId: String(data?.planId || plan.planId) as SubscriptionPlanId,
      monthlyQuota: Number(data?.monthlyQuota ?? plan.monthlyQuota),
      allocatedCredits: Number(data?.allocatedCredits ?? plan.monthlyQuota),
      usedCredits: Number(data?.usedCredits ?? 0),
      reservedCredits: Number(data?.reservedCredits ?? 0),
      remainingCredits: Number(data?.remainingCredits ?? 0),
      planCreditsRemaining: Number(data?.planCreditsRemaining ?? 0),
      bonusCreditsRemaining: Number(data?.bonusCreditsRemaining ?? 0),
      utilizationRate: Number(data?.utilizationRate ?? 0),
      periodStart: data?.periodStart || undefined,
      periodEnd: data?.periodEnd || undefined,
      lifetimeCreditsGranted: data?.lifetimeCreditsGranted == null ? undefined : Number(data.lifetimeCreditsGranted),
      lifetimeCreditsConsumed: data?.lifetimeCreditsConsumed == null ? undefined : Number(data.lifetimeCreditsConsumed),
    };
  }

  static async syncWallet(organizationId: string, planId: SubscriptionPlanId): Promise<DurableCreditSummary> {
    return this.getSummary(organizationId, {
      planId,
      monthlyQuota: TIER_MONTHLY_CREDITS[planId] ?? TIER_MONTHLY_CREDITS.COMMUNITY,
    });
  }

  static async reserveCredits(input: {
    organizationId: string;
    userId?: string;
    correlationId: string;
    amount: number;
    sourceFeature: CreditSourceFeature;
    provider?: string;
    model?: string;
    reason?: string;
    metadata?: Record<string, any>;
  }): Promise<{ allowed: boolean; status: string; reservationId?: string; amount: number; remainingCredits: number }> {
    if (input.amount <= 0) {
      const summary = await this.getSummary(input.organizationId);
      return { allowed: true, status: 'ZERO_COST', amount: 0, remainingCredits: summary.remainingCredits };
    }

    const plan = await this.resolvePlan(input.organizationId);
    const supabase = getCreditsSupabase();
    const { data, error } = await supabase.rpc('ralion_reserve_credits', {
      p_org: input.organizationId,
      p_user: canonicalUuid(input.userId),
      p_correlation_id: input.correlationId,
      p_plan_id: plan.planId,
      p_monthly_quota: plan.monthlyQuota,
      p_amount: input.amount,
      p_source_feature: input.sourceFeature,
      p_provider: input.provider || null,
      p_model: input.model || null,
      p_reason: input.reason || null,
      p_metadata: input.metadata || {},
    });

    if (error) throw new Error(`[DurableCredits] Credit reservation failed: ${error.message}`);
    return {
      allowed: Boolean(data?.allowed),
      status: String(data?.status || 'UNKNOWN'),
      reservationId: data?.reservationId ? String(data.reservationId) : undefined,
      amount: Number(data?.amount ?? input.amount),
      remainingCredits: Number(data?.remainingCredits ?? 0),
    };
  }

  static async finalizeCredits(input: {
    organizationId: string;
    correlationId: string;
    success: boolean;
    provider?: string;
    model?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; status: string; creditsDeducted: number; remainingCredits: number }> {
    const supabase = getCreditsSupabase();
    const { data, error } = await supabase.rpc('ralion_finalize_credits', {
      p_org: input.organizationId,
      p_correlation_id: input.correlationId,
      p_success: input.success,
      p_provider: input.provider || null,
      p_model: input.model || null,
      p_metadata: input.metadata || {},
    });
    if (error) throw new Error(`[DurableCredits] Credit finalization failed: ${error.message}`);
    return {
      success: Boolean(data?.success),
      status: String(data?.status || 'UNKNOWN'),
      creditsDeducted: Number(data?.creditsDeducted ?? 0),
      remainingCredits: Number(data?.remainingCredits ?? 0),
    };
  }

  static async adjustCredits(input: {
    organizationId: string;
    userId?: string;
    amount: number;
    correlationId: string;
    reason: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; idempotent: boolean; transactionId: string; amount: number; remainingCredits: number }> {
    await this.getSummary(input.organizationId);
    const supabase = getCreditsSupabase();
    const { data, error } = await supabase.rpc('ralion_adjust_credits', {
      p_org: input.organizationId,
      p_user: canonicalUuid(input.userId),
      p_amount: input.amount,
      p_correlation_id: input.correlationId,
      p_reason: input.reason,
      p_metadata: input.metadata || {},
    });
    if (error) throw new Error(`[DurableCredits] Credit adjustment failed: ${error.message}`);
    return {
      success: Boolean(data?.success),
      idempotent: Boolean(data?.idempotent),
      transactionId: String(data?.transactionId || ''),
      amount: Number(data?.amount ?? input.amount),
      remainingCredits: Number(data?.remainingCredits ?? 0),
    };
  }
}
