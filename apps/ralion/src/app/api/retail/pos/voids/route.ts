import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
import { RetailDatabaseService } from '@/lib/services/retail/retailDatabase.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context, body);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled) {
      return corsJsonResponse({ success: false, error: 'RETAIL_MODULE_NOT_ENTITLED' }, { status: 403 }, request);
    }

    // Role Enforcement: Floor Manager or Store Owner required to void completed transactions
    if (!entitlement.canApproveVoids) {
      return corsJsonResponse({
        success: false,
        code: 'FORBIDDEN_FLOOR_MANAGER_REQUIRED',
        error: 'Floor Manager or Store Owner authorization is strictly required to void completed sales.',
      }, { status: 403 }, request);
    }

    const { saleId, reason, shiftId } = body;

    if (!saleId) {
      return corsJsonResponse({ success: false, error: 'saleId is required.' }, { status: 400 }, request);
    }

    if (!reason || !reason.trim()) {
      return corsJsonResponse({ success: false, error: 'Void reason is required.' }, { status: 400 }, request);
    }

    const result = await RetailDatabaseService.executeVoidSale({
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      saleId,
      cashierUserId: context.user.id,
      cashierName: context.profile.fullName || 'Cashier',
      approvedByUserId: context.user.id,
      approvedByName: context.profile.fullName || 'Floor Manager',
      shiftId: shiftId || undefined,
      reason: reason.trim(),
    });

    if (!result.success) {
      return corsJsonResponse({ success: false, error: result.error || 'Failed to void transaction.' }, { status: 400 }, request);
    }

    return corsJsonResponse({ success: true, voidRecord: result.voidRecord }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
