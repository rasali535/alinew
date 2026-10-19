import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
import { RetailDatabaseService } from '@/lib/services/retail/retailDatabase.service';
import { RetailPurchaseOrder, RetailPoItem } from '@ralion/database';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canAccessInventory) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_PURCHASING_ACCESS' }, { status: 403 }, request);
    }

    const orders = await RetailDatabaseService.listPurchaseOrders(context.workspace.id);
    return corsJsonResponse({ success: true, orders }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canAccessInventory) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_PURCHASING_ACCESS' }, { status: 403 }, request);
    }

    const body = await request.json();
    if (!body.supplierId || !Array.isArray(body.items) || body.items.length === 0) {
      return corsJsonResponse({ success: false, error: 'Supplier ID and at least one item are required.' }, { status: 400 }, request);
    }

    const poId = body.id || `po_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const poNumber = body.poNumber || `PO-${Date.now().toString().slice(-6)}`;

    let totalAmount = 0;
    const poItems: RetailPoItem[] = body.items.map((it: any) => {
      const lineTotal = Number(it.quantityOrdered) * Number(it.unitCost);
      totalAmount += lineTotal;
      return {
        id: `poi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        purchaseOrderId: poId,
        productId: it.productId,
        productName: it.productName,
        sku: it.sku,
        quantityOrdered: Number(it.quantityOrdered) || 1,
        quantityReceived: 0,
        unitCost: Number(it.unitCost) || 0,
        lineTotal,
      };
    });

    const po: RetailPurchaseOrder = {
      id: poId,
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      poNumber,
      supplierId: body.supplierId,
      supplierName: body.supplierName,
      status: body.status || 'SUBMITTED',
      currency: 'USD',
      totalAmount,
      notes: body.notes,
      expectedDate: body.expectedDate,
      createdBy: context.user.id,
      isPilotDemo: Boolean(body.isPilotDemo),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await RetailDatabaseService.createPurchaseOrder(po, poItems);
    return corsJsonResponse({ success: true, purchaseOrder: saved }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
