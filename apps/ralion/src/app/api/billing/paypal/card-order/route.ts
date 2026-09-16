import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../../lib/cors';
import { requireRalionContext } from '../../../../../lib/auth/serverAuth';
import { DurableBillingDatabaseService } from '@ralion/database/server';
import type { SubscriptionPlanId } from '@ralion/database';
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
    const body = await request.json().catch(() => ({}));
    const planId = String(body.planId || '').toUpperCase() as SubscriptionPlanId;
    if (!['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(planId)) {
      return corsJsonResponse({ success: false, error: 'A valid paid plan is required.' }, { status: 400 }, request);
    }
    const organizationId = ctx.organization?.id || ctx.workspace.organization_id || ctx.workspace.id;
    const existing = await DurableBillingDatabaseService.getSubscription(organizationId);
    const periodEnded = new Date(existing.currentPeriodEnd).getTime() <= Date.now();
    if (!(existing.planId === 'COMMUNITY' || ((existing.status === 'CANCELED' || existing.status === 'EXPIRED') && periodEnded))) {
      return corsJsonResponse({ success: false, code: 'ACTIVE_BILLING_RELATIONSHIP', error: 'This organization already has an active billing relationship.' }, { status: 409 }, request);
    }
    const result = await PayPalCardVaultService.createOrder({ organizationId, userId: ctx.user.id, planId });
    return corsJsonResponse({ success: true, orderId: result.orderId, clientId: PayPalCardVaultService.getClientId(), planId }, undefined, request);
  } catch (error: any) {
    console.error('[PayPal Card Order] Error:', error);
    return corsJsonResponse({ success: false, error: error instanceof Error ? error.message : 'Unable to create card checkout.' }, { status: 400 }, request);
  }
}
