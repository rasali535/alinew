import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '@/lib/auth/adminAuth';
import { getPrivilegedSupabase } from '@/lib/supabase/server';
import { PROINSIGHT_ORGANIZATION_ID, PROINSIGHT_WORKSPACE_ID } from '@/lib/services/retail/retailEntitlement.service';

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

    // 1. Fetch Entitlement Record for Proinsight
    const { data: entitlement, error: entErr } = await supabase
      .from('tenant_module_entitlements')
      .select('*')
      .eq('organization_id', PROINSIGHT_ORGANIZATION_ID)
      .eq('workspace_id', PROINSIGHT_WORKSPACE_ID)
      .eq('module_key', 'retail')
      .maybeSingle();

    if (entErr) {
      throw new Error(`Failed to read entitlement: ${entErr.message}`);
    }

    // 2. Fetch Workspace and Org Information
    const [orgRes, wsRes, settingsRes] = await Promise.all([
      supabase.from('organizations').select('id, name, slug').eq('id', PROINSIGHT_ORGANIZATION_ID).maybeSingle(),
      supabase.from('workspaces').select('id, name, slug, owner_id').eq('id', PROINSIGHT_WORKSPACE_ID).maybeSingle(),
      supabase.from('retail_settings').select('*').eq('workspace_id', PROINSIGHT_WORKSPACE_ID).maybeSingle(),
    ]);

    // 3. Fetch Operational Health Metrics
    const [productsRes, stockRes, salesRes, quotesRes, shiftsRes, expensesRes, employeesRes] = await Promise.all([
      supabase.from('retail_products').select('id, name, sku, purchase_cost, selling_price, status').eq('workspace_id', PROINSIGHT_WORKSPACE_ID),
      supabase.from('retail_stock_levels').select('quantity_on_hand, quantity_reserved').eq('workspace_id', PROINSIGHT_WORKSPACE_ID),
      supabase.from('retail_sales').select('id, total_amount, total_cost, payment_status, created_at').eq('workspace_id', PROINSIGHT_WORKSPACE_ID),
      supabase.from('retail_quotations').select('id, status, total_amount').eq('workspace_id', PROINSIGHT_WORKSPACE_ID),
      supabase.from('retail_cashier_shifts').select('id, cashier_name, status, started_at').eq('workspace_id', PROINSIGHT_WORKSPACE_ID),
      supabase.from('retail_expenses').select('id, amount, status, category').eq('workspace_id', PROINSIGHT_WORKSPACE_ID),
      supabase.from('retail_employees').select('id, first_name, last_name, job_title, department, employment_status, employment_type, hire_date').eq('workspace_id', PROINSIGHT_WORKSPACE_ID),
    ]);

    const products = productsRes.data || [];
    const stockLevels = stockRes.data || [];
    const sales = salesRes.data || [];
    const quotations = quotesRes.data || [];
    const shifts = shiftsRes.data || [];
    const expenses = expensesRes.data || [];
    const employees = employeesRes.data || [];

    const totalStockUnits = stockLevels.reduce((sum, s) => sum + Number(s.quantity_on_hand || 0), 0);
    const totalRevenueUsd = sales
      .filter((s) => s.payment_status === 'PAID' || s.payment_status === 'PARTIAL')
      .reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const totalExpensesUsd = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const activeShiftsCount = shifts.filter((sh) => sh.status === 'OPEN').length;
    const convertedQuotesCount = quotations.filter((q) => q.status === 'CONVERTED').length;

    // Requirement 6: Redact confidential payroll, salaries, and bank account numbers from Admin inspection
    const sanitizedEmployees = employees.map((emp) => ({
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      jobTitle: emp.job_title,
      department: emp.department,
      employmentStatus: emp.employment_status,
      employmentType: emp.employment_type,
      hireDate: emp.hire_date,
      baseSalaryMonthly: '[CONFIDENTIAL - ROLE GATED]',
      hourlyRate: '[CONFIDENTIAL - ROLE GATED]',
      bankAccount: '[CONFIDENTIAL - ROLE GATED]',
      bankName: '[CONFIDENTIAL - ROLE GATED]',
    }));

    return NextResponse.json({
      success: true,
      data: {
        module: {
          key: 'retail',
          name: 'Ralion Retail (Hardware Store OS)',
          version: '1.0.0-pilot',
          operatingCurrency: 'USD',
          targetCustomer: 'Proinsight (Prolnsight Consultants)',
        },
        entitlement: entitlement
          ? {
              id: entitlement.id,
              organizationId: entitlement.organization_id,
              workspaceId: entitlement.workspace_id,
              status: entitlement.status,
              tier: entitlement.tier,
              defaultCurrency: entitlement.default_currency,
              settings: entitlement.settings,
              createdAt: entitlement.created_at,
              updatedAt: entitlement.updated_at,
            }
          : null,
        workspace: {
          organizationId: PROINSIGHT_ORGANIZATION_ID,
          organizationName: orgRes.data?.name || 'Proinsight',
          workspaceId: PROINSIGHT_WORKSPACE_ID,
          workspaceName: wsRes.data?.name || 'Hardware Store Workspace',
          ownerId: wsRes.data?.owner_id,
        },
        settings: settingsRes.data || null,
        operationalHealth: {
          status: entitlement?.status === 'ACTIVE' ? 'HEALTHY' : entitlement?.status || 'NOT_PROVISIONED',
          totalProducts: products.length,
          totalStockUnits,
          activeShifts: activeShiftsCount,
          completedSalesCount: sales.length,
          totalRevenueUsd,
          totalExpensesUsd,
          quotationsCount: quotations.length,
          convertedQuotesCount,
          employeeCount: employees.length,
        },
        employees: sanitizedEmployees,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
