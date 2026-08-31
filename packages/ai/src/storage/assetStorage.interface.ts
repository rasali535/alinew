/**
 * Asset Storage Provider Interface
 *
 * Pluggable abstraction for durable creative asset storage (Supabase, S3, R2, etc.)
 */

export interface AssetStorageMetadata {
  sizeBytes: number;
  contentType?: string;
  updatedAt?: string;
  sha256?: string;
}

export interface AssetStorageUploadResult {
  storagePath: string;
  sizeBytes: number;
  sha256: string;
  contentType: string;
}

export interface AssetStorageDownloadResult {
  buffer: Buffer;
  contentType: string;
  sizeBytes: number;
  sha256: string;
}

export interface AssetStorageProvider {
  /**
   * Upload binary data to durable storage.
   * Throws if upload fails or verification fails.
   */
  upload(
    objectPath: string,
    buffer: Buffer,
    options: { contentType: string; metadata?: Record<string, any> }
  ): Promise<AssetStorageUploadResult>;

  /**
   * Download binary data from durable storage.
   * Returns null if object does not exist.
   */
  download(objectPath: string): Promise<AssetStorageDownloadResult | null>;

  /**
   * Verify whether an object exists in durable storage.
   */
  exists(objectPath: string): Promise<boolean>;

  /**
   * Retrieve metadata for an object in durable storage.
   * Returns null if object does not exist.
   */
  metadata(objectPath: string): Promise<AssetStorageMetadata | null>;

  /**
   * Delete an object from durable storage.
   */
  delete(objectPath: string): Promise<boolean>;

  /**
   * Get human-readable provider name (e.g. 'SUPABASE')
   */
  getProviderName(): 'SUPABASE' | 'LOCAL' | string;
}
