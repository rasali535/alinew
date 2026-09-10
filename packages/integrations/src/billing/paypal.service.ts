/**
 * Ralion OS — Enterprise PayPal Live Subscription & Payment Gateway Service
 * Ras Ali Labs (Pty) Ltd
 *
 * Implements:
 * 1. PayPal REST OAuth 2.0 token acquisition
 * 2. Plan mapping & server-validated subscription creation
 * 3. Cryptographic webhook signature verification
 * 4. Strictly idempotent webhook processing for subscription lifecycle & payment events
 * 5. Tenant entitlement & monthly credit provisioning via TenantCreditsService
 * 6. Multi-tenant isolation & Platform Admin protection
 * 7. Server-side billing audit logging (zero secrets exposed)
 */

import {
  BillingDatabaseService,
  SubscriptionPlanId,
  OrganizationSubscriptionRecord,
  BillingCycle,
} from '@ralion/database';
import { TenantCreditsService } from '@ralion/ai';
import { PLAN_CATALOG } from '@ralion/auth';

export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  webhookId: string;
  environment: 'sandbox' | 'live';
  apiBase: string;
}

export interface PayPalSubscriptionCreationParams {
  organizationId: string;
  planId: SubscriptionPlanId;
  billingCycle?: BillingCycle;
  userId?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export type BillingAuditEventType =
  | 'subscription_created'
  | 'subscription_activated'
  | 'subscription_updated'
  | 'subscription_cancelled'
  | 'subscription_suspended'
  | 'subscription_expired'
  | 'payment_failed'
  | 'payment_completed'
  | 'payment_refunded';

export interface BillingAuditEntry {
  eventType: BillingAuditEventType;
  organizationId: string;
  planId?: SubscriptionPlanId;
  subscriptionId?: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  timestamp: string;
  details?: Record<string, any>;
}

export class PayPalService {
  private static cachedToken: { token: string; expiresAt: number } | null = null;
  private static auditLogs: BillingAuditEntry[] = [];

  static getConfig(): PayPalConfig {
    const isLive = process.env.PAYPAL_MODE === 'live' || process.env.PAYPAL_ENV === 'live';
    const environment: 'sandbox' | 'live' = isLive ? 'live' : 'sandbox';
    const apiBase = isLive
      ? (process.env.PAYPAL_API_BASE || 'https://api-m.paypal.com')
      : (process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com');

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    if (!clientId) {
      throw new Error('[PayPalService] PAYPAL_CLIENT_ID is not configured.');
    }
    if (!clientSecret) {
      throw new Error('[PayPalService] PAYPAL_CLIENT_SECRET is not configured.');
    }
    if (!webhookId) {
      throw new Error('[PayPalService] PAYPAL_WEBHOOK_ID is not configured.');
    }

    return { clientId, clientSecret, webhookId, environment, apiBase };
  }

  static getBaseUrl(): string {
    return this.getConfig().apiBase;
  }

  /** Resolve the PayPal Plan ID for a paid Ralion plan tier. */
  static getPlanId(planId: SubscriptionPlanId): string {
    const planIds: Partial<Record<SubscriptionPlanId, string | undefined>> = {
      STARTER: process.env.PAYPAL_PLAN_ID_STARTER,
      PROFESSIONAL: process.env.PAYPAL_PLAN_ID_PROFESSIONAL,
      ENTERPRISE: process.env.PAYPAL_PLAN_ID_ENTERPRISE,
    };

    if (planId === 'COMMUNITY') {
      throw new Error('[PayPalService] Community tier does not require a PayPal subscription.');
    }

    const configuredPlanId = planIds[planId];
    if (!configuredPlanId) {
      throw new Error(`[PayPalService] PayPal plan ID is not configured for ${planId}.`);
    }
    return configuredPlanId;
  }

  /** Acquires or returns cached PayPal OAuth 2.0 access token. */
  static async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - 60000) {
      return this.cachedToken.token;
    }

    const config = this.getConfig();
    const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    const res = await fetch(`${config.apiBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      throw new Error(`PayPal token request failed with HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data?.access_token) {
      throw new Error('PayPal token response did not contain an access token.');
    }

    this.cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    };
    return data.access_token;
  }

  /** Initiates a PayPal subscription and never fabricates a successful checkout. */
  static async createSubscription(params: PayPalSubscriptionCreationParams): Promise<{
    success: boolean;
    subscriptionId?: string;
    approveUrl?: string;
    error?: string;
  }> {
    const { organizationId, planId, billingCycle = 'MONTHLY', userId, returnUrl, cancelUrl } = params;

    if (!organizationId) return { success: false, error: 'organizationId is required' };
    if (organizationId === 'ras-ali-labs') {
      return { success: false, error: 'Platform Admin organization cannot be converted to a customer PayPal subscription.' };
    }
    if (planId === 'COMMUNITY') {
      return { success: false, error: 'Community plan is free forever and does not require a paid PayPal subscription.' };
    }
    if (!['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(planId)) {
      return { success: false, error: `Invalid subscription plan requested: ${planId}` };
    }

    try {
      const paypalPlanId = this.getPlanId(planId);
      const customIdPayload = JSON.stringify({
        organizationId,
        workspaceId: organizationId,
        userId: userId || 'user_owner',
        planId,
        billingCycle,
      });

      const defaultReturnUrl = returnUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://rasalilabs.com/ralion'}/billing?paypal=success`;
      const defaultCancelUrl = cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://rasalilabs.com/ralion'}/billing?paypal=cancelled`;
      const token = await this.getAccessToken();
      const payload = {
        plan_id: paypalPlanId,
        custom_id: customIdPayload,
        application_context: {
          brand_name: 'Ralion OS',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          return_url: defaultReturnUrl,
          cancel_url: defaultCancelUrl,
        },
      };

      const res = await fetch(`${this.getBaseUrl()}/v1/billing/subscriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        return { success: false, error: `PayPal subscription creation failed with HTTP ${res.status}` };
      }

      const data = await res.json();
      const approveLink = (data.links || []).find((l: any) => l.rel === 'approve')?.href;
      if (!data?.id || !approveLink) {
        return { success: false, error: 'PayPal returned an incomplete subscription response.' };
      }

      this.recordAuditEvent({
        eventType: 'subscription_created',
        organizationId,
        planId,
        subscriptionId: data.id,
        timestamp: new Date().toISOString(),
        details: { status: data.status },
      });

      return { success: true, subscriptionId: data.id, approveUrl: approveLink };
    } catch (err: any) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create PayPal subscription' };
    }
  }

  /** Verifies a PayPal subscription directly with the configured PayPal REST API. */
  static async verifySubscription(subscriptionId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    if (!subscriptionId) return { success: false, error: 'Subscription ID is required' };

    try {
      const token = await this.getAccessToken();
      const res = await fetch(`${this.getBaseUrl()}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) return { success: false, error: `PayPal returned status ${res.status}` };
      const data = await res.json();
      if (!data?.id || data.id !== subscriptionId) {
        return { success: false, error: 'PayPal returned an invalid subscription response.' };
      }
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err instanceof Error ? err.message : 'PayPal verification failed' };
    }
  }

  /** Cryptographically verifies PayPal webhook signature via PayPal REST API. */
  static async verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    body: any
  ): Promise<boolean> {
    const config = this.getConfig();
    const transmissionId = (headers['paypal-transmission-id'] || headers['PAYPAL-TRANSMISSION-ID']) as string;
    const transmissionTime = (headers['paypal-transmission-time'] || headers['PAYPAL-TRANSMISSION-TIME']) as string;
    const transmissionSig = (headers['paypal-transmission-sig'] || headers['PAYPAL-TRANSMISSION-SIG']) as string;
    const certUrl = (headers['paypal-cert-url'] || headers['PAYPAL-CERT-URL']) as string;
    const authAlgo = (headers['paypal-auth-algo'] || headers['PAYPAL-AUTH-ALGO']) as string;

    if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
      return false;
    }

    try {
      const token = await this.getAccessToken();
      const payload = {
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: transmissionSig,
        webhook_id: config.webhookId,
        webhook_event: body,
      };

      const res = await fetch(`${config.apiBase}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) return false;
      const data = await res.json();
      return data.verification_status === 'SUCCESS';
    } catch {
      return false;
    }
  }

  /** Idempotently processes authoritative PayPal webhook events. */
  static async processWebhookEvent(event: any): Promise<{
    handled: boolean;
    action?: string;
    error?: string;
  }> {
    if (!event || !event.id || !event.event_type) {
      return { handled: false, error: 'Malformed webhook event payload' };
    }

    if (BillingDatabaseService.isWebhookProcessed('paypal', event.id)) {
      return { handled: true, action: 'IGNORED_DUPLICATE' };
    }

    const eventType = event.event_type;
    const resource = event.resource || {};
    const resourceId = resource.id || '';

    let organizationId = '';
    let planHint: SubscriptionPlanId = 'STARTER';
    let billingCycle: BillingCycle = 'MONTHLY';

    if (resource.custom_id) {
      try {
        const parsed = JSON.parse(resource.custom_id);
        organizationId = parsed.organizationId || '';
        if (parsed.planId) planHint = parsed.planId;
        if (parsed.billingCycle) billingCycle = parsed.billingCycle;
      } catch {
        organizationId = resource.custom_id;
      }
    }

    if (!organizationId && (resource.id || resource.billing_agreement_id)) {
      const subId = resource.id || resource.billing_agreement_id;
      const existing = BillingDatabaseService.findByProviderSubscriptionId(subId);
      if (existing) {
        organizationId = existing.organizationId;
        planHint = existing.planId;
        billingCycle = existing.billingCycle;
      }
    }

    if (organizationId === 'ras-ali-labs') {
      return { handled: false, error: 'Security violation: Platform Admin organization cannot be bound to customer billing events.' };
    }

    try {
      switch (eventType) {
        case 'BILLING.SUBSCRIPTION.CREATED': {
          if (organizationId) {
            this.recordAuditEvent({ eventType: 'subscription_created', organizationId, planId: planHint, subscriptionId: resource.id, timestamp: new Date().toISOString() });
          }
          break;
        }

        case 'BILLING.SUBSCRIPTION.ACTIVATED': {
          const subscriptionId = resource.id;
          if (organizationId) {
            const planId: SubscriptionPlanId =
              resource.plan_id?.includes('ENT') || resource.plan_id?.includes('ENTERPRISE')
                ? 'ENTERPRISE'
                : resource.plan_id?.includes('PRO')
                ? 'PROFESSIONAL'
                : planHint || 'STARTER';

            const periodStart = resource.start_time || new Date().toISOString();
            const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

            BillingDatabaseService.saveSubscription({
              id: `sub_${organizationId}`,
              organizationId,
              planId,
              status: 'ACTIVE',
              billingCycle,
              provider: 'paypal',
              providerSubscriptionId: subscriptionId,
              providerCustomerId: resource.subscriber?.payer_id,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: false,
              createdAt: periodStart,
              updatedAt: new Date().toISOString(),
            });

            const planDetails = PLAN_CATALOG[planId];
            TenantCreditsService.addCredits(
              organizationId,
              planDetails.monthlyCreditQuota,
              `PayPal Live subscription activated (${planDetails.name})`
            );

            this.recordAuditEvent({
              eventType: 'subscription_activated',
              organizationId,
              planId,
              subscriptionId,
              timestamp: new Date().toISOString(),
              details: { creditQuota: planDetails.monthlyCreditQuota },
            });
          }
          break;
        }

        case 'BILLING.SUBSCRIPTION.UPDATED': {
          const subscriptionId = resource.id;
          const existing = BillingDatabaseService.findByProviderSubscriptionId(subscriptionId);
          if (existing) {
            BillingDatabaseService.saveSubscription({ ...existing, updatedAt: new Date().toISOString() });
            this.recordAuditEvent({ eventType: 'subscription_updated', organizationId: existing.organizationId, planId: existing.planId, subscriptionId, timestamp: new Date().toISOString() });
          }
          break;
        }

        case 'PAYMENT.SALE.COMPLETED': {
          const billingAgreementId = resource.billing_agreement_id;
          const amount = parseFloat(resource.amount?.total || '0');
          const currency = resource.amount?.currency || 'USD';
          const existing = billingAgreementId ? BillingDatabaseService.findByProviderSubscriptionId(billingAgreementId) : null;

          if (existing) {
            const targetOrg = existing.organizationId;
            const newPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            BillingDatabaseService.saveSubscription({ ...existing, status: 'ACTIVE', currentPeriodEnd: newPeriodEnd });
            const planDetails = PLAN_CATALOG[existing.planId];
            TenantCreditsService.addCredits(targetOrg, planDetails.monthlyCreditQuota, `PayPal subscription cycle renewal payment (${currency} ${amount})`);
            BillingDatabaseService.recordTransaction({
              organizationId: targetOrg,
              subscriptionId: existing.id,
              provider: 'paypal',
              providerTransactionId: resource.id,
              amount,
              currency,
              status: 'COMPLETED',
              eventType,
              description: `PayPal payment captured (${existing.planId})`,
              rawEventData: resource,
            });
            this.recordAuditEvent({ eventType: 'payment_completed', organizationId: targetOrg, planId: existing.planId, transactionId: resource.id, amount, currency, timestamp: new Date().toISOString() });
          }
          break;
        }

        case 'BILLING.SUBSCRIPTION.CANCELLED': {
          const subscriptionId = resource.id;
          const existing = BillingDatabaseService.findByProviderSubscriptionId(subscriptionId);
          if (existing) {
            BillingDatabaseService.saveSubscription({ ...existing, status: 'CANCELED', cancelAtPeriodEnd: true, canceledAt: new Date().toISOString() });
            this.recordAuditEvent({ eventType: 'subscription_cancelled', organizationId: existing.organizationId, planId: existing.planId, subscriptionId, timestamp: new Date().toISOString() });
          }
          break;
        }

        case 'BILLING.SUBSCRIPTION.SUSPENDED': {
          const subscriptionId = resource.id;
          const existing = BillingDatabaseService.findByProviderSubscriptionId(subscriptionId);
          if (existing) {
            BillingDatabaseService.saveSubscription({ ...existing, status: 'PAST_DUE' });
            this.recordAuditEvent({ eventType: 'subscription_suspended', organizationId: existing.organizationId, planId: existing.planId, subscriptionId, timestamp: new Date().toISOString() });
          }
          break;
        }

        case 'BILLING.SUBSCRIPTION.EXPIRED': {
          const subscriptionId = resource.id;
          const existing = BillingDatabaseService.findByProviderSubscriptionId(subscriptionId);
          if (existing) {
            BillingDatabaseService.saveSubscription({ ...existing, planId: 'COMMUNITY', status: 'ACTIVE', provider: 'manual', providerSubscriptionId: undefined });
            this.recordAuditEvent({ eventType: 'subscription_expired', organizationId: existing.organizationId, planId: 'COMMUNITY', subscriptionId, timestamp: new Date().toISOString() });
          }
          break;
        }

        case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        case 'PAYMENT.SALE.DENIED': {
          const subscriptionId = resource.id || resource.billing_agreement_id;
          const existing = BillingDatabaseService.findByProviderSubscriptionId(subscriptionId);
          if (existing) {
            BillingDatabaseService.saveSubscription({ ...existing, status: 'PAST_DUE' });
            this.recordAuditEvent({ eventType: 'payment_failed', organizationId: existing.organizationId, planId: existing.planId, subscriptionId, timestamp: new Date().toISOString(), details: { reason: resource.reason_code || 'payment_declined' } });
          }
          break;
        }

        case 'PAYMENT.SALE.REFUNDED':
        case 'PAYMENT.SALE.REVERSED': {
          const amount = parseFloat(resource.amount?.total || '0');
          const currency = resource.amount?.currency || 'USD';
          if (organizationId) {
            BillingDatabaseService.recordTransaction({
              organizationId,
              provider: 'paypal',
              providerTransactionId: resource.id,
              amount: -amount,
              currency,
              status: 'REFUNDED',
              eventType,
              description: `PayPal payment ${eventType === 'PAYMENT.SALE.REVERSED' ? 'reversed' : 'refunded'} (${currency} ${amount})`,
              rawEventData: resource,
            });
            this.recordAuditEvent({ eventType: 'payment_refunded', organizationId, transactionId: resource.id, amount, currency, timestamp: new Date().toISOString() });
          }
          break;
        }

        default:
          break;
      }

      BillingDatabaseService.recordWebhookEvent({
        provider: 'paypal',
        eventId: event.id,
        eventType,
        resourceId,
        status: 'PROCESSED',
        signatureValid: true,
        processedAt: new Date().toISOString(),
      });

      return { handled: true, action: eventType };
    } catch (err: any) {
      BillingDatabaseService.recordWebhookEvent({
        provider: 'paypal',
        eventId: event.id,
        eventType,
        resourceId,
        status: 'FAILED',
        signatureValid: true,
        error: err instanceof Error ? err.message : 'Unknown webhook processing error',
      });
      return { handled: false, error: err instanceof Error ? err.message : 'Unknown webhook processing error' };
    }
  }

  /** Activates/upgrades an organization's subscription following verified PayPal checkout. */
  static async activateVerifiedSubscription(params: {
    organizationId: string;
    planId: SubscriptionPlanId;
    billingCycle: BillingCycle;
    subscriptionId: string;
    userId?: string;
  }): Promise<{ success: boolean; subscription?: OrganizationSubscriptionRecord; error?: string }> {
    const { organizationId, planId, billingCycle, subscriptionId } = params;

    if (!organizationId) return { success: false, error: 'organizationId is required' };
    if (organizationId === 'ras-ali-labs') {
      return { success: false, error: 'Access denied: Platform Admin organization cannot be modified by customer subscription flow.' };
    }

    const verifyResult = await this.verifySubscription(subscriptionId);
    if (!verifyResult.success) {
      return { success: false, error: verifyResult.error || 'PayPal verification failed' };
    }

    const existingBinding = BillingDatabaseService.findByProviderSubscriptionId(subscriptionId);
    if (existingBinding && existingBinding.organizationId !== organizationId) {
      return { success: false, error: 'Access denied: This PayPal subscription is already registered to a different organization.' };
    }

    const verifiedCustomId = verifyResult.data?.custom_id;
    if (verifiedCustomId) {
      try {
        const parsed = JSON.parse(verifiedCustomId);
        if (parsed.organizationId && parsed.organizationId !== organizationId) {
          return { success: false, error: 'Access denied: PayPal subscription belongs to a different organization.' };
        }
        if (parsed.planId && parsed.planId !== planId) {
          return { success: false, error: 'PayPal subscription plan does not match the requested Ralion plan.' };
        }
      } catch {
        return { success: false, error: 'PayPal subscription tenant binding is malformed.' };
      }
    } else {
      return { success: false, error: 'PayPal subscription is missing authoritative tenant binding.' };
    }

    const now = new Date().toISOString();
    const periodDays = billingCycle === 'DAILY' ? 1 : billingCycle === 'WEEKLY' ? 7 : billingCycle === 'YEARLY' ? 365 : 30;
    const periodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString();

    const subRecord: OrganizationSubscriptionRecord = {
      id: `sub_${organizationId}`,
      organizationId,
      planId,
      status: 'ACTIVE',
      billingCycle,
      provider: 'paypal',
      providerSubscriptionId: subscriptionId,
      providerCustomerId: verifyResult.data?.subscriber?.payer_id,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    };

    const saved = BillingDatabaseService.saveSubscription(subRecord);
    const plan = PLAN_CATALOG[planId];
    TenantCreditsService.addCredits(organizationId, plan.monthlyCreditQuota, `PayPal subscription activated: ${plan.name} (${billingCycle})`);
    BillingDatabaseService.recordTransaction({
      organizationId,
      subscriptionId: saved.id,
      provider: 'paypal',
      providerTransactionId: subscriptionId,
      amount: plan.monthlyPriceUsd,
      currency: 'USD',
      status: 'COMPLETED',
      eventType: 'SUBSCRIPTION_ACTIVATED',
      description: `Activated ${plan.name} (${billingCycle}) via PayPal Live`,
    });

    this.recordAuditEvent({
      eventType: 'subscription_activated',
      organizationId,
      planId,
      subscriptionId,
      amount: plan.monthlyPriceUsd,
      currency: 'USD',
      timestamp: now,
    });

    return { success: true, subscription: saved };
  }

  private static recordAuditEvent(entry: BillingAuditEntry): void {
    this.auditLogs.push(entry);
    console.log(`[Billing Audit] ${entry.eventType} | org=${entry.organizationId} | plan=${entry.planId || 'n/a'} | sub=${entry.subscriptionId || 'n/a'}`);
  }

  static getAuditLogs(organizationId?: string): BillingAuditEntry[] {
    if (!organizationId) return [...this.auditLogs];
    return this.auditLogs.filter((log) => log.organizationId === organizationId);
  }
}
