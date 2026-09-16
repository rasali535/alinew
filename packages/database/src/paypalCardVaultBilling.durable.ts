import 'server-only';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { OrganizationSubscriptionRecord, SubscriptionPlanId } from './schema';

const DEFAULT_SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';

function getServerSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('[PayPalCardVaultBilling] service-role Supabase key is required.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function assertOrganizationId(value: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''))) {
    throw new Error('[PayPalCardVaultBilling] canonical organization UUID required.');
  }
}

function normalizePlan(value: unknown): SubscriptionPlanId {
  const plan = String(value || '').toUpperCase();
  return ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(plan)
    ? plan as SubscriptionPlanId
    : 'COMMUNITY';
}

function mapSubscription(row: any): OrganizationSubscriptionRecord {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    planId: normalizePlan(row.edition),
    status: String(row.status || 'pending').toUpperCase() as OrganizationSubscriptionRecord['status'],
    billingCycle: String(row.billing_cycle || 'monthly').toUpperCase() as OrganizationSubscriptionRecord['billingCycle'],
    provider: row.payment_provider === 'paypal' ? 'paypal' : row.payment_provider === 'stripe' ? 'stripe' : 'manual',
    providerCustomerId: row.provider_customer_id || undefined,
    providerSubscriptionId: row.external_subscription_id || undefined,
    providerPlanId: row.provider_plan_id || undefined,
    currentPeriodStart: row.current_period_start || row.created_at,
    currentPeriodEnd: row.current_period_end || row.updated_at || row.created_at,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    canceledAt: row.canceled_at || undefined,
    trialEnd: row.trial_end || undefined,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

export class PayPalCardVaultBillingStore {
  static async findByCustomerId(customerId: string): Promise<OrganizationSubscriptionRecord | null> {
    if (!customerId) return null;
    const { data, error } = await getServerSupabase()
      .from('subscriptions')
      .select('*')
      .eq('payment_provider', 'paypal')
      .eq('provider_customer_id', customerId)
      .maybeSingle();
    if (error) throw new Error(`[PayPalCardVaultBilling] customer lookup failed: ${error.message}`);
    return data ? mapSubscription(data) : null;
  }

  static async patchVaultMetadata(input: {
    organizationId: string;
    vaultId?: string | null;
    customerId?: string | null;
    vaultStatus: string;
    cardBrand?: string | null;
    cardLastDigits?: string | null;
    cardExpiry?: string | null;
    webhookId?: string | null;
  }): Promise<void> {
    assertOrganizationId(input.organizationId);
    const supabase = getServerSupabase();
    const { data: existing, error: readError } = await supabase
      .from('subscriptions')
      .select('metadata,provider_customer_id')
      .eq('organization_id', input.organizationId)
      .single();
    if (readError) throw new Error(`[PayPalCardVaultBilling] subscription lookup failed: ${readError.message}`);

    const metadata = {
      ...(existing?.metadata || {}),
      billingMode: 'paypal_card_vault',
      paypalVaultId: input.vaultId ?? existing?.metadata?.paypalVaultId ?? null,
      paypalVaultStatus: input.vaultStatus,
      paypalCardBrand: input.cardBrand ?? existing?.metadata?.paypalCardBrand ?? null,
      paypalCardLastDigits: input.cardLastDigits ?? existing?.metadata?.paypalCardLastDigits ?? null,
      paypalCardExpiry: input.cardExpiry ?? existing?.metadata?.paypalCardExpiry ?? null,
      lastPayPalVaultWebhookId: input.webhookId ?? existing?.metadata?.lastPayPalVaultWebhookId ?? null,
      vaultUpdatedAt: new Date().toISOString(),
    };

    const patch: Record<string, any> = { metadata, updated_at: new Date().toISOString() };
    if (input.customerId) patch.provider_customer_id = input.customerId;
    const { error } = await supabase.from('subscriptions').update(patch).eq('organization_id', input.organizationId);
    if (error) throw new Error(`[PayPalCardVaultBilling] vault metadata update failed: ${error.message}`);
  }

  static async listDueRenewals(limit = 50): Promise<OrganizationSubscriptionRecord[]> {
    const now = new Date().toISOString();
    const { data, error } = await getServerSupabase()
      .from('subscriptions')
      .select('*')
      .eq('payment_provider', 'paypal')
      .in('status', ['active', 'past_due'])
      .lte('current_period_end', now)
      .order('current_period_end', { ascending: true })
      .limit(Math.max(1, Math.min(limit, 100)));
    if (error) throw new Error(`[PayPalCardVaultBilling] renewal query failed: ${error.message}`);
    return (data || [])
      .map(mapSubscription)
      .filter(sub => sub.metadata?.billingMode === 'paypal_card_vault' && Boolean(sub.metadata?.paypalVaultId));
  }

  static async markRenewalFailure(organizationId: string, message: string): Promise<void> {
    assertOrganizationId(organizationId);
    const supabase = getServerSupabase();
    const { data: existing, error: readError } = await supabase
      .from('subscriptions')
      .select('metadata')
      .eq('organization_id', organizationId)
      .single();
    if (readError) throw new Error(`[PayPalCardVaultBilling] failure lookup failed: ${readError.message}`);
    const { error } = await supabase.from('subscriptions').update({
      status: 'past_due',
      metadata: {
        ...(existing?.metadata || {}),
        lastRenewalError: message.slice(0, 500),
        lastRenewalAttemptAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    }).eq('organization_id', organizationId);
    if (error) throw new Error(`[PayPalCardVaultBilling] renewal failure update failed: ${error.message}`);
  }
}
