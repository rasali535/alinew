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
    if (!entitlement.isEntitled || !entitlement.canManageInventory) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_DISPATCH_ACCESS' }, { status: 403 }, request);
    }

    const { id: transferId } = await params;
    const body = await request.json().catch(() => ({}));
    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context, body);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const { carrierName, vehicleRegistration, trackingNumber, notes, dispatchNonce } = body;

    const result = await RetailDatabaseService.dispatchStockTransfer({
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      transferId,
      dispatchedBy: context.user.id,
      dispatchedByName: context.profile.fullName || 'Warehouse Manager',
      carrierName,
      vehicleRegistration,
      trackingNumber,
      notes,
      dispatchNonce: dispatchNonce || request.headers.get('idempotency-key') || undefined,
    });

    if (!result.success) {
      return corsJsonResponse({ success: false, error: result.error }, { status: 400 }, request);
    }

    return corsJsonResponse({ success: true, transfer: result.transfer }, undefined, request);
  } catch (err: any) {
    console.error('[DispatchTransferAPI] POST Error:', err);
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
