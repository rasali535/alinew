import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { BillingDatabaseService } from '@ralion/database';
import { EntitlementService, PLAN_CATALOG } from '@ralion/auth';
import { TenantCreditsService } from '@ralion/ai';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || request.headers.get('x-organization-id');

    if (!organizationId) {
      return corsJsonResponse(
        { success: false, error: 'organizationId is required' },
        { status: 400 },
        request
      );
    }

    const sub = BillingDatabaseService.getSubscription(organizationId);
    const { plan, status, isPastDue, periodEnd } = EntitlementService.getEffectivePlan(organizationId);
    const wallet = TenantCreditsService.getOrCreateWallet(
      organizationId,
      sub.planId === 'PROFESSIONAL' ? 'PROFESSIONAL' : sub.planId === 'ENTERPRISE' ? 'ENTERPRISE' : 'COMMUNITY'
    );

    return corsJsonResponse(
      {
        success: true,
        subscription: sub,
        effectivePlan: plan,
        status,
        isPastDue,
        currentPeriodEnd: periodEnd,
        credits: {
          balance: wallet.balance,
          monthlyQuota: plan.monthlyCreditQuota,
          updatedAt: wallet.updatedAt,
        },
        catalog: PLAN_CATALOG,
      },
      undefined,
      request
    );
  } catch (err: any) {
    console.error('[Subscription API] Error:', err);
    return corsJsonResponse(
      { success: false, error: 'Internal server error fetching subscription' },
      { status: 500 },
      request
    );
  }
}
