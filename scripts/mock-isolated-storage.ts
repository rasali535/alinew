import crypto from 'crypto';
import {
  AssetStorageProvider,
  AssetStorageUploadResult,
  AssetStorageDownloadResult,
  AssetStorageMetadata,
} from '../packages/ai/src/storage/assetStorage.interface';

export class MockIsolatedStorageProvider implements AssetStorageProvider {
  private files = new Map<string, { buffer: Buffer; contentType: string; metadata?: any; updatedAt: string }>();

  getProviderName(): string {
    return 'MOCK_ISOLATED';
  }

  async upload(
    objectPath: string,
    buffer: Buffer,
    options: { contentType: string; metadata?: Record<string, any> }
  ): Promise<AssetStorageUploadResult> {
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    this.files.set(objectPath, {
      buffer,
      contentType: options.contentType,
      metadata: options.metadata,
      updatedAt: new Date().toISOString(),
    });
    return {
      storagePath: objectPath,
      sizeBytes: buffer.byteLength,
      sha256,
      contentType: options.contentType,
    };
  }

  async download(objectPath: string): Promise<AssetStorageDownloadResult | null> {
    const file = this.files.get(objectPath);
    if (!file) return null;
    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
    return {
      buffer: file.buffer,
      contentType: file.contentType,
      sizeBytes: file.buffer.byteLength,
      sha256,
    };
  }

  async exists(objectPath: string): Promise<boolean> {
    return this.files.has(objectPath);
  }

  async metadata(objectPath: string): Promise<AssetStorageMetadata | null> {
    const file = this.files.get(objectPath);
    if (!file) return null;
    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
    return {
      sizeBytes: file.buffer.byteLength,
      contentType: file.contentType,
      updatedAt: file.updatedAt,
      sha256,
    };
  }

  async delete(objectPath: string): Promise<boolean> {
    return this.files.delete(objectPath);
  }

  async list(
    folderPath = '',
    options?: { limit?: number; offset?: number; search?: string }
  ): Promise<Array<{ name: string; id?: string; updatedAt?: string; createdAt?: string; metadata?: any }>> {
    const results: Array<{ name: string; id?: string; updatedAt?: string; createdAt?: string; metadata?: any }> = [];
    const prefix = folderPath ? (folderPath.endsWith('/') ? folderPath : `${folderPath}/`) : '';
    for (const [key, val] of this.files.entries()) {
      if (key.startsWith(prefix)) {
        const relativeName = key.slice(prefix.length).split('/')[0];
        if (!results.some((r) => r.name === relativeName)) {
          results.push({
            name: relativeName,
            updatedAt: val.updatedAt,
            metadata: val.metadata,
          });
        }
      }
    }
    return results;
  }

  async createSignedUrl(
    objectPath: string,
    expiresInSeconds = 900
  ): Promise<{ signedUrl: string; expiresAt: string } | null> {
    if (!this.files.has(objectPath)) return null;
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    return {
      signedUrl: `https://isolated-test-storage.local/sign/${objectPath}?token=${token}&expires=${expiresInSeconds}`,
      expiresAt,
    };
  }
}
