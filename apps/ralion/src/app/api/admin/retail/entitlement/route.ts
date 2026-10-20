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
    const { data, error } = await supabase
      .from('tenant_module_entitlements')
      .select('*')
      .eq('organization_id', PROINSIGHT_ORGANIZATION_ID)
      .eq('workspace_id', PROINSIGHT_WORKSPACE_ID)
      .eq('module_key', 'retail')
      .maybeSingle();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      success: true,
      entitlement: data,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyPlatformAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized: Platform administrator privilege required.' },
      { status: auth.statusCode || 403 }
    );
  }

  try {
    const body = await request.json();
    const { organizationId, workspaceId, status, reason } = body;

    // Validate inputs
    if (!status || !['ACTIVE', 'SUSPENDED', 'EXPIRED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status. Must be 'ACTIVE', 'SUSPENDED', or 'EXPIRED'." },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'A justification reason of at least 5 characters is required for the immutable audit trail.' },
        { status: 400 }
      );
    }

    // Tenant boundary: Only Proinsight pilot entitlement is managed here
    const targetOrgId = organizationId || PROINSIGHT_ORGANIZATION_ID;
    const targetWsId = workspaceId || PROINSIGHT_WORKSPACE_ID;

    if (targetOrgId !== PROINSIGHT_ORGANIZATION_ID || targetWsId !== PROINSIGHT_WORKSPACE_ID) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Retail pilot management is strictly restricted to Proinsight tenant.' },
        { status: 403 }
      );
    }

    const supabase = getPrivilegedSupabase();

    // Fetch current state
    const { data: currentEntitlement } = await supabase
      .from('tenant_module_entitlements')
      .select('status, tier')
      .eq('organization_id', targetOrgId)
      .eq('workspace_id', targetWsId)
      .eq('module_key', 'retail')
      .maybeSingle();

    const previousStatus = currentEntitlement?.status || 'NONE';

    // Update or insert entitlement
    const { data: updated, error: upsertErr } = await supabase
      .from('tenant_module_entitlements')
      .upsert(
        {
          organization_id: targetOrgId,
          workspace_id: targetWsId,
          module_key: 'retail',
          status,
          tier: 'PILOT',
          default_currency: 'USD',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'workspace_id,module_key' }
      )
      .select()
      .single();

    if (upsertErr) throw new Error(`Entitlement update failed: ${upsertErr.message}`);

    // Append to immutable audit ledger
    await supabase.from('audit_logs').insert({
      organization_id: targetOrgId,
      user_id: auth.user!.id,
      action: `RETAIL_ENTITLEMENT_${status}`,
      module: 'PLATFORM_ADMIN',
      metadata: {
        targetType: 'TENANT_MODULE_ENTITLEMENT',
        targetId: updated.id,
        workspaceId: targetWsId,
        previousStatus,
        newStatus: status,
        reason: reason.trim(),
        adminEmail: auth.user!.email,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Ralion Retail entitlement for Proinsight set to ${status}.`,
      entitlement: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
