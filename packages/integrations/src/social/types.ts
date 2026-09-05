/**
 * Ralion Unified Social Media Architecture — Provider Types & Capability Model
 * Ras Ali Labs (Pty) Ltd
 */

export type SocialPlatformType =
  | 'facebook'
  | 'instagram'
  | 'whatsapp'
  | 'tiktok'
  | 'linkedin'
  | 'x'
  | 'youtube'
  | 'threads'
  | 'pinterest'
  | 'reddit'
  | 'bluesky';

export type InfrastructureProviderType = 'native' | 'zernio';

export type SocialAccountKind = 'PERSONAL' | 'PAGE' | 'BUSINESS' | 'ORGANIZATION' | 'CREATOR';

export interface SocialCapabilities {
  canPublish: boolean;
  canSchedule: boolean;
  canUploadImage: boolean;
  canUploadVideo: boolean;
  canPublishStories: boolean;
  canPublishReels: boolean;
  canPublishShortVideo: boolean;
  canReadAnalytics: boolean;
  canReadComments: boolean;
  canReplyToComments: boolean;
  canReadMessages: boolean;
  canSendMessages: boolean;
  canManagePages: boolean;
  canManageBusinessAccounts: boolean;
}

export interface SocialProfile {
  provider: SocialPlatformType;
  providerAccountId: string;
  accountName: string;
  username?: string;
  avatarUrl?: string;
  accountType: SocialAccountKind;
  scopes: string[];
  followersCount?: number;
  email?: string;
  pageId?: string;
  infrastructureProvider?: InfrastructureProviderType;
  zernioAccountId?: string;
  zernioProfileId?: string;
  metadata?: Record<string, any>;
}

export interface SocialAuthResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scopes: string[];
  profile: SocialProfile;
}

export interface PublishContentParams {
  title?: string;
  body: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
  accountType?: SocialAccountKind;
  pageId?: string;
  options?: Record<string, any>;
  idempotencyKey?: string;
  zernioProfileId?: string;
  zernioAccountIds?: string[];
}

export interface PublishResponse {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
  statusCode?: number;
  details?: any;
  platform: SocialPlatformType;
  publishedAt: string;
  provider?: InfrastructureProviderType;
  metadata?: Record<string, any>;
}

export interface SocialMetricData {
  impressions?: number;
  reach?: number;
  engagement?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  videoViews?: number;
  followers?: number;
  rate?: number;
  period?: string;
}

export interface SocialAnalyticsResult {
  provider: SocialPlatformType;
  providerAccountId: string;
  metrics: SocialMetricData;
  history?: Array<{ date: string; value: number }>;
  lastUpdated: string;
}

export interface SocialMessagePayload {
  conversationId: string;
  recipientId: string;
  messageText: string;
  accountId?: string;
  pageId?: string;
  mediaUrl?: string;
  templateName?: string;
  templateLanguage?: string;
}

export interface SocialMessageResult {
  success: boolean;
  messageId?: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  error?: string;
}

export interface ConnectionHealthResult {
  healthy: boolean;
  status: 'CONNECTED' | 'NEEDS_ATTENTION' | 'RECONNECT_REQUIRED' | 'DISCONNECTED' | 'PLATFORM_UNAVAILABLE';
  tokenStatus: 'TOKEN_VALID' | 'TOKEN_EXPIRING' | 'TOKEN_EXPIRED' | 'TOKEN_REVOKED' | 'REAUTH_REQUIRED';
  errorMessage?: string;
  expiresAt?: Date;
  checkedAt: string;
}

// Zernio Specific Interfaces
export interface ZernioProfileModel {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ZernioAccountModel {
  id: string;
  profileId: string;
  platform: SocialPlatformType;
  name: string;
  username?: string;
  avatarUrl?: string;
  status: 'connected' | 'disconnected' | 'reauth_required';
  capabilities?: Partial<SocialCapabilities>;
  followersCount?: number;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export interface ZernioPostPayload {
  profileId: string;
  accountIds: string[];
  content: string;
  mediaUrls?: string[];
  scheduledFor?: string;
  options?: Record<string, any>;
}

export interface ZernioPostResult {
  id: string;
  profileId: string;
  status: 'PUBLISHED' | 'SCHEDULED' | 'FAILED' | 'PARTIALLY_PUBLISHED';
  platformResults: Array<{
    accountId: string;
    platform: SocialPlatformType;
    status: 'PUBLISHED' | 'QUEUED' | 'FAILED';
    postId?: string;
    postUrl?: string;
    error?: string;
  }>;
  createdAt: string;
}

export interface ZernioWebhookPayload {
  event: string;
  profileId?: string;
  accountId?: string;
  data: Record<string, any>;
  timestamp: string;
}
