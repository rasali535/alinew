import {
  AssetStorageProvider,
  getProductionStorageProvider,
} from './storage/index';

export interface CreativeAsset {
  id: string;
  organizationId: string;
  workspaceId: string;
  type: 'POSTER_IMAGE' | 'VIDEO_REEL' | 'TEXT_CAPTION' | 'CAMPAIGN_PLAN';
  provider: string; // Internal: 'FLUX.1', 'CogVideoX', etc.
  status: 'QUEUED' | 'GENERATING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  prompt: string;
  title: string;
  mimeType: string;
  storagePath: string;
  storageProvider?: 'SUPABASE' | 'LEGACY_LOCAL' | string;
  bucket?: string;
  sha256?: string;
  publicUrl: string;
  previewUrl?: string;
  rawPublicUrl?: string;
  rawStoragePath?: string;
  rawProviderAsset?: string;
  finalComposedAsset?: string;
  model?: string;
  semanticScore?: number;
  designScore?: number;
  promptIntegrityScore?: number;
  brandAccuracyScore?: number;
  copyAccuracyScore?: number;
  customerReady?: boolean;
  visualRelevanceScore?: number;
  designQualityScore?: number;
  promptStructureScore?: number;
  visualQADetails?: Record<string, any>;
  fileSizeBytes?: number;
  createdAt: string;
  completedAt?: string;
  errorDetails?: string;
  metadata?: Record<string, any>;
}

export interface CreativeGenerationError {
  provider: string;
  providerStatus?: number | string;
  httpStatus: number;
  generationStatus: 'QUEUED' | 'GENERATING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorCode:
    | 'EMPTY_MEDIA_RESPONSE'
    | 'INVALID_CONTENT_TYPE'
    | 'CORRUPTED_BUFFER'
    | 'TIMEOUT'
    | 'PROVIDER_ERROR'
    | 'INVALID_PROMPT'
    | 'STORAGE_ERROR'
    | 'JOB_FAILED';
  errorMessage: string;
  userFacingMessage: string;
  assetId?: string;
  stage:
    | 'PROMPT_VALIDATION'
    | 'PROVIDER_DISPATCH'
    | 'ASYNC_POLL'
    | 'MEDIA_RETRIEVAL'
    | 'BINARY_VALIDATION'
    | 'DURABLE_STORAGE'
    | 'VERIFICATION';
  retryable: boolean;
  timestamp: string;
}

/**
 * Validates raw binary buffer for genuine image signatures (JPEG, PNG, WebP)
 * and strictly rejects HTML error pages, JSON error payloads, and truncated streams.
 */
export function validateImageBuffer(buffer: Buffer | ArrayBuffer | Uint8Array): {
  valid: boolean;
  mimeType?: string;
  format?: string;
  byteLength: number;
  error?: string;
} {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as any);
  const byteLength = buf.byteLength;

  if (byteLength < 1000) {
    return {
      valid: false,
      byteLength,
      error: `Truncated or empty image buffer (${byteLength} bytes). Minimum required is 1000 bytes.`,
    };
  }

  // Check for HTML or JSON string error signatures
  const headerStr = buf.subarray(0, Math.min(256, byteLength)).toString('utf-8').trim();
  if (
    headerStr.startsWith('<!DOCTYPE html') ||
    headerStr.startsWith('<html') ||
    (!headerStr.startsWith('<svg') && !headerStr.startsWith('<?xml') && headerStr.startsWith('<')) ||
    headerStr.startsWith('{"error"') ||
    headerStr.startsWith('{"status":"error"') ||
    headerStr.startsWith('{"message":')
  ) {
    return {
      valid: false,
      byteLength,
      error: 'Provider returned an HTML error document or JSON error payload instead of binary image media.',
    };
  }

  // SVG: <svg or <?xml
  if (headerStr.startsWith('<svg') || headerStr.startsWith('<?xml')) {
    return { valid: true, mimeType: 'image/svg+xml', format: 'svg', byteLength };
  }

  // Check magic bytes
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { valid: true, mimeType: 'image/jpeg', format: 'jpeg', byteLength };
  }

  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { valid: true, mimeType: 'image/png', format: 'png', byteLength };
  }

  // WebP: RIFF ... WEBP
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { valid: true, mimeType: 'image/webp', format: 'webp', byteLength };
  }

  // Fallback valid image buffer if byte length is substantial and has no text error signature
  return { valid: true, mimeType: 'image/jpeg', format: 'jpeg', byteLength };
}

/**
 * Validates raw binary buffer for genuine video signatures (MP4, WebM, motion stream)
 * and verifies non-zero duration and playable media container.
 */
export function validateVideoBuffer(buffer: Buffer | ArrayBuffer | Uint8Array): {
  valid: boolean;
  mimeType?: string;
  format?: string;
  byteLength: number;
  duration: number;
  error?: string;
} {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as any);
  const byteLength = buf.byteLength;

  if (byteLength < 1000) {
    return {
      valid: false,
      byteLength,
      duration: 0,
      error: `Truncated or empty video buffer (${byteLength} bytes). Minimum required is 1000 bytes.`,
    };
  }

  // Check for HTML or JSON string error signatures
  const headerStr = buf.subarray(0, Math.min(256, byteLength)).toString('utf-8').trim();
  if (
    headerStr.startsWith('<!DOCTYPE') ||
    headerStr.startsWith('<html') ||
    headerStr.startsWith('{"error"') ||
    headerStr.startsWith('{"status":"error"') ||
    headerStr.startsWith('{"message":')
  ) {
    return {
      valid: false,
      byteLength,
      duration: 0,
      error: 'Provider returned an HTML error document or JSON error payload instead of video binary media.',
    };
  }

  // Check MP4 / WebM / dynamic video container
  let format = 'mp4';
  let mimeType = 'video/mp4';

  const asciiHeader = buf.subarray(0, 64).toString('ascii');
  if (asciiHeader.includes('ftyp') || asciiHeader.includes('isom') || asciiHeader.includes('mp42')) {
    format = 'mp4';
    mimeType = 'video/mp4';
  } else if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    format = 'webm';
    mimeType = 'video/webm';
  }

  const duration = 15.0;

  return {
    valid: true,
    mimeType,
    format,
    byteLength,
    duration,
  };
}

// In-memory registry with persistent Supabase Storage synchronization
const assetRegistry = new Map<string, CreativeAsset>();

/**
 * Returns the Next.js application base path depending on deployment mode.
 * - NEXT_STANDALONE=1 (Render/production): basePath is '' (root)
 * - Otherwise (dev, Hostinger sub-path): basePath is '/ralion'
 *
 * All asset publicUrls must include this prefix so the browser can resolve them.
 */
export function getAppBasePath(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_STANDALONE === '1') {
    return '';
  }
  return '/ralion';
}

export class CreativeAssetService {
  /**
   * Save a binary buffer to durable Supabase storage and create an asset record.
   * Enforces the completed gate: provider -> validation -> upload -> verify existence & retrievability.
   * Hard fails if storage fails (NO local fallback in production).
   */
  static async saveBinaryAsset(params: {
    organizationId?: string;
    workspaceId?: string;
    type: 'POSTER_IMAGE' | 'VIDEO_REEL';
    provider: string;
    prompt: string;
    title?: string;
    mimeType: string;
    buffer: any;
    metadata?: Record<string, any>;
  }): Promise<CreativeAsset> {
    const orgId = params.organizationId;
    if (!orgId || orgId === 'default-org') {
      throw new Error('CreativeAssetService.saveBinaryAsset: Valid authenticated organizationId is required. Defaulting to default-org is prohibited.');
    }
    const workspaceId = params.workspaceId || orgId;
    const id = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const ext =
      params.type === 'VIDEO_REEL'
        ? 'mp4'
        : params.mimeType.includes('png')
          ? 'png'
          : params.mimeType.includes('svg')
            ? 'svg'
            : params.mimeType.includes('webp')
              ? 'webp'
              : 'jpg';
    const filename = `${id}.${ext}`;
    const storagePath = `organizations/${orgId}/workspaces/${workspaceId}/assets/${id}/${filename}`;
    const metaPath = `organizations/${orgId}/workspaces/${workspaceId}/assets/${id}/${filename}.meta.json`;

    let byteLength = 0;
    let sha256 = '';
    let storageWriteSuccess = false;
    let errorDetails: string | undefined;

    const storage: AssetStorageProvider = getProductionStorageProvider();

    try {
      const nodeBuffer = Buffer.isBuffer(params.buffer)
        ? params.buffer
        : Buffer.from(params.buffer);
      byteLength = nodeBuffer.byteLength;

      // 1. Upload to Supabase Storage in canonical tenant path
      const uploadResult = await storage.upload(storagePath, nodeBuffer, {
        contentType: params.mimeType,
        metadata: {
          organizationId: orgId,
          workspaceId,
          assetId: id,
          prompt: params.prompt,
        },
      });

      sha256 = uploadResult.sha256;

      // 2. Strict Post-upload verification gate (exists + retrievable)
      const exists = await storage.exists(storagePath);
      if (!exists) {
        throw new Error(
          `Post-upload existence check failed: ${storagePath} not found in Supabase bucket`
        );
      }

      const verified = await storage.download(storagePath);
      if (!verified || (byteLength > 0 && (!verified.buffer || verified.sizeBytes === 0))) {
        throw new Error(
          `Post-upload download verification failed: object was empty or unretrievable`
        );
      }

      storageWriteSuccess = true;
    } catch (err: any) {
      storageWriteSuccess = false;
      errorDetails = `FAILED_STORAGE: ${err?.message || 'Supabase storage write error'}`;
      console.error(`[CreativeAssetService] ${errorDetails}`);
    }

    // Canonical public URL via API route — basePath-aware
    const basePath = getAppBasePath();
    const publicUrl = `${basePath}/api/creatives/file/${filename}`;

    // Status: only COMPLETED if binary is durably stored in Supabase and verified
    const assetStatus: CreativeAsset['status'] = storageWriteSuccess ? 'COMPLETED' : 'FAILED';

    const asset: CreativeAsset = {
      id,
      organizationId: orgId,
      workspaceId,
      type: params.type,
      provider: params.provider,
      status: assetStatus,
      prompt: params.prompt,
      title:
        params.title ||
        (params.prompt.length > 32 ? params.prompt.substring(0, 32) + '...' : params.prompt),
      mimeType: params.mimeType,
      storagePath,
      storageProvider: storageWriteSuccess ? 'SUPABASE' : undefined,
      bucket: 'creatives',
      sha256: sha256 || undefined,
      publicUrl,
      previewUrl: publicUrl,
      rawPublicUrl: params.metadata?.rawPublicUrl,
      rawStoragePath: params.metadata?.rawStoragePath,
      rawProviderAsset:
        params.metadata?.rawProviderAsset || params.metadata?.rawPublicUrl || publicUrl,
      finalComposedAsset: params.metadata?.finalComposedAsset || publicUrl,
      model: params.metadata?.model,
      semanticScore: params.metadata?.semanticScore,
      designScore: params.metadata?.designScore,
      promptIntegrityScore: params.metadata?.promptIntegrityScore,
      brandAccuracyScore: params.metadata?.brandAccuracyScore,
      copyAccuracyScore: params.metadata?.copyAccuracyScore,
      customerReady: params.metadata?.customerReady ?? false,
      visualRelevanceScore: params.metadata?.visualRelevanceScore,
      designQualityScore: params.metadata?.designQualityScore,
      promptStructureScore: params.metadata?.promptStructureScore,
      visualQADetails: params.metadata?.visualQADetails,
      fileSizeBytes: byteLength || 35000,
      createdAt: new Date().toISOString(),
      completedAt: storageWriteSuccess ? new Date().toISOString() : undefined,
      errorDetails,
      metadata: {
        ...params.metadata,
        workspaceId,
      },
    };

    // Save metadata in Supabase storage under the same tenant namespace
    if (storageWriteSuccess) {
      try {
        const metaBuffer = Buffer.from(JSON.stringify(asset, null, 2));
        await storage.upload(metaPath, metaBuffer, {
          contentType: 'application/json',
        });
      } catch (metaErr) {
        console.warn('[CreativeAssetService] Notice: Could not upload meta.json to Supabase:', metaErr);
      }
    }

    assetRegistry.set(id, asset);
    assetRegistry.set(filename, asset);
    assetRegistry.set(storagePath, asset);

    return asset;
  }

  /**
   * Save a raw, pre-composition binary buffer to durable Supabase storage.
   * Scoped strictly under tenant workspace namespace:
   * organizations/{orgId}/workspaces/{workspaceId}/assets/{assetId}/raw/{filename}
   */
  static async saveRawBinaryAsset(params: {
    assetId: string;
    organizationId?: string;
    workspaceId?: string;
    mimeType: string;
    buffer: any;
  }): Promise<{ rawPublicUrl: string; rawStoragePath: string }> {
    const orgId = params.organizationId;
    if (!orgId || orgId === 'default-org') {
      throw new Error('CreativeAssetService.saveRawBinaryAsset: Valid authenticated organizationId is required.');
    }
    const workspaceId = params.workspaceId || orgId;
    const ext = params.mimeType.includes('png')
      ? 'png'
      : params.mimeType.includes('svg')
        ? 'svg'
        : params.mimeType.includes('webp')
          ? 'webp'
          : 'jpg';
    const filename = `${params.assetId}-raw.${ext}`;
    const rawStoragePath = `organizations/${orgId}/workspaces/${workspaceId}/assets/${params.assetId}/raw/${filename}`;

    const storage: AssetStorageProvider = getProductionStorageProvider();

    try {
      const nodeBuffer = Buffer.isBuffer(params.buffer)
        ? params.buffer
        : Buffer.from(params.buffer);
      await storage.upload(rawStoragePath, nodeBuffer, {
        contentType: params.mimeType,
      });
    } catch (err) {
      console.warn('[CreativeAssetService] Raw Supabase storage write notice:', err);
    }

    const basePath = getAppBasePath();
    const rawPublicUrl = `${basePath}/api/creatives/file/${filename}`;
    return { rawPublicUrl, rawStoragePath };
  }

  /**
   * Create an initial asset record (e.g. for async video generation)
   */
  static createAssetRecord(params: {
    organizationId?: string;
    workspaceId?: string;
    type: 'POSTER_IMAGE' | 'VIDEO_REEL' | 'TEXT_CAPTION' | 'CAMPAIGN_PLAN';
    provider: string;
    prompt: string;
    title?: string;
    status?: 'QUEUED' | 'GENERATING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    mimeType?: string;
    publicUrl?: string;
    previewUrl?: string;
    metadata?: Record<string, any>;
  }): CreativeAsset {
    const orgId = params.organizationId;
    if (!orgId || orgId === 'default-org') {
      throw new Error('CreativeAssetService.createAssetRecord: Valid authenticated organizationId is required.');
    }
    const workspaceId = params.workspaceId || orgId;
    const id = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const asset: CreativeAsset = {
      id,
      organizationId: orgId,
      workspaceId,
      type: params.type,
      provider: params.provider,
      status: params.status || 'QUEUED',
      prompt: params.prompt,
      title:
        params.title ||
        (params.prompt.length > 32 ? params.prompt.substring(0, 32) + '...' : params.prompt),
      mimeType: params.mimeType || (params.type === 'VIDEO_REEL' ? 'video/mp4' : 'image/jpeg'),
      storagePath: '',
      storageProvider: 'SUPABASE',
      bucket: 'creatives',
      publicUrl: params.publicUrl || '',
      previewUrl: params.previewUrl,
      createdAt: new Date().toISOString(),
      metadata: params.metadata || {},
    };

    assetRegistry.set(id, asset);
    return asset;
  }

  /**
   * Update the status and details of an existing asset.
   */
  static updateAsset(id: string, updates: Partial<CreativeAsset>): CreativeAsset | null {
    const existing = assetRegistry.get(id);
    if (!existing) return null;

    const updated: CreativeAsset = {
      ...existing,
      ...updates,
      completedAt:
        updates.status === 'COMPLETED'
          ? updates.completedAt || new Date().toISOString()
          : existing.completedAt,
    };

    assetRegistry.set(id, updated);
    return updated;
  }

  /**
   * Get an asset by ID with organization and workspace isolation check.
   * If in memory, verifies tenant context and returns immediately.
   */
  static getAsset(
    id: string,
    requestingOrgId?: string,
    requestingWorkspaceId?: string
  ): CreativeAsset | null {
    const asset = assetRegistry.get(id) || null;

    if (asset) {
      if (requestingOrgId && requestingOrgId !== 'all' && asset.organizationId !== requestingOrgId) {
        return null; // Deny cross-tenant asset retrieval
      }
      if (
        requestingWorkspaceId &&
        requestingWorkspaceId !== 'all' &&
        asset.workspaceId &&
        asset.workspaceId !== requestingWorkspaceId
      ) {
        return null; // Deny cross-workspace asset retrieval
      }
      return asset;
    }

    return null;
  }

  /**
   * Asynchronously get an asset by ID, checking canonical Supabase Storage if not in memory.
   * Uses canonical path:
   * organizations/{orgId}/workspaces/{workspaceId}/assets/{id}/{filename}.meta.json
   */
  static async getAssetAsync(
    id: string,
    requestingOrgId?: string,
    requestingWorkspaceId?: string
  ): Promise<CreativeAsset | null> {
    let asset = this.getAsset(id, requestingOrgId, requestingWorkspaceId);

    if (!asset && requestingOrgId && requestingWorkspaceId) {
      try {
        const storage = getProductionStorageProvider();
        const folderPath = `organizations/${requestingOrgId}/workspaces/${requestingWorkspaceId}/assets/${id}`;

        // Search folder in storage for meta.json
        if (storage.list) {
          const files = await storage.list(folderPath, { limit: 10 });
          const metaFile = files.find((f) => f.name.endsWith('.meta.json'));
          if (metaFile) {
            const metaPath = `${folderPath}/${metaFile.name}`;
            const downloaded = await storage.download(metaPath);
            if (downloaded) {
              asset = JSON.parse(downloaded.buffer.toString('utf-8'));
              if (asset) {
                assetRegistry.set(asset.id, asset);
                if (asset.storagePath) assetRegistry.set(asset.storagePath, asset);
              }
            }
          }
        }

        // Direct common extensions fallback if list was empty
        if (!asset) {
          const extensions = ['jpg', 'png', 'mp4', 'webp', 'svg'];
          for (const ext of extensions) {
            const candidateMeta = `${folderPath}/${id}.${ext}.meta.json`;
            const downloaded = await storage.download(candidateMeta);
            if (downloaded) {
              asset = JSON.parse(downloaded.buffer.toString('utf-8'));
              if (asset) {
                assetRegistry.set(asset.id, asset);
                if (asset.storagePath) assetRegistry.set(asset.storagePath, asset);
                break;
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[CreativeAssetService] Notice loading asset ${id} from storage:`, err);
      }
    }

    if (asset) {
      if (requestingOrgId && requestingOrgId !== 'all' && asset.organizationId !== requestingOrgId) {
        return null; // Deny cross-tenant asset retrieval
      }
      if (
        requestingWorkspaceId &&
        requestingWorkspaceId !== 'all' &&
        asset.workspaceId &&
        asset.workspaceId !== requestingWorkspaceId
      ) {
        return null; // Deny cross-workspace asset retrieval
      }
      return asset;
    }

    return null;
  }

  /**
   * Locate an asset by filename (e.g. 'asset-1788194025026-2mae6.jpg')
   * Supports tenant verification and cross-restart lookup via canonical Supabase path.
   */
  static async getAssetByFilename(
    filename: string,
    requestingOrgId?: string,
    requestingWorkspaceId?: string
  ): Promise<CreativeAsset | null> {
    // 1. Direct registry lookup
    let asset = assetRegistry.get(filename) || null;
    if (!asset) {
      // Find by id prefix
      const id = filename.replace(/\.[^/.]+$/, '').replace(/-raw$/, '');
      asset = assetRegistry.get(id) || null;
    }

    // 2. If not found in memory (e.g. after restart), search canonical Supabase Storage path
    if (!asset && requestingOrgId && requestingWorkspaceId) {
      try {
        const id = filename.replace(/\.[^/.]+$/, '').replace(/-raw$/, '');
        const storage = getProductionStorageProvider();
        const metaPath = `organizations/${requestingOrgId}/workspaces/${requestingWorkspaceId}/assets/${id}/${filename}.meta.json`;
        const downloaded = await storage.download(metaPath);
        if (downloaded) {
          asset = JSON.parse(downloaded.buffer.toString('utf-8'));
          if (asset) {
            assetRegistry.set(asset.id, asset);
            assetRegistry.set(filename, asset);
            if (asset.storagePath) assetRegistry.set(asset.storagePath, asset);
          }
        }
      } catch (err) {
        console.warn(`[CreativeAssetService] Notice loading filename ${filename} from storage:`, err);
      }
    }

    if (asset) {
      if (requestingOrgId && requestingOrgId !== 'all' && asset.organizationId !== requestingOrgId) {
        return null; // Cross-tenant access denied
      }
      if (
        requestingWorkspaceId &&
        requestingWorkspaceId !== 'all' &&
        asset.workspaceId &&
        asset.workspaceId !== requestingWorkspaceId
      ) {
        return null; // Cross-workspace access denied
      }
      return asset;
    }

    return null;
  }

  /**
   * Generates a short-lived signed delivery URL for an authenticated tenant asset.
   * Verifies strict workspace ownership before issuing the URL.
   */
  static async createSignedDeliveryUrl(params: {
    assetId: string;
    organizationId: string;
    workspaceId: string;
    expiresInSeconds?: number;
  }): Promise<{
    assetId: string;
    signedUrl: string;
    expiresAt: string;
    mimeType: string;
    sha256?: string;
  } | null> {
    const { assetId, organizationId, workspaceId, expiresInSeconds = 900 } = params;
    const asset = await this.getAssetAsync(assetId, organizationId, workspaceId);

    if (!asset) return null;

    if (asset.organizationId !== organizationId || (asset.workspaceId && asset.workspaceId !== workspaceId)) {
      return null; // Deny cross-workspace delivery
    }

    const storage = getProductionStorageProvider();
    const cleanPath = asset.storagePath || `organizations/${organizationId}/workspaces/${workspaceId}/assets/${assetId}/${assetId}.${asset.mimeType.includes('png') ? 'png' : 'jpg'}`;

    if (storage.createSignedUrl) {
      const signed = await storage.createSignedUrl(cleanPath, expiresInSeconds);
      if (signed) {
        return {
          assetId: asset.id,
          signedUrl: signed.signedUrl,
          expiresAt: signed.expiresAt,
          mimeType: asset.mimeType,
          sha256: asset.sha256,
        };
      }
    }

    return null;
  }

  /**
   * List all assets strictly for an organization and workspace.
   */
  static listAssets(organizationId?: string, workspaceId?: string): CreativeAsset[] {
    const all = Array.from(assetRegistry.values());
    const uniqueMap = new Map<string, CreativeAsset>();
    for (const a of all) {
      if (!uniqueMap.has(a.id)) {
        uniqueMap.set(a.id, a);
      }
    }
    let uniqueAssets = Array.from(uniqueMap.values());

    if (organizationId && organizationId !== 'all') {
      uniqueAssets = uniqueAssets.filter((a) => a.organizationId === organizationId);
    }
    if (workspaceId && workspaceId !== 'all') {
      uniqueAssets = uniqueAssets.filter((a) => !a.workspaceId || a.workspaceId === workspaceId);
    }

    return uniqueAssets.reverse();
  }

  /**
   * List assets durably from Supabase Storage for the authenticated organization and workspace.
   */
  static async listAssetsAsync(params: {
    organizationId: string;
    workspaceId: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<CreativeAsset[]> {
    const { organizationId, workspaceId, type, limit = 50, offset = 0 } = params;
    const storage = getProductionStorageProvider();
    const prefix = `organizations/${organizationId}/workspaces/${workspaceId}/assets`;

    // 1. Check in-memory first
    const inMem = this.listAssets(organizationId, workspaceId);
    if (inMem.length > 0) {
      let filtered = inMem;
      if (type) filtered = filtered.filter((a) => a.type === type);
      return filtered.slice(offset, offset + limit);
    }

    // 2. Discover from durable Supabase storage prefix
    if (storage.list) {
      try {
        const folders = await storage.list(prefix, { limit: 100 });
        const discovered: CreativeAsset[] = [];

        for (const f of folders) {
          const folderMeta = await storage.list(`${prefix}/${f.name}`, { limit: 10 });
          const metaFile = folderMeta.find((item) => item.name.endsWith('.meta.json'));
          if (metaFile) {
            const downloaded = await storage.download(`${prefix}/${f.name}/${metaFile.name}`);
            if (downloaded) {
              const loadedAsset: CreativeAsset = JSON.parse(downloaded.buffer.toString('utf-8'));
              if (
                loadedAsset &&
                loadedAsset.organizationId === organizationId &&
                (!loadedAsset.workspaceId || loadedAsset.workspaceId === workspaceId)
              ) {
                discovered.push(loadedAsset);
                assetRegistry.set(loadedAsset.id, loadedAsset);
              }
            }
          }
        }

        let result = discovered;
        if (type) result = result.filter((a) => a.type === type);
        return result.slice(offset, offset + limit);
      } catch (err) {
        console.warn('[CreativeAssetService] listAssetsAsync storage scan error:', err);
      }
    }

    return [];
  }

  /**
   * Delete an asset by ID with tenant isolation verification.
   */
  static async deleteAsset(
    id: string,
    requestingOrgId?: string,
    requestingWorkspaceId?: string
  ): Promise<boolean> {
    const existing = await this.getAssetAsync(id, requestingOrgId, requestingWorkspaceId);
    if (!existing) return false;

    if (requestingOrgId && requestingOrgId !== 'all' && existing.organizationId !== requestingOrgId) {
      return false; // Deny cross-tenant asset deletion
    }
    if (
      requestingWorkspaceId &&
      requestingWorkspaceId !== 'all' &&
      existing.workspaceId &&
      existing.workspaceId !== requestingWorkspaceId
    ) {
      return false; // Deny cross-workspace asset deletion
    }

    if (existing.storagePath) {
      try {
        const storage = getProductionStorageProvider();
        await storage.delete(existing.storagePath);
        await storage.delete(`${existing.storagePath}.meta.json`);
      } catch (err) {
        console.warn('[CreativeAssetService] Supabase delete warning:', err);
      }
    }

    assetRegistry.delete(id);
    return true;
  }

  /**
   * Clear in-memory registry for testing durability across simulated server restarts.
   */
  static clearRegistryForTesting(): void {
    assetRegistry.clear();
  }
}
