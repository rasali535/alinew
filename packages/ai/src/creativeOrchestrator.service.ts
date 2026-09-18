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
  FluxRealismImageProvider,
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
  getAppBasePath,
} from './creativeAsset.service';
import { TenantCreditsService, CREDIT_COSTS } from './tenantCredits.service';
import { EntitlementService } from '@ralion/auth';
import { VisualSemanticEvaluatorService } from './visualSemanticEvaluator.service';

export interface OrchestratorGenerateOptions {
  organizationId: string;
  workspaceId?: string;
  type: CreativeAssetType;
  prompt: string;
  title?: string;
  style?: string;
  format?: string;
  campaign?: string;
  platform?: string;
  cta?: string;
  caption?: string;
  mockFailure?: string;
}

export class CreativeOrchestrator {
  private static imageProviders: CreativeProvider[] = [
    new FluxImageProvider(),
    new FluxRealismImageProvider(),
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
          timeoutMs: type === 'VIDEO_REEL' ? 120000 : 30000,
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

    // ── STAGE 4: VISUAL SEMANTIC EVALUATION & BOUNDED REGENERATION ──────────
    let visualQAResult: any = null;
    let rawPublicUrl: string | undefined = undefined;
    let rawStoragePath: string | undefined = undefined;

    const tempAssetId = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const resolvedWorkspaceId = (options as any).workspaceId || organizationId;

    if (type === 'POSTER_IMAGE' && successfulResult) {
      // 1. Durably save raw, un-composed image binary
      try {
        const rawInfo = await CreativeAssetService.saveRawBinaryAsset({
          assetId: tempAssetId,
          organizationId,
          workspaceId: resolvedWorkspaceId,
          mimeType: successfulResult.mimeType,
          buffer: successfulResult.buffer,
        });
        rawPublicUrl = rawInfo.rawPublicUrl;
        rawStoragePath = rawInfo.rawStoragePath;
      } catch {}

      // 2. Perform Visual Semantic QA Inspection
      visualQAResult = await VisualSemanticEvaluatorService.evaluateVisual(
        successfulResult.buffer,
        successfulResult.mimeType,
        {
          userPrompt: prompt,
          format,
        }
      );

      // 3. Prompt-faithful semantic retries.
      // Generate multiple real candidates from the SAME user brief using different seeds.
      // Do not append machine-authored subjects/objects just to game the relevance score.
      const maxSemanticAttempts = 3;
      let semanticAttempts = 1;

      while (
        visualQAResult &&
        (
          visualQAResult.visualRelevanceScore < 80 ||
          visualQAResult.prohibitedBrandingDetected
        ) &&
        semanticAttempts < maxSemanticAttempts
      ) {
        semanticAttempts += 1;
        console.warn(
          `[CreativeOrchestrator] FAILED_VISUAL_QA (${visualQAResult.visualRelevanceScore}/100) — generating faithful candidate ${semanticAttempts}/${maxSemanticAttempts}...`
        );

        let improvedThisRound = false;

        for (const retryProvider of this.imageProviders) {
          try {
            const retryRes = await retryProvider.generate({
              type: 'POSTER_IMAGE',
              prompt: prompt.trim(),
              style,
              format,
              seed: Math.floor(Math.random() * 1_000_000),
              timeoutMs: 30000,
            });

            const retryVal = validateImageBuffer(retryRes.buffer);
            if (!retryVal.valid) continue;

            const retryQA = await VisualSemanticEvaluatorService.evaluateVisual(
              retryRes.buffer,
              retryRes.mimeType,
              { userPrompt: prompt, format }
            );

            const currentIsBranded = Boolean(visualQAResult.prohibitedBrandingDetected);
            const retryIsBranded = Boolean(retryQA.prohibitedBrandingDetected);
            const retryIsCleaner = currentIsBranded && !retryIsBranded;
            const retryScoresBetter =
              retryQA.visualRelevanceScore > visualQAResult.visualRelevanceScore;

            if (retryIsCleaner || (!retryIsBranded && retryScoresBetter)) {
              successfulResult = retryRes;
              visualQAResult = retryQA;
              improvedThisRound = true;

              // Keep the raw asset aligned with the best candidate only.
              try {
                const rawRetryInfo = await CreativeAssetService.saveRawBinaryAsset({
                  assetId: tempAssetId,
                  organizationId,
                  workspaceId: resolvedWorkspaceId,
                  mimeType: retryRes.mimeType,
                  buffer: retryRes.buffer,
                });
                rawPublicUrl = rawRetryInfo.rawPublicUrl;
                rawStoragePath = rawRetryInfo.rawStoragePath;
              } catch {}

              if (
                visualQAResult.visualRelevanceScore >= 80 &&
                !visualQAResult.prohibitedBrandingDetected
              ) break;
            }
          } catch (retryErr: any) {
            lastErrorMsg = retryErr?.message || lastErrorMsg;
          }
        }

        // A new seed can still produce a different candidate on the next attempt,
        // even when this round does not beat the current best result.
        if (!improvedThisRound && semanticAttempts >= maxSemanticAttempts) break;
      }

      // 4. Customer-ready visual gate.
      // Raw provider output must meet the semantic threshold AND contain no
      // provider watermark/URL/third-party branding. Ralion/customer branding
      // is applied later as a deterministic composition step.
      if (visualQAResult?.prohibitedBrandingDetected) {
        TenantCreditsService.addCredits(organizationId, creditCost, 'Refund for third-party branding rejection');
        return {
          success: false,
          status: 'FAILED',
          userFacingMessage: "I generated real variations, but the provider output contained third-party branding or a watermark, so I rejected it. Your creative credit was refunded.\n\n[Retry]",
          errorDetails: {
            errorCode: 'THIRD_PARTY_BRANDING_REJECTED',
            stage: 'SEMANTIC_VALIDATION',
            visualRelevanceScore: visualQAResult.visualRelevanceScore,
            attempts: semanticAttempts,
            detectedBranding: visualQAResult.detectedBranding,
            details: visualQAResult.providerFeedback,
          },
        };
      }

      if (visualQAResult && visualQAResult.visualRelevanceScore < 80) {
        TenantCreditsService.addCredits(organizationId, creditCost, 'Refund for visual semantic relevance rejection');
        return {
          success: false,
          status: 'FAILED',
          userFacingMessage: "I generated multiple real variations, but none matched your brief closely enough to be customer-ready, so I rejected them rather than show you a generic image. Your creative credit was refunded.\n\n[Retry] [Edit Brief]",
          errorDetails: {
            errorCode: 'SEMANTIC_RELEVANCE_REJECTED',
            stage: 'SEMANTIC_VALIDATION',
            visualRelevanceScore: visualQAResult.visualRelevanceScore,
            attempts: semanticAttempts,
            missingRequiredObjects: visualQAResult.missingRequiredObjects,
            details: visualQAResult.providerFeedback,
          },
        };
      }
    }

    // ── STAGE 5: STORING DURABLE ASSET ──────────────────────────────────────
    const assetTitle =
      title || (prompt.length > 36 ? prompt.substring(0, 36).trim() + '...' : prompt.trim());

    const resolvedModel = type === 'VIDEO_REEL'
      ? 'zai-org/CogVideoX-2b'
      : successfulResult.providerName.includes('dev-realism')
        ? 'black-forest-labs/FLUX.1-dev-realism'
        : successfulResult.providerName.includes('resilient')
          ? 'pollinations/flux-resilient'
          : 'black-forest-labs/FLUX.1-schnell';

    const workspaceId = resolvedWorkspaceId;
    const hasVisualQA = Boolean(visualQAResult && typeof visualQAResult.visualRelevanceScore === 'number');
    const semanticScore = hasVisualQA ? visualQAResult?.visualRelevanceScore : undefined;
    const designScore = hasVisualQA ? visualQAResult?.designQualityScore : undefined;
    const promptIntegrityScore = hasVisualQA ? visualQAResult?.promptIntegrityScore : undefined;
    const brandAccuracyScore = hasVisualQA ? visualQAResult?.brandAccuracyScore : undefined;
    const copyAccuracyScore = hasVisualQA ? visualQAResult?.copyAccuracyScore : undefined;
    const customerReady = hasVisualQA ? Boolean(visualQAResult?.customerReady) : false;

    const asset = await CreativeAssetService.saveBinaryAsset({
      organizationId,
      workspaceId,
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
        model: resolvedModel,
        durationSeconds: successfulResult.durationSeconds,
        byteLength: successfulResult.buffer.byteLength,
        rawPublicUrl,
        rawStoragePath,
        rawProviderAsset: rawPublicUrl,
        finalComposedAsset: `${getAppBasePath()}/api/creatives/file/${tempAssetId}.${successfulResult.mimeType.includes('png') ? 'png' : successfulResult.mimeType.includes('svg') ? 'svg' : 'jpg'}`,
        provider: successfulResult.providerName,
        semanticScore,
        designScore,
        promptIntegrityScore,
        brandAccuracyScore,
        copyAccuracyScore,
        customerReady,
        visualRelevanceScore: semanticScore,
        designQualityScore: designScore,
        promptStructureScore: visualQAResult?.promptStructureScore,
        visualQADetails: visualQAResult,
      },
    });

    // Storage integrity gate: if storage write failed, never return a completed asset
    if (asset.status === 'FAILED') {
      TenantCreditsService.addCredits(organizationId, creditCost, 'Refund for storage failure');
      return {
        success: false,
        status: 'FAILED',
        userFacingMessage: "I created the creative, but I couldn't safely save it. Nothing has been published.",
        errorDetails: {
          errorCode: 'FAILED_STORAGE',
          stage: 'DURABLE_STORAGE',
          details: asset.errorDetails || 'Binary storage write failed or file existence verification failed.',
        },
      };
    }

    // ── STAGE 6: COMPLETED (CONTRACTS & MARI RECEIPT) ───────────────────────
    const dynamicCaption = (options as any).caption || `${asset.title}\n\n${prompt.trim()}`;
    const socialContract: SocialHandoffContract = {
      assetId: asset.id,
      organizationId: asset.organizationId || organizationId,
      workspaceId: asset.workspaceId || options.workspaceId || organizationId,
      mediaUrl: asset.publicUrl,
      mediaType: type === 'VIDEO_REEL' ? 'video' : 'image',
      title: asset.title,
      caption: dynamicCaption,
      campaign,
      platform,
      cta,
    };

    const mediaDescriptor = type === 'VIDEO_REEL' ? 'commercial Reel' : 'commercial poster visual';
    const naturalMariResponse =
      `Done. I've created the ${mediaDescriptor} based on the growth strategy we discussed.\n\n` +
      `It's ready in Growth Studio.\n\n` +
      `[Preview ${type === 'VIDEO_REEL' ? 'Reel' : 'Visual'}] | [Edit] | [Use in Social] | [Schedule Post]`;

    const deliveryEndpoint = `${getAppBasePath()}/api/creatives/${asset.id}/delivery`;

    const receipt: MariCreativeReceipt & {
      id: string;
      publicUrl: string;
      rawMediaUrl?: string;
      rawPublicUrl?: string;
      storagePath?: string;
      mimeType: string;
      sha256?: string;
      deliveryEndpoint: string;
      visualRelevanceScore?: number;
      designQualityScore?: number;
      promptStructureScore?: number;
      rawProviderAsset?: string;
      finalComposedAsset?: string;
      provider?: string;
      model?: string;
      semanticScore?: number;
      designScore?: number;
      promptIntegrityScore?: number;
      brandAccuracyScore?: number;
      copyAccuracyScore?: number;
      customerReady?: boolean;
      organizationId?: string;
      workspaceId?: string;
      visualQADetails?: any;
    } = {
      id: asset.id,
      assetId: asset.id,
      assetType: type,
      mediaUrl: asset.publicUrl,
      publicUrl: asset.publicUrl,
      deliveryEndpoint,
      rawMediaUrl: rawPublicUrl || asset.publicUrl,
      rawPublicUrl: rawPublicUrl || asset.publicUrl,
      rawProviderAsset: rawPublicUrl || asset.publicUrl,
      finalComposedAsset: asset.publicUrl,
      provider: successfulResult.providerName,
      model: resolvedModel,
      semanticScore,
      designScore,
      promptIntegrityScore,
      brandAccuracyScore,
      copyAccuracyScore,
      customerReady,
      organizationId,
      workspaceId,
      thumbnailUrl: asset.previewUrl || asset.publicUrl,
      storagePath: asset.storagePath,
      mimeType: asset.mimeType,
      sha256: asset.sha256,
      title: asset.title,
      prompt: asset.prompt,
      status: 'COMPLETED',
      providerStatus: 'COMPLETED',
      generationTime: successfulResult.generationTimeMs,
      validationStatus: 'PASSED',
      lifecycleState: 'COMPLETED',
      visualRelevanceScore: semanticScore,
      designQualityScore: designScore,
      promptStructureScore: visualQAResult?.promptStructureScore,
      visualQADetails: visualQAResult,
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
