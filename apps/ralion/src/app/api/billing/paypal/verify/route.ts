import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../../lib/cors';
import { requireRalionContext } from '../../../../../lib/auth/serverAuth';
import { DurablePayPalService } from '@ralion/integrations/server';
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
        { success: false, code: 'BILLING_ADMIN_REQUIRED', error: 'Only an organization owner or administrator can verify a subscription.' },
        { status: 403 },
        request
      );
    }

    const body = await request.json().catch(() => ({}));
    const subscriptionId = String(body.subscriptionId || '').trim();
    if (!subscriptionId) {
      return corsJsonResponse(
        { success: false, error: 'PayPal subscriptionId is required.' },
        { status: 400 },
        request
      );
    }

    const planRaw = String(body.planId || '').toUpperCase();
    const validPlan = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(planRaw)
      ? planRaw as SubscriptionPlanId
      : null;
    if (!validPlan) {
      return corsJsonResponse(
        { success: false, error: 'A valid paid Ralion plan is required.' },
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

    const result = await DurablePayPalService.activateVerifiedSubscription({
      organizationId,
      planId: validPlan,
      billingCycle: 'MONTHLY',
      subscriptionId,
      userId: serverCtx.user.id,
    });

    if (!result.success) {
      return corsJsonResponse(
        { success: false, error: result.error || 'Subscription activation failed.' },
        { status: 403 },
        request
      );
    }

    return corsJsonResponse(
      {
        success: true,
        message: `Successfully activated ${validPlan} plan.`,
        subscription: result.subscription,
      },
      undefined,
      request
    );
  } catch (err: any) {
    console.error('[PayPal Verify API] Error:', err);
    return corsJsonResponse(
      { success: false, error: 'Internal server error verifying PayPal subscription.' },
      { status: 500 },
      request
    );
  }
}
