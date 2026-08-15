/**
 * Ralion Unified Social Media Architecture — Content Validation Engine
 * Ras Ali Labs (Pty) Ltd
 * Pre-publishing validation of character limits, video lengths, media sizes, and platform capabilities.
 */

import { SocialPlatformType, SocialProviderRegistry } from '@ralion/integrations';

export interface ValidationIssue {
  platform: SocialPlatformType;
  field: 'body' | 'media' | 'capability' | 'schedule';
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export class SocialContentValidator {
  // Platform text length constraints
  private static readonly MAX_LENGTHS: Record<SocialPlatformType, number> = {
    x: 280,
    instagram: 2200,
    tiktok: 2200,
    linkedin: 3000,
    facebook: 63206,
    whatsapp: 4096,
  };

  /**
   * Validate content against all selected platforms before submission
   */
  static validate(params: {
    platforms: SocialPlatformType[];
    body: string;
    mediaUrls?: string[];
    mediaTypes?: string[];
    scheduledFor?: Date;
  }): ValidationResult {
    const issues: ValidationIssue[] = [];

    for (const platform of params.platforms) {
      const adapter = SocialProviderRegistry.getProvider(platform);
      const caps = adapter.getCapabilities();

      // 1. Text Length Validation
      const maxLength = this.MAX_LENGTHS[platform] || 2000;
      if (params.body.length > maxLength) {
        issues.push({
          platform,
          field: 'body',
          message: `Content exceeds ${adapter.displayName} limit of ${maxLength} characters (currently ${params.body.length}).`,
          severity: 'ERROR',
        });
      }

      if (params.body.trim().length === 0) {
        issues.push({
          platform,
          field: 'body',
          message: `Post text cannot be empty for ${adapter.displayName}.`,
          severity: 'ERROR',
        });
      }

      // 2. Media Requirements Validation
      const hasMedia = (params.mediaUrls && params.mediaUrls.length > 0);
      const isVideo = params.mediaTypes?.some(t => t.startsWith('video/'));

      if (platform === 'instagram' && !hasMedia) {
        issues.push({
          platform,
          field: 'media',
          message: 'Instagram requires at least one image or video attachment.',
          severity: 'ERROR',
        });
      }

      if (platform === 'tiktok' && (!hasMedia || !isVideo)) {
        issues.push({
          platform,
          field: 'media',
          message: 'TikTok requires a video file attachment to publish.',
          severity: 'ERROR',
        });
      }

      // 3. Platform Capability Verification
      if (!caps.canPublish) {
        issues.push({
          platform,
          field: 'capability',
          message: `${adapter.displayName} does not support public feed publishing via connected API (e.g. messaging only).`,
          severity: 'ERROR',
        });
      }

      // 4. Scheduling Time Validation
      if (params.scheduledFor) {
        if (!caps.canSchedule) {
          issues.push({
            platform,
            field: 'schedule',
            message: `Automated scheduling is not supported for ${adapter.displayName}.`,
            severity: 'WARNING',
          });
        }
        if (params.scheduledFor.getTime() <= Date.now() + 60000) {
          issues.push({
            platform,
            field: 'schedule',
            message: 'Scheduled date and time must be at least 1 minute in the future.',
            severity: 'ERROR',
          });
        }
      }
    }

    const hasErrors = issues.some(i => i.severity === 'ERROR');
    return {
      valid: !hasErrors,
      issues,
    };
  }
}
