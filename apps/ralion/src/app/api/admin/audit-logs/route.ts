import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '../../../../lib/auth/adminAuth';
import { getPrivilegedSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const auth = await verifyPlatformAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode || 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action')?.trim() || null;
  const targetId = searchParams.get('targetId')?.trim() || null;
  const requestedLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 500)) : 50;

  try {
    const supabase = getPrivilegedSupabase();
    let query = supabase
      .from('audit_logs')
      .select('id,organization_id,workspace_id,user_id,action,module,metadata,created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (action) query = query.eq('action', action);
    if (targetId) {
      query = query.or(`organization_id.eq.${targetId},workspace_id.eq.${targetId},metadata->>targetId.eq.${targetId}`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const logs = (data || []).map((row: any) => ({
      id: row.id,
      timestamp: row.created_at,
      createdAt: row.created_at,
      adminUserId: row.user_id || row.metadata?.adminUserId || null,
      adminEmail: row.metadata?.adminEmail || null,
      action: row.action,
      module: row.module,
      targetType: row.metadata?.targetType || (row.workspace_id ? 'WORKSPACE' : row.organization_id ? 'ORGANIZATION' : row.module),
      targetId: row.metadata?.targetId || row.workspace_id || row.organization_id || null,
      result: row.metadata?.result || 'SUCCESS',
      reason: row.metadata?.reason || row.metadata?.note || '',
      details: row.metadata || {},
      organizationId: row.organization_id,
      workspaceId: row.workspace_id,
    }));

    return NextResponse.json({ success: true, data: logs, total: logs.length });
  } catch (error: any) {
    console.error('[Admin Audit Logs] failed:', error?.message);
    return NextResponse.json({ success: false, error: 'Failed to load audit history.' }, { status: 500 });
  }
}
