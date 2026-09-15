import 'server-only';

import {
  MariUniversalCore as BaseMariUniversalCore,
  MARI_BUILD_VERSION,
  classifyCapabilityMode,
  type MariQueryRequest,
  type MariQueryResponse,
} from './mariUniversalCore';
import { MariCreditGateway, type MariCreditReservation } from './mariCreditGateway.service';
import { TenantCreditsService } from './tenantCredits.service';

function isChargeableReasoningRequest(request: MariQueryRequest): boolean {
  if (request.forceLocalOnly) return false;
  const prompt = (request.originalUserPrompt || request.prompt || '').trim();
  if (!prompt) return false;

  const preview = classifyCapabilityMode(prompt);
  if (preview.intent === 'GREETING' || preview.intent === 'FACEBOOK_CONNECTION_STATUS') return false;
  if (preview.mode === 'ACTION') return false;
  return true;
}

/**
 * Removes presentation artifacts sometimes exposed when rich Mari DOM is copied
 * back into plain text, while preserving ordinary Markdown semantics.
 */
export function sanitizeMariAnswerArtifacts(raw: string): string {
  if (!raw) return '';

  let text = raw
    .replace(/\\([*_#\[\]()~`])/g, '$1')
    .replace(/^(\s*#{1,6}\s+)svg\s*(\d+)\.?\s*/gim, '$1$2. ')
    .replace(/^(\s*#{1,6}\s+)svg(?=\S)/gim, '$1')
    .replace(/^\s*[-*]\s+\*\*•\*\*\s*$/gm, '')
    .replace(/^\s*[-*]\s+\*\*•\*\*\s*/gm, '- ')
    .replace(/^\s*[-*]\s+•\s*/gm, '- ')
    .replace(/^\s*•\s*/gm, '- ')
    .replace(/^-\s+([^*\n]+?)\*\*:\s*/gm, '- **$1**: ')
    .replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

function buildCreditExhaustedResponse(request: MariQueryRequest, remainingCredits = 0): MariQueryResponse {
  const prompt = (request.originalUserPrompt || request.prompt || '').trim();
  const preview = classifyCapabilityMode(prompt);
  const requestId = request.requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const orgId = request.organizationId || 'unconfigured-tenant';

  return {
    answer: `You have used your available Mari AI reasoning credits for this billing period. Deterministic business intelligence remains available, but generative reasoning requires additional credits or a plan upgrade.\n\nRemaining credits: ${remainingCredits}.`,
    capabilityMode: preview.mode,
    detectedIntent: 'INSUFFICIENT_CREDITS',
    semanticDecisionSource: 'DETERMINISTIC_CLASSIFICATION',
    requestedAction: 'NAVIGATE',
    requestedSources: [preview.requestedSource || 'BUSINESS_PROFILE'],
    toolsActuallyExecuted: [],
    modelAttempted: null,
    modelSucceeded: false,
    modelUsed: 'Ralion Credit Gateway',
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
      { type: 'NAVIGATE', label: 'View Usage', payload: { route: '/billing' } },
      { type: 'NAVIGATE', label: 'Upgrade Subscription', payload: { route: '/billing' } },
    ],
    ragContext: null,
    contextSources: ['RalionCreditGateway'],
    tenantId: orgId,
    companyName: request.companyName || '',
    isBusinessContextVerified: Boolean(request.companyName),
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    requestId,
  };
}

function syncLocalCreditMirror(reservation: MariCreditReservation, organizationId: string): void {
  try {
    // The legacy in-process wallet remains only as a compatibility mirror for
    // older creative/core code. The durable Supabase reservation is authoritative.
    const local = TenantCreditsService.getOrCreateWallet(organizationId, reservation.plan.planId);
    const durableBeforeCharge = reservation.remainingCredits + reservation.amount;
    if (local.totalBalance < durableBeforeCharge) {
      TenantCreditsService.addCredits(
        organizationId,
        durableBeforeCharge - local.totalBalance,
        'Runtime mirror of durable tenant credit wallet',
        { isBonus: true, sourceFeature: 'SYSTEM' }
      );
    }
  } catch (error: any) {
    console.warn('[MariProductionCore] Local credit mirror notice:', error?.message || error);
  }
}

export class MariProductionCore {
  static async processQuery(request: MariQueryRequest): Promise<MariQueryResponse> {
    const orgId = request.organizationId || '';
    const requestId = request.requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const effectiveRequest: MariQueryRequest = { ...request, requestId };
    const shouldCharge = Boolean(orgId && orgId !== 'unconfigured-tenant' && isChargeableReasoningRequest(effectiveRequest));

    let reservation: MariCreditReservation | null = null;

    if (shouldCharge) {
      reservation = await MariCreditGateway.reserveMariReasoning({
        organizationId: orgId,
        userId: request.userId,
        requestId,
        amount: 1,
        reason: `Mari AI reasoning: ${(request.originalUserPrompt || request.prompt || '').trim().slice(0, 80)}`,
      });

      if (!reservation.allowed) {
        return buildCreditExhaustedResponse(effectiveRequest, reservation.remainingCredits);
      }

      syncLocalCreditMirror(reservation, orgId);
    }

    try {
      const result = await BaseMariUniversalCore.processQuery(effectiveRequest);
      const cleanResult: MariQueryResponse = {
        ...result,
        answer: sanitizeMariAnswerArtifacts(result.answer),
      };

      if (reservation) {
        const successfulPaidReasoning = Boolean(
          result.modelSucceeded &&
          result.responseModelSucceeded &&
          result.responseSource === 'gemini' &&
          !result.fallbackUsed
        );

        try {
          await MariCreditGateway.finalizeMariReasoning({
            organizationId: orgId,
            correlationId: reservation.correlationId,
            success: successfulPaidReasoning,
            model: result.actualModelUsed || result.modelUsed || null,
            metadata: {
              requestId,
              detectedIntent: result.detectedIntent,
              responseSource: result.responseSource,
              modelSucceeded: result.modelSucceeded,
            },
          });
        } catch (error: any) {
          console.error('[MariProductionCore] Durable credit finalization failed:', error?.message || error);
        }
      }

      return cleanResult;
    } catch (error) {
      if (reservation) {
        try {
          await MariCreditGateway.finalizeMariReasoning({
            organizationId: orgId,
            correlationId: reservation.correlationId,
            success: false,
            metadata: { requestId, reason: 'MARI_REQUEST_EXCEPTION' },
          });
        } catch (finalizeError: any) {
          console.error('[MariProductionCore] Credit release after exception failed:', finalizeError?.message || finalizeError);
        }
      }
      throw error;
    }
  }

  static async ask(params: {
    prompt: string;
    tenantId?: string;
    organizationId?: string;
    workspaceId?: string;
    userId?: string;
    companyName?: string;
    activeScreen?: any;
    conversationHistory?: any[];
    localOverrides?: any;
    requestId?: string;
    forceLocalOnly?: boolean;
  }): Promise<MariQueryResponse> {
    return this.processQuery({
      prompt: params.prompt,
      organizationId: params.organizationId || params.tenantId,
      workspaceId: params.workspaceId,
      userId: params.userId,
      companyName: params.companyName,
      activeScreen: params.activeScreen,
      conversationHistory: params.conversationHistory,
      localOverrides: params.localOverrides,
      requestId: params.requestId,
      forceLocalOnly: params.forceLocalOnly,
    });
  }
}

export const processMariQuery = MariProductionCore.processQuery.bind(MariProductionCore);
