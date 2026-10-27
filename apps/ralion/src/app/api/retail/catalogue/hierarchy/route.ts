import { NextRequest } from 'next/server';
import { handleCorsPreflight } from '@/lib/cors';
import { handleRetailRoute } from '@/lib/retail/retailRouteGuard';
import { RetailCatalogueService, CatalogueError } from '@/lib/services/retail/retailCatalogue.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/** Departments -> Subdepartments tree (purchaser / manager / owner). */
export async function GET(request: NextRequest) {
  return handleRetailRoute(request, 'INVENTORY', async ({ ctx }) => ({
    departments: await RetailCatalogueService.listHierarchy(ctx.workspaceId),
  }));
}

/** body.kind = 'department' | 'subdepartment'. Include body.id to update. */
export async function POST(request: NextRequest) {
  return handleRetailRoute(
    request,
    'INVENTORY',
    async ({ ctx, body }) => {
      if (body.kind === 'department') return { department: await RetailCatalogueService.saveDepartment(ctx, body) };
      if (body.kind === 'subdepartment') return { subdepartment: await RetailCatalogueService.saveSubdepartment(ctx, body) };
      throw new CatalogueError('INVALID_INPUT', "kind must be 'department' or 'subdepartment'.");
    },
    { readBody: true }
  );
}
