import 'server-only';

import { createHash } from 'crypto';
import { PLAN_CATALOG } from '@ralion/auth';
import type { OrganizationSubscriptionRecord, SubscriptionPlanId } from '@ralion/database';
import {
  DurableBillingCheckoutReferenceService,
  DurableBillingDatabaseService,
  PayPalCardVaultBillingStore,
} from '@ralion/database/server';
import { DurableTenantCreditsService } from '@ralion/ai/server';
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

function addMonth(iso: string): string {
  const date = new Date(iso);
  const valid = Number.isFinite(date.getTime()) ? date : new Date();
  valid.setUTCMonth(valid.getUTCMonth() + 1);
  return valid.toISOString();
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

function completedCapture(order: any): any | null {
  const capture = order?.purchase_units?.[0]?.payments?.captures?.[0];
  return capture?.id && capture?.status === 'COMPLETED' ? capture : null;
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
              stored_credential: {
                payment_initiator: 'CUSTOMER',
                payment_type: 'RECURRING',
                usage: 'FIRST',
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

    const captured = order.status === 'COMPLETED'
      ? order
      : await paypalJson(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
          method: 'POST',
          headers: { 'PayPal-Request-Id': `${billingReference}-capture` },
          body: '{}',
        });
    if (captured?.status !== 'COMPLETED') throw new Error(`PayPal order was not completed (${captured?.status || 'UNKNOWN'}).`);
    const capture = completedCapture(captured);
    if (!capture) throw new Error('PayPal did not return a completed capture.');
    const card = captured?.payment_source?.card || {};
    const vault = card?.attributes?.vault || {};
    await DurableBillingCheckoutReferenceService.markStatus(billingReference, 'CONSUMED', {
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

  static async chargeRenewal(subscription: OrganizationSubscriptionRecord): Promise<{
    orderId: string;
    captureId: string;
    amount: number;
    currency: string;
    periodStart: string;
    periodEnd: string;
  }> {
    assertPaidPlan(subscription.planId);
    const vaultId = String(subscription.metadata?.paypalVaultId || '');
    if (!vaultId || String(subscription.metadata?.paypalVaultStatus || '').toUpperCase() === 'DELETED') {
      throw new Error('No active PayPal vaulted card is available for renewal.');
    }
    const periodKey = createHash('sha256')
      .update(`${subscription.organizationId}:${subscription.currentPeriodEnd}:${subscription.planId}`)
      .digest('hex')
      .slice(0, 24);
    const requestId = `ral-renew-${periodKey}`;
    const previousCaptureId = String(subscription.metadata?.paypalCaptureId || subscription.metadata?.lastPayPalCaptureId || '');
    const storedCredential: Record<string, any> = {
      payment_initiator: 'MERCHANT',
      payment_type: 'RECURRING',
      usage: 'SUBSEQUENT',
    };
    if (previousCaptureId) storedCredential.previous_transaction_reference = previousCaptureId;

    let order = await paypalJson('/v2/checkout/orders', {
      method: 'POST',
      headers: { 'PayPal-Request-Id': requestId },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: `renew_${periodKey}`,
          custom_id: subscription.organizationId,
          description: `Ralion OS ${subscription.planId} monthly renewal`,
          amount: { currency_code: 'USD', value: money(subscription.planId) },
        }],
        payment_source: {
          card: {
            vault_id: vaultId,
            stored_credential: storedCredential,
          },
        },
      }),
    });
    if (!order?.id) throw new Error('PayPal did not return a renewal order ID.');
    if (order.status !== 'COMPLETED') {
      order = await paypalJson(`/v2/checkout/orders/${encodeURIComponent(String(order.id))}/capture`, {
        method: 'POST',
        headers: { 'PayPal-Request-Id': `${requestId}-capture` },
        body: '{}',
      });
    }
    const capture = completedCapture(order);
    if (order?.status !== 'COMPLETED' || !capture) throw new Error(`PayPal renewal was not completed (${order?.status || 'UNKNOWN'}).`);

    const periodStart = new Date(Math.max(Date.now(), new Date(subscription.currentPeriodEnd).getTime())).toISOString();
    return {
      orderId: String(order.id),
      captureId: String(capture.id),
      amount: Number(capture.amount?.value || money(subscription.planId)),
      currency: String(capture.amount?.currency_code || 'USD'),
      periodStart,
      periodEnd: addMonth(periodStart),
    };
  }

  static async processVaultWebhook(event: any): Promise<{ handled: boolean; action?: string; error?: string }> {
    const eventType = String(event?.event_type || '');
    if (!['VAULT.PAYMENT-TOKEN.CREATED', 'VAULT.PAYMENT-TOKEN.DELETED', 'VAULT.PAYMENT-TOKEN.DELETION-INITIATED'].includes(eventType)) {
      return { handled: false };
    }
    if (!event?.id || !event?.resource?.id) return { handled: false, error: 'Malformed PayPal vault webhook.' };

    const resource = event.resource;
    const customerId = String(resource?.customer?.id || '');
    if (!customerId) return { handled: false, error: 'PayPal vault webhook is missing customer ID.' };
    const subscription = await PayPalCardVaultBillingStore.findByCustomerId(customerId);
    if (!subscription) return { handled: false, error: 'PayPal vault token is not yet linked to a Ralion billing customer.' };

    const payloadHash = createHash('sha256').update(JSON.stringify(event)).digest('hex');
    const claim = await DurableBillingDatabaseService.claimWebhookEvent({
      provider: 'paypal',
      eventId: String(event.id),
      eventType,
      resourceId: String(resource.id),
      organizationId: subscription.organizationId,
      signatureValid: true,
      payloadHash,
      metadata: { source: 'paypal_card_vault' },
    });
    if (!claim.claimed) return { handled: true, action: `IGNORED_DUPLICATE_${claim.status}` };

    try {
      const card = resource?.payment_source?.card || {};
      const deleted = eventType !== 'VAULT.PAYMENT-TOKEN.CREATED';
      await PayPalCardVaultBillingStore.patchVaultMetadata({
        organizationId: subscription.organizationId,
        vaultId: deleted ? null : String(resource.id),
        customerId,
        vaultStatus: deleted ? 'DELETED' : 'VAULTED',
        cardBrand: card.brand || null,
        cardLastDigits: card.last_digits || null,
        cardExpiry: card.expiry || null,
        webhookId: String(event.id),
      });
      await DurableBillingDatabaseService.completeWebhookEvent('paypal', String(event.id), 'PROCESSED', {
        organizationId: subscription.organizationId,
        metadata: { action: deleted ? 'VAULT_TOKEN_DELETED' : 'VAULT_TOKEN_CREATED' },
      });
      return { handled: true, action: deleted ? 'VAULT_TOKEN_DELETED' : 'VAULT_TOKEN_CREATED' };
    } catch (error: any) {
      await DurableBillingDatabaseService.completeWebhookEvent('paypal', String(event.id), 'FAILED', {
        organizationId: subscription.organizationId,
        error: error?.message || 'Vault webhook processing failed',
      }).catch(() => undefined);
      return { handled: false, error: error?.message || 'Vault webhook processing failed' };
    }
  }

  static async runDueRenewals(limit = 25): Promise<{ attempted: number; succeeded: number; failed: number }> {
    const due = await PayPalCardVaultBillingStore.listDueRenewals(limit);
    let succeeded = 0;
    let failed = 0;
    for (const subscription of due) {
      try {
        const result = await this.chargeRenewal(subscription);
        await DurableBillingDatabaseService.recordTransaction({
          organizationId: subscription.organizationId,
          subscriptionId: subscription.id,
          provider: 'paypal',
          providerTransactionId: result.captureId,
          amount: result.amount,
          currency: result.currency,
          status: 'COMPLETED',
          eventType: 'PAYPAL_CARD_RENEWAL_COMPLETED',
          description: `Ralion OS ${subscription.planId} monthly card renewal`,
          rawEventData: { orderId: result.orderId },
        });
        await DurableBillingDatabaseService.saveSubscription({
          ...subscription,
          status: 'ACTIVE',
          currentPeriodStart: result.periodStart,
          currentPeriodEnd: result.periodEnd,
          metadata: {
            ...(subscription.metadata || {}),
            paypalCaptureId: result.captureId,
            paypalOrderId: result.orderId,
            lastPayPalCaptureId: result.captureId,
            lastRenewalAt: new Date().toISOString(),
            lastRenewalError: null,
          },
          updatedAt: new Date().toISOString(),
        });
        await DurableTenantCreditsService.syncWallet(subscription.organizationId, subscription.planId);
        succeeded += 1;
      } catch (error: any) {
        failed += 1;
        await PayPalCardVaultBillingStore.markRenewalFailure(
          subscription.organizationId,
          error instanceof Error ? error.message : 'PayPal renewal failed'
        ).catch(() => undefined);
      }
    }
    return { attempted: due.length, succeeded, failed };
  }
}
