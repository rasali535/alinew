import 'server-only';

import { randomUUID } from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { BillingCycle, SubscriptionPlanId } from './schema';

const DEFAULT_SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';

function getServerSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('[BillingCheckoutReference] SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required.');
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function assertOrganizationId(organizationId: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(organizationId || '').trim())) {
    throw new Error('[BillingCheckoutReference] A canonical organization UUID is required.');
  }
}

export interface BillingCheckoutReferenceRecord {
  reference: string;
  organizationId: string;
  workspaceId?: string;
  userId?: string;
  planId: SubscriptionPlanId;
  billingCycle: BillingCycle;
  provider: 'paypal';
  providerSubscriptionId?: string;
  status: 'PENDING' | 'BOUND' | 'CONSUMED' | 'EXPIRED' | 'FAILED';
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}

function mapRow(row: any): BillingCheckoutReferenceRecord {
  return {
    reference: String(row.reference),
    organizationId: String(row.organization_id),
    workspaceId: row.workspace_id || undefined,
    userId: row.user_id || undefined,
    planId: String(row.plan_id).toUpperCase() as SubscriptionPlanId,
    billingCycle: String(row.billing_cycle).toUpperCase() as BillingCycle,
    provider: 'paypal',
    providerSubscriptionId: row.provider_subscription_id || undefined,
    status: String(row.status).toUpperCase() as BillingCheckoutReferenceRecord['status'],
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: row.metadata || {},
  };
}

export class DurableBillingCheckoutReferenceService {
  static async createReference(input: {
    organizationId: string;
    workspaceId?: string;
    userId?: string;
    planId: SubscriptionPlanId;
    billingCycle: BillingCycle;
    metadata?: Record<string, any>;
  }): Promise<BillingCheckoutReferenceRecord> {
    assertOrganizationId(input.organizationId);
    if (!['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(input.planId)) {
      throw new Error('[BillingCheckoutReference] Paid checkout requires a paid plan.');
    }
    if (input.billingCycle !== 'MONTHLY') {
      throw new Error('[BillingCheckoutReference] Only MONTHLY checkout references are currently supported.');
    }

    const supabase = getServerSupabase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const reference = `ral_sub_${randomUUID().replace(/-/g, '')}`;

    const { data, error } = await supabase
      .from('billing_checkout_references')
      .insert({
        reference,
        organization_id: input.organizationId,
        workspace_id: input.workspaceId || null,
        user_id: input.userId || null,
        plan_id: input.planId.toLowerCase(),
        billing_cycle: input.billingCycle.toLowerCase(),
        provider: 'paypal',
        status: 'PENDING',
        expires_at: expiresAt.toISOString(),
        metadata: input.metadata || {},
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`[BillingCheckoutReference] Failed to create reference: ${error?.message || 'unknown error'}`);
    }
    return mapRow(data);
  }

  static async resolveReference(reference: string): Promise<BillingCheckoutReferenceRecord | null> {
    if (!String(reference || '').startsWith('ral_sub_')) return null;
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('billing_checkout_references')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();

    if (error) throw new Error(`[BillingCheckoutReference] Failed to resolve reference: ${error.message}`);
    if (!data) return null;

    const mapped = mapRow(data);
    const expired = new Date(mapped.expiresAt).getTime() <= Date.now();
    if (expired && mapped.status === 'PENDING') {
      await supabase
        .from('billing_checkout_references')
        .update({ status: 'EXPIRED', updated_at: new Date().toISOString() })
        .eq('reference', reference);
      return null;
    }

    return mapped;
  }

  static async bindProviderSubscription(reference: string, providerSubscriptionId: string): Promise<void> {
    if (!String(reference || '').startsWith('ral_sub_') || !providerSubscriptionId) return;
    const supabase = getServerSupabase();
    const { error } = await supabase
      .from('billing_checkout_references')
      .update({
        provider_subscription_id: providerSubscriptionId,
        status: 'BOUND',
        updated_at: new Date().toISOString(),
      })
      .eq('reference', reference);

    if (error) throw new Error(`[BillingCheckoutReference] Failed to bind provider subscription: ${error.message}`);
  }

  static async markStatus(
    reference: string,
    status: BillingCheckoutReferenceRecord['status'],
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!String(reference || '').startsWith('ral_sub_')) return;
    const supabase = getServerSupabase();
    const patch: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (metadata) patch.metadata = metadata;

    const { error } = await supabase
      .from('billing_checkout_references')
      .update(patch)
      .eq('reference', reference);
    if (error) throw new Error(`[BillingCheckoutReference] Failed to update reference: ${error.message}`);
  }
}
