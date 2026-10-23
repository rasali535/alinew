import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
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
      return corsJsonResponse({ success: false, error: 'INVALID_ACTION: Supported actions are DISCOUNT_OVERRIDE, CART_VOID, REFUND.' }, { status: 400 }, request);
    }

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

    const maxDiscountRate = action === 'DISCOUNT_OVERRIDE' ? Number(details?.discountRate || 100) : undefined;

    const approvalToken = PosManagerApprovalService.createApprovalToken({
      workspaceId: context.workspace.id,
      organizationId: context.organization.id,
      action,
      maxDiscountRate,
      cashierUserId: context.user.id,
      approvedByUserId: verification.approvedByUserId,
      reason,
    });

    await PosManagerApprovalService.recordApprovalAudit({
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      action,
      cashierUserId: context.user.id,
      approvedByUserId: verification.approvedByUserId,
      reason,
      details,
    });

    return corsJsonResponse({
      success: true,
      approvalToken,
      expiresInSeconds: 300,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message || 'Error processing manager approval.' }, { status: 500 }, request);
  }
}
