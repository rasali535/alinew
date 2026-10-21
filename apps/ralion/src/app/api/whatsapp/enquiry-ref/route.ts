import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getPrivilegedSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * Returns or generates a durable server-side business customer enquiry reference for the workspace.
 */
export async function GET(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const supabase = getPrivilegedSupabase();

    // 1. Check for existing active enquiry reference for this workspace
    const { data: existingRef } = await supabase
      .from('whatsapp_business_enquiry_refs')
      .select('*')
      .eq('workspace_id', context.workspace.id)
      .eq('is_active', true)
      .maybeSingle();

    if (existingRef) {
      const centralNumber = (process.env.WHATSAPP_CENTRAL_NUMBER || '+12029087457').replace(/[^0-9]/g, '');
      const directLink = `https://wa.me/${centralNumber}?text=${encodeURIComponent(existingRef.reference_code)}`;

      return corsJsonResponse({
        success: true,
        referenceCode: existingRef.reference_code,
        businessName: existingRef.business_name,
        directLink,
        qrCodeUrl: existingRef.qr_code_url,
      }, undefined, request);
    }

    // 2. Generate unique deterministic reference code server-side
    const cleanWsId = context.workspace.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
    const referenceCode = `REF-${cleanWsId}`;
    const businessName = context.workspace.name || 'Store';
    const centralNumber = (process.env.WHATSAPP_CENTRAL_NUMBER || '+12029087457').replace(/[^0-9]/g, '');
    const directLink = `https://wa.me/${centralNumber}?text=${encodeURIComponent(referenceCode)}`;

    // 3. Persist in whatsapp_business_enquiry_refs
    await supabase.from('whatsapp_business_enquiry_refs').upsert({
      organization_id: context.organization.id,
      workspace_id: context.workspace.id,
      reference_code: referenceCode,
      business_name: businessName,
      is_active: true,
      allow_quotations: true,
    }, { onConflict: 'reference_code' });

    return corsJsonResponse({
      success: true,
      referenceCode,
      businessName,
      directLink,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
