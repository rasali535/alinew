import 'server-only';
import { getServiceSupabase } from '../../auth/serverAuth';

export interface MariKnowledgeChunk {
  id: string;
  documentId: string;
  documentName: string;
  category: string;
  chunkIndex: number;
  content: string;
}

export interface MariKnowledgeResult {
  query: string;
  workspaceId: string;
  chunks: MariKnowledgeChunk[];
  documentsConsulted: string[];
}

function normalizeSearchQuery(raw: string): string {
  return raw
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export class MariKnowledgeRetrievalService {
  static async retrieve(params: {
    workspaceId: string;
    query: string;
    limit?: number;
  }): Promise<MariKnowledgeResult> {
    const query = normalizeSearchQuery(params.query);
    const limit = Math.min(Math.max(params.limit || 6, 1), 12);

    if (!params.workspaceId || !query || query.length < 2) {
      return { query, workspaceId: params.workspaceId, chunks: [], documentsConsulted: [] };
    }

    const db = getServiceSupabase();

    const { data: chunkRows, error: chunkError } = await db
      .from('document_chunks')
      .select('id, document_id, chunk_index, content')
      .eq('workspace_id', params.workspaceId)
      .textSearch('search_vector', query, { type: 'websearch', config: 'english' })
      .limit(limit);

    if (chunkError) {
      console.warn('[MariKnowledgeRetrieval] Full-text search failed:', chunkError.message);
      return { query, workspaceId: params.workspaceId, chunks: [], documentsConsulted: [] };
    }

    if (!chunkRows || chunkRows.length === 0) {
      return { query, workspaceId: params.workspaceId, chunks: [], documentsConsulted: [] };
    }

    const documentIds = unique(chunkRows.map((row: any) => row.document_id).filter(Boolean));
    const { data: documents, error: documentError } = await db
      .from('documents')
      .select('id, name, category, rag_status, workspace_id')
      .eq('workspace_id', params.workspaceId)
      .eq('rag_status', 'READY')
      .in('id', documentIds);

    if (documentError) {
      console.warn('[MariKnowledgeRetrieval] Document metadata lookup failed:', documentError.message);
      return { query, workspaceId: params.workspaceId, chunks: [], documentsConsulted: [] };
    }

    const byId = new Map((documents || []).map((doc: any) => [doc.id, doc]));
    const chunks: MariKnowledgeChunk[] = [];

    for (const row of chunkRows as any[]) {
      const document = byId.get(row.document_id);
      if (!document) continue;
      chunks.push({
        id: row.id,
        documentId: row.document_id,
        documentName: document.name || 'Untitled document',
        category: document.category || 'GENERAL',
        chunkIndex: Number(row.chunk_index || 0),
        content: String(row.content || '').trim().slice(0, 2200),
      });
    }

    return {
      query,
      workspaceId: params.workspaceId,
      chunks,
      documentsConsulted: unique(chunks.map((chunk) => chunk.documentName)),
    };
  }

  static toPromptContext(result: MariKnowledgeResult): string {
    if (!result.chunks.length) return '';

    const evidence = result.chunks
      .map((chunk, index) => {
        return `[DOCUMENT ${index + 1}: ${chunk.documentName} | ${chunk.category} | chunk ${chunk.chunkIndex}]\n${chunk.content}`;
      })
      .join('\n\n');

    return `[TENANT-ISOLATED DOCUMENT KNOWLEDGE]\n${evidence}\n\n[DOCUMENT GROUNDING RULES]\nUse these excerpts only when relevant to the user's question. Treat them as tenant-provided source material, not general truth. Do not invent details that are absent. If the excerpts conflict or are insufficient, say so. Never mention or expose another tenant, document path, storage identifier, internal database identifier, or retrieval implementation.`;
  }
}
