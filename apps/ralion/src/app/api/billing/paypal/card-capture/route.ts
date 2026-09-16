import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../../lib/cors';
import { requireRalionContext } from '../../../../../lib/auth/serverAuth';
import { DurableBillingDatabaseService } from '@ralion/database/server';
import { TenantCreditsService } from '@ralion/ai/server';
import { PLAN_CATALOG } from '@ralion/auth';
import { PayPalCardVaultService } from '@ralion/integrations/server';

export const dynamic = 'force-dynamic';
export async function OPTIONS(request: NextRequest) { return handleCorsPreflight(request); }

export async function POST(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;
    if (!['owner', 'admin'].includes(ctx.membership.role)) {
      return corsJsonResponse({ success: false, code: 'BILLING_ADMIN_REQUIRED', error: 'Only an organization owner or administrator can change the subscription.' }, { status: 403 }, request);
    }
    const { orderId } = await request.json().catch(() => ({}));
    const organizationId = ctx.organization?.id || ctx.workspace.organization_id || ctx.workspace.id;
    const result = await PayPalCardVaultService.captureOrder(String(orderId || ''), organizationId);
    const now = new Date();
    const end = new Date(now);
    end.setUTCMonth(end.getUTCMonth() + 1);
    const existing = await DurableBillingDatabaseService.getSubscription(organizationId);
    const saved = await DurableBillingDatabaseService.saveSubscription({
      ...existing,
      organizationId,
      planId: result.planId,
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      provider: 'paypal',
      providerSubscriptionId: result.orderId,
      providerCustomerId: result.customerId,
      providerPlanId: undefined,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: end.toISOString(),
      cancelAtPeriodEnd: false,
      metadata: {
        ...(existing.metadata || {}),
        billingMode: 'paypal_card_vault',
        paypalVaultId: result.vaultId || null,
        paypalVaultStatus: result.vaultStatus || null,
        paypalCaptureId: result.captureId,
        billingReference: result.billingReference,
      },
      updatedAt: now.toISOString(),
    });
    await DurableBillingDatabaseService.recordTransaction({
      organizationId,
      subscriptionId: saved.id,
      provider: 'paypal',
      providerTransactionId: result.captureId,
      amount: result.amount,
      currency: result.currency,
      status: 'COMPLETED',
      eventType: 'PAYMENT_COMPLETED',
      description: `Ralion OS ${result.planId} initial card payment`,
    });
    await TenantCreditsService.addCredits(organizationId, PLAN_CATALOG[result.planId].monthlyCreditQuota, `PayPal card subscription activated (${PLAN_CATALOG[result.planId].name})`);
    return corsJsonResponse({ success: true, planId: result.planId, status: 'ACTIVE', vaultStatus: result.vaultStatus || 'PENDING' }, undefined, request);
  } catch (error: any) {
    console.error('[PayPal Card Capture] Error:', error);
    return corsJsonResponse({ success: false, error: error instanceof Error ? error.message : 'Unable to capture card checkout.' }, { status: 400 }, request);
  }
}
