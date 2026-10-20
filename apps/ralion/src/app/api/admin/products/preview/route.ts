import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '@/lib/auth/adminAuth';
import { getPrivilegedSupabase } from '@/lib/supabase/server';
import { PROINSIGHT_ORGANIZATION_ID } from '@/lib/services/retail/retailEntitlement.service';

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
    const body = await request.json();
    const { product, reason } = body;

    if (!product || !['retail', 'trade'].includes(product)) {
      return NextResponse.json(
        { success: false, error: "Product must be 'retail' or 'trade'." },
        { status: 400 }
      );
    }

    const justification = reason && typeof reason === 'string' && reason.trim().length >= 5
      ? reason.trim()
      : 'Platform administrator operational inspection from Command Centre';

    const supabase = getPrivilegedSupabase();

    // Isolated internal test workspaces
    const previewWorkspaceId = product === 'retail'
      ? 'ralion-internal-retail-preview-ws'
      : 'ralion-internal-trade-preview-ws';

    const previewUrl = product === 'retail'
      ? `/ralion/retail?preview=internal&ws=${previewWorkspaceId}`
      : `/industry/trade?preview=internal&ws=${previewWorkspaceId}`;

    // Append to immutable platform admin audit log
    await supabase.from('audit_logs').insert({
      organization_id: PROINSIGHT_ORGANIZATION_ID,
      user_id: auth.user!.id,
      action: `ADMIN_PREVIEW_${product.toUpperCase()}`,
      module: 'PLATFORM_ADMIN',
      metadata: {
        product,
        previewWorkspaceId,
        previewUrl,
        reason: justification,
        adminEmail: auth.user!.email,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      product,
      previewWorkspaceId,
      previewUrl,
      message: `Audited preview session generated for Ralion ${product === 'retail' ? 'Retail' : 'Trade'}.`,
    });
  } catch (err: any) {
    console.error('[AdminProductsPreviewAPI] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
