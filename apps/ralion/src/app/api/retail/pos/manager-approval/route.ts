import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { requireRalionContext, getServiceSupabase } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
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

    const body = await request.json().catch(() => ({}));

    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context, body);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const { pin, managerEmail, managerPassword, action, details, reason } = body;

    const validActions = ['DISCOUNT_OVERRIDE', 'CART_VOID', 'REFUND'];
    if (!validActions.includes(action)) {
      return corsJsonResponse(
        { success: false, error: 'INVALID_ACTION: Supported actions are DISCOUNT_OVERRIDE, CART_VOID, REFUND.' },
        { status: 400 },
        request
      );
    }

    // 1. Server-Side Policy Enforcements by Action
    const storeMaxDiscountCeiling = 50; // Store policy ceiling (50% max)
    let maxDiscountRate: number | undefined = undefined;
    let actionPayloadHash: string | undefined = undefined;

    if (action === 'DISCOUNT_OVERRIDE') {
      const requestedDiscount = Number(details?.discountRate ?? 0);
      if (!Number.isFinite(requestedDiscount) || requestedDiscount <= 0) {
        return corsJsonResponse(
          { success: false, error: 'INVALID_DISCOUNT: A positive discount percentage must be specified.' },
          { status: 400 },
          request
        );
      }

      if (requestedDiscount > storeMaxDiscountCeiling) {
        return corsJsonResponse(
          {
            success: false,
            code: 'EXCEEDS_STORE_MAX_DISCOUNT_POLICY',
            error: `Requested discount (${requestedDiscount}%) exceeds store policy ceiling of ${storeMaxDiscountCeiling}%.`,
          },
          { status: 403 },
          request
        );
      }
      maxDiscountRate = requestedDiscount;

      // Bind to cart hash or cart items if supplied by POS terminal
      if (details?.cartItems && Array.isArray(details.cartItems)) {
        actionPayloadHash = crypto
          .createHash('sha256')
          .update(
            JSON.stringify(
              details.cartItems.map((i: any) => ({
                productId: String(i.productId),
                quantity: Math.max(1, Number(i.quantity || 1)),
                discountRate: Math.max(0, Math.min(100, Number(i.discountRate || 0))),
              }))
            )
          )
          .digest('hex');
      } else if (details?.cartHash) {
        actionPayloadHash = String(details.cartHash);
      }
    } else if (action === 'CART_VOID') {
      if (!reason || String(reason).trim().length < 5) {
        return corsJsonResponse(
          { success: false, error: 'VOID_REASON_REQUIRED: A valid reason (min 5 characters) is required to void cart.' },
          { status: 400 },
          request
        );
      }
      if (details?.cartHash) {
        actionPayloadHash = String(details.cartHash);
      }
    } else if (action === 'REFUND') {
      const originalSaleId = details?.originalSaleId;
      const refundAmount = Number(details?.refundAmount || 0);

      if (!originalSaleId || typeof originalSaleId !== 'string') {
        return corsJsonResponse(
          { success: false, error: 'ORIGINAL_SALE_REQUIRED: Refund requires a valid original sale ID.' },
          { status: 400 },
          request
        );
      }
      if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
        return corsJsonResponse(
          { success: false, error: 'INVALID_REFUND_AMOUNT: Refund amount must be greater than zero.' },
          { status: 400 },
          request
        );
      }

      // Verify original sale exists, belongs to tenant, and is refundable
      const db = getServiceSupabase();
      const { data: originalSale, error: saleErr } = await db
        .from('retail_sales')
        .select('id, workspace_id, total_amount, status')
        .eq('id', originalSaleId)
        .eq('workspace_id', context.workspace.id)
        .maybeSingle();

      if (saleErr || !originalSale) {
        return corsJsonResponse(
          { success: false, error: 'SALE_NOT_FOUND: Original sale could not be found in this workspace.' },
          { status: 404 },
          request
        );
      }

      if (originalSale.status !== 'COMPLETED') {
        return corsJsonResponse(
          { success: false, error: `SALE_NOT_REFUNDABLE: Sale status is '${originalSale.status}'. Only completed sales may be refunded.` },
          { status: 400 },
          request
        );
      }

      if (refundAmount > Number(originalSale.total_amount) + 0.005) {
        return corsJsonResponse(
          {
            success: false,
            error: `REFUND_EXCEEDS_SALE: Refund amount ($${refundAmount.toFixed(2)}) cannot exceed original sale total ($${Number(originalSale.total_amount).toFixed(2)}).`,
          },
          { status: 400 },
          request
        );
      }

      actionPayloadHash = crypto
        .createHash('sha256')
        .update(`${originalSaleId}:${refundAmount.toFixed(2)}`)
        .digest('hex');
    }

    // 2. Server-Side Manager Credential Verification
    const verification = await PosManagerApprovalService.verifyManagerCredentials({
      workspaceId: context.workspace.id,
      organizationId: context.organization.id,
      cashierUserId: context.user.id,
      callerRole: context.membership?.role || entitlement.effectiveRole,
      pin,
      managerEmail,
      managerPassword,
    });

    if (!verification.verified) {
      return corsJsonResponse({ success: false, error: verification.error || 'Manager authorization failed.' }, { status: 403 }, request);
    }

    // 3. Durable Security Audit Logging (Fail-Closed)
    await PosManagerApprovalService.recordApprovalAudit({
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      action,
      cashierUserId: context.user.id,
      approvedByUserId: verification.approvedByUserId,
      reason,
      details: {
        ...(details || {}),
        actionPayloadHash,
        terminalId: details?.terminalId,
      },
    });

    // 4. Token Issuance Bound to Actor, Organization, Action, and Cart Hash
    const approvalToken = PosManagerApprovalService.createApprovalToken({
      workspaceId: context.workspace.id,
      organizationId: context.organization.id,
      cashierUserId: context.user.id,
      approvedByUserId: verification.approvedByUserId,
      action,
      maxDiscountRate,
      terminalId: details?.terminalId,
      actionPayloadHash,
      reason,
      ttlSeconds: 300, // 5 minutes
    });

    return corsJsonResponse(
      {
        success: true,
        approvalToken,
        expiresInSeconds: 300,
      },
      undefined,
      request
    );
  } catch (err: any) {
    console.error('[ManagerApprovalRoute] Exception:', err);
    return corsJsonResponse(
      { success: false, error: err.message || 'Error processing manager approval.' },
      { status: 500 },
      request
    );
  }
}
