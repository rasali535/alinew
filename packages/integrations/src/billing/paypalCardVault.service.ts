import 'server-only';

import { PLAN_CATALOG } from '@ralion/auth';
import type { SubscriptionPlanId } from '@ralion/database';
import { DurableBillingCheckoutReferenceService } from '@ralion/database/server';
import { PayPalService } from './paypal.service';

const PAID_PLANS: SubscriptionPlanId[] = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'];

function assertPaidPlan(planId: SubscriptionPlanId): void {
  if (!PAID_PLANS.includes(planId)) throw new Error('A paid Ralion plan is required.');
}

function money(planId: SubscriptionPlanId): string {
  const value = Number(PLAN_CATALOG[planId]?.monthlyPriceUsd || 0);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid monthly price for ${planId}.`);
  return value.toFixed(2);
}

async function paypalJson(path: string, init: RequestInit): Promise<any> {
  const token = await PayPalService.getAccessToken();
  const response = await fetch(`${PayPalService.getBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!response.ok) {
    const issue = Array.isArray(data?.details) ? data.details[0] : undefined;
    const reason = issue?.description || issue?.issue || data?.message || `HTTP ${response.status}`;
    throw new Error(`PayPal card checkout failed: ${reason}`);
  }
  return data;
}

export class PayPalCardVaultService {
  static getClientId(): string {
    return PayPalService.getConfig().clientId;
  }

  static async createOrder(params: {
    organizationId: string;
    userId: string;
    planId: SubscriptionPlanId;
  }): Promise<{ orderId: string; billingReference: string }> {
    assertPaidPlan(params.planId);
    const checkout = await DurableBillingCheckoutReferenceService.createReference({
      organizationId: params.organizationId,
      workspaceId: params.organizationId,
      userId: params.userId,
      planId: params.planId,
      billingCycle: 'MONTHLY',
      metadata: { source: 'paypal_card_vault_checkout' },
    });

    try {
      const data = await paypalJson('/v2/checkout/orders', {
        method: 'POST',
        headers: { 'PayPal-Request-Id': checkout.reference },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            reference_id: checkout.reference,
            custom_id: checkout.reference,
            description: `Ralion OS ${params.planId} monthly subscription`,
            amount: { currency_code: 'USD', value: money(params.planId) },
          }],
          payment_source: {
            card: {
              attributes: {
                vault: { store_in_vault: 'ON_SUCCESS' },
                verification: { method: 'SCA_WHEN_REQUIRED' },
              },
            },
          },
        }),
      });
      if (!data?.id) throw new Error('PayPal did not return an order ID.');
      await DurableBillingCheckoutReferenceService.bindProviderSubscription(checkout.reference, String(data.id));
      return { orderId: String(data.id), billingReference: checkout.reference };
    } catch (error) {
      await DurableBillingCheckoutReferenceService.markStatus(checkout.reference, 'FAILED', {
        reason: 'paypal_card_order_creation_failed',
      }).catch(() => undefined);
      throw error;
    }
  }

  static async captureOrder(orderId: string, organizationId: string): Promise<{
    orderId: string;
    captureId: string;
    vaultId?: string;
    customerId?: string;
    vaultStatus?: string;
    amount: number;
    currency: string;
    planId: SubscriptionPlanId;
    billingReference: string;
  }> {
    if (!orderId) throw new Error('PayPal order ID is required.');
    const order = await paypalJson(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, { method: 'GET' });
    const unit = order?.purchase_units?.[0];
    const billingReference = String(unit?.custom_id || unit?.reference_id || '');
    if (!billingReference.startsWith('ral_sub_')) throw new Error('PayPal order is missing its Ralion billing reference.');
    const checkout = await DurableBillingCheckoutReferenceService.resolveReference(billingReference);
    if (!checkout || checkout.organizationId !== organizationId) throw new Error('PayPal order does not belong to the authenticated organization.');
    assertPaidPlan(checkout.planId as SubscriptionPlanId);
    if (String(unit?.amount?.currency_code || '') !== 'USD' || String(unit?.amount?.value || '') !== money(checkout.planId as SubscriptionPlanId)) {
      throw new Error('PayPal order amount does not match the Ralion plan price.');
    }

    const captured = await paypalJson(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: 'POST',
      headers: { 'PayPal-Request-Id': `${billingReference}-capture` },
      body: '{}',
    });
    if (captured?.status !== 'COMPLETED') throw new Error(`PayPal order was not completed (${captured?.status || 'UNKNOWN'}).`);
    const capture = captured?.purchase_units?.[0]?.payments?.captures?.[0];
    if (!capture?.id || capture?.status !== 'COMPLETED') throw new Error('PayPal did not return a completed capture.');
    const card = captured?.payment_source?.card || {};
    const vault = card?.attributes?.vault || {};
    await DurableBillingCheckoutReferenceService.markStatus(billingReference, 'COMPLETED', {
      providerOrderId: orderId,
      providerCaptureId: capture.id,
      vaultStatus: vault.status || null,
      vaultId: vault.id || null,
      customerId: vault.customer?.id || null,
    });
    return {
      orderId,
      captureId: String(capture.id),
      vaultId: vault.id ? String(vault.id) : undefined,
      customerId: vault.customer?.id ? String(vault.customer.id) : undefined,
      vaultStatus: vault.status ? String(vault.status) : undefined,
      amount: Number(capture.amount?.value || unit.amount.value),
      currency: String(capture.amount?.currency_code || 'USD'),
      planId: checkout.planId as SubscriptionPlanId,
      billingReference,
    };
  }
}
