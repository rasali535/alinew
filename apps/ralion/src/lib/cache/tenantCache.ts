/**
 * Ralion OS — Tenant-Scoped In-Memory Cache
 * Ras Ali Labs (Pty) Ltd
 *
 * Provides safe, short-lived (e.g. 60s) in-memory caching for expensive read-only
 * upstream social/analytics requests.
 *
 * CRITICAL TENANT ISOLATION RULES:
 * 1. Every cache key MUST be generated using `buildTenantCacheKey(userId, workspaceId, resource, id)`
 * 2. Cross-tenant cache sharing is strictly prohibited.
 * 3. Never store sensitive tokens or cross-tenant aggregate structures here.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class TenantCacheStore {
  private store = new Map<string, CacheEntry<any>>();
  private maxEntries = 1000;

  /**
   * Build a strictly tenant-isolated cache key.
   */
  static buildKey(userId: string, workspaceId: string, resource: string, identifier: string = ''): string {
    const safeUser = userId || 'anonymous';
    const safeWorkspace = workspaceId || 'default-workspace';
    return `tenant:${safeUser}:${safeWorkspace}:${resource}:${identifier}`;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number = 60): void {
    // Evict oldest if limit exceeded
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidateTenant(userId: string, workspaceId: string): void {
    const prefix = `tenant:${userId}:${workspaceId}:`;
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) {
        this.store.delete(k);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }
}

export const tenantCache = new TenantCacheStore();
export const buildTenantCacheKey = TenantCacheStore.buildKey;
