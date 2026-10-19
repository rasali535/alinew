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
    if (!entitlement.isEntitled) {
      return corsJsonResponse(
        { success: false, error: 'RETAIL_MODULE_NOT_ENTITLED', message: entitlement.reason },
        { status: 403 },
        request
      );
    }

    const metrics = await RetailDatabaseService.computeFinancialMetrics(context.workspace.id);
    const settings = await RetailDatabaseService.getSettings(context.workspace.id);

    return corsJsonResponse(
      {
        success: true,
        metrics,
        settings,
        entitlement,
      },
      undefined,
      request
    );
  } catch (err: any) {
    console.error('[RetailDashboardAPI] Error:', err);
    return corsJsonResponse({ success: false, error: err.message || 'Failed to load dashboard' }, { status: 500 }, request);
  }
}
