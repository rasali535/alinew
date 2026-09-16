import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '../../../../../../lib/auth/adminAuth';
import { getPrivilegedSupabase } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyPlatformAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode || 403 });
  }

  const { id: organizationId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const status = String(body.status || '').toUpperCase();
  const reason = String(body.reason || '').trim();

  if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
    return NextResponse.json({ success: false, error: 'Valid status ("ACTIVE" or "SUSPENDED") is required.' }, { status: 400 });
  }
  if (reason.length < 5) {
    return NextResponse.json({ success: false, error: 'A detailed audit reason (min 5 characters) is mandatory.' }, { status: 400 });
  }

  try {
    const supabase = getPrivilegedSupabase();
    const { data: organization, error: orgError } = await supabase.from('organizations').select('id,name').eq('id', organizationId).maybeSingle();
    if (orgError) throw new Error(orgError.message);
    if (!organization) return NextResponse.json({ success: false, error: 'Organization not found.' }, { status: 404 });

    const now = new Date().toISOString();
    const { data: state, error: stateError } = await supabase.from('tenant_admin_state').upsert({
      organization_id: organizationId,
      status,
      suspension_reason: status === 'SUSPENDED' ? reason : null,
      suspended_at: status === 'SUSPENDED' ? now : null,
      suspended_by: status === 'SUSPENDED' ? auth.user!.id : null,
      updated_at: now,
    }, { onConflict: 'organization_id' }).select('*').single();
    if (stateError) throw new Error(stateError.message);

    const { error: auditError } = await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      user_id: auth.user!.id,
      action: status === 'SUSPENDED' ? 'TENANT_SUSPENDED' : 'TENANT_REACTIVATED',
      module: 'PLATFORM_ADMIN',
      metadata: {
        targetType: 'ORGANIZATION',
        targetId: organizationId,
        organizationName: organization.name,
        adminEmail: auth.user!.email,
        reason,
        status,
        result: 'SUCCESS',
      },
    });
    if (auditError) throw new Error(`Audit logging failed: ${auditError.message}`);

    return NextResponse.json({
      success: true,
      data: state,
      message: `Tenant '${organization.name}' successfully marked as ${status}.`,
    });
  } catch (err: any) {
    console.error('[Admin Tenant Status] failed:', err?.message);
    return NextResponse.json({ success: false, error: err?.message || 'Failed to update tenant status.' }, { status: 500 });
  }
}
