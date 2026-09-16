import 'server-only';
import { createHash } from 'crypto';
import {
  BillingCycle,
  OrganizationSubscriptionRecord,
  PaymentTransactionRecord,
  SubscriptionPlanId,
} from '@ralion/database';
import { DurableBillingDatabaseService } from '@ralion/database/server';
import { DurableTenantCreditsService } from '@ralion/ai/server';
import { PayPalService, type PayPalSubscriptionCreationParams } from './paypal.service';

function addMonth(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const valid = Number.isFinite(d.getTime()) ? d : new Date();
  valid.setUTCMonth(valid.getUTCMonth() + 1);
  return valid.toISOString();
}

function parseCustomId(customId: unknown): {
  organizationId?: string;
  userId?: string;
  planId?: SubscriptionPlanId;
  billingCycle?: BillingCycle;
} {
  if (!customId || typeof customId !== 'string') return {};
  try {
    const parsed = JSON.parse(customId);
    return {
      organizationId: parsed?.organizationId,
      userId: parsed?.userId,
      planId: parsed?.planId,
      billingCycle: parsed?.billingCycle,
    };
  } catch {
    return {};
  }
}

function planFromProviderPlanId(providerPlanId?: string): SubscriptionPlanId | null {
  if (!providerPlanId) return null;
  for (const planId of ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as SubscriptionPlanId[]) {
    try {
      if (PayPalService.getPlanId(planId) === providerPlanId) return planId;
    } catch {
      // Ignore unconfigured tiers while checking another configured plan.
    }
  }
  return null;
}

export class DurablePayPalService {
  static async createSubscription(params: PayPalSubscriptionCreationParams) {
    if (params.billingCycle && params.billingCycle !== 'MONTHLY') {
      return {
        success: false,
        error: 'Only MONTHLY PayPal billing is currently enabled. Additional provider billing cycles require dedicated PayPal plan IDs.',
      };
    }
    return PayPalService.createSubscription({ ...params, billingCycle: 'MONTHLY' });
  }

  static async verifyWebhookSignature(headers: Record<string, string | string[] | undefined>, body: any): Promise<boolean> {
    return PayPalService.verifyWebhookSignature(headers, body);
  }

  static async activateVerifiedSubscription(params: {
    organizationId: string;
    planId: SubscriptionPlanId;
    billingCycle: BillingCycle;
    subscriptionId: string;
    userId?: string;
  }): Promise<{ success: boolean; subscription?: OrganizationSubscriptionRecord; error?: string }> {
    const { organizationId, planId, subscriptionId } = params;
    if (params.billingCycle !== 'MONTHLY') {
      return { success: false, error: 'Only MONTHLY PayPal billing is currently enabled.' };
    }

    const verified = await PayPalService.verifySubscription(subscriptionId);
    if (!verified.success || !verified.data) {
      return { success: false, error: verified.error || 'PayPal subscription verification failed.' };
    }

    const remote = verified.data;
    if (String(remote.status || '').toUpperCase() !== 'ACTIVE') {
      return { success: false, error: `PayPal subscription is not active (status: ${remote.status || 'unknown'}).` };
    }

    const custom = parseCustomId(remote.custom_id);
    if (!custom.organizationId || custom.organizationId !== organizationId) {
      return { success: false, error: 'PayPal subscription tenant metadata does not match the authenticated organization.' };
    }

    const expectedProviderPlanId = PayPalService.getPlanId(planId);
    if (remote.plan_id !== expectedProviderPlanId || (custom.planId && custom.planId !== planId)) {
      return { success: false, error: 'PayPal subscription plan does not match the requested Ralion plan.' };
    }

    const now = new Date().toISOString();
    const periodStart = remote.start_time || now;
    const periodEnd = remote.billing_info?.next_billing_time || addMonth(periodStart);
    const existing = await DurableBillingDatabaseService.getSubscription(organizationId);

    const saved = await DurableBillingDatabaseService.saveSubscription({
      ...existing,
      organizationId,
      planId,
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      provider: 'paypal',
      providerCustomerId: remote.subscriber?.payer_id || existing.providerCustomerId,
      providerSubscriptionId: remote.id,
      providerPlanId: remote.plan_id,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: undefined,
      metadata: {
        ...(existing.metadata || {}),
        paypalStatus: remote.status,
        verifiedAt: now,
      },
      createdAt: existing.createdAt || now,
      updatedAt: now,
    });

    await DurableTenantCreditsService.syncWallet(organizationId, planId);
    return { success: true, subscription: saved };
  }

  static async processWebhookEvent(event: any): Promise<{ handled: boolean; action?: string; error?: string }> {
    if (!event?.id || !event?.event_type) {
      return { handled: false, error: 'Malformed webhook event payload.' };
    }

    const eventId = String(event.id);
    const eventType = String(event.event_type);
    const resource = event.resource || {};
    const custom = parseCustomId(resource.custom_id);
    let organizationId = custom.organizationId || '';
    let existing: OrganizationSubscriptionRecord | null = null;

    const providerSubscriptionId = resource.billing_agreement_id || resource.id;
    if (!organizationId && providerSubscriptionId) {
      existing = await DurableBillingDatabaseService.findByProviderSubscriptionId(String(providerSubscriptionId));
      organizationId = existing?.organizationId || '';
    }

    const payloadHash = createHash('sha256').update(JSON.stringify(event)).digest('hex');
    const claim = await DurableBillingDatabaseService.claimWebhookEvent({
      provider: 'paypal',
      eventId,
      eventType,
      resourceId: resource.id ? String(resource.id) : undefined,
      organizationId: organizationId || undefined,
      signatureValid: true,
      payloadHash,
      metadata: { providerCreateTime: event.create_time || null },
    });

    if (!claim.claimed) {
      return { handled: true, action: `IGNORED_DUPLICATE_${claim.status}` };
    }

    try {
      let action = 'IGNORED_UNSUPPORTED';

      switch (eventType) {
        case 'BILLING.SUBSCRIPTION.ACTIVATED': {
          const planId = planFromProviderPlanId(resource.plan_id) || custom.planId || null;
          if (!organizationId || !planId) throw new Error('Activated subscription is missing trusted tenant or plan metadata.');
          const current = existing || await DurableBillingDatabaseService.getSubscription(organizationId);
          const periodStart = resource.start_time || new Date().toISOString();
          const periodEnd = resource.billing_info?.next_billing_time || addMonth(periodStart);
          await DurableBillingDatabaseService.saveSubscription({
            ...current,
            planId,
            status: 'ACTIVE',
            billingCycle: 'MONTHLY',
            provider: 'paypal',
            providerCustomerId: resource.subscriber?.payer_id || current.providerCustomerId,
            providerSubscriptionId: resource.id,
            providerPlanId: resource.plan_id,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            canceledAt: undefined,
            metadata: { ...(current.metadata || {}), lastPayPalWebhookId: eventId },
            updatedAt: new Date().toISOString(),
          });
          await DurableTenantCreditsService.syncWallet(organizationId, planId);
          action = 'SUBSCRIPTION_ACTIVATED';
          break;
        }

        case 'BILLING.SUBSCRIPTION.UPDATED': {
          existing = existing || await DurableBillingDatabaseService.findByProviderSubscriptionId(String(resource.id || ''));
          if (!existing) throw new Error('Updated PayPal subscription is not linked to a Ralion organization.');
          const verified = await PayPalService.verifySubscription(String(resource.id));
          if (!verified.success || !verified.data) throw new Error(verified.error || 'Unable to verify updated PayPal subscription.');
          const remote = verified.data;
          const planId = planFromProviderPlanId(remote.plan_id) || existing.planId;
          const remoteStatus = String(remote.status || '').toUpperCase();
          const status: OrganizationSubscriptionRecord['status'] =
            remoteStatus === 'ACTIVE' ? 'ACTIVE' :
            remoteStatus === 'SUSPENDED' ? 'SUSPENDED' :
            remoteStatus === 'CANCELLED' ? 'CANCELED' : existing.status;
          await DurableBillingDatabaseService.saveSubscription({
            ...existing,
            planId,
            status,
            providerPlanId: remote.plan_id || existing.providerPlanId,
            currentPeriodEnd: remote.billing_info?.next_billing_time || existing.currentPeriodEnd,
            metadata: { ...(existing.metadata || {}), lastPayPalWebhookId: eventId },
            updatedAt: new Date().toISOString(),
          });
          await DurableTenantCreditsService.syncWallet(existing.organizationId, status === 'ACTIVE' ? planId : 'COMMUNITY');
          organizationId = existing.organizationId;
          action = 'SUBSCRIPTION_UPDATED';
          break;
        }

        case 'BILLING.SUBSCRIPTION.CANCELLED':
        case 'BILLING.SUBSCRIPTION.SUSPENDED':
        case 'BILLING.SUBSCRIPTION.EXPIRED': {
          existing = existing || await DurableBillingDatabaseService.findByProviderSubscriptionId(String(resource.id || ''));
          if (!existing) throw new Error('PayPal subscription lifecycle event is not linked to a Ralion organization.');
          const status: OrganizationSubscriptionRecord['status'] =
            eventType.endsWith('CANCELLED') ? 'CANCELED' : eventType.endsWith('SUSPENDED') ? 'SUSPENDED' : 'EXPIRED';
          const saved = await DurableBillingDatabaseService.saveSubscription({
            ...existing,
            status,
            cancelAtPeriodEnd: status === 'CANCELED',
            canceledAt: status === 'CANCELED' ? new Date().toISOString() : existing.canceledAt,
            metadata: { ...(existing.metadata || {}), lastPayPalWebhookId: eventId },
            updatedAt: new Date().toISOString(),
          });
          organizationId = saved.organizationId;
          if (status === 'SUSPENDED' || status === 'EXPIRED') {
            await DurableTenantCreditsService.syncWallet(saved.organizationId, 'COMMUNITY');
          }
          action = `SUBSCRIPTION_${status}`;
          break;
        }

        case 'PAYMENT.SALE.COMPLETED': {
          const agreementId = String(resource.billing_agreement_id || '');
          existing = existing || await DurableBillingDatabaseService.findByProviderSubscriptionId(agreementId);
          if (!existing) throw new Error('Completed PayPal payment is not linked to a Ralion subscription.');
          organizationId = existing.organizationId;
          const amount = Number(resource.amount?.total || 0);
          const currency = String(resource.amount?.currency || 'USD');
          await DurableBillingDatabaseService.recordTransaction({
            organizationId,
            subscriptionId: existing.id,
            provider: 'paypal',
            providerTransactionId: String(resource.id || eventId),
            amount,
            currency,
            status: 'COMPLETED',
            eventType,
            description: 'PayPal subscription payment completed',
            rawEventData: { billingAgreementId: agreementId },
          });
          const renewed = await DurableBillingDatabaseService.saveSubscription({
            ...existing,
            status: 'ACTIVE',
            currentPeriodEnd: addMonth(existing.currentPeriodEnd),
            metadata: { ...(existing.metadata || {}), lastPayPalWebhookId: eventId },
            updatedAt: new Date().toISOString(),
          });
          await DurableTenantCreditsService.syncWallet(organizationId, renewed.planId);
          action = 'PAYMENT_COMPLETED';
          break;
        }

        case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        case 'PAYMENT.SALE.DENIED': {
          const agreementId = String(resource.billing_agreement_id || resource.id || '');
          existing = existing || await DurableBillingDatabaseService.findByProviderSubscriptionId(agreementId);
          if (!existing) throw new Error('Failed PayPal payment is not linked to a Ralion subscription.');
          organizationId = existing.organizationId;
          await DurableBillingDatabaseService.saveSubscription({
            ...existing,
            status: 'PAST_DUE',
            metadata: { ...(existing.metadata || {}), lastPayPalWebhookId: eventId },
            updatedAt: new Date().toISOString(),
          });
          if (resource.id) {
            await DurableBillingDatabaseService.recordTransaction({
              organizationId,
              subscriptionId: existing.id,
              provider: 'paypal',
              providerTransactionId: String(resource.id),
              amount: Number(resource.amount?.total || 0),
              currency: String(resource.amount?.currency || 'USD'),
              status: 'FAILED',
              eventType,
              description: 'PayPal subscription payment failed',
              rawEventData: { reason: resource.reason_code || null },
            });
          }
          action = 'PAYMENT_FAILED';
          break;
        }

        case 'PAYMENT.SALE.REFUNDED': {
          const agreementId = String(resource.billing_agreement_id || '');
          existing = existing || await DurableBillingDatabaseService.findByProviderSubscriptionId(agreementId);
          if (!existing) throw new Error('Refunded PayPal payment is not linked to a Ralion subscription.');
          organizationId = existing.organizationId;
          await DurableBillingDatabaseService.recordTransaction({
            organizationId,
            subscriptionId: existing.id,
            provider: 'paypal',
            providerTransactionId: String(resource.id || eventId),
            amount: Number(resource.amount?.total || 0),
            currency: String(resource.amount?.currency || 'USD'),
            status: 'REFUNDED',
            eventType,
            description: 'PayPal subscription payment refunded',
            rawEventData: { billingAgreementId: agreementId },
          });
          action = 'PAYMENT_REFUNDED';
          break;
        }
      }

      await DurableBillingDatabaseService.completeWebhookEvent(
        'paypal',
        eventId,
        action === 'IGNORED_UNSUPPORTED' ? 'IGNORED' : 'PROCESSED',
        { organizationId: organizationId || undefined, metadata: { action } }
      );
      return { handled: true, action };
    } catch (error: any) {
      await DurableBillingDatabaseService.completeWebhookEvent('paypal', eventId, 'FAILED', {
        organizationId: organizationId || undefined,
        error: error?.message || 'Unknown webhook processing error',
      }).catch(() => undefined);
      return { handled: false, error: error?.message || 'Unknown webhook processing error' };
    }
  }
}
