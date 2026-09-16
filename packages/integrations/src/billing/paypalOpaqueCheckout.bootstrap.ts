import 'server-only';

import { DurableBillingCheckoutReferenceService } from '@ralion/database/server';
import { PayPalService, type PayPalSubscriptionCreationParams } from './paypal.service';
import { DurablePayPalService } from './paypalDurable.service';

const globalState = globalThis as unknown as {
  __ralionOpaquePayPalCheckoutPatched?: boolean;
};

function isOpaqueReference(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('ral_sub_');
}

function asLegacyCustomId(record: {
  organizationId: string;
  workspaceId?: string;
  userId?: string;
  planId: string;
  billingCycle: string;
}): string {
  return JSON.stringify({
    organizationId: record.organizationId,
    workspaceId: record.workspaceId || record.organizationId,
    userId: record.userId,
    planId: record.planId,
    billingCycle: record.billingCycle,
  });
}

if (!globalState.__ralionOpaquePayPalCheckoutPatched) {
  globalState.__ralionOpaquePayPalCheckoutPatched = true;

  const originalVerifySubscription = PayPalService.verifySubscription.bind(PayPalService);
  const originalProcessWebhookEvent = DurablePayPalService.processWebhookEvent.bind(DurablePayPalService);

  PayPalService.createSubscription = async function opaqueCreateSubscription(
    params: PayPalSubscriptionCreationParams
  ): Promise<{ success: boolean; subscriptionId?: string; approveUrl?: string; error?: string }> {
    const {
      organizationId,
      planId,
      billingCycle = 'MONTHLY',
      userId,
      returnUrl,
      cancelUrl,
    } = params;

    if (!organizationId) return { success: false, error: 'organizationId is required' };
    if (organizationId === 'ras-ali-labs') {
      return { success: false, error: 'Platform Admin organization cannot be converted to a customer PayPal subscription.' };
    }
    if (!['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(planId)) {
      return { success: false, error: `Invalid subscription plan requested: ${planId}` };
    }
    if (billingCycle !== 'MONTHLY') {
      return { success: false, error: 'Only MONTHLY PayPal billing is currently enabled.' };
    }

    let billingReference = '';
    try {
      const checkout = await DurableBillingCheckoutReferenceService.createReference({
        organizationId,
        workspaceId: organizationId,
        userId,
        planId,
        billingCycle: 'MONTHLY',
        metadata: { source: 'paypal_subscription_checkout' },
      });
      billingReference = checkout.reference;

      const paypalPlanId = PayPalService.getPlanId(planId);
      const defaultReturnUrl = returnUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://rasalilabs.com/ralion'}/billing?paypal=success`;
      const defaultCancelUrl = cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://rasalilabs.com/ralion'}/billing?paypal=cancelled`;
      const token = await PayPalService.getAccessToken();
      const payload = {
        plan_id: paypalPlanId,
        custom_id: billingReference,
        application_context: {
          brand_name: 'Ralion OS',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          return_url: defaultReturnUrl,
          cancel_url: defaultCancelUrl,
        },
      };

      const res = await fetch(`${PayPalService.getBaseUrl()}/v1/billing/subscriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        await DurableBillingCheckoutReferenceService.markStatus(billingReference, 'FAILED', {
          reason: 'paypal_subscription_creation_failed',
          httpStatus: res.status,
        }).catch(() => undefined);
        return { success: false, error: `PayPal subscription creation failed with HTTP ${res.status}` };
      }

      const data = await res.json();
      const approveLink = (data.links || []).find((link: any) => link.rel === 'approve')?.href;
      if (!data?.id || !approveLink) {
        await DurableBillingCheckoutReferenceService.markStatus(billingReference, 'FAILED', {
          reason: 'paypal_incomplete_subscription_response',
        }).catch(() => undefined);
        return { success: false, error: 'PayPal returned an incomplete subscription response.' };
      }

      await DurableBillingCheckoutReferenceService.bindProviderSubscription(billingReference, String(data.id));
      return { success: true, subscriptionId: String(data.id), approveUrl: String(approveLink) };
    } catch (error: any) {
      if (billingReference) {
        await DurableBillingCheckoutReferenceService.markStatus(billingReference, 'FAILED', {
          reason: 'opaque_checkout_exception',
        }).catch(() => undefined);
      }
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create PayPal subscription' };
    }
  } as typeof PayPalService.createSubscription;

  PayPalService.verifySubscription = async function opaqueVerifySubscription(subscriptionId: string) {
    const verified = await originalVerifySubscription(subscriptionId);
    if (!verified.success || !verified.data) return verified;

    const remote = verified.data;
    if (!isOpaqueReference(remote.custom_id)) return verified;

    const checkout = await DurableBillingCheckoutReferenceService.resolveReference(remote.custom_id);
    if (!checkout) {
      return { success: false, error: 'PayPal checkout reference is unknown or expired.' };
    }

    await DurableBillingCheckoutReferenceService.bindProviderSubscription(checkout.reference, subscriptionId);
    return {
      success: true,
      data: {
        ...remote,
        custom_id: asLegacyCustomId(checkout),
        ralion_billing_reference: checkout.reference,
      },
    };
  } as typeof PayPalService.verifySubscription;

  DurablePayPalService.processWebhookEvent = async function opaqueWebhookBridge(event: any) {
    const resource = event?.resource || {};
    if (!isOpaqueReference(resource.custom_id)) {
      return originalProcessWebhookEvent(event);
    }

    const checkout = await DurableBillingCheckoutReferenceService.resolveReference(resource.custom_id);
    if (!checkout) {
      return { handled: false, error: 'PayPal webhook referenced an unknown or expired Ralion checkout.' };
    }

    const providerSubscriptionId = resource.id || resource.billing_agreement_id;
    if (providerSubscriptionId) {
      await DurableBillingCheckoutReferenceService.bindProviderSubscription(
        checkout.reference,
        String(providerSubscriptionId)
      );
    }

    const bridgedEvent = {
      ...event,
      resource: {
        ...resource,
        custom_id: asLegacyCustomId(checkout),
      },
    };

    return originalProcessWebhookEvent(bridgedEvent);
  } as typeof DurablePayPalService.processWebhookEvent;
}
