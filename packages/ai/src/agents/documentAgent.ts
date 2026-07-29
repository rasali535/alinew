// =====================================================================
// Document Agent — Knowledge base search & document Q&A
// =====================================================================

import { callAimlApi, buildMariSystemPrompt } from '../aimlClient';
import { processMariQuery } from '../mariChat';

export interface DocumentContext {
  totalDocuments?: number;
  recentUploads?: string[];
  knowledgeContext?: string; // Pre-fetched relevant content from vector search
}

export async function runDocumentAgent(
  query: string,
  context: DocumentContext & { orgName?: string; userName?: string; userRole?: string }
): Promise<string> {
  const dataContext = `
Document Library Summary:
- Total documents stored: ${context.totalDocuments ?? 'N/A'}
- Recently uploaded: ${context.recentUploads?.join(', ') || 'None'}
${context.knowledgeContext ? `\nRelevant Knowledge Base Content:\n${context.knowledgeContext}` : ''}
  `.trim();

  const systemPrompt = buildMariSystemPrompt({
    orgName: context.orgName,
    userName: context.userName,
    userRole: context.userRole,
    dataContext,
  });

  const result = await callAimlApi([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query },
  ], { model: 'gemini/gemini-2.0-flash', maxTokens: 800 });

  if (result) return result;

  return processMariQuery(query, context).answer;
}
