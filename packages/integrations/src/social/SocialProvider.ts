/**
 * Ralion Unified Social Media Architecture — Base SocialProvider Interface
 * Ras Ali Labs (Pty) Ltd
 */

import {
  SocialPlatformType,
  SocialCapabilities,
  SocialProfile,
  SocialAuthResult,
  PublishContentParams,
  PublishResponse,
  SocialAnalyticsResult,
  SocialMessagePayload,
  SocialMessageResult,
  ConnectionHealthResult
} from './types';

export abstract class SocialProvider {
  abstract readonly platform: SocialPlatformType;
  abstract readonly displayName: string;
  abstract readonly defaultScopes: string[];

  /**
   * Get the static and dynamic capabilities of this provider based on authorized scopes
   */
  abstract getCapabilities(scopes?: string[]): SocialCapabilities;

  /**
   * Generate the official OAuth authorization URL with CSRF state
   */
  abstract getAuthorizationUrl(state: string, redirectUri: string, additionalScopes?: string[]): string;

  /**
   * Exchange authorization code for access and refresh tokens
   */
  abstract handleCallback(code: string, redirectUri: string): Promise<SocialAuthResult>;

  /**
   * Refresh an expiring OAuth access token
   */
  abstract refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }>;

  /**
   * Retrieve official account and profile information
   */
  abstract getProfile(accessToken: string, options?: Record<string, any>): Promise<SocialProfile>;

  /**
   * Publish content to the platform
   */
  abstract publish(accessToken: string, params: PublishContentParams): Promise<PublishResponse>;

  /**
   * Delete or unpublish a post
   */
  abstract deletePost(accessToken: string, postId: string): Promise<boolean>;

  /**
   * Retrieve official analytics metrics
   */
  abstract getAnalytics(accessToken: string, accountId: string, period?: string): Promise<SocialAnalyticsResult>;

  /**
   * Send a direct or template message (if officially supported by platform)
   */
  abstract sendMessage(accessToken: string, message: SocialMessagePayload): Promise<SocialMessageResult>;

  /**
   * Revoke token permissions at the platform endpoint upon disconnection
   */
  abstract revokeAccess(accessToken: string): Promise<boolean>;

  /**
   * Run a live API health check
   */
  abstract healthCheck(accessToken: string, accountId?: string): Promise<ConnectionHealthResult>;
}
