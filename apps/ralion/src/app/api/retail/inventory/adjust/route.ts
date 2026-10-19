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

    const entitlement = RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canAccessInventory) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_INVENTORY_ACCESS' }, { status: 403 }, request);
    }

    const body = await request.json();
    const { productId, quantityChange, movementType, reason } = body;

    if (!productId || quantityChange === undefined || !movementType || !reason) {
      return corsJsonResponse(
        { success: false, error: 'Missing required adjustment fields: productId, quantityChange, movementType, reason.' },
        { status: 400 },
        request
      );
    }

    const result = await RetailDatabaseService.adjustStock({
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      productId,
      quantityChange: Number(quantityChange),
      movementType,
      reason: reason.trim(),
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
