/**
 * Deterministic API Contract for Admin Command Center Metrics
 * Shared between /api/admin/metrics and apps/ralion/src/app/admin/page.tsx
 */

export interface AdminConnectedUserConnection {
  socialConnectionId: string;
  id?: string;
  provider: string;
  providerAccountId: string;
  accountName: string;
  accountType?: string;
  accountTypeLabel?: string;
  isPersonalProfile?: boolean;
  isBusinessPage?: boolean;
  connectionStatus: string;
  status?: string;
  tokenStatus?: string;
  connectedAt?: string;
}

export interface AdminConnectedUser {
  userId: string;
  id?: string;
  userName: string;
  name?: string;
  email: string;
  workspaceId?: string;
  connectionCount: number;
  connections: AdminConnectedUserConnection[];
}

export interface AdminConnectionRegistryItem {
  id: string;
  connectionId: string;
  provider: string;
  providerAccountId: string;
  accountName: string;
  accountType?: string;
  accountTypeLabel?: string;
  isPersonalProfile?: boolean;
  isBusinessPage?: boolean;
  username?: string | null;
  connectionStatus: string;
  status?: string;
  tokenStatus: string;
  followersCount: number;
  organizationId: string;
  workspaceId?: string;
  userId?: string;
  infrastructureProvider: string;
  connectedAt: string;
  capabilities?: Record<string, boolean>;
  metadata?: any;
}

export interface AdminMetricsData {
  totalCustomers: number;
  activeCustomers: number;
  suspendedCustomers: number;
  estimatedMRR: number;
  totalCreditsIssued: number;
  totalCreditsConsumed: number;
  creativeGenerations: {
    total: number;
    images: number;
    videos: number;
    successRate: number;
  };
  connectedUsers: AdminConnectedUser[];
  connectedUserCount: number;
  connectedUsersCount: number;
  activeConnectionCount: number;
  activeSocialConnections: number;
  connectedMetaAccounts: number;
  connectedZernioProfiles: number;
  adminFacebook?: {
    id: string;
    pageId: string;
    pageName: string;
    pageUsername: string;
    connectionStatus: string;
    tokenStatus: string;
    followersCount: number;
    capabilities: Record<string, boolean>;
    connectedAt: string;
  };
  adminZernio?: {
    id: string;
    providerProfileId: string;
    profileName: string;
    status: string;
    updatedAt: string;
  };
  allConnections: AdminConnectionRegistryItem[];
  systemHealth: string;
  apiErrorRatePct: number;
  recentSecurityEvents: number;
  timestamp: string;
}

export interface AdminMetricsApiResponse {
  success: boolean;
  data: AdminMetricsData;
  error?: string;
}
