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

    const entitlement = RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled) {
      return corsJsonResponse({ success: false, error: 'RETAIL_MODULE_NOT_ENTITLED' }, { status: 403 }, request);
    }

    const metrics = await RetailDatabaseService.computeFinancialMetrics(context.workspace.id);
    const sales = await RetailDatabaseService.listSales(context.workspace.id);
    const movements = await RetailDatabaseService.listStockMovements(context.workspace.id);
    const expenses = await RetailDatabaseService.listExpenses(context.workspace.id);
    const payrollRuns = entitlement.canAccessPayroll ? await RetailDatabaseService.listPayrollRuns(context.workspace.id) : [];

    return corsJsonResponse(
      {
        success: true,
        metrics,
        summary: {
          currency: 'USD',
          totalCompletedSales: sales.length,
          totalMovementsCount: movements.length,
          totalExpensesCount: expenses.length,
          totalPayrollRunsCount: payrollRuns.length,
        },
      },
      undefined,
      request
    );
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
