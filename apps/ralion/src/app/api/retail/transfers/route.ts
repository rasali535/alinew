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

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canAccessInventory) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_INVENTORY_ACCESS' }, { status: 403 }, request);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const sourceLocationId = searchParams.get('sourceLocationId') || undefined;
    const destinationLocationId = searchParams.get('destinationLocationId') || undefined;

    const transfers = await RetailDatabaseService.listStockTransfers(context.workspace.id, {
      status,
      sourceLocationId,
      destinationLocationId,
    });

    return corsJsonResponse({ success: true, transfers }, undefined, request);
  } catch (err: any) {
    console.error('[TransfersAPI] GET Error:', err);
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canManageInventory) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_TRANSFER_CREATION' }, { status: 403 }, request);
    }

    const body = await request.json().catch(() => ({}));
    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context, body);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const {
      sourceLocationId,
      destinationLocationId,
      requestId,
      transferType,
      carrierName,
      vehicleRegistration,
      trackingNumber,
      notes,
      items,
    } = body;

    if (!sourceLocationId || !destinationLocationId) {
      return corsJsonResponse({ success: false, error: 'Source and destination locations are required.' }, { status: 400 }, request);
    }
    if (sourceLocationId === destinationLocationId) {
      return corsJsonResponse({ success: false, error: 'Source and destination locations cannot be identical.' }, { status: 400 }, request);
    }
    if (!Array.isArray(items) || items.length === 0) {
      return corsJsonResponse({ success: false, error: 'Transfer must contain at least one item.' }, { status: 400 }, request);
    }

    const transferNumber = body.transferNumber || `TRF-${Date.now().toString().slice(-6)}`;

    const result = await RetailDatabaseService.createStockTransfer({
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      transferNumber,
      requestId,
      sourceLocationId,
      destinationLocationId,
      transferType,
      carrierName,
      vehicleRegistration,
      trackingNumber,
      notes,
      items,
    });

    if (!result.success) {
      return corsJsonResponse({ success: false, error: result.error }, { status: 400 }, request);
    }

    return corsJsonResponse({ success: true, transfer: result.transfer }, { status: 201 }, request);
  } catch (err: any) {
    console.error('[TransfersAPI] POST Error:', err);
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
