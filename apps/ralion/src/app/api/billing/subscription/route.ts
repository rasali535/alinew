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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { organizationId, planId = 'PROFESSIONAL', billingCycle = 'MONTHLY' } = body;

    if (!organizationId) {
      return corsJsonResponse(
        { success: false, error: 'organizationId is required' },
        { status: 400 },
        request
      );
    }

    const now = new Date().toISOString();
    const nextPeriod = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const sub = BillingDatabaseService.saveSubscription({
      id: `sub_${organizationId}_${Date.now()}`,
      organizationId,
      planId: planId as any,
      status: 'ACTIVE',
      billingCycle,
      provider: 'manual',
      currentPeriodStart: now,
      currentPeriodEnd: nextPeriod,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    });

    const catalogPlan = PLAN_CATALOG[planId as keyof typeof PLAN_CATALOG] || PLAN_CATALOG.COMMUNITY;
    const targetTier = planId === 'ENTERPRISE' ? 'ENTERPRISE' : planId === 'PROFESSIONAL' ? 'PROFESSIONAL' : 'COMMUNITY';
    const wallet = TenantCreditsService.getOrCreateWallet(organizationId, targetTier);
    const targetQuota = targetTier === 'ENTERPRISE' ? 3000 : targetTier === 'PROFESSIONAL' ? 750 : 50;
    if (wallet.balance < targetQuota) {
      TenantCreditsService.addCredits(organizationId, targetQuota - wallet.balance, `Subscription tier upgrade to ${targetTier}`);
    }
    const finalBalance = TenantCreditsService.getBalance(organizationId);

    return corsJsonResponse(
      {
        success: true,
        subscription: sub,
        effectivePlan: catalogPlan,
        credits: {
          balance: wallet.balance,
          monthlyQuota: catalogPlan.monthlyCreditQuota,
        },
      },
      undefined,
      request
    );
  } catch (err: any) {
    console.error('[Subscription API] Error updating subscription:', err);
    return corsJsonResponse(
      { success: false, error: err.message || 'Internal server error updating subscription' },
      { status: 500 },
      request
    );
  }
}
