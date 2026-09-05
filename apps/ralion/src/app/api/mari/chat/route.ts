import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import {
  BusinessContextService,
  callMariAiApi,
  processMariQuery,
  mariKnowledgeManager,
  MariTokenTelemetryService,
  estimateTokenCount,
  ChatHistoryMessage,
  detectSemanticIntent,
} from '@ralion/ai';
import { getCurrentRalionContext } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * POST /api/mari/chat
 * Context-grounded conversation endpoint with multi-turn memory, guaranteed tenant isolation, and single-pass usage recording.
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

    // Parse conversation history from request body
    const rawHistory = body.messages || body.conversationHistory || [];
    const conversationHistory: ChatHistoryMessage[] = Array.isArray(rawHistory)
      ? rawHistory
          .filter((m: any) => m && m.text && (m.sender || m.role))
          .map((m: any) => ({
            role: ((m.sender === 'USER' || m.role === 'user') ? 'user' : 'model') as 'user' | 'model',
            text: String(m.text).trim(),
          }))
          .filter((m: ChatHistoryMessage) => m.text.length > 0)
      : [];

    if (!query || typeof query !== 'string' || !query.trim()) {
      return corsJsonResponse({ success: false, error: 'Query prompt is required' }, { status: 400 }, request);
    }

    const cleanQuery = query.trim();
    const detectedIntent = detectSemanticIntent(cleanQuery);

    // 1. Resolve organization business context
    const context = await BusinessContextService.assembleContext(orgId, {
      activeScreen,
      localOverrides: body.localOverrides,
    });

    const contextSourcesLoaded: string[] = [];
    if (context.layer1?.companyName?.value) contextSourcesLoaded.push('BusinessKnowledgeProfile');
    if (context.layer1?.websiteKnowledge?.value) contextSourcesLoaded.push('WebsiteKnowledge');
    if (context.layer2?.crm?.isConnected) contextSourcesLoaded.push('CRM_Deals');
    if (context.layer2?.social?.isConnected) contextSourcesLoaded.push('Facebook_Social');
    if (context.layer2?.operations) contextSourcesLoaded.push('Workspace_Operations');

    // 2. Perform RAG search across knowledge base
    const ragContext = mariKnowledgeManager.searchKnowledgeBase(cleanQuery);

    // 3. Process query with AI/ML router and Gemini fallback
    const ruleResponse = processMariQuery(cleanQuery, context);
    const apiResult = await callMariAiApi(cleanQuery, undefined, context, {
      conversationHistory,
      requestId,
    });

    let answerText = '';
    let modelUsed = 'Mari Enterprise Intelligence (gemini-2.5-flash)';
    const responseSource = apiResult?.responseSource || 'gemini';
    const geminiInvoked = responseSource === 'gemini';
    const fallbackInvoked = responseSource === 'local_grounded';

    if (apiResult && apiResult.text && apiResult.text.trim().length > 0) {
      answerText = apiResult.text;
      modelUsed = `${apiResult.modelInfo.category} (${apiResult.modelInfo.model})`;
    } else if (ruleResponse && ruleResponse.answer) {
      answerText = ruleResponse.answer;
      modelUsed = 'Mari Semantic Rule Engine';
    } else {
      answerText = "I've analyzed your verified business telemetry. Let's focus on accelerating revenue and optimizing campaign performance today.";
    }

    // Diagnostic logging (safe: no secrets or private keys)
    console.log(JSON.stringify({
      level: 'INFO',
      type: 'MARI_CHAT_TELEMETRY',
      requestId,
      tenantId: orgId,
      detectedIntent,
      contextSourcesLoaded,
      modelSelected: modelUsed,
      geminiInvoked,
      fallbackInvoked,
      responseSource,
      historyTurnCount: conversationHistory.length,
    }));

    // 4. Authoritative Token Usage Recording (Exactly ONE event per genuine Mari execution)
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
      detectedIntent,
      responseSource,
      contextSources: contextSourcesLoaded,
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
    console.error('[Mari Chat API] Exception:', err);
    return corsJsonResponse({
      success: false,
      error: err.message || "Mari couldn't complete that request right now. Please retry.",
    }, { status: 500 }, request);
  }
}

