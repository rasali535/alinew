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
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_INVENTORY_ACCESS' }, { status: 403 }, request);
    }

    const body = await request.json();

    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context, body);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    if (!body || typeof body !== 'object') {
      return corsJsonResponse({ success: false, error: 'Invalid JSON request body.' }, { status: 400 }, request);
    }

    const productId = body.productId || body.product_id;
    const quantityChangeRaw = body.quantityChange !== undefined
      ? body.quantityChange
      : (body.quantityDelta !== undefined ? body.quantityDelta : body.quantity_change);
    const movementType = body.movementType || body.movement_type || 'COUNT_ADJUSTMENT';
    const reason = (body.reason || body.notes || 'Physical inventory audit').toString().trim();

    if (!productId || quantityChangeRaw === undefined || quantityChangeRaw === null) {
      return corsJsonResponse(
        { success: false, error: 'Missing required adjustment fields: productId and quantityChange.' },
        { status: 400 },
        request
      );
    }

    if (
      typeof quantityChangeRaw === 'boolean' ||
      isNaN(Number(quantityChangeRaw)) ||
      !Number.isFinite(Number(quantityChangeRaw))
    ) {
      return corsJsonResponse(
        { success: false, error: 'quantityChange must be a valid finite number.' },
        { status: 400 },
        request
      );
    }

    const quantityChange = Number(quantityChangeRaw);

    const result = await RetailDatabaseService.adjustStock({
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      productId,
      quantityChange,
      movementType,
      reason,
      userId: context.user.id,
    });

    if (!result.success) {
      return corsJsonResponse({ success: false, error: result.error }, { status: 400 }, request);
    }

    return corsJsonResponse({ success: true, newBalance: result.newBalance }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
