import { chunkText, simulateVectorSearch, TextChunk } from './ragEngine';

export interface KnowledgeDocument {
  id: string;
  orgId: string;
  title: string;
  category: 'POLICY' | 'MANUAL' | 'PRODUCT' | 'SOP' | 'TRAINING';
  content: string;
  vectorIndexed: boolean;
  chunkCount: number;
  createdAt: string;
}

export class MariKnowledgeManager {
  private documents: KnowledgeDocument[] = [
    {
      id: 'kb-1',
      orgId: 'ras-ali-labs',
      title: 'Ras Ali Labs Enterprise Service Level Agreement (SLA)',
      category: 'POLICY',
      content: 'Ras Ali Labs guarantees 99.99% uptime for all Ralion OS instances. Support requests are categorized into Critical, High, and Standard priorities with response times under 15 minutes for Critical issues.',
      vectorIndexed: true,
      chunkCount: 1,
      createdAt: '2026-07-24T10:00:00Z'
    },
    {
      id: 'kb-2',
      orgId: 'ras-ali-labs',
      title: 'Ralion Health Clinical Assessment Protocol',
      category: 'SOP',
      content: 'All clinical patient intake forms must be processed within 24 hours of intake. Assessment summaries must record physical indicators, counseling progress notes, and emergency contact details.',
      vectorIndexed: true,
      chunkCount: 1,
      createdAt: '2026-07-22T14:30:00Z'
    },
    {
      id: 'kb-3',
      orgId: 'ras-ali-labs',
      title: 'Botswana Border Logistics & Customs Compliance Guide',
      category: 'MANUAL',
      content: 'Trucks crossing the Pioneer Border post require pre-stamped customs declarations, driver identification hash, and manifest verification. Any delay triggers an automated Customs Hold workflow alert.',
      vectorIndexed: true,
      chunkCount: 2,
      createdAt: '2026-07-20T09:15:00Z'
    }
  ];

  public getDocuments(orgId?: string): KnowledgeDocument[] {
    if (!orgId || orgId === 'unconfigured-tenant' || orgId === 'public-visitor') {
      return [];
    }
    return this.documents.filter(d => d.orgId === orgId);
  }

  public addDocument(doc: { orgId: string; title: string; category: KnowledgeDocument['category']; content: string }): KnowledgeDocument {
    const chunks = chunkText(doc.content);
    const created: KnowledgeDocument = {
      id: `kb-${Date.now()}`,
      orgId: doc.orgId,
      title: doc.title,
      category: doc.category,
      content: doc.content,
      chunkCount: Math.max(1, chunks.length),
      vectorIndexed: true,
      createdAt: new Date().toISOString()
    };
    this.documents.unshift(created);
    return created;
  }

  public searchKnowledgeBase(query: string, orgId?: string): string {
    if (!orgId || orgId === 'unconfigured-tenant' || orgId === 'public-visitor') {
      return "No matching organizational knowledge document found for your query.";
    }
    const targetDocs = this.documents.filter(d => d.orgId === orgId);
    if (targetDocs.length === 0) {
      return "No matching organizational knowledge document found for your query.";
    }
    const allChunks: TextChunk[] = [];
    targetDocs.forEach(doc => {
      const chunks = chunkText(doc.content);
      chunks.forEach((chunkTextStr, idx) => {
        allChunks.push({
          id: `${doc.id}-${idx}`,
          docId: doc.id,
          chunkIndex: idx,
          text: `[${doc.title}] ${chunkTextStr}`
        });
      });
    });

    const results = simulateVectorSearch(query, allChunks, 2);
    if (results.length === 0) {
      return "No matching organizational knowledge document found for your query.";
    }

    return results.map(r => r.text).join("\n\n");
  }
}

export const mariKnowledgeManager = new MariKnowledgeManager();
