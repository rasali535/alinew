export type IntegrationProvider =
  | 'google'
  | 'meta'
  | 'facebook'
  | 'instagram'
  | 'whatsapp'
  | 'microsoft'
  | 'linkedin'
  | 'tiktok'
  | 'x'
  | 'youtube'
  | 'pinterest'
  | 'reddit'
  | 'github'
  | 'slack'
  | 'discord'
  | 'notion'
  | 'dropbox'
  | 'onedrive'
  | 'shopify'
  | 'woocommerce'
  | 'stripe'
  | 'paypal'
  | 'quickbooks'
  | 'xero'
  | 'sage'
  | 'hubspot'
  | 'salesforce';

export type IntegrationCategory =
  | 'MARKETING_SOCIAL'
  | 'PRODUCTIVITY_DOCS'
  | 'COMMERCE_PAYMENTS'
  | 'FINANCE_ERP'
  | 'CRM_SUPPORT'
  | 'DEV_CHAT';

export type IntegrationStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'SYNCING'
  | 'ERROR'
  | 'NEEDS_RECONNECT';

export interface IntegrationServiceMeta {
  provider: IntegrationProvider;
  name: string;
  category: IntegrationCategory;
  description: string;
  logoUrl?: string;
  officialOAuthUrl: string;
  defaultScopes: string[];
  supportsOfflineMode: boolean;
}

export interface IntegrationConnectionState {
  workspaceId: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  encryptedAccessToken?: string;
  encryptedRefreshToken?: string;
  expiresAt?: number;
  permissionsGranted: string[];
  lastSyncTimestamp?: string;
  lastError?: string;
  accountName?: string;
  accountEmail?: string;
}

export interface SyncResult {
  success: boolean;
  syncedItemsCount: number;
  entitiesLearned: string[];
  timestamp: string;
  error?: string;
}

export interface LearnResult {
  success: boolean;
  businessName?: string;
  discoveredBrandVoice?: string;
  productsLearnedCount: number;
  servicesLearnedCount: number;
  targetAudience?: string;
  brandColors?: string[];
  keywords?: string[];
  knowledgeGraphNodesCount: number;
  completionMessage: string;
}

export interface IntegrationConnector {
  meta: IntegrationServiceMeta;

  connect(workspaceId: string, options?: { redirectUri?: string; scopes?: string[] }): Promise<{ authorizationUrl: string; stateToken: string }>;

  disconnect(workspaceId: string): Promise<boolean>;

  refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: number }>;

  sync(workspaceId: string): Promise<SyncResult>;

  learn(workspaceId: string): Promise<LearnResult>;

  status(workspaceId: string): Promise<{ status: IntegrationStatus; lastSync?: string; permissions: string[] }>;

  permissions(workspaceId: string): Promise<string[]>;
}
