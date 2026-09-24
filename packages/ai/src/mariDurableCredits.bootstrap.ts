import 'server-only';

import {
  MariUniversalCore,
  MARI_BUILD_VERSION,
  isPureGreeting,
  type MariQueryRequest,
  type MariQueryResponse,
} from './mariUniversalCore';
import { CREDIT_COSTS, TenantCreditsService } from './tenantCredits.service';
import { DurableTenantCreditsService } from './durableTenantCredits.service';

const globalState = globalThis as unknown as {
  __ralionMariDurableCreditsPatched?: boolean;
  __ralionMariLegacyDebitSuppressed?: boolean;
};

function canonicalUuid(value?: string): string | null {
  const clean = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean) ? clean : null;
}

function insufficientCreditsResponse(request: MariQueryRequest, remainingCredits: number): MariQueryResponse {
  const requestId = request.requestId || `mari_credit_${Date.now()}`;
  return {
    answer: 'You have consumed your available Mari credits for this billing period. You can review usage or upgrade your plan in Billing & Subscriptions.\n\n[Upgrade Plan](/billing) [View Usage](/billing)',
    capabilityMode: 'BUSINESS',
    detectedIntent: 'INSUFFICIENT_CREDITS',
    semanticDecisionSource: 'DETERMINISTIC_CLASSIFICATION',
    requestedAction: 'NAVIGATE',
    requestedSources: ['BUSINESS_PROFILE'],
    toolsActuallyExecuted: ['DurableTenantCreditsService.reserveCredits'],
    modelAttempted: null,
    modelSucceeded: false,
    modelUsed: 'Ralion Durable Credit Gateway',
    classificationModelAttempted: null,
    classificationModelSucceeded: false,
    responseModelAttempted: null,
    responseModelSucceeded: false,
    actualModelUsed: null,
    modelsAttempted: [],
    modelFailureCodes: {},
    responseSource: 'local_grounded',
    fallbackUsed: true,
    fallbackReason: 'INSUFFICIENT_CREDITS',
    buildVersion: MARI_BUILD_VERSION,
    suggestedActions: [
      { type: 'NAVIGATE', label: 'Upgrade Subscription', payload: { route: '/billing' } },
      { type: 'NAVIGATE', label: 'View Usage', payload: { route: '/billing' } },
    ],
    ragContext: null,
    contextSources: ['DurableCreditLedger'],
    tenantId: String(request.organizationId || ''),
    companyName: String(request.companyName || ''),
    isBusinessContextVerified: false,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    requestId,
  };
}

if (!globalState.__ralionMariDurableCreditsPatched) {
  globalState.__ralionMariDurableCreditsPatched = true;

  // The legacy core still calls the synchronous in-memory debit after successful
  // Mari reasoning. Suppress only that MARI_CHAT debit; all other legacy callers
  // retain their current behavior until they are migrated independently.
  if (!globalState.__ralionMariLegacyDebitSuppressed) {
    globalState.__ralionMariLegacyDebitSuppressed = true;
    const originalDeductCredits = TenantCreditsService.deductCredits.bind(TenantCreditsService);
    TenantCreditsService.deductCredits = function durableMariDebitBridge(
      organizationId: string,
      amount: number,
      reason: string,
      options?: any
    ) {
      if (options && typeof options === 'object' && options.sourceFeature === 'MARI_CHAT') {
        return {
          success: true,
          balanceRemaining: Number.MAX_SAFE_INTEGER,
          transactionId: `durable-managed:${options.correlationId || 'mari'}`,
        };
      }
      return originalDeductCredits(organizationId, amount, reason, options);
    } as typeof TenantCreditsService.deductCredits;
  }

  const originalProcessQuery = MariUniversalCore.processQuery.bind(MariUniversalCore);

  MariUniversalCore.processQuery = async function durableCreditAwareProcessQuery(request: MariQueryRequest) {
    const organizationId = canonicalUuid(request.organizationId);
    const prompt = String(request.originalUserPrompt || request.prompt || '').trim();

    // Non-customer/dev contexts and pure greetings keep the zero-credit path.
    if (!organizationId || isPureGreeting(prompt)) {
      return originalProcessQuery(request);
    }

    const requestId = request.requestId || `mari_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const amount = CREDIT_COSTS.MARI_STRATEGY;

    const reservation = await DurableTenantCreditsService.reserveCredits({
      organizationId,
      userId: request.userId,
      correlationId: requestId,
      amount,
      sourceFeature: 'MARI_CHAT',
      provider: 'google',
      model: process.env.MARI_GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      reason: `Mari AI reasoning reservation: ${prompt.slice(0, 64)}`,
      metadata: { workspaceId: request.workspaceId || null },
    });

    if (!reservation.allowed) {
      return insufficientCreditsResponse({ ...request, requestId }, reservation.remainingCredits);
    }

    let result: MariQueryResponse;
    try {
      result = await originalProcessQuery({ ...request, requestId });
    } catch (error) {
      try {
        await DurableTenantCreditsService.finalizeCredits({
          organizationId,
          correlationId: requestId,
          success: false,
          metadata: { releaseReason: 'mari_exception' },
        });
      } catch (releaseError: any) {
        console.error('[MariDurableCredits] Failed to release exception reservation:', releaseError?.message);
      }
      throw error;
    }

    const chargeable = Boolean(
      result.modelSucceeded &&
      !result.fallbackUsed &&
      result.detectedIntent !== 'GREETING' &&
      result.detectedIntent !== 'CREATIVE_STUDIO' &&
      result.requestedAction !== 'GENERATE_CREATIVE_JOB'
    );

    try {
      const finalized = await DurableTenantCreditsService.finalizeCredits({
        organizationId,
        correlationId: requestId,
        success: chargeable,
        provider: result.responseSource === 'gemini' ? 'google' : result.responseSource,
        model: result.actualModelUsed || result.modelUsed,
        metadata: {
          detectedIntent: result.detectedIntent,
          capabilityMode: result.capabilityMode,
          responseSource: result.responseSource,
          fallbackUsed: result.fallbackUsed,
        },
      });

      result.contextSources = Array.from(new Set([
        ...(result.contextSources || []),
        chargeable && finalized.status === 'CHARGED' ? 'DurableCreditLedger' : 'DurableCreditReservationReleased',
      ]));
    } catch (finalizeError: any) {
      // The reservation remains held and is recovered by the database stale-
      // reservation guard if a transient DB failure prevents finalization.
      console.error('[MariDurableCredits] Credit finalization failed:', finalizeError?.message);
      result.contextSources = Array.from(new Set([...(result.contextSources || []), 'DurableCreditFinalizationPending']));
    }

    return result;
  };
}
