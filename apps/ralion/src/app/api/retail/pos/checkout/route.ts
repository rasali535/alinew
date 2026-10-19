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
    if (!entitlement.isEntitled || !entitlement.canAccessPOS) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_POS_ACCESS' }, { status: 403 }, request);
    }

    const body = await request.json();

    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context, body);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const { items, payments, customerName, customerId, shiftId, notes, isPilotDemo } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return corsJsonResponse({ success: false, error: 'Cart must contain at least one product.' }, { status: 400 }, request);
    }
    if (!Array.isArray(payments) || payments.length === 0) {
      return corsJsonResponse({ success: false, error: 'At least one payment method is required.' }, { status: 400 }, request);
    }

    // Idempotency key from header or body
    const idempotencyKey = request.headers.get('idempotency-key') || body.idempotencyKey || undefined;
    const saleNumber = body.saleNumber || `POS-${Date.now().toString().slice(-6)}`;

    const result = await RetailDatabaseService.executeAtomicSale({
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      saleNumber,
      source: 'POS',
      customerId,
      customerName: customerName ? customerName.trim() : 'Walk-in Customer',
      cashierUserId: context.user.id,
      cashierName: context.profile.fullName || 'Cashier',
      shiftId,
      currency: 'USD',
      items,
      payments,
      idempotencyKey,
      notes,
      isPilotDemo: Boolean(isPilotDemo),
    });

    if (!result.success) {
      return corsJsonResponse({ success: false, error: result.error }, { status: 400 }, request);
    }

    return corsJsonResponse({ success: true, sale: result.sale }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
