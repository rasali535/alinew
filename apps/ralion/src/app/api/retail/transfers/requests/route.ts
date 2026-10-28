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
    const destinationLocationId = searchParams.get('destinationLocationId') || undefined;

    const requests = await RetailDatabaseService.listStockRequests(context.workspace.id, {
      status,
      destinationLocationId,
    });

    return corsJsonResponse({ success: true, requests }, undefined, request);
  } catch (err: any) {
    console.error('[StockRequestsAPI] GET Error:', err);
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canAccessInventory) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_INVENTORY_ACCESS' }, { status: 403 }, request);
    }

    const body = await request.json().catch(() => ({}));
    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context, body);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const { sourceLocationId, destinationLocationId, priority, requiredDate, notes, items } = body;

    if (!sourceLocationId || !destinationLocationId) {
      return corsJsonResponse({ success: false, error: 'Source warehouse and destination branch are required.' }, { status: 400 }, request);
    }
    if (sourceLocationId === destinationLocationId) {
      return corsJsonResponse({ success: false, error: 'Source and destination locations cannot be identical.' }, { status: 400 }, request);
    }
    if (!Array.isArray(items) || items.length === 0) {
      return corsJsonResponse({ success: false, error: 'Request must contain at least one item.' }, { status: 400 }, request);
    }

    const requestNumber = body.requestNumber || `REQ-${Date.now().toString().slice(-6)}`;

    const result = await RetailDatabaseService.createStockRequest({
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      requestNumber,
      sourceLocationId,
      destinationLocationId,
      priority: priority || 'NORMAL',
      requiredDate,
      requestedBy: context.user.id,
      requestedByName: context.profile.fullName || 'Branch Staff',
      notes,
      items,
    });

    if (!result.success) {
      return corsJsonResponse({ success: false, error: result.error }, { status: 400 }, request);
    }

    return corsJsonResponse({ success: true, request: result.request }, { status: 201 }, request);
  } catch (err: any) {
    console.error('[StockRequestsAPI] POST Error:', err);
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
