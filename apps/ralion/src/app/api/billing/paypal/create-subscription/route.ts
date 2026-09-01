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
    const { organizationId, planId, billingCycle = 'MONTHLY', userId, returnUrl, cancelUrl } = body;

    if (!organizationId) {
      return corsJsonResponse(
        { success: false, error: 'organizationId is required' },
        { status: 400 },
        request
      );
    }

    if (!planId || planId === 'COMMUNITY') {
      return corsJsonResponse(
        { success: false, error: 'Paid subscription requires STARTER, PROFESSIONAL, or ENTERPRISE plan' },
        { status: 400 },
        request
      );
    }

    const validPlan: SubscriptionPlanId = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(
      planId?.toUpperCase()
    )
      ? (planId.toUpperCase() as SubscriptionPlanId)
      : 'STARTER';

    const result = await PayPalService.createSubscription({
      organizationId,
      planId: validPlan,
      billingCycle: (billingCycle?.toUpperCase() || 'MONTHLY') as BillingCycle,
      userId,
      returnUrl,
      cancelUrl,
    });

    if (!result.success) {
      return corsJsonResponse(
        { success: false, error: result.error || 'Failed to create PayPal subscription' },
        { status: 400 },
        request
      );
    }

    return corsJsonResponse(
      {
        success: true,
        subscriptionId: result.subscriptionId,
        approveUrl: result.approveUrl,
        planId: validPlan,
      },
      undefined,
      request
    );
  } catch (err: any) {
    console.error('[PayPal Create Subscription API] Error:', err);
    return corsJsonResponse(
      { success: false, error: 'Internal server error creating PayPal subscription' },
      { status: 500 },
      request
    );
  }
}
