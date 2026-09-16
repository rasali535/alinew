import 'server-only';

import { randomUUID } from 'crypto';
import { BillingDatabaseService } from '@ralion/database';
import { DurableBillingDatabaseService } from '@ralion/database/server';
import { EntitlementService } from '@ralion/auth';
import { CreativeOrchestrator, type OrchestratorGenerateOptions } from './creativeOrchestrator.service';
import { CREDIT_COSTS, TenantCreditsService } from './tenantCredits.service';
import { DurableTenantCreditsService } from './durableTenantCredits.service';

const globalState = globalThis as unknown as {
  __ralionCreativeDurableCreditsPatched?: boolean;
  __ralionCreativeLegacyEconomicsSuppressed?: boolean;
};

const LEGACY_CREATIVE_REFUND_REASONS = new Set([
  'Refund for invalid prompt',
  'Refund for provider simulation failure',
  'Refund for empty response',
  'Refund for exhausted provider failover',
  'Refund for visual semantic relevance rejection',
  'Refund for storage failure',
]);

function canonicalUuid(value?: string): string | null {
  const clean = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean) ? clean : null;
}

function isLegacyCreativeDebit(reason: string): boolean {
  return /^Generate (Video Reel|Poster Image):/i.test(String(reason || ''));
}

if (!globalState.__ralionCreativeDurableCreditsPatched) {
  globalState.__ralionCreativeDurableCreditsPatched = true;

  // Keep the legacy orchestrator's control flow intact while removing its Map
  // as an economic authority. These exact reason strings are private to the
  // creative orchestrator. All unrelated legacy credit calls still delegate.
  if (!globalState.__ralionCreativeLegacyEconomicsSuppressed) {
    globalState.__ralionCreativeLegacyEconomicsSuppressed = true;

    const previousDeduct = TenantCreditsService.deductCredits.bind(TenantCreditsService);
    TenantCreditsService.deductCredits = function durableCreativeDebitBridge(
      organizationId: string,
      amount: number,
      reason: string,
      options?: any
    ) {
      if (isLegacyCreativeDebit(reason)) {
        return {
          success: true,
          balanceRemaining: Number.MAX_SAFE_INTEGER,
          transactionId: 'durable-creative-managed',
        };
      }
      return previousDeduct(organizationId, amount, reason, options);
    } as typeof TenantCreditsService.deductCredits;

    const previousAdd = TenantCreditsService.addCredits.bind(TenantCreditsService);
    TenantCreditsService.addCredits = function durableCreativeRefundBridge(
      organizationId: string,
      amount: number,
      reason: string,
      options?: any
    ) {
      if (LEGACY_CREATIVE_REFUND_REASONS.has(String(reason || ''))) {
        return {
          success: true,
          newBalance: Number.MAX_SAFE_INTEGER,
          transactionId: 'durable-creative-release-managed',
        };
      }
      return previousAdd(organizationId, amount, reason, options);
    } as typeof TenantCreditsService.addCredits;
  }

  const originalGenerate = CreativeOrchestrator.generate.bind(CreativeOrchestrator);

  CreativeOrchestrator.generate = async function durableCreativeGenerate(options: OrchestratorGenerateOptions) {
    const organizationId = canonicalUuid(options.organizationId);
    if (!organizationId) {
      // Preserve existing test/dev behavior for non-canonical fixture IDs. Live
      // authenticated Ralion organizations use UUIDs and take the durable path.
      return originalGenerate(options);
    }

    const prompt = String(options.prompt || '').trim();
    if (!prompt) {
      return originalGenerate(options);
    }

    // Synchronize the legacy synchronous entitlement cache from the durable DB
    // before the existing orchestrator performs its feature check. This cache is
    // compatibility-only; billing truth remains in Supabase.
    const durableSubscription = await DurableBillingDatabaseService.getSubscription(organizationId);
    BillingDatabaseService.saveSubscription(durableSubscription);

    const featureKey = options.type === 'VIDEO_REEL' ? 'cogvideoVideos' : 'fluxImages';
    const entitlement = EntitlementService.checkFeature(organizationId, featureKey);
    if (!entitlement.allowed) {
      return {
        success: false,
        status: 'FAILED' as const,
        userFacingMessage: entitlement.reason || `Your current subscription does not include ${options.type === 'VIDEO_REEL' ? 'video' : 'visual'} generation. Please upgrade your plan.`,
        errorDetails: {
          errorCode: 'ENTITLEMENT_REQUIRED',
          stage: 'ENTITLEMENT_CHECK',
          details: entitlement.reason,
        },
      };
    }

    const amount = options.type === 'VIDEO_REEL' ? CREDIT_COSTS.VIDEO_REEL : CREDIT_COSTS.POSTER_IMAGE;
    const correlationId = String((options as any).requestId || `creative:${randomUUID()}`);
    const sourceFeature = options.type === 'VIDEO_REEL' ? 'CREATIVE_VIDEO' : 'CREATIVE_IMAGE';

    const reservation = await DurableTenantCreditsService.reserveCredits({
      organizationId,
      userId: (options as any).userId,
      correlationId,
      amount,
      sourceFeature,
      provider: options.type === 'VIDEO_REEL' ? 'creative-video-router' : 'creative-image-router',
      reason: `Generate ${options.type === 'VIDEO_REEL' ? 'Video Reel' : 'Poster Image'}: ${prompt.slice(0, 64)}`,
      metadata: {
        workspaceId: options.workspaceId || null,
        format: options.format || null,
        campaign: options.campaign || null,
      },
    });

    if (!reservation.allowed) {
      return {
        success: false,
        status: 'FAILED' as const,
        userFacingMessage: `Insufficient credits. This creative requires ${amount} credits and ${reservation.remainingCredits} are currently available.`,
        errorDetails: {
          errorCode: 'INSUFFICIENT_CREDITS',
          stage: 'CREDIT_CHECK',
          requiredCredits: amount,
          remainingCredits: reservation.remainingCredits,
        },
      };
    }

    try {
      const result = await originalGenerate(options);
      const chargeable = Boolean(result.success && result.status === 'COMPLETED' && result.receipt?.assetId);

      const finalized = await DurableTenantCreditsService.finalizeCredits({
        organizationId,
        correlationId,
        success: chargeable,
        metadata: {
          assetId: result.receipt?.assetId || null,
          lifecycleState: result.status,
          releaseReason: chargeable ? null : result.errorDetails?.errorCode || 'creative_not_completed',
        },
      });

      if (result.receipt) {
        (result.receipt as any).creditTransaction = {
          correlationId,
          status: finalized.status,
          creditsDeducted: finalized.creditsDeducted,
          remainingCredits: finalized.remainingCredits,
        };
      }

      return result;
    } catch (error) {
      try {
        await DurableTenantCreditsService.finalizeCredits({
          organizationId,
          correlationId,
          success: false,
          metadata: { releaseReason: 'creative_exception' },
        });
      } catch (releaseError: any) {
        console.error('[CreativeDurableCredits] Failed to release reservation:', releaseError?.message);
      }
      throw error;
    }
  } as typeof CreativeOrchestrator.generate;
}
