import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { handleRetailRoute } from '@/lib/retail/retailRouteGuard';
import { RetailCatalogueService } from '@/lib/services/retail/retailCatalogue.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  return handleRetailRoute(request, 'INVENTORY', async ({ ctx }) => ({
    taxCodes: await RetailCatalogueService.listTaxCodes(ctx.workspaceId),
  }));
}

/** Create or update (body.id) a tax code. Editing a rate re-syncs linked products' legacy vat_rate. */
export async function POST(request: NextRequest) {
  return handleRetailRoute(
    request,
    'INVENTORY',
    async ({ ctx, body }) => ({ taxCode: await RetailCatalogueService.saveTaxCode(ctx, body) }),
    { readBody: true }
  );
}
