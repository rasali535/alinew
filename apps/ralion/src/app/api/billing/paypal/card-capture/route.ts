import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../../lib/cors';
import { requireRalionContext } from '../../../../../lib/auth/serverAuth';
import { DurableBillingDatabaseService, PayPalCardVaultBillingStore } from '@ralion/database/server';
import { DurableTenantCreditsService } from '@ralion/ai/server';
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
    const existing = await DurableBillingDatabaseService.getSubscription(organizationId);

    if (existing.metadata?.paypalCaptureId === result.captureId && existing.status === 'ACTIVE') {
      return corsJsonResponse({
        success: true,
        idempotent: true,
        planId: existing.planId,
        status: existing.status,
        vaultStatus: existing.metadata?.paypalVaultStatus || result.vaultStatus || 'PENDING',
      }, undefined, request);
    }

    const now = new Date();
    const end = new Date(now);
    end.setUTCMonth(end.getUTCMonth() + 1);
    const saved = await DurableBillingDatabaseService.saveSubscription({
      ...existing,
      organizationId,
      planId: result.planId,
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      provider: 'paypal',
      providerSubscriptionId: result.orderId,
      providerCustomerId: result.customerId || existing.providerCustomerId,
      providerPlanId: undefined,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: end.toISOString(),
      cancelAtPeriodEnd: false,
      canceledAt: undefined,
      metadata: {
        ...(existing.metadata || {}),
        billingMode: 'paypal_card_vault',
        paypalVaultId: result.vaultId || existing.metadata?.paypalVaultId || null,
        paypalVaultStatus: result.vaultStatus || existing.metadata?.paypalVaultStatus || 'PENDING',
        paypalCaptureId: result.captureId,
        lastPayPalCaptureId: result.captureId,
        paypalOrderId: result.orderId,
        billingReference: result.billingReference,
        activatedAt: now.toISOString(),
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
      eventType: 'PAYPAL_CARD_INITIAL_PAYMENT_COMPLETED',
      description: `Ralion OS ${result.planId} initial card payment`,
      rawEventData: { orderId: result.orderId, billingReference: result.billingReference },
    });

    if (result.customerId) {
      await PayPalCardVaultBillingStore.patchVaultMetadata({
        organizationId,
        vaultId: result.vaultId || null,
        customerId: result.customerId,
        vaultStatus: result.vaultStatus || (result.vaultId ? 'VAULTED' : 'APPROVED'),
      });
    }

    await DurableTenantCreditsService.syncWallet(organizationId, result.planId);
    return corsJsonResponse({
      success: true,
      planId: result.planId,
      status: 'ACTIVE',
      vaultStatus: result.vaultStatus || (result.vaultId ? 'VAULTED' : 'APPROVED'),
    }, undefined, request);
  } catch (error: any) {
    console.error('[PayPal Card Capture] Error:', error);
    return corsJsonResponse({ success: false, error: error instanceof Error ? error.message : 'Unable to capture card checkout.' }, { status: 400 }, request);
  }
}
