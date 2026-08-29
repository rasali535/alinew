import {
  CreativeAssetType,
  CreativeProvider,
  CreativeProviderRequest,
  CreativeLifecycleState,
  MariCreativeReceipt,
  MariLearningLoopRecord,
  SocialHandoffContract,
} from './creativeProvider.interface';
import {
  FluxImageProvider,
  TurboImageProvider,
  ResilientImageProvider,
  SyntheticStudioImageProvider,
  CogVideoXProvider,
  FallbackVideoProvider,
  SyntheticMotionVideoProvider,
} from './creativeProviders';
import {
  CreativeAssetService,
  validateImageBuffer,
  validateVideoBuffer,
} from './creativeAsset.service';
import { TenantCreditsService, CREDIT_COSTS } from './tenantCredits.service';
import { EntitlementService } from '@ralion/auth';

export interface OrchestratorGenerateOptions {
  organizationId: string;
  type: CreativeAssetType;
  prompt: string;
  title?: string;
  style?: string;
  format?: string;
  campaign?: string;
  platform?: string;
  cta?: string;
  mockFailure?: string;
}

export class CreativeOrchestrator {
  private static imageProviders: CreativeProvider[] = [
    new FluxImageProvider(),
    new TurboImageProvider(),
    new ResilientImageProvider(),
    new SyntheticStudioImageProvider(),
  ];

  private static videoProviders: CreativeProvider[] = [
    new CogVideoXProvider(),
    new FallbackVideoProvider(),
    new SyntheticMotionVideoProvider(),
  ];

  private static learningRecords: MariLearningLoopRecord[] = [];

  /**
   * Orchestrates the complete generation lifecycle:
   * ENTITLEMENT_CHECK -> CREDIT_CHECK -> QUEUED -> GENERATING (Router Failover) -> VALIDATING -> STORING -> COMPLETED
   */
  static async generate(options: OrchestratorGenerateOptions): Promise<{
    success: boolean;
    status: CreativeLifecycleState;
    receipt?: MariCreativeReceipt;
    userFacingMessage: string;
    errorDetails?: any;
  }> {
    const {
      organizationId,
      type,
      prompt,
      title,
      style = 'Corporate Executive',
      format = type === 'VIDEO_REEL' ? '16:9' : '1:1',
      campaign = 'Enterprise Growth',
      platform = 'facebook',
      cta = 'Learn More',
      mockFailure,
    } = options;

    if (!organizationId) {
      return {
        success: false,
        status: 'FAILED',
        userFacingMessage: 'Organization context is required for creative generation.',
        errorDetails: { errorCode: 'UNAUTHENTICATED_TENANT', stage: 'TENANT_CHECK' },
      };
    }

    // ── STAGE 0: PLAN ENTITLEMENT VERIFICATION ──────────────────────────────
    const featureKey = type === 'VIDEO_REEL' ? 'cogvideoVideos' : 'fluxImages';
    const entitlement = EntitlementService.checkFeature(organizationId, featureKey);
    if (!entitlement.allowed) {
      return {
        success: false,
        status: 'FAILED',
        userFacingMessage: entitlement.reason || `Your current subscription does not include ${type === 'VIDEO_REEL' ? 'video' : 'visual'} generation. Please upgrade your plan.`,
        errorDetails: { errorCode: 'ENTITLEMENT_REQUIRED', stage: 'ENTITLEMENT_CHECK', details: entitlement.reason },
      };
    }

    // ── STAGE 0.5: TENANT CREDIT VERIFICATION & DEDUCTION ───────────────────
    const creditCost = type === 'VIDEO_REEL' ? CREDIT_COSTS.VIDEO_REEL : CREDIT_COSTS.POSTER_IMAGE;
    try {
      TenantCreditsService.deductCredits(
        organizationId,
        creditCost,
        `Generate ${type === 'VIDEO_REEL' ? 'Video Reel' : 'Poster Image'}: ${prompt.substring(0, 30)}...`
      );
    } catch (creditErr: any) {
      return {
        success: false,
        status: 'FAILED',
        userFacingMessage: creditErr.message || 'Insufficient credits to generate this creative.',
        errorDetails: { errorCode: 'INSUFFICIENT_CREDITS', stage: 'CREDIT_CHECK', details: creditErr.message },
      };
    }

    // ── STAGE 1: PROMPT VALIDATION ──────────────────────────────────────────
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      TenantCreditsService.addCredits(organizationId, creditCost, 'Refund for invalid prompt');
      return {
        success: false,
        status: 'FAILED',
        userFacingMessage: 'Please enter a valid creative brief or topic to generate your asset.',
        errorDetails: { errorCode: 'INVALID_PROMPT', stage: 'PROMPT_VALIDATION' },
      };
    }

    // ── NEGATIVE TEST SIMULATION HOOKS ──────────────────────────────────────
    if (mockFailure === 'JSON_ERROR_PAYLOAD') {
      TenantCreditsService.addCredits(organizationId, creditCost, 'Refund for provider simulation failure');
      return {
        success: false,
        status: 'FAILED',
        userFacingMessage: "The image provider returned an incomplete result. Mari couldn't safely save the creative. Please try again.",
        errorDetails: { errorCode: 'PROVIDER_ERROR', stage: 'BINARY_VALIDATION' },
      };
    }
    if (mockFailure === 'EMPTY_BODY') {
      TenantCreditsService.addCredits(organizationId, creditCost, 'Refund for empty response');
      return {
        success: false,
        status: 'FAILED',
        userFacingMessage: 'The creative service returned an empty file. No incomplete creative was saved.',
        errorDetails: { errorCode: 'EMPTY_MEDIA_RESPONSE', stage: 'MEDIA_RETRIEVAL' },
      };
    }

    const providers = type === 'VIDEO_REEL' ? this.videoProviders : this.imageProviders;
    let successfulResult: {
      buffer: Buffer;
      mimeType: string;
      providerName: string;
      durationSeconds?: number;
      generationTimeMs: number;
    } | null = null;

    let lastErrorMsg = '';

    // ── STAGE 2: GENERATING (ROUTER FAILOVER) ────────────────────────────────
    for (const provider of providers) {
      try {
        const req: CreativeProviderRequest = {
          type,
          prompt: prompt.trim(),
          style,
          format,
        };
        const result = await provider.generate(req);

        // ── STAGE 3: SEMANTIC BINARY VALIDATION ─────────────────────────────
        if (type === 'POSTER_IMAGE') {
          const val = validateImageBuffer(result.buffer);
          if (!val.valid) {
            lastErrorMsg = val.error || 'Invalid image buffer';
            continue; // Attempt next provider
          }
        } else {
          const val = validateVideoBuffer(result.buffer);
          if (!val.valid) {
            lastErrorMsg = val.error || 'Invalid video container';
            continue; // Attempt next provider
          }
        }

        successfulResult = result;
        break; // Successfully generated and validated!
      } catch (err: any) {
        lastErrorMsg = err?.message || 'Provider connection timeout';
        // Transparently try next provider
      }
    }

    if (!successfulResult) {
      TenantCreditsService.addCredits(organizationId, creditCost, 'Refund for exhausted provider failover');
      const userMessage =
        type === 'POSTER_IMAGE'
          ? "I couldn't complete the creative this time. I haven't marked anything as generated. [Retry] [Try Another Format]"
          : "I couldn't complete the commercial video this time. I haven't marked anything as generated. [Retry] [Try Another Format]";

      return {
        success: false,
        status: 'FAILED',
        userFacingMessage: userMessage,
        errorDetails: {
          errorCode: 'PROVIDER_FAILOVER_EXHAUSTED',
          errorMessage: lastErrorMsg,
          stage: 'BINARY_VALIDATION',
        },
      };
    }

    // ── STAGE 4: STORING DURABLE ASSET ──────────────────────────────────────
    const assetTitle =
      title || (prompt.length > 36 ? prompt.substring(0, 36).trim() + '...' : prompt.trim());

    const asset = await CreativeAssetService.saveBinaryAsset({
      organizationId,
      type,
      provider: successfulResult.providerName,
      prompt: prompt.trim(),
      title: assetTitle,
      mimeType: successfulResult.mimeType,
      buffer: successfulResult.buffer,
      metadata: {
        style,
        format,
        generator: successfulResult.providerName,
        durationSeconds: successfulResult.durationSeconds,
        byteLength: successfulResult.buffer.byteLength,
      },
    });

    // ── STAGE 5: COMPLETED (CONTRACTS & MARI RECEIPT) ───────────────────────
    const socialContract: SocialHandoffContract = {
      assetId: asset.id,
      mediaUrl: asset.publicUrl,
      mediaType: type === 'VIDEO_REEL' ? 'video' : 'image',
      title: asset.title,
      caption: `${asset.title}\n\nTargeting enterprise decision makers across SADC. #Enterprise #Technology #SovereignSoftware`,
      campaign,
      platform,
      cta,
    };

    const mediaDescriptor = type === 'VIDEO_REEL' ? 'commercial Reel' : 'commercial poster visual';
    const naturalMariResponse =
      `Done. I've created the ${mediaDescriptor} based on the growth strategy we discussed.\n\n` +
      `It's ready in Growth Studio.\n\n` +
      `[Preview ${type === 'VIDEO_REEL' ? 'Reel' : 'Visual'}] | [Edit] | [Use in Social] | [Schedule Post]`;

    const receipt: MariCreativeReceipt & { id: string; publicUrl: string; storagePath?: string; mimeType: string } = {
      id: asset.id,
      assetId: asset.id,
      assetType: type,
      mediaUrl: asset.publicUrl,
      publicUrl: asset.publicUrl,
      thumbnailUrl: asset.previewUrl || asset.publicUrl,
      storagePath: asset.storagePath,
      mimeType: asset.mimeType,
      title: asset.title,
      prompt: asset.prompt,
      providerStatus: 'COMPLETED',
      generationTime: successfulResult.generationTimeMs,
      validationStatus: 'PASSED',
      lifecycleState: 'COMPLETED',
      mariResponse: naturalMariResponse,
      socialContract,
    };

    return {
      success: true,
      status: 'COMPLETED',
      receipt,
      userFacingMessage: naturalMariResponse,
    };
  }

  /**
   * Records closed-loop publication & feedback to Mari memory
   */
  static recordSocialFeedback(record: MariLearningLoopRecord): void {
    this.learningRecords.unshift(record);
    if (this.learningRecords.length > 50) {
      this.learningRecords.pop();
    }
  }

  static getLearningHistory(organizationId?: string): MariLearningLoopRecord[] {
    if (!organizationId) return this.learningRecords;
    return this.learningRecords.filter(r => r.organizationId === organizationId);
  }
}
