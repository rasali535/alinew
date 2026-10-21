import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
import { RetailDatabaseService } from '@/lib/services/retail/retailDatabase.service';
import { RetailProduct } from '@ralion/database';

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
      return corsJsonResponse({ success: false, error: 'RETAIL_MODULE_NOT_ENTITLED' }, { status: 403 }, request);
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const query = searchParams.get('q') || undefined;
    const barcode = searchParams.get('barcode') || undefined;

    if (barcode) {
      const product = await RetailDatabaseService.getProductByBarcode(context.workspace.id, barcode);
      return corsJsonResponse({ success: true, product }, undefined, request);
    }

    const products = await RetailDatabaseService.listProducts(context.workspace.id, { category, query });
    return corsJsonResponse({ success: true, products }, undefined, request);
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
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_INVENTORY_ACCESS' }, { status: 403 }, request);
    }

    const body = await request.json();

    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context, body);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    if (!body || typeof body !== 'object') {
      return corsJsonResponse({ success: false, error: 'Invalid JSON request body.' }, { status: 400 }, request);
    }

    const name = body.name ? String(body.name).trim() : '';
    const sku = body.sku ? String(body.sku).trim().toUpperCase() : '';
    const sellingPriceRaw = body.sellingPrice !== undefined ? body.sellingPrice : body.selling_price;
    const purchaseCostRaw = body.purchaseCost !== undefined ? body.purchaseCost : (body.unit_cost !== undefined ? body.unit_cost : body.cost_price);
    const reorderLevelRaw = body.reorderLevel !== undefined ? body.reorderLevel : body.min_stock_level;
    const unitOfMeasure = (body.unitOfMeasure || body.unit_of_measure || 'EACH').trim();
    const initialStockRaw = body.initialStock !== undefined ? body.initialStock : body.initial_stock;

    if (!name || !sku) {
      return corsJsonResponse({ success: false, error: 'Missing required product fields: name and sku.' }, { status: 400 }, request);
    }

    // Strict numeric validation: do NOT silently replace missing or invalid financial values with zero
    if (
      sellingPriceRaw === undefined ||
      sellingPriceRaw === null ||
      sellingPriceRaw === '' ||
      typeof sellingPriceRaw === 'boolean' ||
      isNaN(Number(sellingPriceRaw)) ||
      !Number.isFinite(Number(sellingPriceRaw)) ||
      Number(sellingPriceRaw) < 0
    ) {
      return corsJsonResponse(
        { success: false, error: 'Missing or invalid required financial field: sellingPrice must be a valid non-negative finite number.' },
        { status: 400 },
        request
      );
    }
    const sellingPrice = Number(sellingPriceRaw);

    let purchaseCost = 0;
    if (purchaseCostRaw !== undefined && purchaseCostRaw !== null && purchaseCostRaw !== '') {
      if (
        typeof purchaseCostRaw === 'boolean' ||
        isNaN(Number(purchaseCostRaw)) ||
        !Number.isFinite(Number(purchaseCostRaw)) ||
        Number(purchaseCostRaw) < 0
      ) {
        return corsJsonResponse(
          { success: false, error: 'Invalid financial field: purchaseCost must be a valid non-negative finite number.' },
          { status: 400 },
          request
        );
      }
      purchaseCost = Number(purchaseCostRaw);
    }

    const reorderLevel = reorderLevelRaw !== undefined && reorderLevelRaw !== null && !isNaN(Number(reorderLevelRaw))
      ? Number(reorderLevelRaw)
      : 10;

    const product: RetailProduct = {
      id: body.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      name,
      sku,
      barcode: body.barcode ? String(body.barcode).trim() : undefined,
      category: body.category || 'General Supplies',
      subcategory: body.subcategory,
      description: body.description,
      brand: body.brand,
      supplierId: body.supplierId || body.supplier_id,
      unitOfMeasure: unitOfMeasure as any,
      purchaseCost,
      sellingPrice,
      minSellingPrice: body.minSellingPrice !== undefined ? Number(body.minSellingPrice) : sellingPrice,
      vatRate: Number(body.vatRate ?? body.tax_rate ?? 0) || 0,
      reorderLevel,
      status: body.status || 'ACTIVE',
      imageUrl: body.imageUrl || body.image_url,
      isPilotDemo: Boolean(body.isPilotDemo || body.is_pilot_demo),
      createdAt: body.createdAt || body.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const initialStock = initialStockRaw !== undefined && !isNaN(Number(initialStockRaw)) ? Number(initialStockRaw) : 0;
    const saved = await RetailDatabaseService.upsertProduct(product, initialStock);

    return corsJsonResponse({ success: true, product: saved }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
