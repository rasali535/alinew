import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { handleRetailRoute } from '@/lib/retail/retailRouteGuard';
import { RetailCatalogueService, CatalogueError } from '@/lib/services/retail/retailCatalogue.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/** Packaging variants of a product (includes purchase cost, so purchaser/manager only). */
export async function GET(request: NextRequest) {
  return handleRetailRoute(request, 'INVENTORY', async ({ ctx }) => {
    const productId = new URL(request.url).searchParams.get('productId');
    if (!productId) throw new CatalogueError('INVALID_INPUT', 'productId is required.');
    return { packages: await RetailCatalogueService.listPackages(ctx.workspaceId, productId) };
  });
}

/**
 * Create or update (body.id) a pack. The database blocks conversion-factor
 * changes for packs referenced by historical sales/quotes/POs (409 PACK_CONVERSION_LOCKED):
 * deactivate the pack (isActive=false) and create a new one instead.
 */
export async function POST(request: NextRequest) {
  return handleRetailRoute(
    request,
    'INVENTORY',
    async ({ ctx, body }) => ({ package: await RetailCatalogueService.savePackage(ctx, body) }),
    { readBody: true }
  );
}
