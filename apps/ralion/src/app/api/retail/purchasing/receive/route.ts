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

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canAccessInventory) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_PURCHASING_ACCESS' }, { status: 403 }, request);
    }

    const body = await request.json();

    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context, body);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const { purchaseOrderId, receiptNumber, items, notes } = body;

    if (!purchaseOrderId || !Array.isArray(items) || items.length === 0) {
      return corsJsonResponse(
        { success: false, error: 'Purchase Order ID and received items list are required.' },
        { status: 400 },
        request
      );
    }

    const result = await RetailDatabaseService.executeAtomicReceive({
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      purchaseOrderId,
      receiptNumber: receiptNumber || `GRN-${Date.now().toString().slice(-6)}`,
      receivedBy: context.user.id,
      items,
      notes,
    });

    if (!result.success) {
      return corsJsonResponse({ success: false, error: result.error }, { status: 400 }, request);
    }

    return corsJsonResponse({ success: true, receipt: result.receipt }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
