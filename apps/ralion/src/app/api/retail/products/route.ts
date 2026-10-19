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

    if (!body.name || !body.sku || body.sellingPrice === undefined) {
      return corsJsonResponse({ success: false, error: 'Missing required product fields (name, sku, sellingPrice).' }, { status: 400 }, request);
    }

    const product: RetailProduct = {
      id: body.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      name: body.name.trim(),
      sku: body.sku.trim().toUpperCase(),
      barcode: body.barcode ? body.barcode.trim() : undefined,
      category: body.category || 'General Supplies',
      subcategory: body.subcategory,
      description: body.description,
      brand: body.brand,
      supplierId: body.supplierId,
      unitOfMeasure: body.unitOfMeasure || 'EACH',
      purchaseCost: Number(body.purchaseCost) || 0,
      sellingPrice: Number(body.sellingPrice) || 0,
      minSellingPrice: Number(body.minSellingPrice) || Number(body.sellingPrice) || 0,
      vatRate: Number(body.vatRate) || 0,
      reorderLevel: Number(body.reorderLevel) || 10,
      status: body.status || 'ACTIVE',
      imageUrl: body.imageUrl,
      isPilotDemo: Boolean(body.isPilotDemo),
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const initialStock = Number(body.initialStock) || 0;
    const saved = await RetailDatabaseService.upsertProduct(product, initialStock);

    return corsJsonResponse({ success: true, product: saved }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
