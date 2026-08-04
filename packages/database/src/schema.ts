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
