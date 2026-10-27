import { NextRequest, NextResponse } from 'next/server';
import { requireRalionContext, getServiceSupabase } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUCKET = 'ralion-documents';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || (!entitlement.canManageInventory && !entitlement.canManagePurchasing)) {
      return corsJsonResponse(
        { success: false, code: 'FORBIDDEN_DOCUMENT_ACCESS', error: 'Only inventory managers may view receiving documents.' },
        { status: 403 },
        request
      );
    }

    const { id: draftId } = await params;
    const supabase = getServiceSupabase();

    const { data: draft, error: draftErr } = await supabase
      .from('retail_smart_receipt_drafts')
      .select('file_path, file_name, mime_type')
      .eq('id', draftId)
      .eq('workspace_id', context.workspace.id)
      .single();

    if (draftErr || !draft) {
      return corsJsonResponse({ success: false, error: 'Document not found.' }, { status: 404 }, request);
    }

    // Stream download through authenticated API endpoint
    const { data: fileBlob, error: downloadErr } = await supabase.storage
      .from(BUCKET)
      .download(draft.file_path);

    if (downloadErr || !fileBlob) {
      return corsJsonResponse({ success: false, error: 'Failed to read document from storage.' }, { status: 500 }, request);
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': draft.mime_type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${draft.file_name}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
