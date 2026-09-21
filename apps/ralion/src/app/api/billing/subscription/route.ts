import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { requireRalionContext } from '../../../../lib/auth/serverAuth';
import { DurableBillingDatabaseService } from '@ralion/database/server';
import { PLAN_CATALOG } from '@ralion/auth';
import { DurableTenantCreditsService } from '@ralion/ai/server';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const serverCtx = required.context;

    const organizationId = serverCtx.organization?.id || serverCtx.workspace.organization_id || serverCtx.workspace.id;
    // Billing identity is derived exclusively from the authenticated server
    // context. Legacy clients may still send display-name organizationId query
    // parameters; never use those as tenant authority.

    const sub = await DurableBillingDatabaseService.getSubscription(organizationId);
    const now = new Date();
    const periodEnd = new Date(sub.currentPeriodEnd);
    let effectivePlan = PLAN_CATALOG[sub.planId] || PLAN_CATALOG.COMMUNITY;
    let effectiveStatus = sub.status;
    let isPastDue = false;

    if (sub.status === 'CANCELED' && now > periodEnd) {
      effectivePlan = PLAN_CATALOG.COMMUNITY;
      effectiveStatus = 'EXPIRED';
    } else if (['PAST_DUE', 'SUSPENDED', 'EXPIRED'].includes(sub.status)) {
      effectivePlan = PLAN_CATALOG.COMMUNITY;
      isPastDue = sub.status === 'PAST_DUE' || sub.status === 'SUSPENDED';
    }

    const credits = await DurableTenantCreditsService.getSummary(organizationId);
    const platformAdmin = serverCtx.isPlatformAdmin === true;

    return corsJsonResponse(
      {
        success: true,
        subscription: sub,
        effectivePlan: platformAdmin
          ? { ...effectivePlan, planId: 'PLATFORM_ADMIN', name: 'Platform Admin', description: 'Internal Ras Ali Labs platform administration with full feature access.' }
          : effectivePlan,
        platformAdmin,
        status: platformAdmin ? 'INTERNAL' : effectiveStatus,
        isPastDue,
        currentPeriodEnd: sub.currentPeriodEnd,
        credits: {
          balance: credits.remainingCredits,
          monthlyQuota: credits.monthlyQuota,
          reserved: credits.reservedCredits,
          used: credits.usedCredits,
          updatedAt: credits.periodStart || sub.updatedAt,
        },
        catalog: PLAN_CATALOG,
      },
      undefined,
      request
    );
  } catch (err: any) {
    console.error('[Subscription API] Error:', err);
    return corsJsonResponse(
      { success: false, error: 'Internal server error fetching subscription.' },
      { status: 500 },
      request
    );
  }
}

export async function POST(request: NextRequest) {
  const required = await requireRalionContext(request);
  if (required.response) return required.response;

  return corsJsonResponse(
    {
      success: false,
      code: 'DIRECT_SUBSCRIPTION_MUTATION_DISABLED',
      error: 'Customer subscription state cannot be changed directly. Use the verified PayPal checkout flow.',
    },
    { status: 405 },
    request
  );
}
