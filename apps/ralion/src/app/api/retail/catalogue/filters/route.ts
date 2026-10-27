import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { handleRetailRoute } from '@/lib/retail/retailRouteGuard';
import { RetailCatalogueService } from '@/lib/services/retail/retailCatalogue.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/** Filter lookups (names only) for cashier quick filters. */
export async function GET(request: NextRequest) {
  return handleRetailRoute(request, 'SEARCH', async ({ ctx }) => ({
    filters: await RetailCatalogueService.filterOptions(ctx.workspaceId),
  }));
}
