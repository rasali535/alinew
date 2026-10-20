import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '@/lib/auth/adminAuth';
import { getPrivilegedSupabase } from '@/lib/supabase/server';
import { PROINSIGHT_ORGANIZATION_ID, PROINSIGHT_WORKSPACE_ID } from '@/lib/services/retail/retailEntitlement.service';
import { TradeDatabaseService } from '@/lib/services/trade/tradeDatabase.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await verifyPlatformAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized: Platform administrator privilege required.' },
      { status: auth.statusCode || 403 }
    );
  }

  try {
    const supabase = getPrivilegedSupabase();

    // 1. Fetch Ralion Retail status & Proinsight Pilot Health
    const [retailEntitlementRes, retailProductsRes, retailSalesRes] = await Promise.all([
      supabase
        .from('tenant_module_entitlements')
        .select('*')
        .eq('organization_id', PROINSIGHT_ORGANIZATION_ID)
        .eq('workspace_id', PROINSIGHT_WORKSPACE_ID)
        .eq('module_key', 'retail')
        .maybeSingle(),
      supabase
        .from('retail_products')
        .select('id', { count: 'exact' })
        .eq('workspace_id', PROINSIGHT_WORKSPACE_ID),
      supabase
        .from('retail_sales')
        .select('total_amount, status')
        .eq('workspace_id', PROINSIGHT_WORKSPACE_ID),
    ]);

    const sales = retailSalesRes.data || [];
    const completedSales = sales.filter(s => s.status === 'COMPLETED');
    const totalSalesVolume = completedSales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);

    const retailData = {
      productKey: 'retail',
      name: 'Ralion Retail OS',
      tagline: 'Hardware Store, POS, Inventory & Localized Payroll OS',
      status: retailEntitlementRes.data?.status || 'PILOT',
      tier: 'PILOT',
      currency: 'USD',
      managedCustomer: {
        name: 'Proinsight (Prolnsight Consultants)',
        organizationId: PROINSIGHT_ORGANIZATION_ID,
        workspaceId: PROINSIGHT_WORKSPACE_ID,
      },
      metrics: {
        totalProducts: retailProductsRes.count || 0,
        completedSalesCount: completedSales.length,
        totalSalesVolume,
      },
      previewAvailable: true,
      previewWorkspaceId: 'ralion-internal-retail-preview-ws',
    };

    // 2. Fetch Ralion Trade status & Internal Preview Health
    const tradeOverview = TradeDatabaseService.getMockPreviewOverview();
    const tradeData = {
      productKey: 'trade',
      name: 'Ralion Trade OS',
      tagline: 'B2B Wholesale Procurement, Quotations & Supplier Distribution OS',
      status: 'INTERNAL_PREVIEW',
      tier: 'BETA_PREVIEW',
      currency: 'USD',
      label: 'Functional Internal Preview (Beta — Not Production Ready)',
      metrics: tradeOverview,
      previewAvailable: true,
      previewWorkspaceId: 'ralion-internal-trade-preview-ws',
    };

    return NextResponse.json({
      success: true,
      products: {
        retail: retailData,
        trade: tradeData,
      },
    });
  } catch (err: any) {
    console.error('[AdminProductsOverviewAPI] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
