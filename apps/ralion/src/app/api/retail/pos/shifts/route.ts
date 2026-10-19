import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
import { RetailDatabaseService } from '@/lib/services/retail/retailDatabase.service';
import { RetailCashierShift } from '@ralion/database';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canAccessPOS) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_POS_ACCESS' }, { status: 403 }, request);
    }

    const activeShift = await RetailDatabaseService.getActiveShift(context.workspace.id, context.user.id);
    return corsJsonResponse({ success: true, activeShift }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
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
    const action = body.action || 'OPEN';

    if (action === 'OPEN') {
      const existing = await RetailDatabaseService.getActiveShift(context.workspace.id, context.user.id);
      if (existing) {
        return corsJsonResponse({ success: true, shift: existing, message: 'Existing active shift restored.' }, undefined, request);
      }

      const shift: RetailCashierShift = {
        id: `shift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        organizationId: context.organization.id,
        workspaceId: context.workspace.id,
        cashierUserId: context.user.id,
        cashierName: context.profile.fullName || 'Cashier',
        startedAt: new Date().toISOString(),
        openingCash: Number(body.openingCash) || 0,
        status: 'OPEN',
        notes: body.notes,
        createdAt: new Date().toISOString(),
      };

      const opened = await RetailDatabaseService.openShift(shift);
      return corsJsonResponse({ success: true, shift: opened }, undefined, request);
    } else if (action === 'CLOSE') {
      if (!body.shiftId || body.closingCashActual === undefined) {
        return corsJsonResponse({ success: false, error: 'shiftId and closingCashActual are required to close shift.' }, { status: 400 }, request);
      }

      const result = await RetailDatabaseService.closeShift(
        context.workspace.id,
        body.shiftId,
        Number(body.closingCashActual),
        body.notes
      );

      if (!result.success) {
        return corsJsonResponse({ success: false, error: result.error }, { status: 400 }, request);
      }

      return corsJsonResponse({ success: true, shift: result.shift }, undefined, request);
    }

    return corsJsonResponse({ success: false, error: `Invalid shift action '${action}'.` }, { status: 400 }, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
