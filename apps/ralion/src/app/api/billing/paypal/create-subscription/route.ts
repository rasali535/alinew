import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../../lib/cors';
import { requireRalionContext } from '../../../../../lib/auth/serverAuth';
import { DurablePayPalService } from '@ralion/integrations/server';
import { DurableBillingDatabaseService } from '@ralion/database/server';
import { SubscriptionPlanId } from '@ralion/database';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const serverCtx = required.context;

    if (!['owner', 'admin'].includes(serverCtx.membership.role)) {
      return corsJsonResponse(
        { success: false, code: 'BILLING_ADMIN_REQUIRED', error: 'Only an organization owner or administrator can change the subscription.' },
        { status: 403 },
        request
      );
    }

    const body = await request.json().catch(() => ({}));
    const planRaw = String(body.planId || '').toUpperCase();
    const validPlan = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(planRaw)
      ? planRaw as SubscriptionPlanId
      : null;

    if (!validPlan) {
      return corsJsonResponse(
        { success: false, error: 'Paid subscription requires STARTER, PROFESSIONAL, or ENTERPRISE plan.' },
        { status: 400 },
        request
      );
    }

    const requestedCycle = String(body.billingCycle || 'MONTHLY').toUpperCase();
    if (requestedCycle !== 'MONTHLY') {
      return corsJsonResponse(
        { success: false, code: 'BILLING_CYCLE_UNAVAILABLE', error: 'Only MONTHLY PayPal billing is currently enabled.' },
        { status: 400 },
        request
      );
    }

    const organizationId = serverCtx.organization?.id || serverCtx.workspace.organization_id || serverCtx.workspace.id;
    const suppliedOrganizationId = body.organizationId || request.headers.get('x-organization-id');
    if (suppliedOrganizationId && suppliedOrganizationId !== organizationId && suppliedOrganizationId !== serverCtx.workspace.id) {
      return corsJsonResponse(
        { success: false, code: 'TENANT_CONTEXT_MISMATCH', error: 'The requested billing organization does not match the authenticated tenant.' },
        { status: 403 },
        request
      );
    }

    const existing = await DurableBillingDatabaseService.getSubscription(organizationId);
    const periodEndMs = new Date(existing.currentPeriodEnd).getTime();
    const periodEnded = Number.isFinite(periodEndMs) && periodEndMs <= Date.now();
    const canCreateNewPaidSubscription =
      existing.planId === 'COMMUNITY' ||
      ((existing.status === 'CANCELED' || existing.status === 'EXPIRED') && periodEnded);

    if (!canCreateNewPaidSubscription) {
      const code = existing.planId === validPlan ? 'ALREADY_SUBSCRIBED' : 'PLAN_CHANGE_REQUIRES_MANAGED_REVISION';
      const error = existing.planId === validPlan
        ? `This organization already has a ${existing.planId} subscription. A second PayPal billing relationship was not created.`
        : `This organization already has a ${existing.planId} billing relationship. Paid-plan changes require a managed revision to prevent double billing.`;
      return corsJsonResponse(
        { success: false, code, error, currentPlanId: existing.planId, currentStatus: existing.status },
        { status: 409 },
        request
      );
    }

    const appBase = (process.env.NEXT_PUBLIC_APP_URL || 'https://rasalilabs.com/ralion').replace(/\/$/, '');
    const result = await DurablePayPalService.createSubscription({
      organizationId,
      planId: validPlan,
      billingCycle: 'MONTHLY',
      userId: serverCtx.user.id,
      returnUrl: `${appBase}/billing?paypal=success`,
      cancelUrl: `${appBase}/billing?paypal=cancelled`,
    });

    if (!result.success || !result.subscriptionId || !result.approveUrl) {
      return corsJsonResponse(
        {
          success: false,
          code: 'PAYPAL_SUBSCRIPTION_CREATE_FAILED',
          error: result.error || 'PayPal subscription checkout could not be created.',
        },
        { status: 400 },
        request
      );
    }

    return corsJsonResponse(
      {
        success: true,
        subscriptionId: result.subscriptionId,
        approveUrl: result.approveUrl,
        checkoutMode: 'paypal_subscription',
        planId: validPlan,
        billingCycle: 'MONTHLY',
      },
      undefined,
      request
    );
  } catch (err: any) {
    console.error('[PayPal Subscription Checkout API] Error:', err);
    return corsJsonResponse(
      { success: false, code: 'PAYPAL_SUBSCRIPTION_CREATE_FAILED', error: err instanceof Error ? err.message : 'Internal server error creating PayPal subscription checkout.' },
      { status: 400 },
      request
    );
  }
}
