import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { BusinessContextService, callMariAiApi, processMariQuery, mariKnowledgeManager } from '@ralion/ai';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/mari/chat
 * Context-grounded conversation endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const query = body.query || body.message || body.prompt;
    const orgId = body.organizationId || request.headers.get('x-organization-id') || request.headers.get('x-workspace-id') || 'org_demo';
    const activeScreen = body.activeScreen;

    if (!query || typeof query !== 'string') {
      return corsJsonResponse({ success: false, error: 'Query is required' }, { status: 400 }, request);
    }

    // 1. Resolve organization business context
    const context = await BusinessContextService.assembleContext(orgId, {
      activeScreen,
      localOverrides: body.localOverrides,
    });

    // 2. Perform RAG search across knowledge base
    const ragContext = mariKnowledgeManager.searchKnowledgeBase(query);

    // 3. Process query with AI/ML router and Gemini fallback
    const ruleResponse = processMariQuery(query);
    const apiResult = await callMariAiApi(query, undefined, context);

    let answerText = '';
    let modelUsed = 'Rule-based Semantic Engine';

    if (apiResult) {
      answerText = apiResult.text;
      modelUsed = `${apiResult.modelInfo.category} (${apiResult.modelInfo.model})`;
    } else {
      answerText = ruleResponse.answer;
    }

    return corsJsonResponse({
      success: true,
      answer: answerText,
      actionsSuggested: ruleResponse.suggestedActions,
      ragContext: ragContext.includes('No matching') ? null : ragContext,
      modelUsed,
      contextVersion: context.version,
      usage: apiResult?.usage || {
        promptTokens: Math.ceil((query.length + 40) / 4),
        completionTokens: Math.ceil(answerText.length / 4),
        totalTokens: Math.ceil((query.length + 40 + answerText.length) / 4),
      },
      tokens: apiResult?.tokens || apiResult?.usage || {
        promptTokens: Math.ceil((query.length + 40) / 4),
        completionTokens: Math.ceil(answerText.length / 4),
        totalTokens: Math.ceil((query.length + 40 + answerText.length) / 4),
      },
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({
      success: false,
      error: err.message || 'Failed to process chat query',
    }, { status: 500 }, request);
  }
}
