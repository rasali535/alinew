import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
import { SmartStockReceivingService } from '@/lib/services/retail/smartStockReceiving.service';
import { SmartReceiptDocumentType } from '@ralion/database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
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
        { success: false, code: 'FORBIDDEN_RECEIVING_MANAGEMENT', error: 'Only inventory managers or store administrators may upload supplier documents for stock receiving.' },
        { status: 403 },
        request
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = (formData.get('documentType') as SmartReceiptDocumentType) || 'INVOICE';

    if (!file) {
      return corsJsonResponse({ success: false, error: 'NO_FILE_PROVIDED: A document file is required.' }, { status: 400 }, request);
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // 1. Create draft and store file in private tenant storage
    const { draft, isDuplicate } = await SmartStockReceivingService.createDraft({
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      userId: context.user.id,
      fileBuffer,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      documentType,
    });

    if (isDuplicate) {
      return corsJsonResponse(
        {
          success: true,
          isDuplicate: true,
          message: 'An identical document (matching file SHA-256) already exists in this workspace.',
          draft,
        },
        undefined,
        request
      );
    }

    // 2. Perform initial extraction and catalogue matching
    let processedDraft = draft;
    try {
      processedDraft = await SmartStockReceivingService.extractAndMatch(draft.id, context.workspace.id);
    } catch (extractErr: any) {
      console.warn('[SmartReceiving] Background extraction error:', extractErr.message);
      // Draft remains reviewable even if auto-extraction failed
    }

    return corsJsonResponse(
      {
        success: true,
        isDuplicate: false,
        message: 'Supplier document uploaded successfully as a reviewable goods-receiving draft. Physical stock has not been modified.',
        draft: processedDraft,
      },
      undefined,
      request
    );
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}
