/**
 * Storage Abstraction Module
 */

export * from './assetStorage.interface';
export * from './supabaseStorage.provider';
export * from './r2Storage.provider';
export * from './hybridStorage.provider';

import { AssetStorageProvider } from './assetStorage.interface';
import { SupabaseStorageProvider } from './supabaseStorage.provider';
import { R2StorageProvider } from './r2Storage.provider';
import { PrimaryWithFallbackStorageProvider } from './hybridStorage.provider';

let _activeStorageProvider: AssetStorageProvider | null = null;

function requiredR2Config(): {
  endpoint: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
} {
  const endpoint = process.env.R2_ENDPOINT?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !bucketName || !accessKeyId || !secretAccessKey) {
    throw new Error(
      '[Storage] R2 is enabled but R2_ENDPOINT, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are not all configured.'
    );
  }

  return {
    endpoint,
    bucketName,
    accessKeyId,
    secretAccessKey,
    region: process.env.R2_REGION?.trim() || 'auto',
  };
}

export function getProductionStorageProvider(): AssetStorageProvider {
  if (_activeStorageProvider) return _activeStorageProvider;

  const mode = (
    process.env.RALION_ASSET_STORAGE_PROVIDER ||
    process.env.ASSET_STORAGE_PROVIDER ||
    'SUPABASE'
  ).trim().toUpperCase();

  if (mode === 'R2') {
    const r2 = new R2StorageProvider(requiredR2Config());
    const useSupabaseFallback =
      (process.env.R2_SUPABASE_FALLBACK || 'true').trim().toLowerCase() !== 'false';

    _activeStorageProvider = useSupabaseFallback
      ? new PrimaryWithFallbackStorageProvider(
          r2,
          new SupabaseStorageProvider(process.env.SUPABASE_CREATIVE_BUCKET || 'creatives')
        )
      : r2;

    return _activeStorageProvider;
  }

  _activeStorageProvider = new SupabaseStorageProvider(
    process.env.SUPABASE_CREATIVE_BUCKET || 'creatives'
  );
  return _activeStorageProvider;
}

export function setStorageProvider(provider: AssetStorageProvider): void {
  _activeStorageProvider = provider;
}
