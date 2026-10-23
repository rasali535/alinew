import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
import { RetailDatabaseService } from '@/lib/services/retail/retailDatabase.service';

import { PosManagerApprovalService } from '@/lib/services/retail/posManagerApproval.service';

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

    // Server-side Discount Policy Enforcement: Discounts > 10% REQUIRE verified Manager Approval Token
    const maxDiscount = Math.max(0, ...items.map((i: any) => Number(i.discountRate || 0)));
    const managerApprovalToken = request.headers.get('x-manager-approval-token') || body.managerApprovalToken;

    if (maxDiscount > 10) {
      const isCallerManagerOrOwner =
        entitlement.effectiveRole === 'STORE_OWNER' ||
        entitlement.effectiveRole === 'RETAIL_MANAGER' ||
        entitlement.isPlatformAdmin;

      if (!isCallerManagerOrOwner) {
        if (!managerApprovalToken) {
          return corsJsonResponse({
            success: false,
            code: 'MANAGER_APPROVAL_REQUIRED',
            error: `Discounts exceeding 10% (requested: ${maxDiscount}%) require server-verified Manager Approval.`,
          }, { status: 403 }, request);
        }

        const verifyResult = PosManagerApprovalService.verifyApprovalToken(
          managerApprovalToken,
          context.workspace.id,
          'DISCOUNT_OVERRIDE',
          maxDiscount
        );

        if (!verifyResult.valid) {
          return corsJsonResponse({
            success: false,
            code: 'MANAGER_APPROVAL_INVALID',
            error: verifyResult.error || 'Invalid or expired manager approval token.',
          }, { status: 403 }, request);
        }
      }
    }

    // Sanitize items: Strip any client-provided unitCost, unitPrice or taxRate!
    // The server recalculates pricing, tax, and costs exclusively from DB records.
    const sanitizedItems = items.map((i: any) => ({
      productId: String(i.productId),
      quantity: Number(i.quantity || 1),
      discountRate: Number(i.discountRate || 0),
      productName: i.productName ? String(i.productName) : undefined,
      sku: i.sku ? String(i.sku) : undefined,
    }));

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
      items: sanitizedItems,
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
