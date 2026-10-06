import 'server-only';
import {
  AssetStorageProvider,
  AssetStorageUploadResult,
  AssetStorageDownloadResult,
  AssetStorageMetadata,
} from './assetStorage.interface';

export class PrimaryWithFallbackStorageProvider implements AssetStorageProvider {
  constructor(
    private readonly primary: AssetStorageProvider,
    private readonly fallback: AssetStorageProvider
  ) {}

  getProviderName(): string {
    return `${this.primary.getProviderName()}+${this.fallback.getProviderName()}_FALLBACK`;
  }

  async upload(
    objectPath: string,
    buffer: Buffer,
    options: { contentType: string; metadata?: Record<string, any> }
  ): Promise<AssetStorageUploadResult> {
    return this.primary.upload(objectPath, buffer, options);
  }

  async download(objectPath: string): Promise<AssetStorageDownloadResult | null> {
    const primary = await this.primary.download(objectPath);
    if (primary) return primary;
    return this.fallback.download(objectPath);
  }

  async exists(objectPath: string): Promise<boolean> {
    if (await this.primary.exists(objectPath)) return true;
    return this.fallback.exists(objectPath);
  }

  async metadata(objectPath: string): Promise<AssetStorageMetadata | null> {
    const primary = await this.primary.metadata(objectPath);
    if (primary) return primary;
    return this.fallback.metadata(objectPath);
  }

  async delete(objectPath: string): Promise<boolean> {
    const [primaryDeleted, fallbackDeleted] = await Promise.allSettled([
      this.primary.delete(objectPath),
      this.fallback.delete(objectPath),
    ]);
    const primaryOk = primaryDeleted.status === 'fulfilled' && primaryDeleted.value;
    const fallbackOk = fallbackDeleted.status === 'fulfilled' && fallbackDeleted.value;
    return primaryOk || fallbackOk;
  }

  async list(
    folderPath?: string,
    options?: { limit?: number; offset?: number; search?: string }
  ): Promise<Array<{ name: string; id?: string; updatedAt?: string; createdAt?: string; metadata?: any }>> {
    const expandedLimit = Math.min(
      Math.max((options?.limit || 100) + (options?.offset || 0), 1),
      1000
    );
    const listOptions = { ...options, limit: expandedLimit, offset: 0 };
    const [primaryItems, fallbackItems] = await Promise.all([
      this.primary.list ? this.primary.list(folderPath, listOptions).catch(() => []) : Promise.resolve([]),
      this.fallback.list ? this.fallback.list(folderPath, listOptions).catch(() => []) : Promise.resolve([]),
    ]);

    const merged = new Map<string, { name: string; id?: string; updatedAt?: string; createdAt?: string; metadata?: any }>();
    for (const item of fallbackItems) merged.set(item.name, item);
    for (const item of primaryItems) merged.set(item.name, item);

    const items = Array.from(merged.values()).sort((a, b) =>
      (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '')
    );
    const offset = Math.max(options?.offset || 0, 0);
    const limit = Math.max(options?.limit || 100, 1);
    return items.slice(offset, offset + limit);
  }

  async createSignedUrl(
    objectPath: string,
    expiresInSeconds: number = 900
  ): Promise<{ signedUrl: string; expiresAt: string } | null> {
    if (await this.primary.exists(objectPath)) {
      return this.primary.createSignedUrl
        ? this.primary.createSignedUrl(objectPath, expiresInSeconds)
        : null;
    }
    return this.fallback.createSignedUrl
      ? this.fallback.createSignedUrl(objectPath, expiresInSeconds)
      : null;
  }
}
