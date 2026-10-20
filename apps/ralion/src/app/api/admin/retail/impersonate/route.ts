import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '@/lib/auth/adminAuth';
import { getPrivilegedSupabase } from '@/lib/supabase/server';
import { PROINSIGHT_ORGANIZATION_ID, PROINSIGHT_WORKSPACE_ID } from '@/lib/services/retail/retailEntitlement.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await verifyPlatformAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized: Platform administrator privilege required.' },
      { status: auth.statusCode || 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const reason = (body.reason || 'Platform administrator Retail operational inspection').trim();

    if (reason.length < 5) {
      return NextResponse.json(
        { success: false, error: 'An inspection reason of at least 5 characters is required for the audit trail.' },
        { status: 400 }
      );
    }

    const supabase = getPrivilegedSupabase();

    // Verify entitlement exists before granting inspection access
    const { data: entitlement } = await supabase
      .from('tenant_module_entitlements')
      .select('status')
      .eq('organization_id', PROINSIGHT_ORGANIZATION_ID)
      .eq('workspace_id', PROINSIGHT_WORKSPACE_ID)
      .eq('module_key', 'retail')
      .maybeSingle();

    if (!entitlement) {
      return NextResponse.json(
        { success: false, error: 'Cannot open Retail workspace: Proinsight Retail entitlement has not been provisioned.' },
        { status: 400 }
      );
    }

    // Log the privileged workspace impersonation/inspection event immutably
    await supabase.from('audit_logs').insert({
      organization_id: PROINSIGHT_ORGANIZATION_ID,
      user_id: auth.user!.id,
      action: 'ADMIN_RETAIL_WORKSPACE_OPEN',
      module: 'PLATFORM_ADMIN',
      metadata: {
        targetWorkspaceId: PROINSIGHT_WORKSPACE_ID,
        targetOrganizationId: PROINSIGHT_ORGANIZATION_ID,
        entitlementStatus: entitlement.status,
        adminEmail: auth.user!.email,
        reason,
        sessionType: 'SERVER_AUTHORIZED_INSPECTION',
        timestamp: new Date().toISOString(),
      },
    });

    const response = NextResponse.json({
      success: true,
      redirectUrl: '/ralion/retail?admin_inspect=true',
      message: 'Platform administrator inspection session authorized.',
      workspace: {
        organizationId: PROINSIGHT_ORGANIZATION_ID,
        workspaceId: PROINSIGHT_WORKSPACE_ID,
        entitlementStatus: entitlement.status,
      },
    });

    // Set inspection session cookie for unambiguous UI session banner
    response.cookies.set('ralion_admin_retail_inspect', 'true', {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600, // 1 hour
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
