import 'server-only';

import { createHash } from 'crypto';
import { PLAN_CATALOG } from '@ralion/auth';
import type { OrganizationSubscriptionRecord, SubscriptionPlanId } from '@ralion/database';
import { DurableBillingDatabaseService, PayPalCardVaultBillingStore } from '@ralion/database/server';
import { DurableTenantCreditsService } from '@ralion/ai/server';
import { PayPalService } from './paypal.service';

function money(planId: SubscriptionPlanId): string {
  const value = Number(PLAN_CATALOG[planId]?.monthlyPriceUsd || 0);
  if (!['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(planId) || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid paid Ralion plan for renewal: ${planId}`);
  }
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
    throw new Error(issue?.description || issue?.issue || data?.message || `PayPal HTTP ${response.status}`);
  }
  return data;
}

function getCompletedCapture(order: any): any | null {
  const capture = order?.purchase_units?.[0]?.payments?.captures?.[0];
  return capture?.id && capture?.status === 'COMPLETED' ? capture : null;
}

export class PayPalCardRenewalService {
  private static async resolveVaultId(subscription: OrganizationSubscriptionRecord): Promise<string> {
    const stored = String(subscription.metadata?.paypalVaultId || '');
    const status = String(subscription.metadata?.paypalVaultStatus || '').toUpperCase();
    if (stored && status !== 'DELETED') return stored;

    const customerId = String(subscription.providerCustomerId || '');
    if (!customerId) throw new Error('PayPal customer ID is missing; vaulted card cannot be recovered.');
    const result = await paypalJson(`/v3/vault/payment-tokens?customer_id=${encodeURIComponent(customerId)}`, { method: 'GET' });
    const tokens = Array.isArray(result?.payment_tokens) ? result.payment_tokens : [];
    const token = tokens.find((item: any) => item?.id && item?.payment_source?.card);
    if (!token?.id) throw new Error('No active PayPal card payment token is available for this customer.');

    const card = token.payment_source.card || {};
    await PayPalCardVaultBillingStore.patchVaultMetadata({
      organizationId: subscription.organizationId,
      customerId,
      vaultId: String(token.id),
      vaultStatus: 'VAULTED',
      cardBrand: card.brand || null,
      cardLastDigits: card.last_digits || null,
      cardExpiry: card.expiry || null,
    });
    return String(token.id);
  }

  private static async charge(subscription: OrganizationSubscriptionRecord): Promise<{
    orderId: string;
    captureId: string;
    amount: number;
    currency: string;
    periodStart: string;
    periodEnd: string;
  }> {
    const vaultId = await this.resolveVaultId(subscription);
    const periodKey = createHash('sha256')
      .update(`${subscription.organizationId}:${subscription.currentPeriodEnd}:${subscription.planId}`)
      .digest('hex')
      .slice(0, 24);
    const requestId = `ral-renew-${periodKey}`;
    const storedCredential: Record<string, any> = {
      payment_initiator: 'MERCHANT',
      payment_type: 'RECURRING',
      usage: 'SUBSEQUENT',
    };
    const priorCapture = String(subscription.metadata?.lastPayPalCaptureId || subscription.metadata?.paypalCaptureId || '');
    if (priorCapture) storedCredential.previous_transaction_reference = priorCapture;

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
    const capture = getCompletedCapture(order);
    if (order?.status !== 'COMPLETED' || !capture) {
      throw new Error(`PayPal renewal was not completed (${order?.status || 'UNKNOWN'}).`);
    }

    const dueMs = new Date(subscription.currentPeriodEnd).getTime();
    const periodStart = new Date(Math.max(Date.now(), Number.isFinite(dueMs) ? dueMs : Date.now())).toISOString();
    return {
      orderId: String(order.id),
      captureId: String(capture.id),
      amount: Number(capture.amount?.value || money(subscription.planId)),
      currency: String(capture.amount?.currency_code || 'USD'),
      periodStart,
      periodEnd: addMonth(periodStart),
    };
  }

  static async runDueRenewals(limit = 25): Promise<{ attempted: number; succeeded: number; failed: number }> {
    const due = await PayPalCardVaultBillingStore.listDueRenewals(limit);
    let succeeded = 0;
    let failed = 0;

    for (const subscription of due) {
      try {
        const result = await this.charge(subscription);
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
            paypalOrderId: result.orderId,
            paypalCaptureId: result.captureId,
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
