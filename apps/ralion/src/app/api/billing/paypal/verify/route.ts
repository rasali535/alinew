import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../../lib/cors';
import { PayPalService } from '@ralion/integrations';
import { SubscriptionPlanId, BillingCycle } from '@ralion/database';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { organizationId, planId, billingCycle = 'MONTHLY', subscriptionId, userId } = body;

    if (!organizationId) {
      return corsJsonResponse(
        { success: false, error: 'organizationId is required' },
        { status: 400 },
        request
      );
    }

    if (!subscriptionId) {
      return corsJsonResponse(
        { success: false, error: 'PayPal subscriptionId is required' },
        { status: 400 },
        request
      );
    }

    const validPlan: SubscriptionPlanId = ['COMMUNITY', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(
      planId?.toUpperCase()
    )
      ? (planId.toUpperCase() as SubscriptionPlanId)
      : 'STARTER';

    const result = await PayPalService.activateVerifiedSubscription({
      organizationId,
      planId: validPlan,
      billingCycle: billingCycle.toUpperCase() as BillingCycle,
      subscriptionId,
      userId,
    });

    if (!result.success) {
      return corsJsonResponse(
        { success: false, error: result.error || 'Subscription activation failed' },
        { status: 403 },
        request
      );
    }

    return corsJsonResponse(
      {
        success: true,
        message: `Successfully activated ${validPlan} plan for organization ${organizationId}`,
        subscription: result.subscription,
      },
      undefined,
      request
    );
  } catch (err: any) {
    console.error('[PayPal Verify API] Error:', err);
    return corsJsonResponse(
      { success: false, error: 'Internal server error verifying PayPal subscription' },
      { status: 500 },
      request
    );
  }
}
