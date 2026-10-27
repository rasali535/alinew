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
    brands: await RetailCatalogueService.listBrands(ctx.workspaceId),
  }));
}

export async function POST(request: NextRequest) {
  return handleRetailRoute(
    request,
    'INVENTORY',
    async ({ ctx, body }) => ({ brand: await RetailCatalogueService.saveBrand(ctx, body) }),
    { readBody: true }
  );
}
