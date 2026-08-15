/**
 * Ralion Unified Social Media Architecture — Rate Limiting Service
 * Ras Ali Labs (Pty) Ltd
 * Sliding window rate limit tracker with exponential backoff per social provider.
 */

import { SocialPlatformType } from '@ralion/integrations';

interface RateLimitBucket {
  count: number;
  resetTime: number;
}

export class SocialRateLimitService {
  // Provider default rate limits per minute
  private static readonly RATE_LIMITS: Record<SocialPlatformType, { maxPerMin: number; windowMs: number }> = {
    facebook: { maxPerMin: 200, windowMs: 60000 },
    instagram: { maxPerMin: 100, windowMs: 60000 },
    whatsapp: { maxPerMin: 80, windowMs: 1000 }, // 80 msg/sec
    tiktok: { maxPerMin: 50, windowMs: 60000 },
    linkedin: { maxPerMin: 100, windowMs: 60000 },
    x: { maxPerMin: 50, windowMs: 900000 }, // 50 requests per 15 min
  };

  private static buckets: Map<string, RateLimitBucket> = new Map();

  /**
   * Check whether an API call is permitted under current provider rate limits
   */
  static checkRateLimit(provider: SocialPlatformType, accountId: string): { allowed: boolean; retryAfterMs: number } {
    const key = `${provider}:${accountId}`;
    const limitConfig = this.RATE_LIMITS[provider] || { maxPerMin: 60, windowMs: 60000 };
    const now = Date.now();

    let bucket = this.buckets.get(key);
    if (!bucket || now >= bucket.resetTime) {
      bucket = { count: 1, resetTime: now + limitConfig.windowMs };
      this.buckets.set(key, bucket);
      return { allowed: true, retryAfterMs: 0 };
    }

    if (bucket.count < limitConfig.maxPerMin) {
      bucket.count++;
      return { allowed: true, retryAfterMs: 0 };
    }

    const retryAfterMs = Math.max(0, bucket.resetTime - now);
    return { allowed: false, retryAfterMs };
  }

  /**
   * Calculate exponential backoff delay for retrying failed requests
   */
  static calculateBackoff(attempt: number, baseDelayMs = 1000, maxDelayMs = 30000): number {
    const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
    const jitter = Math.random() * 200;
    return Math.floor(delay + jitter);
  }
}
