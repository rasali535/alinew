import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { TradeEntitlementService } from '@/lib/services/trade/tradeEntitlement.service';
import { TradeDatabaseService } from '@/lib/services/trade/tradeDatabase.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const scopeCheck = TradeEntitlementService.validateClientWorkspaceScope(request, context);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const entitlement = await TradeEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled) {
      return corsJsonResponse(
        { success: false, error: 'TRADE_MODULE_NOT_ENTITLED', message: entitlement.reason },
        { status: 403 },
        request
      );
    }

    const overview = await TradeDatabaseService.getOverview(context.workspace.id);

    return corsJsonResponse(
      {
        success: true,
        overview,
        entitlement,
      },
      undefined,
      request
    );
  } catch (err: any) {
    console.error('[TradeOverviewAPI] Error:', err);
    return corsJsonResponse({ success: false, error: err.message || 'Failed to load trade overview' }, { status: 500 }, request);
  }
}
