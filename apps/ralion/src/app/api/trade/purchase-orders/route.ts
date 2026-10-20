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

    const purchaseOrders = await TradeDatabaseService.getPurchaseOrders(context.workspace.id);
    return corsJsonResponse({ success: true, purchaseOrders }, undefined, request);
  } catch (err: any) {
    console.error('[TradePOAPI] Error:', err);
    return corsJsonResponse({ success: false, error: err.message || 'Failed to load purchase orders' }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const body = await request.json();
    const scopeCheck = TradeEntitlementService.validateClientWorkspaceScope(request, context, body);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const entitlement = await TradeEntitlementService.verifyEntitlement(context, 'PROCUREMENT_MANAGER');
    if (!entitlement.isEntitled) {
      return corsJsonResponse(
        { success: false, error: 'FORBIDDEN', message: entitlement.reason || 'Procurement manager capability required.' },
        { status: 403 },
        request
      );
    }

    if (!body.supplier_name || typeof body.supplier_name !== 'string') {
      return corsJsonResponse({ success: false, error: 'Supplier name is required.' }, { status: 400 }, request);
    }

    const po = await TradeDatabaseService.createPurchaseOrder(context.workspace.id, context.organization.id, body);
    return corsJsonResponse({ success: true, purchaseOrder: po }, { status: 201 }, request);
  } catch (err: any) {
    console.error('[TradePOAPI] Error:', err);
    return corsJsonResponse({ success: false, error: err.message || 'Failed to create purchase order' }, { status: 500 }, request);
  }
}
