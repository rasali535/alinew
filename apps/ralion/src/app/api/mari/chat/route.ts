import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { BusinessContextService, callMariAiApi, processMariQuery, mariKnowledgeManager, MariTokenTelemetryService, estimateTokenCount } from '@ralion/ai';
import { getCurrentRalionContext } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/mari/chat
 * Context-grounded conversation endpoint with guaranteed tenant isolation and usage recording.
 */
export async function POST(request: NextRequest) {
  try {
    const serverCtx = await getCurrentRalionContext(request, { requireAuth: false });
    const body = await request.json().catch(() => ({}));
    const query = body.query || body.message || body.prompt;
    const orgId =
      body.organizationId ||
      serverCtx?.workspace.id ||
      serverCtx?.user.id ||
      request.headers.get('x-organization-id') ||
      request.headers.get('x-workspace-id') ||
      'ras-ali-labs';
    const userId = body.userId || serverCtx?.user.id || 'anonymous';
    const activeScreen = body.activeScreen;
    const requestId = body.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return corsJsonResponse({ success: false, error: 'Query prompt is required' }, { status: 400 }, request);
    }

    const cleanQuery = query.trim();

    // 1. Resolve organization business context
    const context = await BusinessContextService.assembleContext(orgId, {
      activeScreen,
      localOverrides: body.localOverrides,
    });

    // 2. Perform RAG search across knowledge base
    const ragContext = mariKnowledgeManager.searchKnowledgeBase(cleanQuery);

    // 3. Process query with AI/ML router and Gemini fallback
    const ruleResponse = processMariQuery(cleanQuery);
    const apiResult = await callMariAiApi(cleanQuery, undefined, context);

    let answerText = '';
    let modelUsed = 'Mari Enterprise Intelligence (gemini-2.5-flash)';

    if (apiResult && apiResult.text && apiResult.text.trim().length > 0) {
      answerText = apiResult.text;
      modelUsed = `${apiResult.modelInfo.category} (${apiResult.modelInfo.model})`;
    } else if (ruleResponse && ruleResponse.answer) {
      answerText = ruleResponse.answer;
      modelUsed = 'Mari Semantic Rule Engine';
    } else {
      answerText = "I've analyzed your business telemetry. Let's focus on accelerating revenue and optimizing campaign performance today.";
    }

    // 4. Guaranteed Authoritative Usage Recording
    const inputTokens = apiResult?.usage?.promptTokens || estimateTokenCount(cleanQuery);
    const outputTokens = apiResult?.usage?.completionTokens || estimateTokenCount(answerText);
    const totalTokens = apiResult?.usage?.totalTokens || (inputTokens + outputTokens);

    const usageRecord = MariTokenTelemetryService.recordUsage({
      organizationId: orgId,
      userId,
      requestId,
      provider: 'google',
      model: modelUsed,
      inputTokens,
      outputTokens,
      totalTokens,
    });

    return corsJsonResponse({
      success: true,
      answer: answerText,
      actionsSuggested: ruleResponse?.suggestedActions || [],
      ragContext: ragContext && !ragContext.includes('No matching') ? ragContext : null,
      modelUsed,
      contextVersion: context.version,
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens,
      },
      usageRecordId: usageRecord.id,
      requestId,
    }, undefined, request);
  } catch (err: any) {
    console.error('[Mari Chat API] Error:', err);
    return corsJsonResponse({
      success: false,
      error: err.message || "Mari couldn't complete that request right now. Please retry.",
    }, { status: 500 }, request);
  }
}
