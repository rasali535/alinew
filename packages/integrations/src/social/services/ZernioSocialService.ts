/**
 * Ralion Unified Social Media Architecture — Zernio Server-Side Service Layer
 * Ras Ali Labs (Pty) Ltd
 *
 * Implements direct integration with Zernio REST API (https://zernio.com/api/v1).
 * Authenticates strictly server-side via ZERNIO_API_KEY.
 * Idempotent requests, rate-limit resilience with exponential backoff, and signature verification.
 */

import * as crypto from 'crypto';
import {
  SocialPlatformType,
  ZernioProfileModel,
  ZernioAccountModel,
  ZernioPostPayload,
  ZernioPostResult,
  SocialCapabilities,
} from '../types';

export interface ZernioRequestOptions {
  idempotencyKey?: string;
  timeoutMs?: number;
  retries?: number;
}

export class ZernioSocialService {
  private static BASE_URL = process.env.ZERNIO_API_BASE_URL || 'https://zernio.com/api/v1';
  private static SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  private static SUPABASE_ANON_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';

  /**
   * Securely retrieve ZERNIO_API_KEY from server-side environment
   */
  private static getApiKey(): string {
    const key = process.env.ZERNIO_API_KEY || '';
    return key.trim();
  }

  /**
   * Check if Zernio API key or Supabase Secrets bridge is configured on the server
   */
  static isConfigured(): boolean {
    return !!this.getApiKey() || !!this.SUPABASE_URL;
  }

  /**
   * Internal HTTP dispatcher with authentication, timeouts, and exponential backoff
   */
  private static async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    options?: ZernioRequestOptions
  ): Promise<T> {
    const directKey = this.getApiKey();

    let url: string;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Ralion-OS-Social-Engine/2.4',
    };

    if (directKey) {
      url = `${this.BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
      headers['Authorization'] = `Bearer ${directKey}`;
    } else {
      // Route securely through Supabase Edge Function bridge (which has ZERNIO_API_KEY in Supabase Secrets)
      url = `${this.SUPABASE_URL.replace(/\/$/, '')}/functions/v1/zernio-bridge/${endpoint.replace(/^\//, '')}`;
      if (this.SUPABASE_ANON_KEY) {
        headers['apikey'] = this.SUPABASE_ANON_KEY;
        headers['Authorization'] = `Bearer ${this.SUPABASE_ANON_KEY}`;
      }
    }

    if (options?.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    const maxRetries = options?.retries ?? 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options?.timeoutMs || 15000);

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle HTTP 429 Too Many Requests with exponential backoff
        if (response.status === 429 && attempt < maxRetries) {
          const retryAfter = Number(response.headers.get('retry-after')) || Math.pow(2, attempt + 1);
          await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
          attempt++;
          continue;
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const errorMessage =
            data?.error?.message ||
            data?.message ||
            `Zernio API request failed with status ${response.status}`;
          const errorCode = data?.error?.code || `HTTP_${response.status}`;
          const err = new Error(`[ZernioSocialService] ${errorCode}: ${errorMessage}`);
          (err as any).status = response.status;
          (err as any).code = errorCode;
          throw err;
        }

        return data as T;
      } catch (err: any) {
        if (attempt >= maxRetries || err.name === 'AbortError') {
          throw err;
        }
        attempt++;
        const backoffMs = Math.min(10000, 1000 * Math.pow(2, attempt));
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw new Error(`[ZernioSocialService] Failed request to ${endpoint} after ${maxRetries} retries.`);
  }

  // =====================================================================
  // 1. Profile Management (Tenant Mapping)
  // =====================================================================

  /**
   * Create an isolated profile container for a Ralion Organization/Workspace
   */
  static async createProfile(
    name: string,
    description?: string,
    idempotencyKey?: string
  ): Promise<ZernioProfileModel> {
    const payload = { name, description };
    const res = await this.request<any>('profiles', 'POST', payload, { idempotencyKey });
    const profileObj = res.profile || res;
    return {
      id: profileObj._id || profileObj.id || res.id || res._id,
      name: profileObj.name || name,
      description: profileObj.description || description,
      createdAt: profileObj.createdAt || new Date().toISOString(),
    };
  }

  /**
   * Retrieve profile details
   */
  static async getProfile(profileId: string): Promise<ZernioProfileModel | null> {
    try {
      const res = await this.request<any>(`profiles/${profileId}`, 'GET');
      const profileObj = res.profile || res;
      return {
        id: profileObj._id || profileObj.id || profileId,
        name: profileObj.name || 'Ralion Workspace',
        description: profileObj.description,
        createdAt: profileObj.createdAt || new Date().toISOString(),
      };
    } catch (err: any) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  /**
   * List all profiles
   */
  static async listProfiles(): Promise<ZernioProfileModel[]> {
    const res = await this.request<any>('profiles', 'GET');
    const profiles = Array.isArray(res) ? res : res.profiles || [];
    return profiles.map((p: any) => ({
      id: p._id || p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt || new Date().toISOString(),
    }));
  }

  /**
   * Delete a profile and all associated social accounts
   */
  static async deleteProfile(profileId: string): Promise<boolean> {
    await this.request<any>(`profiles/${profileId}`, 'DELETE');
    return true;
  }

  // =====================================================================
  // 2. Account Connection & OAuth Flow
  // =====================================================================

  /**
   * Generate an official OAuth connection URL for a platform and profile
   */
  static async getConnectUrl(
    platform: SocialPlatformType,
    profileId: string,
    redirectUri?: string
  ): Promise<{ authUrl: string }> {
    const params = new URLSearchParams({ profileId });
    if (redirectUri) params.append('redirectUri', redirectUri);

    const res = await this.request<any>(`connect/${platform}?${params.toString()}`, 'GET');
    if (!res.authUrl && !res.url) {
      throw new Error(`[ZernioSocialService] No authUrl returned from Zernio for platform: ${platform}`);
    }
    return { authUrl: res.authUrl || res.url };
  }

  /**
   * List connected social accounts for a profile
   */
  static async getAccounts(profileId: string): Promise<ZernioAccountModel[]> {
    const res = await this.request<any>(`accounts?profileId=${encodeURIComponent(profileId)}`, 'GET');
    const accounts = Array.isArray(res) ? res : res.accounts || [];

    return accounts.map((a: any) => ({
      id: a._id || a.id,
      profileId: a.profileId || profileId,
      platform: (a.platform || 'facebook').toLowerCase() as SocialPlatformType,
      name: a.name || a.accountName || 'Connected Account',
      username: a.username || a.handle,
      avatarUrl: a.avatarUrl || a.profileImageUrl,
      status: (a.status === 'connected' ? 'connected' : a.status === 'reauth_required' ? 'reauth_required' : 'disconnected') as any,
      capabilities: a.capabilities || {},
      followersCount: Number(a.followersCount || a.followers || 0),
      createdAt: a.createdAt || new Date().toISOString(),
      updatedAt: a.updatedAt,
      metadata: a.metadata || {},
    }));
  }

  /**
   * Retrieve single account metadata and health
   */
  static async getAccount(accountId: string): Promise<ZernioAccountModel | null> {
    try {
      const res = await this.request<any>(`accounts/${accountId}`, 'GET');
      const a = res.account || res;
      return {
        id: a._id || a.id || accountId,
        profileId: a.profileId,
        platform: (a.platform || 'facebook').toLowerCase() as SocialPlatformType,
        name: a.name || a.accountName || 'Connected Account',
        username: a.username || a.handle,
        avatarUrl: a.avatarUrl || a.profileImageUrl,
        status: a.status || 'connected',
        capabilities: a.capabilities || {},
        followersCount: Number(a.followersCount || a.followers || 0),
        createdAt: a.createdAt || new Date().toISOString(),
        updatedAt: a.updatedAt,
        metadata: a.metadata || {},
      };
    } catch (err: any) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  /**
   * Disconnect an account and revoke tokens remotely
   */
  static async disconnectAccount(accountId: string): Promise<boolean> {
    await this.request<any>(`accounts/${accountId}`, 'DELETE');
    return true;
  }

  // =====================================================================
  // 3. Content Publishing & Scheduling
  // =====================================================================

  /**
   * Create and publish/schedule a post across multiple platform accounts
   */
  static async createPost(
    params: ZernioPostPayload,
    idempotencyKey?: string
  ): Promise<ZernioPostResult> {
    const res = await this.request<any>('posts', 'POST', params, { idempotencyKey });
    const platformResults = Array.isArray(res.platformResults)
      ? res.platformResults
      : (params.accountIds || []).map((accId) => ({
          accountId: accId,
          platform: 'facebook' as SocialPlatformType,
          status: 'PUBLISHED' as const,
          postId: res.id,
        }));

    return {
      id: res.id || `zpost_${Date.now()}`,
      profileId: params.profileId,
      status: res.status || 'PUBLISHED',
      platformResults,
      createdAt: res.createdAt || new Date().toISOString(),
    };
  }

  /**
   * Retrieve published/scheduled post details
   */
  static async getPost(postId: string): Promise<any> {
    return this.request<any>(`posts/${postId}`, 'GET');
  }

  /**
   * Delete or unpublish a post
   */
  static async deletePost(postId: string): Promise<boolean> {
    await this.request<any>(`posts/${postId}`, 'DELETE');
    return true;
  }

  // =====================================================================
  // 4. Analytics & Metrics
  // =====================================================================

  /**
   * Get workspace-level analytics summary for a profile
   */
  static async getAnalyticsSummary(profileId: string, period: string = '30d'): Promise<any> {
    return this.request<any>(`analytics/summary?profileId=${encodeURIComponent(profileId)}&period=${encodeURIComponent(period)}`, 'GET');
  }

  /**
   * Get account-specific analytics
   */
  static async getAccountAnalytics(accountId: string, period: string = '30d'): Promise<any> {
    return this.request<any>(`analytics/accounts/${encodeURIComponent(accountId)}?period=${encodeURIComponent(period)}`, 'GET');
  }

  // =====================================================================
  // 5. Unified Social Inbox
  // =====================================================================

  /**
   * Get direct messages for a profile or specific account
   */
  static async getInboxMessages(profileId: string, accountId?: string): Promise<any[]> {
    const params = new URLSearchParams({ profileId });
    if (accountId) params.append('accountId', accountId);

    const res = await this.request<any>(`inbox/messages?${params.toString()}`, 'GET');
    return Array.isArray(res) ? res : res.messages || [];
  }

  /**
   * Send a direct message or reply to a recipient
   */
  static async sendInboxReply(
    accountId: string,
    recipientId: string,
    message: string
  ): Promise<any> {
    return this.request<any>('inbox/reply', 'POST', {
      accountId,
      recipientId,
      message,
    });
  }

  // =====================================================================
  // 6. Webhooks & Security Verification
  // =====================================================================

  /**
   * Verify HMAC-SHA256 signature from incoming Zernio webhook header
   */
  static verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string,
    secret?: string
  ): boolean {
    const webhookSecret = secret || process.env.ZERNIO_WEBHOOK_SECRET || '';
    if (!webhookSecret || !signatureHeader) return false;

    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const cleanHeader = signatureHeader.replace(/^sha256=/, '').trim();
      return crypto.timingSafeEqual(
        Buffer.from(cleanHeader, 'utf-8'),
        Buffer.from(expectedSignature, 'utf-8')
      );
    } catch {
      return false;
    }
  }

  // =====================================================================
  // 7. Health Check & Diagnostics
  // =====================================================================

  /**
   * Server-side diagnostic check against Zernio API without exposing secrets
   */
  static async checkApiHealth(): Promise<{
    configured: boolean;
    reachable: boolean;
    latencyMs?: number;
    profileCount?: number;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return { configured: false, reachable: false, error: 'ZERNIO_API_KEY is not configured.' };
    }

    const start = Date.now();
    try {
      const profiles = await this.listProfiles();
      const latencyMs = Date.now() - start;
      return {
        configured: true,
        reachable: true,
        latencyMs,
        profileCount: profiles.length,
      };
    } catch (err: any) {
      return {
        configured: true,
        reachable: false,
        latencyMs: Date.now() - start,
        error: err.message || 'Zernio API unreachable',
      };
    }
  }
}
