/**
 * Ralion Unified Social Media Architecture — Provider Registry & Factory
 * Ras Ali Labs (Pty) Ltd
 */

import { SocialProvider } from './SocialProvider';
import { SocialPlatformType, SocialCapabilities, InfrastructureProviderType } from './types';
import { MetaProvider } from './adapters/MetaProvider';
import { InstagramProvider } from './adapters/InstagramProvider';
import { WhatsAppProvider } from './adapters/WhatsAppProvider';
import { TikTokProvider } from './adapters/TikTokProvider';
import { LinkedInProvider } from './adapters/LinkedInProvider';
import { XProvider } from './adapters/XProvider';
import { ZernioProvider } from './adapters/ZernioProvider';

export class SocialProviderRegistry {
  private static nativeProviders: Map<SocialPlatformType, SocialProvider> = new Map<SocialPlatformType, SocialProvider>([
    ['facebook', new MetaProvider()],
    ['instagram', new InstagramProvider()],
    ['whatsapp', new WhatsAppProvider()],
    ['tiktok', new TikTokProvider()],
    ['linkedin', new LinkedInProvider()],
    ['x', new XProvider()],
  ]);

  private static zernioProviderInstance = new ZernioProvider();

  /**
   * Retrieve the provider adapter instance for a given platform and infrastructure mode
   */
  static getProvider(
    platform: SocialPlatformType,
    infrastructure: InfrastructureProviderType = 'native'
  ): SocialProvider {
    if (infrastructure === 'zernio') {
      return this.zernioProviderInstance;
    }

    const provider = this.nativeProviders.get(platform);
    if (!provider) {
      // If native adapter does not exist for an extended platform (e.g. youtube, threads, bluesky), default to Zernio
      return this.zernioProviderInstance;
    }
    return provider;
  }

  /**
   * Directly get the Zernio provider instance
   */
  static getZernioProvider(): ZernioProvider {
    return this.zernioProviderInstance;
  }

  /**
   * Retrieve all supported native providers
   */
  static getAllProviders(): SocialProvider[] {
    return Array.from(this.nativeProviders.values());
  }

  /**
   * Get dynamic capabilities map across all supported platforms
   */
  static getAllCapabilities(): Record<SocialPlatformType, SocialCapabilities> {
    const result: Partial<Record<SocialPlatformType, SocialCapabilities>> = {};
    for (const [platform, provider] of this.nativeProviders.entries()) {
      result[platform] = provider.getCapabilities();
    }
    return result as Record<SocialPlatformType, SocialCapabilities>;
  }

  /**
   * Check if a platform is officially supported
   */
  static isSupported(platform: string): platform is SocialPlatformType {
    const supportedPlatforms = [
      'facebook',
      'instagram',
      'whatsapp',
      'tiktok',
      'linkedin',
      'x',
      'youtube',
      'threads',
      'pinterest',
      'reddit',
      'bluesky',
    ];
    return supportedPlatforms.includes(platform);
  }
}
