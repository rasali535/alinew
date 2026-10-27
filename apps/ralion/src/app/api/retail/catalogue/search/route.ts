import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { handleRetailRoute } from '@/lib/retail/retailRouteGuard';
import { RetailCatalogueService } from '@/lib/services/retail/retailCatalogue.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * Unified catalogue search for the cashier workstation, quotations and Mari.
 * Cost-free projection. Purchase-channel search (purchase-only packs) requires
 * inventory/purchasing permission; everyone else is forced onto the sales channel.
 */
export async function GET(request: NextRequest) {
  return handleRetailRoute(request, 'SEARCH', async ({ ctx, entitlement }) => {
    const p = new URL(request.url).searchParams;
    const wantsPurchase = p.get('channel') === 'PURCHASE';
    const hits = await RetailCatalogueService.search({
      workspaceId: ctx.workspaceId,
      query: p.get('q') || undefined,
      departmentId: p.get('departmentId') || undefined,
      subdepartmentId: p.get('subdepartmentId') || undefined,
      brandId: p.get('brandId') || undefined,
      supplierId: p.get('supplierId') || undefined,
      inStockOnly: p.get('inStock') === 'true',
      limit: Number(p.get('limit')) || undefined,
      channel: wantsPurchase && entitlement.canAccessInventory ? 'PURCHASE' : 'SALES',
    });
    return { products: hits };
  });
}
