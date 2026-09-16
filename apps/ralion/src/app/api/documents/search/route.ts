import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getServiceSupabase, requireRalionContext } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const workspaceId = required.context.workspace.id;
    const q = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 300);
    if (!q) return corsJsonResponse({ success: true, results: [] }, undefined, request);

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('document_chunks')
      .select('id,document_id,chunk_index,content,documents!inner(name,category,mime_type,rag_status)')
      .eq('workspace_id', workspaceId)
      .textSearch('search_vector', q, { type: 'websearch', config: 'english' })
      .limit(12);
    if (error) throw new Error(error.message);

    return corsJsonResponse({
      success: true,
      results: (data || []).map((row: any) => ({
        id: row.id,
        documentId: row.document_id,
        chunkIndex: row.chunk_index,
        content: row.content,
        document: Array.isArray(row.documents) ? row.documents[0] : row.documents,
      })),
    }, undefined, request);
  } catch (error: any) {
    console.error('[Document Search API] failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Document search failed.' }, { status: 500 }, request);
  }
}
