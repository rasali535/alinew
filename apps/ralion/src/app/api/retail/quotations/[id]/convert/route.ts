import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
import { RetailDatabaseService } from '@/lib/services/retail/retailDatabase.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canAccessQuotations || !entitlement.canAccessSales) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_CONVERSION_ACCESS' }, { status: 403 }, request);
    }

    const { id: quotationId } = await params;
    const body = await request.json().catch(() => ({}));
    const paymentMethod = body.paymentMethod || 'CASH';
    const shiftId = body.shiftId;

    const result = await RetailDatabaseService.executeAtomicQuoteConversion({
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      quotationId,
      cashierUserId: context.user.id,
      cashierName: context.profile.fullName || 'Authorized Staff',
      paymentMethod,
      shiftId,
    });

    if (!result.success) {
      return corsJsonResponse({ success: false, error: result.error }, { status: 400 }, request);
    }

    return corsJsonResponse({ success: true, sale: result.sale }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
