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

    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

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

    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context, body);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    if (!body || typeof body !== 'object') {
      return corsJsonResponse({ success: false, error: 'Invalid JSON request body.' }, { status: 400 }, request);
    }

    const supplierId = body.supplierId || body.supplier_id;
    const supplierName = body.supplierName || body.supplier_name;
    const expectedDate = body.expectedDate || body.expected_delivery;
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (!supplierId || rawItems.length === 0) {
      return corsJsonResponse({ success: false, error: 'Supplier ID and at least one item are required.' }, { status: 400 }, request);
    }

    const poId = body.id || `po_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const poNumber = body.poNumber || body.order_number || body.po_number || `PO-${Date.now().toString().slice(-6)}`;

    let totalAmount = 0;
    const poItems: RetailPoItem[] = [];

    for (const it of rawItems) {
      const quantityOrdered = Number(it.quantityOrdered ?? it.quantity ?? it.quantity_ordered ?? 1);
      const unitCostRaw = it.unitCost !== undefined ? it.unitCost : it.unit_cost;

      if (
        unitCostRaw === undefined ||
        unitCostRaw === null ||
        typeof unitCostRaw === 'boolean' ||
        isNaN(Number(unitCostRaw)) ||
        !Number.isFinite(Number(unitCostRaw)) ||
        Number(unitCostRaw) < 0
      ) {
        return corsJsonResponse(
          { success: false, error: `Invalid unitCost for PO item: must be a valid non-negative number.` },
          { status: 400 },
          request
        );
      }

      const unitCost = Number(unitCostRaw);
      const lineTotal = quantityOrdered * unitCost;
      totalAmount += lineTotal;

      poItems.push({
        id: `poi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        purchaseOrderId: poId,
        productId: it.productId || it.product_id,
        productName: it.productName || it.product_name || 'Hardware Item',
        sku: it.sku || 'SKU-PO',
        quantityOrdered,
        quantityReceived: 0,
        unitCost,
        lineTotal,
        packageId: it.packageId || it.package_id || undefined,
        packLabel: it.packLabel || it.pack_label || undefined,
        packSize: it.packSize || it.pack_size ? Number(it.packSize || it.pack_size) : 1,
      });
    }

    const po: RetailPurchaseOrder = {
      id: poId,
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      poNumber,
      supplierId,
      supplierName,
      status: body.status || 'SUBMITTED',
      currency: 'USD',
      totalAmount,
      notes: body.notes,
      expectedDate,
      createdBy: context.user.id,
      isPilotDemo: Boolean(body.isPilotDemo || body.is_pilot_demo),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await RetailDatabaseService.createPurchaseOrder(po, poItems);
    return corsJsonResponse({ success: true, purchaseOrder: saved }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
