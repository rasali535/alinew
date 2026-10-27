import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { handleRetailRoute } from '@/lib/retail/retailRouteGuard';
import { RetailCatalogueService, CatalogueError } from '@/lib/services/retail/retailCatalogue.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  return handleRetailRoute(request, 'INVENTORY', async ({ ctx }) => {
    const productId = new URL(request.url).searchParams.get('productId');
    if (!productId) throw new CatalogueError('INVALID_INPUT', 'productId is required.');
    return { suppliers: await RetailCatalogueService.listProductSuppliers(ctx.workspaceId, productId) };
  });
}

/** Link (or update) a supplier on a product: supplierSku, lastCost, isPreferred. */
export async function POST(request: NextRequest) {
  return handleRetailRoute(
    request,
    'INVENTORY',
    async ({ ctx, body }) => ({ link: await RetailCatalogueService.linkSupplier(ctx, body) }),
    { readBody: true }
  );
}

export async function DELETE(request: NextRequest) {
  return handleRetailRoute(request, 'INVENTORY', async ({ ctx }) => {
    const p = new URL(request.url).searchParams;
    const productId = p.get('productId');
    const supplierId = p.get('supplierId');
    if (!productId || !supplierId) throw new CatalogueError('INVALID_INPUT', 'productId and supplierId are required.');
    await RetailCatalogueService.unlinkSupplier(ctx.workspaceId, productId, supplierId);
    return {};
  });
}
