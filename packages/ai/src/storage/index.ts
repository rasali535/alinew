/**
 * Storage Abstraction Module
 */

export * from './assetStorage.interface';
export * from './supabaseStorage.provider';

import { AssetStorageProvider } from './assetStorage.interface';
import { SupabaseStorageProvider } from './supabaseStorage.provider';

let _activeStorageProvider: AssetStorageProvider | null = null;

export function getProductionStorageProvider(): AssetStorageProvider {
  if (!_activeStorageProvider) {
    _activeStorageProvider = new SupabaseStorageProvider('creatives');
  }
  return _activeStorageProvider;
}

export function setStorageProvider(provider: AssetStorageProvider): void {
  _activeStorageProvider = provider;
}
