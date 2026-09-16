import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  BillingCycle,
  BillingWebhookEventRecord,
  OrganizationSubscriptionRecord,
  PaymentProvider,
  PaymentTransactionRecord,
  SubscriptionPlanId,
  SubscriptionStatus,
} from './schema';

const DEFAULT_SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';

function getServerSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('[DurableBillingDB] SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required.');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function assertOrganizationId(organizationId: string): void {
  if (!organizationId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId)) {
    throw new Error('[DurableBillingDB] A canonical organization UUID is required.');
  }
}

function planFromEdition(value: unknown): SubscriptionPlanId {
  const normalized = String(value || '').trim().toUpperCase();
  return ['COMMUNITY', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(normalized)
    ? normalized as SubscriptionPlanId
    : 'COMMUNITY';
}

function statusFromDb(value: unknown): SubscriptionStatus {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'CANCELLED') return 'CANCELED';
  return ['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'SUSPENDED', 'EXPIRED', 'PENDING'].includes(normalized)
    ? normalized as SubscriptionStatus
    : 'PENDING';
}

function cycleFromDb(value: unknown): BillingCycle {
  const normalized = String(value || '').trim().toUpperCase();
  return ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(normalized)
    ? normalized as BillingCycle
    : 'MONTHLY';
}

function providerFromDb(value: unknown): PaymentProvider {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'paypal' || normalized === 'stripe' ? normalized : 'manual';
}

function mapSubscription(row: any): OrganizationSubscriptionRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    planId: planFromEdition(row.edition),
    status: statusFromDb(row.status),
    billingCycle: cycleFromDb(row.billing_cycle),
    provider: providerFromDb(row.payment_provider),
    providerCustomerId: row.provider_customer_id || undefined,
    providerSubscriptionId: row.external_subscription_id || undefined,
    providerPlanId: row.provider_plan_id || undefined,
    currentPeriodStart: row.current_period_start || row.subscription_start || row.start_date || row.created_at,
    currentPeriodEnd: row.current_period_end || row.subscription_end || row.end_date || row.updated_at || row.created_at,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    canceledAt: row.canceled_at || undefined,
    trialEnd: row.trial_end || undefined,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

function mapTransaction(row: any): PaymentTransactionRecord {
  const metadata = row.metadata || {};
  const normalizedStatus = String(row.status || '').toUpperCase();
  const status = ['COMPLETED', 'PENDING', 'FAILED', 'REFUNDED', 'REVERSED'].includes(normalizedStatus)
    ? normalizedStatus as PaymentTransactionRecord['status']
    : 'PENDING';

  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    subscriptionId: row.subscription_id || undefined,
    provider: providerFromDb(row.payment_provider),
    providerTransactionId: row.transaction_id || '',
    amount: Number(row.amount || 0),
    currency: String(row.currency || 'USD'),
    status,
    eventType: String(metadata.eventType || metadata.event_type || 'PAYMENT'),
    description: metadata.description || undefined,
    rawEventData: metadata.rawEventData || metadata.raw_event_data || undefined,
    createdAt: row.created_at,
  };
}

async function resolvePlanRow(planId: SubscriptionPlanId): Promise<{ id: string; slug: string }> {
  const supabase = getServerSupabase();
  const slug = planId.toLowerCase();
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('id,slug')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(`[DurableBillingDB] Failed to resolve ${planId} plan: ${error.message}`);
  if (!data?.id) throw new Error(`[DurableBillingDB] Missing subscription plan row for ${planId}.`);
  return { id: String(data.id), slug: String(data.slug) };
}

export class DurableBillingDatabaseService {
  static async getSubscription(organizationId: string): Promise<OrganizationSubscriptionRecord> {
    assertOrganizationId(organizationId);
    const supabase = getServerSupabase();

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) throw new Error(`[DurableBillingDB] Failed to read subscription: ${error.message}`);
    if (data) return mapSubscription(data);

    const plan = await resolvePlanRow('COMMUNITY');
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

    const payload = {
      organization_id: organizationId,
      plan_id: plan.id,
      status: 'active',
      start_date: now.toISOString().slice(0, 10),
      end_date: periodEnd.toISOString().slice(0, 10),
      edition: 'community',
      subscription_start: now.toISOString().slice(0, 10),
      subscription_end: periodEnd.toISOString().slice(0, 10),
      payment_provider: 'manual',
      external_subscription_id: null,
      billing_cycle: 'monthly',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      metadata: { source: 'durable_default_community' },
      updated_at: now.toISOString(),
    };

    const { data: inserted, error: insertError } = await supabase
      .from('subscriptions')
      .upsert(payload, { onConflict: 'organization_id' })
      .select('*')
      .single();

    if (insertError || !inserted) {
      throw new Error(`[DurableBillingDB] Failed to initialize Community subscription: ${insertError?.message || 'unknown error'}`);
    }
    return mapSubscription(inserted);
  }

  static async saveSubscription(sub: OrganizationSubscriptionRecord): Promise<OrganizationSubscriptionRecord> {
    assertOrganizationId(sub.organizationId);
    const supabase = getServerSupabase();
    const plan = await resolvePlanRow(sub.planId);

    const payload = {
      organization_id: sub.organizationId,
      plan_id: plan.id,
      status: sub.status.toLowerCase(),
      start_date: sub.currentPeriodStart.slice(0, 10),
      end_date: sub.currentPeriodEnd.slice(0, 10),
      edition: sub.planId.toLowerCase(),
      trial_start: null,
      trial_end: sub.trialEnd ? sub.trialEnd.slice(0, 10) : null,
      subscription_start: sub.currentPeriodStart.slice(0, 10),
      subscription_end: sub.currentPeriodEnd.slice(0, 10),
      payment_provider: sub.provider,
      external_subscription_id: sub.providerSubscriptionId || null,
      billing_cycle: sub.billingCycle.toLowerCase(),
      provider_customer_id: sub.providerCustomerId || null,
      provider_plan_id: sub.providerPlanId || null,
      current_period_start: sub.currentPeriodStart,
      current_period_end: sub.currentPeriodEnd,
      cancel_at_period_end: sub.cancelAtPeriodEnd,
      canceled_at: sub.canceledAt || null,
      metadata: sub.metadata || {},
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('subscriptions')
      .upsert(payload, { onConflict: 'organization_id' })
      .select('*')
      .single();

    if (error || !data) throw new Error(`[DurableBillingDB] Failed to save subscription: ${error?.message || 'unknown error'}`);
    return mapSubscription(data);
  }

  static async findByProviderSubscriptionId(providerSubscriptionId: string): Promise<OrganizationSubscriptionRecord | null> {
    if (!providerSubscriptionId) return null;
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('external_subscription_id', providerSubscriptionId)
      .maybeSingle();

    if (error) throw new Error(`[DurableBillingDB] Failed provider subscription lookup: ${error.message}`);
    return data ? mapSubscription(data) : null;
  }

  static async recordTransaction(tx: Omit<PaymentTransactionRecord, 'id' | 'createdAt'>): Promise<PaymentTransactionRecord> {
    assertOrganizationId(tx.organizationId);
    const supabase = getServerSupabase();
    const payload = {
      organization_id: tx.organizationId,
      subscription_id: tx.subscriptionId || null,
      amount: tx.amount,
      currency: tx.currency,
      payment_provider: tx.provider,
      transaction_id: tx.providerTransactionId || null,
      status: tx.status.toLowerCase(),
      metadata: {
        eventType: tx.eventType,
        description: tx.description || null,
        rawEventData: tx.rawEventData || null,
      },
      paid_at: tx.status === 'COMPLETED' ? new Date().toISOString() : null,
    };

    let query = supabase.from('payments').upsert(payload, {
      onConflict: 'payment_provider,transaction_id',
      ignoreDuplicates: false,
    });
    const { data, error } = await query.select('*').single();

    if (error || !data) throw new Error(`[DurableBillingDB] Failed to record transaction: ${error?.message || 'unknown error'}`);
    return mapTransaction(data);
  }

  static async listTransactions(organizationId: string): Promise<PaymentTransactionRecord[]> {
    assertOrganizationId(organizationId);
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`[DurableBillingDB] Failed to list transactions: ${error.message}`);
    return (data || []).map(mapTransaction);
  }

  static async claimWebhookEvent(input: {
    provider: PaymentProvider;
    eventId: string;
    eventType: string;
    resourceId?: string;
    organizationId?: string;
    signatureValid: boolean;
    payloadHash?: string;
    metadata?: Record<string, any>;
  }): Promise<{ claimed: boolean; status: string; id?: string }> {
    const supabase = getServerSupabase();
    if (input.organizationId) assertOrganizationId(input.organizationId);
    const { data, error } = await supabase.rpc('ralion_claim_billing_webhook', {
      p_provider: input.provider,
      p_event_id: input.eventId,
      p_event_type: input.eventType,
      p_resource_id: input.resourceId || null,
      p_organization_id: input.organizationId || null,
      p_signature_valid: input.signatureValid,
      p_payload_hash: input.payloadHash || null,
      p_metadata: input.metadata || {},
    });

    if (error) throw new Error(`[DurableBillingDB] Failed webhook claim: ${error.message}`);
    return {
      claimed: Boolean(data?.claimed),
      status: String(data?.status || 'UNKNOWN'),
      id: data?.id ? String(data.id) : undefined,
    };
  }

  static async completeWebhookEvent(
    provider: PaymentProvider,
    eventId: string,
    status: BillingWebhookEventRecord['status'],
    options?: { organizationId?: string; error?: string; metadata?: Record<string, any> }
  ): Promise<void> {
    const supabase = getServerSupabase();
    if (options?.organizationId) assertOrganizationId(options.organizationId);
    const patch: Record<string, any> = {
      status,
      processed_at: new Date().toISOString(),
      error: options?.error || null,
    };
    if (options?.organizationId) patch.organization_id = options.organizationId;
    if (options?.metadata) patch.metadata = options.metadata;

    const { error } = await supabase
      .from('billing_webhook_events')
      .update(patch)
      .eq('provider', provider)
      .eq('event_id', eventId);

    if (error) throw new Error(`[DurableBillingDB] Failed webhook completion: ${error.message}`);
  }
}
