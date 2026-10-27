import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
import { SmartStockReceivingService } from '@/lib/services/retail/smartStockReceiving.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || (!entitlement.canManageInventory && !entitlement.canManagePurchasing)) {
      return corsJsonResponse(
        { success: false, code: 'FORBIDDEN_RECEIVING_MANAGEMENT', error: 'Only inventory managers may view receiving draft details.' },
        { status: 403 },
        request
      );
    }

    const { id: draftId } = await params;
    const draft = await SmartStockReceivingService.getDraft(draftId, context.workspace.id);

    // Generate signed document URL for secure viewing
    let documentUrl: string | null = null;
    try {
      documentUrl = await SmartStockReceivingService.getSignedDocumentUrl(draft.filePath, context.workspace.id);
    } catch (e: any) {
      console.warn('[SmartReceiving] Signed document URL warning:', e.message);
    }

    return corsJsonResponse({ success: true, draft, documentUrl }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || (!entitlement.canManageInventory && !entitlement.canManagePurchasing)) {
      return corsJsonResponse(
        { success: false, code: 'FORBIDDEN_RECEIVING_MANAGEMENT', error: 'Only inventory managers may edit receiving draft details.' },
        { status: 403 },
        request
      );
    }

    const { id: draftId } = await params;
    const body = await request.json();

    if (!body.itemId) {
      return corsJsonResponse({ success: false, error: 'MISSING_ITEM_ID: itemId is required to update draft line.' }, { status: 400 }, request);
    }

    const updatedItem = await SmartStockReceivingService.updateDraftItem(draftId, body.itemId, context.workspace.id, {
      receivedQuantity: body.receivedQuantity !== undefined ? Number(body.receivedQuantity) : undefined,
      damagedQuantity: body.damagedQuantity !== undefined ? Number(body.damagedQuantity) : undefined,
      missingQuantity: body.missingQuantity !== undefined ? Number(body.missingQuantity) : undefined,
      matchedProductId: body.matchedProductId,
      matchedPackageId: body.matchedPackageId,
      packSize: body.packSize !== undefined ? Number(body.packSize) : undefined,
      packLabel: body.packLabel,
      unitCost: body.unitCost !== undefined ? Number(body.unitCost) : undefined,
      reviewNotes: body.reviewNotes,
    });

    return corsJsonResponse({ success: true, item: updatedItem }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
