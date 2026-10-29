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

    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || (!entitlement.canAccessReports && !entitlement.canAccessPOS)) {
      return corsJsonResponse({
        success: false,
        code: 'FORBIDDEN_CASHUP_ACCESS',
        error: 'Point of Sale or Management authorization is required to access cash-up reports.',
      }, { status: 403 }, request);
    }

    const shiftId = request.nextUrl.searchParams.get('shiftId')?.trim() || request.nextUrl.searchParams.get('drilldownShiftId')?.trim();
    const id = request.nextUrl.searchParams.get('id')?.trim();

    // If specific shiftId requested, return detailed transaction drill-down
    if (shiftId) {
      const drilldown = await RetailDatabaseService.getShiftTransactionDrilldown(context.workspace.id, shiftId);
      return corsJsonResponse({ success: true, drilldown }, undefined, request);
    }

    // If specific report ID requested, return report details
    if (id) {
      const report = await RetailDatabaseService.getCashupReport(context.workspace.id, id);
      if (!report) {
        return corsJsonResponse({ success: false, error: 'Cash-up report not found.' }, { status: 404 }, request);
      }
      return corsJsonResponse({ success: true, report }, undefined, request);
    }

    // Default: list all shifts and cash-up reports for this workspace
    const { shifts, reports } = await RetailDatabaseService.listShiftsWithCashups(context.workspace.id);

    // If cashier without full report access, scope to own shifts
    if (!entitlement.canAccessReports && entitlement.canAccessPOS) {
      const myShifts = shifts.filter((s: any) => s.cashierId === context.user.id);
      const myReports = reports.filter((r: any) => r.cashierUserId === context.user.id);
      return corsJsonResponse({ success: true, shifts: myShifts, reports: myReports }, undefined, request);
    }

    return corsJsonResponse({ success: true, shifts, reports }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
