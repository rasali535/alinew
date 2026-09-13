/**
 * Supabase Storage Provider
 *
 * Authoritative production storage provider for Ralion OS creative assets.
 * Backed by private Supabase Storage `creatives` bucket.
 * Uses SUPABASE_SERVICE_ROLE_KEY strictly server-side.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import {
  AssetStorageProvider,
  AssetStorageUploadResult,
  AssetStorageDownloadResult,
  AssetStorageMetadata,
} from './assetStorage.interface';

export class SupabaseStorageProvider implements AssetStorageProvider {
  private client: SupabaseClient | null = null;
  private bucketName: string;

  constructor(bucketName: string = 'creatives') {
    this.bucketName = bucketName;
  }

  private getClient(): SupabaseClient {
    if (this.client) return this.client;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!key) {
      throw new Error(
        `[SupabaseStorageProvider] Missing required Supabase credentials (URL: ${!!url}, SERVICE_ROLE_KEY: ${!!key}). Production storage requires Supabase configuration.`
      );
    }

    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return this.client;
  }

  getProviderName(): 'SUPABASE' {
    return 'SUPABASE';
  }

  getBucketName(): string {
    return this.bucketName;
  }

  async upload(
    objectPath: string,
    buffer: Buffer,
    options: { contentType: string; metadata?: Record<string, any> }
  ): Promise<AssetStorageUploadResult> {
    const supabase = this.getClient();
    const cleanPath = objectPath.replace(/^\/+/, '');
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    const { error: uploadError } = await supabase.storage
      .from(this.bucketName)
      .upload(cleanPath, buffer, {
        contentType: options.contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`[SupabaseStorageProvider] Upload failed for ${cleanPath}:`, uploadError);
      throw new Error(`Supabase storage upload failed: ${uploadError.message}`);
    }

    // Step 2: Post-upload existence & verification gate
    const exists = await this.exists(cleanPath);
    if (!exists) {
      throw new Error(
        `[SupabaseStorageProvider] Post-upload verification FAILED: Object ${cleanPath} not found in bucket '${this.bucketName}' after upload.`
      );
    }

    return {
      storagePath: cleanPath,
      sizeBytes: buffer.byteLength,
      sha256,
      contentType: options.contentType,
    };
  }

  async download(objectPath: string): Promise<AssetStorageDownloadResult | null> {
    const supabase = this.getClient();
    const cleanPath = objectPath.replace(/^\/+/, '');

    const { data: blob, error } = await supabase.storage
      .from(this.bucketName)
      .download(cleanPath);

    if (error || !blob) {
      return null;
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const contentType = blob.type || 'application/octet-stream';

    return {
      buffer,
      contentType,
      sizeBytes: buffer.byteLength,
      sha256,
    };
  }

  async exists(objectPath: string): Promise<boolean> {
    try {
      const supabase = this.getClient();
      const cleanPath = objectPath.replace(/^\/+/, '');
      const pathParts = cleanPath.split('/');
      const filename = pathParts.pop() || '';
      const folder = pathParts.join('/');

      const { data: files, error } = await supabase.storage
        .from(this.bucketName)
        .list(folder || undefined, {
          search: filename,
        });

      if (!error && files && files.some((f) => f.name === filename)) {
        return true;
      }

      // Fallback existence check via download
      const { data: dlBlob } = await supabase.storage
        .from(this.bucketName)
        .download(cleanPath);
      return Boolean(dlBlob);
    } catch {
      return false;
    }
  }

  async metadata(objectPath: string): Promise<AssetStorageMetadata | null> {
    try {
      const supabase = this.getClient();
      const cleanPath = objectPath.replace(/^\/+/, '');
      const pathParts = cleanPath.split('/');
      const filename = pathParts.pop() || '';
      const folder = pathParts.join('/');

      const { data: files, error } = await supabase.storage
        .from(this.bucketName)
        .list(folder || undefined, {
          search: filename,
        });

      if (error || !files) return null;

      const file = files.find((f) => f.name === filename);
      if (!file) return null;

      return {
        sizeBytes: (file.metadata?.size as number) || (file as any).size || 0,
        contentType: (file.metadata?.mimetype as string) || (file as any).mimetype,
        updatedAt: file.updated_at || undefined,
      };
    } catch {
      return null;
    }
  }

  async delete(objectPath: string): Promise<boolean> {
    try {
      const supabase = this.getClient();
      const cleanPath = objectPath.replace(/^\/+/, '');
      const { error } = await supabase.storage.from(this.bucketName).remove([cleanPath]);
      return !error;
    } catch {
      return false;
    }
  }

  async list(
    folderPath?: string,
    options?: { limit?: number; offset?: number; search?: string }
  ): Promise<Array<{ name: string; id?: string; updatedAt?: string; createdAt?: string; metadata?: any }>> {
    try {
      const supabase = this.getClient();
      const cleanPath = folderPath ? folderPath.replace(/^\/+/, '').replace(/\/+$/, '') : undefined;
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(cleanPath, {
          limit: options?.limit || 100,
          offset: options?.offset || 0,
          search: options?.search,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error || !data) return [];
      return data.map((item) => ({
        name: item.name,
        id: item.id || undefined,
        updatedAt: item.updated_at || undefined,
        createdAt: item.created_at || undefined,
        metadata: item.metadata || undefined,
      }));
    } catch {
      return [];
    }
  }

  async createSignedUrl(
    objectPath: string,
    expiresInSeconds: number = 900
  ): Promise<{ signedUrl: string; expiresAt: string } | null> {
    try {
      const supabase = this.getClient();
      const cleanPath = objectPath.replace(/^\/+/, '');
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(cleanPath, expiresInSeconds);

      if (error || !data?.signedUrl) {
        console.error(`[SupabaseStorageProvider] createSignedUrl failed for ${cleanPath}:`, error);
        return null;
      }

      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
      return {
        signedUrl: data.signedUrl,
        expiresAt,
      };
    } catch (err) {
      console.error('[SupabaseStorageProvider] createSignedUrl error:', err);
      return null;
    }
  }
}
