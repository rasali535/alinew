/**
 * Ralion Unified Social Media Architecture — Provider Registry & Factory
 * Ras Ali Labs (Pty) Ltd
 */

import { SocialProvider } from './SocialProvider';
import { SocialPlatformType, SocialCapabilities } from './types';
import { MetaProvider } from './adapters/MetaProvider';
import { InstagramProvider } from './adapters/InstagramProvider';
import { WhatsAppProvider } from './adapters/WhatsAppProvider';
import { TikTokProvider } from './adapters/TikTokProvider';
import { LinkedInProvider } from './adapters/LinkedInProvider';
import { XProvider } from './adapters/XProvider';

export class SocialProviderRegistry {
  private static providers: Map<SocialPlatformType, SocialProvider> = new Map<SocialPlatformType, SocialProvider>([
    ['facebook', new MetaProvider()],
    ['instagram', new InstagramProvider()],
    ['whatsapp', new WhatsAppProvider()],
    ['tiktok', new TikTokProvider()],
    ['linkedin', new LinkedInProvider()],
    ['x', new XProvider()],
  ]);

  /**
   * Retrieve the provider adapter instance for a given platform
   */
  static getProvider(platform: SocialPlatformType): SocialProvider {
    const provider = this.providers.get(platform);
    if (!provider) {
      throw new Error(`[SocialProviderRegistry] Unsupported social platform: ${platform}`);
    }
    return provider;
  }

  /**
   * Retrieve all supported providers
   */
  static getAllProviders(): SocialProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get dynamic capabilities map across all supported platforms
   */
  static getAllCapabilities(): Record<SocialPlatformType, SocialCapabilities> {
    const result: Partial<Record<SocialPlatformType, SocialCapabilities>> = {};
    for (const [platform, provider] of this.providers.entries()) {
      result[platform] = provider.getCapabilities();
    }
    return result as Record<SocialPlatformType, SocialCapabilities>;
  }

  /**
   * Check if a platform is officially supported
   */
  static isSupported(platform: string): platform is SocialPlatformType {
    return this.providers.has(platform as SocialPlatformType);
  }
}
