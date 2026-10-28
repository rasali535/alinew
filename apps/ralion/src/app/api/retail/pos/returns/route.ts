import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
import { RetailDatabaseService } from '@/lib/services/retail/retailDatabase.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || (!entitlement.canAccessPOS && !entitlement.canAccessSales)) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_RETURNS_ACCESS' }, { status: 403 }, request);
    }

    const returns = await RetailDatabaseService.listReturns(context.workspace.id);
    return corsJsonResponse({ success: true, returns }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
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

    // Role Enforcement: Floor Manager or Store Owner required to approve returns and refunds!
    if (!entitlement.canApproveReturns) {
      return corsJsonResponse({
        success: false,
        code: 'FORBIDDEN_FLOOR_MANAGER_REQUIRED',
        error: 'Floor Manager or Store Owner authorization is strictly required to approve returns and refunds. Cashier accounts cannot self-approve returns.',
      }, { status: 403 }, request);
    }

    const { saleId, returnItems, reason, refundPaymentMethod, refundReference, shiftId } = body;

    if (!saleId) {
      return corsJsonResponse({ success: false, error: 'saleId is required.' }, { status: 400 }, request);
    }

    if (!Array.isArray(returnItems) || returnItems.length === 0) {
      return corsJsonResponse({ success: false, error: 'At least one return line item is required.' }, { status: 400 }, request);
    }

    if (!reason || !reason.trim()) {
      return corsJsonResponse({ success: false, error: 'Return reason is required.' }, { status: 400 }, request);
    }

    const validTenders = ['CASH', 'CARD', 'CARD_EXTERNAL', 'BANK_TRANSFER', 'STORE_CREDIT'];
    const resolvedMethod = String(refundPaymentMethod || 'CASH').toUpperCase();
    if (!validTenders.includes(resolvedMethod)) {
      return corsJsonResponse({
        success: false,
        error: `Unsupported refund tender '${refundPaymentMethod}'. Supported: ${validTenders.join(', ')}.`,
      }, { status: 400 }, request);
    }

    const result = await RetailDatabaseService.executeReturnAndRefund({
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      saleId,
      cashierUserId: context.user.id,
      cashierName: context.profile.fullName || 'Cashier',
      approvedByUserId: context.user.id,
      approvedByName: context.profile.fullName || 'Floor Manager',
      shiftId: shiftId || undefined,
      reason: reason.trim(),
      refundPaymentMethod: resolvedMethod,
      refundReference: refundReference ? String(refundReference).trim() : undefined,
      returnItems,
    });

    if (!result.success) {
      return corsJsonResponse({ success: false, error: result.error || 'Failed to process return and refund.' }, { status: 400 }, request);
    }

    return corsJsonResponse({ success: true, returnRecord: result.returnRecord }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
