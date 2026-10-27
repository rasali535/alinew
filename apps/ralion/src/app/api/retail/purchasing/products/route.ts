import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { handleRetailRoute } from '@/lib/retail/retailRouteGuard';
import { RetailCatalogueService } from '@/lib/services/retail/retailCatalogue.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * "Create New Product" inside the purchase-order workflow.
 * Creates catalogue data only — NO stock. Inventory increases solely through goods receipt.
 * Duplicate SKU/barcode returns 409 with the existing product so the UI can offer "Add Existing".
 */
export async function POST(request: NextRequest) {
  return handleRetailRoute(
    request,
    'INVENTORY',
    async ({ ctx, body }) => ({ product: await RetailCatalogueService.createProductForPurchasing(ctx, body) }),
    { readBody: true }
  );
}
