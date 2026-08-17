export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'IN_REVIEW' | 'DONE' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type DealStage = 'LEAD' | 'CONTACTED' | 'PROSPECT' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST' | 'CLOSED_WON' | 'CLOSED_LOST';
export type RoleName = 'OWNER' | 'ADMINISTRATOR' | 'MARKETING_MANAGER' | 'SALES' | 'HR' | 'FINANCE' | 'DEVELOPER' | 'VIEWER';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: RoleName | string;
  createdAt: string;
  updatedAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  industry?: string;
  ownerId: string;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: RoleName;
  joinedAt: string;
}

export interface WorkflowRule {
  id: string;
  name: string;
  triggerEvent?: string;
  trigger?: { event: string; conditions?: Record<string, any> };
  action: any;
  isActive: boolean;
}

export interface BusinessProfile {
  id: string;
  workspaceId: string;
  businessName: string;
  registrationNumber?: string;
  industry?: string;
  country?: string;
  address?: string;
  mission?: string;
  vision?: string;
  brandVoice?: string;
  brandColors?: string[];
  targetAudience?: string;
  languages?: string[];
  websiteUrl?: string;
  socialLinks?: Record<string, string>;
  competitors?: string[];
  businessGoals?: string[];
  updatedAt: string;
}

export interface SocialAccountToken {
  id: string;
  workspaceId: string;
  provider: string;
  accountId: string;
  accountName?: string;
  encryptedAccessToken: string;
  encryptedRefreshToken?: string;
  permissions: string[];
  expiresAt?: string;
  syncStatus: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'SYNCING' | 'ERROR';
  connectionHealth: 'HEALTHY' | 'NEEDS_REAUTHENTICATION' | 'EXPIRED';
  lastSyncAt?: string;
}

export interface CustomerRecord {
  id: string;
  workspaceId: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  address?: string;
  category: 'ENTERPRISE' | 'SMB' | 'GOVERNMENT' | 'INDIVIDUAL';
  notes?: string;
  dealValue?: number;
  createdAt: string;
}

export interface SalesDeal {
  id: string;
  workspaceId?: string;
  title: string;
  companyName: string;
  value: number;
  stage: DealStage;
  probability: number;
  expectedCloseDate: string;
  assignedTo?: string;
  createdAt?: string;
}

export interface MarketingCampaign {
  id: string;
  workspaceId: string;
  title: string;
  targetPlatform: string;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED';
  budget?: number;
  startDate?: string;
  endDate?: string;
  contentPostIds?: string[];
  createdAt: string;
}

export interface AiMemoryRecord {
  id: string;
  workspaceId: string;
  category: 'BUSINESS_CONTEXT' | 'BRAND_VOICE' | 'PRODUCT_CATALOG' | 'MARKETING' | 'CRM';
  content: string;
  embedding?: number[];
  confidence: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface AiJobRecord {
  id: string;
  workspaceId: string;
  jobType: 'IMAGE_GENERATION' | 'VIDEO_GENERATION' | 'COPYWRITING' | 'RESEARCH' | 'AUTOMATION';
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  inputPrompt: string;
  outputResult?: string;
  mediaUrl?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AuditLogRecord {
  id: string;
  workspaceId: string;
  userId: string;
  action: string;
  resource: string;
  ipAddress?: string;
  timestamp: string;
}

export type SecurityEventCategory = 'AUTH' | 'META' | 'ADMIN' | 'SECURITY' | 'DATA_ACCESS' | 'RBAC';

export interface MetaConnectionRecord {
  id: string;
  userId: string;
  workspaceId?: string;
  metaUserId: string;
  provider: 'facebook' | 'instagram' | 'meta' | 'whatsapp';
  email?: string;
  profilePictureUrl?: string;
  accountHandle?: string;
  accountName?: string;
  pageId?: string;
  scopes: string[];
  connectionStatus: 'connected' | 'expired' | 'disconnected' | 'revoked';
  encryptedAccessToken?: string;
  encryptedRefreshToken?: string;
  tokenExpiresAt?: string;
  lastSyncAt?: string;
  disconnectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityAuditLogRecord {
  id: string;
  userId?: string;
  actorUserId?: string;
  metaUserId?: string;
  eventType: string;
  eventCategory: SecurityEventCategory;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  metadata: Record<string, any>;
  timestamp: string;
  createdAt: string;
}

export interface SecurityReviewRecord {
  id: string;
  reviewPeriod: string;
  reviewer: string;
  reviewerId?: string;
  reviewedAt: string;
  findings?: string;
  incidentsFound: number;
  actionsTaken?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ACTION_REQUIRED';
  createdAt: string;
}

export interface SecurityAlertRecord {
  id: string;
  alertType: 'FAILED_LOGIN_SPIKE' | 'SUSPICIOUS_META_ACTIVITY' | 'PRIVILEGE_ESCALATION_ATTEMPT' | 'UNAUTHORIZED_API_CALL' | 'TOKEN_ANOMALY' | 'EXCESSIVE_RATE_LIMIT' | 'ACCOUNT_LOCKED' | 'SECURITY_ALERT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  metaUserId?: string;
  description: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  metadata: Record<string, any>;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export type SocialPlatform = 'facebook' | 'instagram' | 'whatsapp' | 'tiktok' | 'linkedin' | 'x';
export type SocialConnectionStatus = 'CONNECTED' | 'NEEDS_ATTENTION' | 'RECONNECT_REQUIRED' | 'DISCONNECTED' | 'REVOKED';
export type SocialTokenStatus = 'TOKEN_VALID' | 'TOKEN_EXPIRING' | 'TOKEN_EXPIRED' | 'TOKEN_REVOKED' | 'REAUTH_REQUIRED';
export type SocialAccountType = 'PERSONAL' | 'PAGE' | 'BUSINESS' | 'ORGANIZATION' | 'CREATOR';

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

export interface SocialConnectionRecord {
  id: string;
  userId: string;
  organizationId?: string;
  workspaceId?: string;
  provider: SocialPlatform;
  providerAccountId: string;
  accountName: string;
  username?: string;
  profileImageUrl?: string;
  accountType: SocialAccountType;
  connectionStatus: SocialConnectionStatus;
  tokenStatus: SocialTokenStatus;
  scopes: string[];
  capabilities: Partial<SocialCapabilities>;
  metadata: Record<string, any>;
  followersCount?: number;
  infrastructureProvider?: 'native' | 'zernio';
  zernioAccountId?: string;
  zernioProfileId?: string;
  lastSyncAt?: string;
  lastHealthCheckAt?: string;
  healthErrorMessage?: string;
  connectedAt: string;
  disconnectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocialProviderProfileRecord {
  id: string;
  organizationId?: string;
  workspaceId?: string;
  userId: string;
  provider: 'zernio';
  providerProfileId: string;
  profileName: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SocialProviderRoutingRecord {
  id: string;
  workspaceId?: string;
  platform: SocialPlatform;
  provider: 'zernio' | 'native';
  enabled: boolean;
  priority: number;
  fallbackProvider?: 'zernio' | 'native' | 'none';
  createdAt: string;
  updatedAt: string;
}

export interface SocialWebhookEventRecord {
  id: string;
  provider: string;
  eventType: string;
  eventId?: string;
  providerProfileId?: string;
  providerAccountId?: string;
  organizationId?: string;
  workspaceId?: string;
  signatureValid: boolean;
  payload: Record<string, any>;
  processed: boolean;
  processedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface SocialCredentialRecord {
  id: string;
  socialConnectionId: string;
  encryptedAccessToken: string;
  encryptedRefreshToken?: string;
  tokenType: string;
  expiresAt?: string;
  refreshExpiresAt?: string;
  revokedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocialPostRecord {
  id: string;
  userId: string;
  workspaceId?: string;
  title?: string;
  body: string;
  mediaUrls: string[];
  mediaTypes: string[];
  platforms: SocialPlatform[];
  status: 'DRAFT' | 'QUEUED' | 'PROCESSING' | 'PUBLISHED' | 'PARTIALLY_PUBLISHED' | 'FAILED' | 'CANCELLED';
  platformPostIds: Record<string, string>;
  platformResults: Record<string, { status: string; postId?: string; postUrl?: string; error?: string }>;
  scheduledFor?: string;
  publishedAt?: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocialInboxMessageRecord {
  id: string;
  connectionId: string;
  workspaceId?: string;
  provider: SocialPlatform;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderAvatarUrl?: string;
  recipientId: string;
  messageText: string;
  mediaUrl?: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  timestamp: string;
  metadata: Record<string, any>;
  createdAt: string;
}


