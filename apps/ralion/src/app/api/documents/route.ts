import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getServiceSupabase, requireRalionContext } from '@/lib/auth/serverAuth';
import { writeOperationalAudit } from '@/lib/operations/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUCKET = 'ralion-documents';
const MAX_BYTES = 20 * 1024 * 1024;
const TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'application/json',
  'application/xml',
  'text/xml',
]);

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

function cleanText(value: unknown, max = 500): string {
  return String(value ?? '').trim().slice(0, max);
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 180) || 'document';
}

function chunkText(text: string, size = 1800, overlap = 200) {
  const normalized = text.replace(/\u0000/g, '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  let offset = 0;
  while (offset < normalized.length && chunks.length < 500) {
    const end = Math.min(normalized.length, offset + size);
    const chunk = normalized.slice(offset, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= normalized.length) break;
    offset = Math.max(offset + 1, end - overlap);
  }
  return chunks;
}

async function indexTextDocument(documentId: string, workspaceId: string, text: string) {
  const supabase = getServiceSupabase();
  const chunks = chunkText(text);
  if (!chunks.length) return 0;
  const { error } = await supabase.from('document_chunks').insert(
    chunks.map((content, index) => ({ document_id: documentId, workspace_id: workspaceId, chunk_index: index, content }))
  );
  if (error) throw new Error(`Failed to index document: ${error.message}`);
  return chunks.length;
}

export async function GET(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const workspaceId = required.context.workspace.id;
    const supabase = getServiceSupabase();
    const url = new URL(request.url);
    const downloadId = cleanText(url.searchParams.get('downloadId'), 80);

    if (downloadId) {
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('id,name,file_path,mime_type')
        .eq('id', downloadId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      if (docError) throw new Error(docError.message);
      if (!doc) return corsJsonResponse({ success: false, error: 'Document not found.' }, { status: 404 }, request);
      const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 300, { download: doc.name });
      if (signedError) throw new Error(signedError.message);
      return corsJsonResponse({ success: true, document: doc, url: signed.signedUrl, expiresIn: 300 }, undefined, request);
    }

    const { data, error } = await supabase
      .from('documents')
      .select('id,name,file_path,category,mime_type,size_bytes,rag_status,created_at,updated_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return corsJsonResponse({ success: true, documents: data || [] }, undefined, request);
  } catch (error: any) {
    console.error('[Documents API] GET failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to load documents.' }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;
    const contentType = request.headers.get('content-type') || '';
    const supabase = getServiceSupabase();

    let name = '';
    let category = 'GENERAL';
    let mimeType = 'text/plain';
    let bytes: Uint8Array;
    let extractedText: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!(file instanceof File)) {
        return corsJsonResponse({ success: false, error: 'A file is required.' }, { status: 400 }, request);
      }
      if (file.size <= 0 || file.size > MAX_BYTES) {
        return corsJsonResponse({ success: false, error: `File must be between 1 byte and ${MAX_BYTES / 1024 / 1024} MB.` }, { status: 400 }, request);
      }
      name = safeName(file.name || 'document');
      category = cleanText(form.get('category'), 80).toUpperCase() || 'GENERAL';
      mimeType = cleanText(file.type, 120) || 'application/octet-stream';
      const arrayBuffer = await file.arrayBuffer();
      bytes = new Uint8Array(arrayBuffer);
      if (TEXT_MIME_TYPES.has(mimeType) || /\.(txt|md|csv|json|xml|html)$/i.test(name)) {
        extractedText = new TextDecoder('utf-8', { fatal: false }).decode(bytes).slice(0, 2_000_000);
      }
    } else {
      const body = await request.json().catch(() => ({}));
      name = safeName(cleanText(body.name, 180) || 'generated-document.txt');
      category = cleanText(body.category, 80).toUpperCase() || 'GENERATED';
      extractedText = cleanText(body.content, 2_000_000);
      if (!extractedText) return corsJsonResponse({ success: false, error: 'Document content is required.' }, { status: 400 }, request);
      mimeType = cleanText(body.mimeType, 120) || 'text/plain';
      bytes = new TextEncoder().encode(extractedText);
      if (bytes.length > MAX_BYTES) return corsJsonResponse({ success: false, error: 'Document is too large.' }, { status: 400 }, request);
    }

    const path = `${ctx.workspace.id}/${Date.now()}-${crypto.randomUUID()}-${name}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: mimeType,
      upsert: false,
    });
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    const ragStatus = extractedText?.trim() ? 'PENDING' : 'UNSUPPORTED';
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        workspace_id: ctx.workspace.id,
        organization_id: ctx.organization?.id || null,
        name,
        file_path: path,
        category,
        mime_type: mimeType,
        size_bytes: bytes.length,
        rag_status: ragStatus,
        extracted_text: extractedText || null,
        uploaded_by: ctx.user.id,
      })
      .select('*')
      .single();
    if (docError) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw new Error(docError.message);
    }

    let indexedChunks = 0;
    if (extractedText?.trim()) {
      try {
        indexedChunks = await indexTextDocument(doc.id, ctx.workspace.id, extractedText);
        await supabase.from('documents').update({ rag_status: indexedChunks ? 'READY' : 'UNSUPPORTED', updated_at: new Date().toISOString() }).eq('id', doc.id);
        doc.rag_status = indexedChunks ? 'READY' : 'UNSUPPORTED';
      } catch (indexError: any) {
        await supabase.from('documents').update({ rag_status: 'FAILED', updated_at: new Date().toISOString() }).eq('id', doc.id);
        doc.rag_status = 'FAILED';
        console.warn('[Documents API] indexing failed:', indexError?.message);
      }
    }

    await writeOperationalAudit(
      { organizationId: ctx.organization?.id, workspaceId: ctx.workspace.id, userId: ctx.user.id },
      'DOCUMENT_UPLOADED',
      'DOCUMENTS',
      { documentId: doc.id, name: doc.name, mimeType, sizeBytes: bytes.length, ragStatus: doc.rag_status, indexedChunks }
    );

    return corsJsonResponse({ success: true, document: doc, indexedChunks }, { status: 201 }, request);
  } catch (error: any) {
    console.error('[Documents API] POST failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to upload document.' }, { status: 500 }, request);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;
    const body = await request.json().catch(() => ({}));
    const id = cleanText(body.id, 80);
    if (!id) return corsJsonResponse({ success: false, error: 'Document id is required.' }, { status: 400 }, request);
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) patch.name = safeName(cleanText(body.name, 180));
    if (body.category !== undefined) patch.category = cleanText(body.category, 80).toUpperCase() || 'GENERAL';
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('documents').update(patch).eq('id', id).eq('workspace_id', ctx.workspace.id).select('*').maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return corsJsonResponse({ success: false, error: 'Document not found.' }, { status: 404 }, request);
    return corsJsonResponse({ success: true, document: data }, undefined, request);
  } catch (error: any) {
    console.error('[Documents API] PATCH failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to update document.' }, { status: 500 }, request);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;
    const id = cleanText(new URL(request.url).searchParams.get('id'), 80);
    if (!id) return corsJsonResponse({ success: false, error: 'Document id is required.' }, { status: 400 }, request);
    const supabase = getServiceSupabase();
    const { data: doc, error: docError } = await supabase.from('documents').select('id,name,file_path').eq('id', id).eq('workspace_id', ctx.workspace.id).maybeSingle();
    if (docError) throw new Error(docError.message);
    if (!doc) return corsJsonResponse({ success: false, error: 'Document not found.' }, { status: 404 }, request);
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([doc.file_path]);
    if (storageError) throw new Error(`Storage delete failed: ${storageError.message}`);
    const { error: deleteError } = await supabase.from('documents').delete().eq('id', id).eq('workspace_id', ctx.workspace.id);
    if (deleteError) throw new Error(deleteError.message);
    await writeOperationalAudit(
      { organizationId: ctx.organization?.id, workspaceId: ctx.workspace.id, userId: ctx.user.id },
      'DOCUMENT_DELETED',
      'DOCUMENTS',
      { documentId: doc.id, name: doc.name }
    );
    return corsJsonResponse({ success: true, id: doc.id }, undefined, request);
  } catch (error: any) {
    console.error('[Documents API] DELETE failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to delete document.' }, { status: 500 }, request);
  }
}
