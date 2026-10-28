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
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_APPROVAL_ACCESS' }, { status: 403 }, request);
    }

    const { id: requestId } = await params;
    const body = await request.json().catch(() => ({}));
    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context, body);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const action = body.action || 'APPROVE'; // 'APPROVE' or 'REJECT'
    const status = action === 'REJECT' ? 'REJECTED' : 'APPROVED';

    const result = await RetailDatabaseService.updateStockRequestStatus(
      context.workspace.id,
      requestId,
      status,
      { id: context.user.id, name: context.profile.fullName || 'Manager' },
      body.rejectionReason
    );

    if (!result.success) {
      return corsJsonResponse({ success: false, error: result.error }, { status: 400 }, request);
    }

    return corsJsonResponse({ success: true, status }, undefined, request);
  } catch (err: any) {
    console.error('[StockRequestApprovalAPI] Error:', err);
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
