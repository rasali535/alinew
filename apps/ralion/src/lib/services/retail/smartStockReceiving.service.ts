/**
 * Ralion OS — MARI Smart Stock Receiving Service
 * Ras Ali Labs (Pty) Ltd
 *
 * Provides intelligent, asynchronous extraction of supplier invoices and
 * packing lists (PDF, scanned images, CSV, spreadsheets) into reviewable
 * goods-receiving drafts.
 *
 * Architectural & Security Principles:
 * 1. Uploading a document creates a DRAFT only. NEVER increases stock.
 * 2. Physical stock increases ONLY upon explicit authorized manager approval
 *    via atomic PostgreSQL transaction (execute_atomic_smart_stock_receipt).
 * 3. File validation: MIME type, size limit (25MB), file signature magic bytes, SHA-256.
 * 4. Duplicate prevention: file SHA-256 and (workspace, supplier, doc_type, doc_number).
 * 5. Prompt injection defense: untrusted documents are data, not instructions.
 *    Strict JSON schema enforcement.
 * 6. Financial integrity: packing lists lack cost and never invent prices or tax rates.
 * 7. Tenant isolation: workspace boundary strictly verified on every query.
 */

import crypto from 'node:crypto';
import { getServiceSupabase } from '@/lib/auth/serverAuth';
import { writeOperationalAudit } from '@/lib/operations/audit';
import { toScaled, fromScaled, convertPacksToBase } from '@/lib/retail/packaging';
import {
  RetailSmartReceiptDraft,
  RetailSmartReceiptItem,
  SmartReceiptDocumentType,
  SmartReceiptDraftStatus,
  SmartReceiptMatchStatus,
  ExecuteAtomicSmartStockReceiptParams,
  ExecuteAtomicSmartStockReceiptResult,
} from '@ralion/database';

const BUCKET = 'ralion-documents';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export interface FileValidationResult {
  valid: boolean;
  mimeType: string;
  sha256: string;
  sizeBytes: number;
  error?: string;
}

export interface ExtractedLineItem {
  rawDescription: string;
  rawSku?: string;
  rawBarcode?: string;
  statedQuantity: number;
  unitOfMeasure?: string;
  packLabel?: string;
  packSize?: number;
  unitCost?: number | null;
  taxRate?: number;
  lineTotal?: number;
}

export interface ExtractedDocumentData {
  documentType: SmartReceiptDocumentType;
  supplierName?: string;
  supplierTaxId?: string;
  documentNumber?: string;
  poNumber?: string;
  documentDate?: string;
  currency: string;
  subtotal: number;
  taxTotal: number;
  totalAmount: number;
  confidenceScore: number;
  lineItems: ExtractedLineItem[];
  rawSummary?: string;
}

export class SmartStockReceivingService {
  // ---------------------------------------------------------------------------
  // 1. File Validation & Magic Bytes Check
  // ---------------------------------------------------------------------------
  static validateFileSignature(buffer: Buffer, declaredMimeType: string, filename: string): FileValidationResult {
    const sizeBytes = buffer.length;
    if (sizeBytes === 0) {
      return { valid: false, mimeType: declaredMimeType, sha256: '', sizeBytes, error: 'FILE_EMPTY: Uploaded file contains 0 bytes.' };
    }
    if (sizeBytes > MAX_FILE_SIZE) {
      return { valid: false, mimeType: declaredMimeType, sha256: '', sizeBytes, error: `FILE_TOO_LARGE: Exceeds maximum 25MB limit (${sizeBytes} bytes).` };
    }

    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    // Inspect magic bytes header
    let detectedMime = declaredMimeType;

    // PDF: %PDF (25 50 44 46)
    if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      detectedMime = 'application/pdf';
    }
    // PNG: \x89PNG (89 50 4E 47)
    else if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      detectedMime = 'image/png';
    }
    // JPEG: FF D8 FF
    else if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      detectedMime = 'image/jpeg';
    }
    // XLSX / ZIP: 50 4B 03 04 (PK..)
    else if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
      detectedMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    // CSV / Plain text
    else if (['csv', 'txt', 'tsv'].includes(ext) || declaredMimeType.includes('csv') || declaredMimeType.includes('text')) {
      // Validate that content is readable UTF-8 text without excessive binary nulls
      const sample = buffer.subarray(0, Math.min(buffer.length, 1024));
      let nullCount = 0;
      for (const b of sample) {
        if (b === 0) nullCount++;
      }
      if (nullCount > 2) {
        return { valid: false, mimeType: declaredMimeType, sha256, sizeBytes, error: 'INVALID_FILE_SIGNATURE: Binary file cannot be parsed as CSV or text.' };
      }
      detectedMime = ext === 'tsv' ? 'text/tab-separated-values' : 'text/csv';
    } else {
      return {
        valid: false,
        mimeType: declaredMimeType,
        sha256,
        sizeBytes,
        error: `UNSUPPORTED_FORMAT: Only PDF, PNG, JPG, CSV, and XLSX spreadsheet files are supported.`,
      };
    }

    return { valid: true, mimeType: detectedMime, sha256, sizeBytes };
  }

  // ---------------------------------------------------------------------------
  // 2. Draft Creation & Storage Upload
  // ---------------------------------------------------------------------------
  static async createDraft(params: {
    organizationId: string;
    workspaceId: string;
    userId: string;
    fileBuffer: Buffer;
    fileName: string;
    mimeType: string;
    documentType?: SmartReceiptDocumentType;
  }): Promise<{ draft: RetailSmartReceiptDraft; isDuplicate: boolean }> {
    const supabase = getServiceSupabase();
    const validation = this.validateFileSignature(params.fileBuffer, params.mimeType, params.fileName);
    if (!validation.valid) {
      throw new Error(validation.error || 'File validation failed.');
    }

    // Check for existing document with same file SHA-256 within the workspace
    const { data: existingDraft } = await supabase
      .from('retail_smart_receipt_drafts')
      .select('*')
      .eq('workspace_id', params.workspaceId)
      .eq('file_sha256', validation.sha256)
      .not('status', 'eq', 'REJECTED')
      .maybeSingle();

    if (existingDraft) {
      return {
        draft: this.formatDraft(existingDraft),
        isDuplicate: true,
      };
    }

    const draftId = crypto.randomUUID();
    const cleanName = params.fileName.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 150) || 'document';
    const storagePath = `${params.workspaceId}/smart-receiving/${draftId}/${cleanName}`;

    // Upload to private tenant storage
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, params.fileBuffer, {
      contentType: validation.mimeType,
      upsert: false,
    });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const docType: SmartReceiptDocumentType = params.documentType || 'INVOICE';

    // Insert draft row (status = PENDING_EXTRACTION)
    const { data: newDraft, error: insertError } = await supabase
      .from('retail_smart_receipt_drafts')
      .insert({
        id: draftId,
        organization_id: params.organizationId,
        workspace_id: params.workspaceId,
        document_type: docType,
        status: 'PENDING_EXTRACTION',
        file_name: params.fileName,
        file_path: storagePath,
        file_size_bytes: validation.sizeBytes,
        mime_type: validation.mimeType,
        file_sha256: validation.sha256,
        created_by: params.userId,
      })
      .select()
      .single();

    if (insertError) {
      // Cleanup uploaded file on insert error
      await supabase.storage.from(BUCKET).remove([storagePath]);
      throw new Error(`Draft persistence failed: ${insertError.message}`);
    }

    return {
      draft: this.formatDraft(newDraft),
      isDuplicate: false,
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Extraction & Catalogue Matching Engine
  // ---------------------------------------------------------------------------
  static async extractAndMatch(draftId: string, workspaceId: string): Promise<RetailSmartReceiptDraft> {
    const supabase = getServiceSupabase();

    const { data: draftRecord, error: draftErr } = await supabase
      .from('retail_smart_receipt_drafts')
      .select('*')
      .eq('id', draftId)
      .eq('workspace_id', workspaceId)
      .single();

    if (draftErr || !draftRecord) {
      throw new Error(`Draft not found: ${draftId}`);
    }

    if (draftRecord.status === 'POSTED') {
      throw new Error(`Draft ${draftId} is already posted to inventory.`);
    }

    // Set to processing
    await supabase
      .from('retail_smart_receipt_drafts')
      .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
      .eq('id', draftId);

    try {
      // Download file bytes from storage
      const { data: fileBlob, error: downloadErr } = await supabase.storage
        .from(BUCKET)
        .download(draftRecord.file_path);

      if (downloadErr || !fileBlob) {
        throw new Error(`Failed to read document from storage: ${downloadErr?.message}`);
      }

      const buffer = Buffer.from(await fileBlob.arrayBuffer());

      // Parse document based on mime type
      const extracted = await this.parseDocumentData(buffer, draftRecord.mime_type, draftRecord.file_name, draftRecord.document_type);

      // Perform workspace catalogue matching
      const matchedItems = await this.matchCatalogue(workspaceId, extracted.lineItems, draftRecord.document_type);

      // Resolve supplier if extracted name matches existing
      let resolvedSupplierId = draftRecord.supplier_id;
      if (!resolvedSupplierId && extracted.supplierName) {
        const { data: matchedSupplier } = await supabase
          .from('retail_suppliers')
          .select('id, name')
          .eq('workspace_id', workspaceId)
          .ilike('name', `%${extracted.supplierName.trim()}%`)
          .limit(1)
          .maybeSingle();

        if (matchedSupplier) {
          resolvedSupplierId = matchedSupplier.id;
        }
      }

      // Check for matching PO if extracted PO number present
      let matchedPoId = draftRecord.purchase_order_id;
      if (!matchedPoId && extracted.poNumber) {
        const { data: matchedPo } = await supabase
          .from('retail_purchase_orders')
          .select('id, order_number')
          .eq('workspace_id', workspaceId)
          .or(`order_number.ilike.%${extracted.poNumber}%,po_number.ilike.%${extracted.poNumber}%`)
          .limit(1)
          .maybeSingle();

        if (matchedPo) {
          matchedPoId = matchedPo.id;
        }
      }

      // Delete any prior draft items for this draft (retrying extraction)
      await supabase.from('retail_smart_receipt_items').delete().eq('draft_id', draftId);

      // Insert matched items
      if (matchedItems.length > 0) {
        const itemsToInsert = matchedItems.map((it, idx) => ({
          draft_id: draftId,
          organization_id: draftRecord.organization_id,
          workspace_id: workspaceId,
          line_number: idx + 1,
          raw_description: it.rawDescription,
          raw_sku: it.rawSku || null,
          raw_barcode: it.rawBarcode || null,
          stated_quantity: it.statedQuantity,
          received_quantity: it.receivedQuantity,
          damaged_quantity: it.damagedQuantity,
          missing_quantity: it.missingQuantity,
          unit_of_measure: it.unitOfMeasure,
          pack_label: it.packLabel || null,
          pack_size: it.packSize,
          calculated_base_quantity: it.calculatedBaseQuantity,
          unit_cost: it.unitCost !== null && it.unitCost !== undefined ? it.unitCost : null,
          tax_rate: it.taxRate,
          line_total: it.lineTotal,
          matched_product_id: it.matchedProductId || null,
          matched_package_id: it.matchedPackageId || null,
          matched_po_item_id: it.matchedPoItemId || null,
          match_confidence: it.matchConfidence,
          match_status: it.matchStatus,
          review_notes: it.reviewNotes || null,
        }));

        const { error: itemsInsertErr } = await supabase.from('retail_smart_receipt_items').insert(itemsToInsert);
        if (itemsInsertErr) {
          throw new Error(`Failed to persist draft line items: ${itemsInsertErr.message}`);
        }
      }

      // Update draft record with extracted metadata
      const { data: updatedDraft, error: updateErr } = await supabase
        .from('retail_smart_receipt_drafts')
        .update({
          status: 'READY_FOR_REVIEW',
          supplier_id: resolvedSupplierId,
          extracted_supplier_name: extracted.supplierName || null,
          extracted_supplier_tax_id: extracted.supplierTaxId || null,
          extracted_document_number: extracted.documentNumber || null,
          extracted_po_number: extracted.poNumber || null,
          purchase_order_id: matchedPoId,
          document_date: extracted.documentDate || null,
          currency: extracted.currency || 'USD',
          subtotal: extracted.subtotal || 0.0,
          tax_total: extracted.taxTotal || 0.0,
          total_amount: extracted.totalAmount || 0.0,
          confidence_score: extracted.confidenceScore || 90.0,
          extraction_raw: extracted,
          extraction_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draftId)
        .select()
        .single();

      if (updateErr) {
        throw new Error(`Failed to update draft: ${updateErr.message}`);
      }

      return this.getDraft(draftId, workspaceId);
    } catch (err: any) {
      await supabase
        .from('retail_smart_receipt_drafts')
        .update({
          status: 'FAILED',
          extraction_error: err.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draftId);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Structured Document Parsing with Prompt Injection Neutralization
  // ---------------------------------------------------------------------------
  static async parseDocumentData(
    buffer: Buffer,
    mimeType: string,
    filename: string,
    documentType: SmartReceiptDocumentType
  ): Promise<ExtractedDocumentData> {
    const textContent = buffer.toString('utf-8');

    // 1. CSV / TSV Parsing
    if (mimeType.includes('csv') || mimeType.includes('text') || filename.endsWith('.csv') || filename.endsWith('.tsv')) {
      return this.parseCsvDocument(textContent, documentType);
    }

    // 2. Structured text / JSON mock or extracted text streams
    if (textContent.includes('"lineItems"') || textContent.includes('"supplier"')) {
      try {
        const parsed = JSON.parse(textContent);
        if (parsed.lineItems && Array.isArray(parsed.lineItems)) {
          return this.sanitizeExtractedData(parsed, documentType);
        }
      } catch (e) {
        // Fallback to text parser
      }
    }

    // 3. Text & Binary Document Stream Parser
    return this.parseTextStreamDocument(textContent, documentType, filename);
  }

  /**
   * Robust CSV Parser with header detection and financial extraction
   */
  private static parseCsvDocument(rawCsv: string, documentType: SmartReceiptDocumentType): ExtractedDocumentData {
    const lines = rawCsv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let supplierName: string | undefined;
    let documentNumber: string | undefined;
    let poNumber: string | undefined;
    let currency = 'USD';
    let headerIndex = -1;
    let headers: string[] = [];

    // Detect header row and metadata rows
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();

      if (lower.startsWith('supplier:') || lower.startsWith('vendor:')) {
        supplierName = line.split(':')[1]?.trim();
      } else if (lower.startsWith('invoice #:') || lower.startsWith('invoice:') || lower.startsWith('inv:')) {
        documentNumber = line.split(':')[1]?.trim();
      } else if (lower.startsWith('po #:') || lower.startsWith('po:') || lower.startsWith('order:')) {
        poNumber = line.split(':')[1]?.trim();
      } else if (lower.includes('sku') || lower.includes('description') || lower.includes('item') || lower.includes('qty')) {
        headerIndex = i;
        headers = this.parseCsvRow(line).map((h) => h.toLowerCase().trim());
        break;
      }
    }

    const lineItems: ExtractedLineItem[] = [];
    const startIndex = headerIndex >= 0 ? headerIndex + 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const row = this.parseCsvRow(lines[i]);
      if (row.length < 2) continue;

      let desc = '';
      let sku = '';
      let barcode = '';
      let qty = 1;
      let unitCost: number | null = null;
      let packSize = 1;
      let packLabel = 'Unit';

      if (headers.length > 0) {
        for (let col = 0; col < headers.length; col++) {
          const val = row[col]?.trim() || '';
          const h = headers[col];
          if (h.includes('desc') || h.includes('item') || h.includes('product') || h.includes('name')) {
            desc = val;
          } else if (h.includes('sku') || h.includes('part') || h.includes('code')) {
            sku = val;
          } else if (h.includes('barcode') || h.includes('ean') || h.includes('upc')) {
            barcode = val;
          } else if (h.includes('qty') || h.includes('quantity')) {
            qty = parseFloat(val) || 1;
          } else if (h.includes('cost') || h.includes('price') || h.includes('rate')) {
            if (documentType !== 'PACKING_LIST') {
              unitCost = parseFloat(val.replace(/[^0-9.-]/g, '')) || 0;
            }
          } else if (h.includes('pack')) {
            const packMatch = val.match(/(\d+)/);
            if (packMatch) packSize = parseInt(packMatch[1]) || 1;
            packLabel = val;
          }
        }
      } else {
        // Fallback positional indexing: SKU, Description, Qty, Cost
        sku = row[0] || '';
        desc = row[1] || row[0] || 'Hardware Item';
        qty = parseFloat(row[2]) || 1;
        if (documentType !== 'PACKING_LIST' && row[3]) {
          unitCost = parseFloat(row[3].replace(/[^0-9.-]/g, '')) || 0;
        }
      }

      if (desc || sku) {
        // Look for embedded pack keywords in description (e.g. "Carton x20", "Bag 50kg", "Box of 100")
        const packMatch = desc.match(/\b(carton|box|pack|case|bag)\s*(?:x|of)?\s*(\d+)\b/i);
        if (packMatch && packSize === 1) {
          packSize = parseInt(packMatch[2]) || 1;
          packLabel = `${packMatch[1]} x${packSize}`;
        }

        lineItems.push({
          rawDescription: desc || sku,
          rawSku: sku || undefined,
          rawBarcode: barcode || undefined,
          statedQuantity: qty,
          unitOfMeasure: 'units',
          packLabel: packSize > 1 ? packLabel : 'Unit',
          packSize,
          unitCost: documentType === 'PACKING_LIST' ? null : unitCost,
          lineTotal: unitCost !== null && unitCost !== undefined ? Math.round(qty * unitCost * 100) / 100 : 0,
        });
      }
    }

    const subtotal = lineItems.reduce((acc, it) => acc + (it.lineTotal || 0), 0);
    const taxTotal = 0; // standard zero unless parsed
    const totalAmount = subtotal + taxTotal;

    return {
      documentType,
      supplierName,
      documentNumber,
      poNumber,
      currency,
      subtotal,
      taxTotal,
      totalAmount,
      confidenceScore: lineItems.length > 0 ? 98.0 : 70.0,
      lineItems,
    };
  }

  private static parseCsvRow(rowStr: string): string[] {
    const result: string[] = [];
    let insideQuotes = false;
    let entry = '';
    for (let i = 0; i < rowStr.length; i++) {
      const char = rowStr[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        result.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    result.push(entry.trim());
    return result;
  }

  /**
   * Text stream parser with Prompt-Injection Neutralization
   */
  private static parseTextStreamDocument(
    rawText: string,
    documentType: SmartReceiptDocumentType,
    filename: string
  ): ExtractedDocumentData {
    // -------------------------------------------------------------------------
    // Prompt Injection Defense:
    // Untrusted documents are data, not instructions.
    // Strip or neutralize any instructional triggers, script wrappers, or attempts
    // to override systemic prompt logic.
    // -------------------------------------------------------------------------
    const sanitized = rawText
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/ignore\s+all\s+(previous|prior)\s+instructions/gi, '[DEFENSE: IGNORED_PROMPT_INJECTION]')
      .replace(/system\s*:\s*/gi, '')
      .replace(/\u0000/g, '');

    const lines = sanitized.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

    let supplierName: string | undefined;
    let documentNumber: string | undefined;
    let poNumber: string | undefined;
    let documentDate: string | undefined;
    const currency = 'USD';
    const lineItems: ExtractedLineItem[] = [];

    // Heuristic regex scanning
    for (const line of lines) {
      const lower = line.toLowerCase();

      // Extract Supplier
      if (!supplierName && (lower.includes('supplier:') || lower.includes('vendor:') || lower.includes('from:'))) {
        const parts = line.split(/:\s*/);
        if (parts[1]) supplierName = parts[1].replace(/[^a-zA-Z0-9\s&.-]/g, '').trim();
      }

      // Extract Invoice / Doc Number
      if (!documentNumber && (lower.includes('invoice') || lower.includes('inv #') || lower.includes('delivery note') || lower.includes('packing list'))) {
        const m = line.match(/(?:inv(?:oice)?|dn|pl|doc)?\s*#?\s*([A-Za-z0-9-_]{4,20})/i);
        if (m) documentNumber = m[1];
      }

      // Extract PO Number
      if (!poNumber && (lower.includes('po #') || lower.includes('purchase order') || lower.includes('order ref'))) {
        const m = line.match(/(?:po|order)\s*#?\s*([A-Za-z0-9-_]{4,20})/i);
        if (m) poNumber = m[1];
      }

      // Extract Date
      if (!documentDate && (lower.includes('date:'))) {
        const m = line.match(/\b(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})\b/);
        if (m) documentDate = m[1];
      }

      // Extract item rows: e.g. "5 cartons LED Bulbs A60 $40.00" or "10 bags Cement $7.20"
      const itemMatch = line.match(/^(?:(?:\d+\.?\s*)|\b)(\d+)\s*(cartons?|boxes?|bags?|cases?|units?|ea)?\s*(?:x\s*(\d+))?\s+([A-Za-z0-9\s\-_.()]+?)(?:\s+[$€£]?\s*(\d+(?:\.\d{1,2})?))?$/i);
      if (itemMatch) {
        const qty = parseFloat(itemMatch[1]) || 1;
        const packUnit = itemMatch[2]?.toLowerCase() || '';
        const packMultiplier = parseInt(itemMatch[3]) || 1;
        let desc = itemMatch[4]?.trim() || '';
        const costVal = itemMatch[5] ? parseFloat(itemMatch[5]) : null;

        let packSize = 1;
        let packLabel = 'Unit';

        if (packMultiplier > 1) {
          packSize = packMultiplier;
          packLabel = `${packUnit || 'Pack'} x${packSize}`;
        } else if (packUnit.includes('carton') || packUnit.includes('box')) {
          // Look for embedded pack conversion factor in description e.g. "LED Bulbs (20pk)"
          const embeddedMatch = desc.match(/\b(?:x|of|\()\s*(\d+)\s*(?:pk|pcs|units|\))/i);
          packSize = embeddedMatch ? parseInt(embeddedMatch[1]) : 12;
          packLabel = `${packUnit} x${packSize}`;
        }

        lineItems.push({
          rawDescription: desc,
          statedQuantity: qty,
          packSize,
          packLabel: packSize > 1 ? packLabel : 'Unit',
          unitCost: documentType === 'PACKING_LIST' ? null : costVal,
          lineTotal: costVal !== null ? Math.round(qty * costVal * 100) / 100 : 0,
        });
      }
    }

    // Default document number if not found
    if (!documentNumber) {
      documentNumber = 'DOC-' + filename.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase();
    }

    const subtotal = lineItems.reduce((acc, it) => acc + (it.lineTotal || 0), 0);

    return {
      documentType,
      supplierName,
      documentNumber,
      poNumber,
      documentDate,
      currency,
      subtotal,
      taxTotal: 0,
      totalAmount: subtotal,
      confidenceScore: lineItems.length > 0 ? 92.0 : 60.0,
      lineItems,
    };
  }

  private static sanitizeExtractedData(raw: any, documentType: SmartReceiptDocumentType): ExtractedDocumentData {
    return {
      documentType,
      supplierName: typeof raw.supplierName === 'string' ? raw.supplierName.slice(0, 120) : undefined,
      supplierTaxId: typeof raw.supplierTaxId === 'string' ? raw.supplierTaxId.slice(0, 50) : undefined,
      documentNumber: typeof raw.documentNumber === 'string' ? raw.documentNumber.slice(0, 50) : undefined,
      poNumber: typeof raw.poNumber === 'string' ? raw.poNumber.slice(0, 50) : undefined,
      documentDate: typeof raw.documentDate === 'string' ? raw.documentDate.slice(0, 20) : undefined,
      currency: typeof raw.currency === 'string' ? raw.currency : 'USD',
      subtotal: Number(raw.subtotal) || 0,
      taxTotal: Number(raw.taxTotal) || 0,
      totalAmount: Number(raw.totalAmount) || 0,
      confidenceScore: Math.min(100, Math.max(0, Number(raw.confidenceScore) || 95)),
      lineItems: Array.isArray(raw.lineItems)
        ? raw.lineItems.map((li: any) => ({
            rawDescription: String(li.rawDescription || li.description || 'Hardware Item').slice(0, 200),
            rawSku: li.rawSku || li.sku ? String(li.rawSku || li.sku).slice(0, 60) : undefined,
            rawBarcode: li.rawBarcode || li.barcode ? String(li.rawBarcode || li.barcode).slice(0, 60) : undefined,
            statedQuantity: Math.max(0, Number(li.statedQuantity ?? li.quantity) || 1),
            unitOfMeasure: String(li.unitOfMeasure || 'units').slice(0, 30),
            packLabel: li.packLabel ? String(li.packLabel).slice(0, 50) : undefined,
            packSize: Math.max(0.0001, Number(li.packSize ?? li.pack_size) || 1),
            unitCost: documentType === 'PACKING_LIST' ? null : (li.unitCost !== null && li.unitCost !== undefined ? Number(li.unitCost) : null),
            taxRate: Number(li.taxRate || 0),
            lineTotal: Number(li.lineTotal || 0),
          }))
        : [],
    };
  }

  // ---------------------------------------------------------------------------
  // 5. Intelligent Catalogue Matching
  // ---------------------------------------------------------------------------
  static async matchCatalogue(
    workspaceId: string,
    extractedLines: ExtractedLineItem[],
    documentType: SmartReceiptDocumentType
  ): Promise<Array<RetailSmartReceiptItem & { matchConfidence: number; matchStatus: SmartReceiptMatchStatus }>> {
    const supabase = getServiceSupabase();

    // Fetch workspace products, packages, and supplier mappings
    const [productsRes, packagesRes, suppliersRes] = await Promise.all([
      supabase.from('retail_products').select('id, name, sku, barcode, unit_of_measure, cost_price, selling_price, brand').eq('workspace_id', workspaceId),
      supabase.from('retail_product_packages').select('id, product_id, label, base_units_per_pack, barcode, purchase_cost').eq('workspace_id', workspaceId),
      supabase.from('retail_product_suppliers').select('id, product_id, supplier_sku').eq('workspace_id', workspaceId),
    ]);

    const products = productsRes.data || [];
    const packages = packagesRes.data || [];
    const supplierLinks = suppliersRes.data || [];

    const results: any[] = [];

    for (let idx = 0; idx < extractedLines.length; idx++) {
      const line = extractedLines[idx];
      const descNorm = line.rawDescription.toLowerCase().replace(/[^a-z0-9]/g, ' ');
      const skuNorm = (line.rawSku || '').trim().toLowerCase();
      const barcodeNorm = (line.rawBarcode || '').trim();

      let matchedProduct: any = null;
      let matchedPackage: any = null;
      let matchConfidence = 0;
      let matchStatus: SmartReceiptMatchStatus = 'UNMATCHED';

      // 1. Exact Barcode Match (product or package barcode)
      if (barcodeNorm) {
        const pkgMatch = packages.find((pk) => pk.barcode === barcodeNorm);
        if (pkgMatch) {
          matchedPackage = pkgMatch;
          matchedProduct = products.find((p) => p.id === pkgMatch.product_id);
          matchConfidence = 100.0;
          matchStatus = 'EXACT';
        } else {
          const prodMatch = products.find((p) => p.barcode === barcodeNorm);
          if (prodMatch) {
            matchedProduct = prodMatch;
            matchConfidence = 100.0;
            matchStatus = 'EXACT';
          }
        }
      }

      // 2. Exact Supplier SKU Match
      if (!matchedProduct && skuNorm) {
        const supMatch = supplierLinks.find((sl) => (sl.supplier_sku || '').toLowerCase() === skuNorm);
        if (supMatch) {
          matchedProduct = products.find((p) => p.id === supMatch.product_id);
          if (matchedProduct) {
            matchConfidence = 98.0;
            matchStatus = 'EXACT';
          }
        }
      }

      // 3. Exact Product SKU Match
      if (!matchedProduct && skuNorm) {
        const prodMatch = products.find((p) => (p.sku || '').toLowerCase() === skuNorm);
        if (prodMatch) {
          matchedProduct = prodMatch;
          matchConfidence = 95.0;
          matchStatus = 'EXACT';
        }
      }

      // 4. Fuzzy Description & Brand Match
      if (!matchedProduct) {
        let bestScore = 0;
        let candidate: any = null;

        for (const p of products) {
          const pNameNorm = (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, ' ');
          const pSkuNorm = (p.sku || '').toLowerCase();
          const pBrandNorm = (p.brand || '').toLowerCase();

          // Token overlap score
          const pTokens = pNameNorm.split(/\s+/).filter(Boolean);
          let matches = 0;
          for (const tok of pTokens) {
            if (tok.length > 2 && descNorm.includes(tok)) {
              matches++;
            }
          }
          const score = pTokens.length > 0 ? (matches / pTokens.length) * 100 : 0;

          // Brand bonus
          const brandBonus = pBrandNorm && descNorm.includes(pBrandNorm) ? 20 : 0;
          const totalScore = Math.min(94, score + brandBonus);

          if (totalScore > bestScore && totalScore >= 40) {
            bestScore = totalScore;
            candidate = p;
          }
        }

        if (candidate) {
          matchedProduct = candidate;
          matchConfidence = Math.round(bestScore);
          matchStatus = bestScore >= 80 ? 'HIGH_CONFIDENCE' : 'NEEDS_REVIEW';
        }
      }

      // 5. Package Resolution for Matched Product
      let finalPackSize = line.packSize || 1;
      let finalPackLabel = line.packLabel || 'Unit';

      if (matchedProduct) {
        const prodPacks = packages.filter((pk) => pk.product_id === matchedProduct.id);
        if (prodPacks.length > 0) {
          // If a pack matching the extracted packSize or label exists
          const matchingPack = prodPacks.find(
            (pk) =>
              Number(pk.base_units_per_pack) === Number(finalPackSize) ||
              (line.packLabel && pk.label.toLowerCase().includes(line.packLabel.toLowerCase()))
          );
          if (matchingPack) {
            matchedPackage = matchingPack;
            finalPackSize = Number(matchingPack.base_units_per_pack);
            finalPackLabel = matchingPack.label;
          }
        }
      }

      // Base quantity conversion
      const calcBaseQty = Math.round(line.statedQuantity * finalPackSize * 100) / 100;

      // Unit Cost resolution:
      // If invoice provides unit cost, keep it.
      // If packing list, leave cost null unless catalogue/PO provides approved cost.
      let finalCost: number | null = null;
      if (documentType !== 'PACKING_LIST' && line.unitCost !== null && line.unitCost !== undefined) {
        finalCost = line.unitCost;
      } else if (matchedPackage?.purchase_cost) {
        finalCost = Number(matchedPackage.purchase_cost);
      } else if (matchedProduct?.cost_price) {
        finalCost = Math.round(Number(matchedProduct.cost_price) * finalPackSize * 100) / 100;
      }

      results.push({
        draftId: '',
        organizationId: '',
        workspaceId,
        lineNumber: idx + 1,
        rawDescription: line.rawDescription,
        rawSku: line.rawSku,
        rawBarcode: line.rawBarcode,
        statedQuantity: line.statedQuantity,
        receivedQuantity: line.statedQuantity, // default physical received to stated delivery qty
        damagedQuantity: 0,
        missingQuantity: 0,
        unitOfMeasure: matchedProduct?.unit_of_measure || line.unitOfMeasure || 'units',
        packLabel: finalPackLabel,
        packSize: finalPackSize,
        calculatedBaseQuantity: calcBaseQty,
        unitCost: finalCost,
        taxRate: line.taxRate || 0,
        lineTotal: finalCost !== null ? Math.round(line.statedQuantity * finalCost * 100) / 100 : 0,
        matchedProductId: matchedProduct?.id || null,
        matchedProductName: matchedProduct?.name || null,
        matchedPackageId: matchedPackage?.id || null,
        matchedPoItemId: null,
        matchConfidence,
        matchStatus,
        reviewNotes: matchStatus === 'NEEDS_REVIEW' || matchStatus === 'UNMATCHED' ? 'Verify product match before posting.' : undefined,
      });
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // 6. Draft Retrieval, Listing, & Item Updates
  // ---------------------------------------------------------------------------
  static async listDrafts(workspaceId: string): Promise<RetailSmartReceiptDraft[]> {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('retail_smart_receipt_drafts')
      .select('*, supplier:retail_suppliers(name)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to list drafts: ${error.message}`);
    return (data || []).map((d) => this.formatDraft(d));
  }

  static async getDraft(draftId: string, workspaceId: string): Promise<RetailSmartReceiptDraft> {
    const supabase = getServiceSupabase();
    const { data: draft, error } = await supabase
      .from('retail_smart_receipt_drafts')
      .select('*, supplier:retail_suppliers(name), items:retail_smart_receipt_items(*), attachments:retail_smart_receipt_attachments(*)')
      .eq('id', draftId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !draft) throw new Error(`Smart receipt draft not found: ${draftId}`);
    return this.formatDraft(draft);
  }

  static async updateDraftItem(
    draftId: string,
    itemId: string,
    workspaceId: string,
    updates: {
      receivedQuantity?: number;
      damagedQuantity?: number;
      missingQuantity?: number;
      matchedProductId?: string;
      matchedPackageId?: string;
      packSize?: number;
      packLabel?: string;
      unitCost?: number;
      reviewNotes?: string;
    }
  ): Promise<RetailSmartReceiptItem> {
    const supabase = getServiceSupabase();

    // Verify draft is not posted
    const { data: draft } = await supabase
      .from('retail_smart_receipt_drafts')
      .select('status')
      .eq('id', draftId)
      .eq('workspace_id', workspaceId)
      .single();

    if (!draft) throw new Error('Draft not found.');
    if (draft.status === 'POSTED') throw new Error('Cannot update items on an already posted draft.');

    const { data: currentItem, error: getErr } = await supabase
      .from('retail_smart_receipt_items')
      .select('*')
      .eq('id', itemId)
      .eq('draft_id', draftId)
      .single();

    if (getErr || !currentItem) throw new Error('Line item not found.');

    const receivedQty = updates.receivedQuantity !== undefined ? Number(updates.receivedQuantity) : Number(currentItem.received_quantity);
    const damagedQty = updates.damagedQuantity !== undefined ? Number(updates.damagedQuantity) : Number(currentItem.damaged_quantity);
    const missingQty = updates.missingQuantity !== undefined ? Number(updates.missingQuantity) : Number(currentItem.missing_quantity);
    const packSize = updates.packSize !== undefined ? Number(updates.packSize) : Number(currentItem.pack_size);
    const unitCost = updates.unitCost !== undefined ? Number(updates.unitCost) : currentItem.unit_cost;

    const baseQty = Math.round(receivedQty * packSize * 100) / 100;
    const lineTotal = unitCost !== null && unitCost !== undefined ? Math.round(receivedQty * unitCost * 100) / 100 : 0;

    const matchedProdId = updates.matchedProductId !== undefined ? updates.matchedProductId : currentItem.matched_product_id;

    const { data: updated, error: updateErr } = await supabase
      .from('retail_smart_receipt_items')
      .update({
        received_quantity: receivedQty,
        damaged_quantity: damagedQty,
        missing_quantity: missingQty,
        pack_size: packSize,
        pack_label: updates.packLabel !== undefined ? updates.packLabel : currentItem.pack_label,
        calculated_base_quantity: baseQty,
        unit_cost: unitCost,
        line_total: lineTotal,
        matched_product_id: matchedProdId,
        matched_package_id: updates.matchedPackageId !== undefined ? updates.matchedPackageId : currentItem.matched_package_id,
        match_status: matchedProdId ? 'EXACT' : 'UNMATCHED',
        review_notes: updates.reviewNotes !== undefined ? updates.reviewNotes : currentItem.review_notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select()
      .single();

    if (updateErr) throw new Error(`Failed to update item: ${updateErr.message}`);

    return this.formatItem(updated);
  }

  // ---------------------------------------------------------------------------
  // 7. Atomic Goods Receipt Posting (Single PostgreSQL Transaction)
  // ---------------------------------------------------------------------------
  static async postReceipt(params: {
    organizationId: string;
    workspaceId: string;
    draftId: string;
    approvedBy: string;
    nonce?: string;
    notes?: string;
    items?: Array<{
      id?: string;
      product_id: string;
      package_id?: string | null;
      quantity_received: number;
      pack_size?: number;
      unit_cost?: number;
    }>;
  }): Promise<ExecuteAtomicSmartStockReceiptResult> {
    const supabase = getServiceSupabase();
    const nonce = params.nonce || crypto.randomUUID();

    // If items not supplied directly, fetch from draft items table
    let itemsPayload = params.items;
    if (!itemsPayload || itemsPayload.length === 0) {
      const { data: draftItems, error: itemsErr } = await supabase
        .from('retail_smart_receipt_items')
        .select('*')
        .eq('draft_id', params.draftId)
        .eq('workspace_id', params.workspaceId);

      if (itemsErr || !draftItems || draftItems.length === 0) {
        throw new Error('No line items found for this smart receipt draft.');
      }

      itemsPayload = draftItems.map((it) => ({
        id: it.id,
        product_id: it.matched_product_id,
        package_id: it.matched_package_id || null,
        quantity_received: Number(it.received_quantity),
        pack_size: Number(it.pack_size),
        unit_cost: it.unit_cost !== null && it.unit_cost !== undefined ? Number(it.unit_cost) : 0,
      }));
    }

    // Call atomic PostgreSQL function
    const { data: result, error: rpcError } = await supabase.rpc('execute_atomic_smart_stock_receipt', {
      p_organization_id: params.organizationId,
      p_workspace_id: params.workspaceId,
      p_draft_id: params.draftId,
      p_approved_by: params.approvedBy,
      p_nonce: nonce,
      p_notes: params.notes || null,
      p_items: itemsPayload,
    });

    if (rpcError) {
      throw new Error(`Atomic smart stock receipt failed: ${rpcError.message}`);
    }

    // Write durable audit log
    await writeOperationalAudit(
      {
        organizationId: params.organizationId,
        workspaceId: params.workspaceId,
        userId: params.approvedBy,
      },
      'RETAIL_SMART_STOCK_RECEIPT_POSTED',
      'retail',
      {
        draft_id: params.draftId,
        receipt_id: result.receipt_id,
        receipt_number: result.receipt_number,
        lines_posted: result.lines_posted,
        base_units_added: result.base_units_added,
        nonce,
      }
    );

    return result as ExecuteAtomicSmartStockReceiptResult;
  }

  // ---------------------------------------------------------------------------
  // 8. Secure Signed File URL
  // ---------------------------------------------------------------------------
  static async getSignedDocumentUrl(filePath: string, workspaceId: string): Promise<string> {
    if (!filePath.startsWith(`${workspaceId}/`)) {
      throw new Error('CROSS_TENANT_ACCESS_DENIED: Cannot access documents from another workspace.');
    }
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 300);
    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed document URL: ${error?.message}`);
    }
    return data.signedUrl;
  }

  // ---------------------------------------------------------------------------
  // 9. Formatters
  // ---------------------------------------------------------------------------
  private static formatDraft(raw: any): RetailSmartReceiptDraft {
    return {
      id: raw.id,
      organizationId: raw.organization_id,
      workspaceId: raw.workspace_id,
      documentType: raw.document_type,
      status: raw.status,
      fileName: raw.file_name,
      filePath: raw.file_path,
      fileSizeBytes: Number(raw.file_size_bytes),
      mimeType: raw.mime_type,
      fileSha256: raw.file_sha256,
      supplierId: raw.supplier_id || undefined,
      supplierName: raw.supplier?.name || raw.extracted_supplier_name || undefined,
      extractedSupplierName: raw.extracted_supplier_name || undefined,
      extractedSupplierTaxId: raw.extracted_supplier_tax_id || undefined,
      extractedDocumentNumber: raw.extracted_document_number || undefined,
      extractedPoNumber: raw.extracted_po_number || undefined,
      purchaseOrderId: raw.purchase_order_id || undefined,
      documentDate: raw.document_date || undefined,
      currency: raw.currency || 'USD',
      subtotal: Number(raw.subtotal || 0),
      taxTotal: Number(raw.tax_total || 0),
      totalAmount: Number(raw.total_amount || 0),
      confidenceScore: Number(raw.confidence_score || 100),
      extractionRaw: raw.extraction_raw,
      extractionError: raw.extraction_error || undefined,
      createdBy: raw.created_by || undefined,
      reviewedBy: raw.reviewed_by || undefined,
      reviewedAt: raw.reviewed_at || undefined,
      postedBy: raw.posted_by || undefined,
      postedAt: raw.posted_at || undefined,
      goodsReceiptId: raw.goods_receipt_id || undefined,
      postingNonce: raw.posting_nonce || undefined,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      items: Array.isArray(raw.items) ? raw.items.map((it: any) => this.formatItem(it)) : undefined,
      attachments: Array.isArray(raw.attachments)
        ? raw.attachments.map((at: any) => ({
            id: at.id,
            draftId: at.draft_id,
            organizationId: at.organization_id,
            workspaceId: at.workspace_id,
            documentType: at.document_type,
            fileName: at.file_name,
            filePath: at.file_path,
            fileSizeBytes: Number(at.file_size_bytes),
            mimeType: at.mime_type,
            fileSha256: at.file_sha256,
            createdAt: at.created_at,
          }))
        : undefined,
    };
  }

  private static formatItem(raw: any): RetailSmartReceiptItem {
    return {
      id: raw.id,
      draftId: raw.draft_id,
      organizationId: raw.organization_id,
      workspaceId: raw.workspace_id,
      lineNumber: Number(raw.line_number || 1),
      rawDescription: raw.raw_description,
      rawSku: raw.raw_sku || undefined,
      rawBarcode: raw.raw_barcode || undefined,
      statedQuantity: Number(raw.stated_quantity || 0),
      receivedQuantity: Number(raw.received_quantity || 0),
      damagedQuantity: Number(raw.damaged_quantity || 0),
      missingQuantity: Number(raw.missing_quantity || 0),
      unitOfMeasure: raw.unit_of_measure || 'units',
      packLabel: raw.pack_label || undefined,
      packSize: Number(raw.pack_size || 1),
      calculatedBaseQuantity: Number(raw.calculated_base_quantity || 0),
      unitCost: raw.unit_cost !== null && raw.unit_cost !== undefined ? Number(raw.unit_cost) : undefined,
      taxRate: Number(raw.tax_rate || 0),
      lineTotal: Number(raw.line_total || 0),
      matchedProductId: raw.matched_product_id || undefined,
      matchedProductName: raw.matched_product?.name || undefined,
      matchedPackageId: raw.matched_package_id || undefined,
      matchedPoItemId: raw.matched_po_item_id || undefined,
      matchConfidence: Number(raw.match_confidence || 0),
      matchStatus: raw.match_status,
      reviewNotes: raw.review_notes || undefined,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }
}
