import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
import { SmartStockReceivingService } from '@/lib/services/retail/smartStockReceiving.service';

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

    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || (!entitlement.canManageInventory && !entitlement.canManagePurchasing)) {
      return corsJsonResponse(
        { success: false, code: 'FORBIDDEN_RECEIVING_MANAGEMENT', error: 'Only inventory managers may run document extraction.' },
        { status: 403 },
        request
      );
    }

    const { id: draftId } = await params;
    const updatedDraft = await SmartStockReceivingService.extractAndMatch(draftId, context.workspace.id);

    return corsJsonResponse({ success: true, draft: updatedDraft }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
