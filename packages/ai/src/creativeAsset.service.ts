import fs from 'fs';
import path from 'path';

export interface CreativeAsset {
  id: string;
  organizationId: string;
  type: 'POSTER_IMAGE' | 'VIDEO_REEL' | 'TEXT_CAPTION' | 'CAMPAIGN_PLAN';
  provider: string; // Internal: 'FLUX.1', 'CogVideoX', etc.
  status: 'QUEUED' | 'GENERATING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  prompt: string;
  title: string;
  mimeType: string;
  storagePath: string;
  publicUrl: string;
  previewUrl?: string;
  fileSizeBytes?: number;
  createdAt: string;
  completedAt?: string;
  errorDetails?: string;
  metadata?: Record<string, any>;
}

// In-memory registry with disk persistence fallback
const assetRegistry = new Map<string, CreativeAsset>();

// Ensure local storage directory exists
function getUploadDir(): string {
  // Try Next.js public uploads directory
  const cwd = process.cwd();
  const candidateDirs = [
    path.join(cwd, 'apps', 'ralion', 'public', 'uploads', 'creatives'),
    path.join(cwd, 'public', 'uploads', 'creatives'),
    path.join(cwd, 'uploads', 'creatives'),
  ];

  for (const dir of candidateDirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      return dir;
    } catch {}
  }

  // Fallback to tmp / scratch
  const fallback = path.join(cwd, '.creatives_storage');
  if (!fs.existsSync(fallback)) {
    fs.mkdirSync(fallback, { recursive: true });
  }
  return fallback;
}

export class CreativeAssetService {
  /**
   * Save a binary buffer to durable storage and create an asset record.
   */
  static async saveBinaryAsset(params: {
    organizationId?: string;
    type: 'POSTER_IMAGE' | 'VIDEO_REEL';
    provider: string;
    prompt: string;
    title?: string;
    mimeType: string;
    buffer: Buffer | ArrayBuffer;
    metadata?: Record<string, any>;
  }): Promise<CreativeAsset> {
    const orgId = params.organizationId || 'default-org';
    const id = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const ext = params.mimeType.includes('png') ? 'png' : params.mimeType.includes('jpeg') || params.mimeType.includes('jpg') ? 'jpg' : params.type === 'VIDEO_REEL' ? 'mp4' : 'bin';
    const filename = `${id}.${ext}`;
    
    const uploadDir = getUploadDir();
    const filePath = path.join(uploadDir, filename);
    const nodeBuffer = Buffer.isBuffer(params.buffer) ? params.buffer : Buffer.from(params.buffer);

    // Write file to disk
    fs.writeFileSync(filePath, nodeBuffer);

    // Public URL accessible via Next.js static asset serving
    const publicUrl = `/ralion/uploads/creatives/${filename}`;

    const asset: CreativeAsset = {
      id,
      organizationId: orgId,
      type: params.type,
      provider: params.provider,
      status: 'COMPLETED',
      prompt: params.prompt,
      title: params.title || (params.prompt.length > 32 ? params.prompt.substring(0, 32) + '...' : params.prompt),
      mimeType: params.mimeType,
      storagePath: filePath,
      publicUrl,
      previewUrl: publicUrl,
      fileSizeBytes: nodeBuffer.byteLength,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      metadata: params.metadata || {},
    };

    assetRegistry.set(id, asset);
    return asset;
  }

  /**
   * Create an initial asset record (e.g. for async video generation)
   */
  static createAssetRecord(params: {
    organizationId?: string;
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
    const id = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const asset: CreativeAsset = {
      id,
      organizationId: params.organizationId || 'default-org',
      type: params.type,
      provider: params.provider,
      status: params.status || 'QUEUED',
      prompt: params.prompt,
      title: params.title || (params.prompt.length > 32 ? params.prompt.substring(0, 32) + '...' : params.prompt),
      mimeType: params.mimeType || (params.type === 'VIDEO_REEL' ? 'video/mp4' : 'image/jpeg'),
      storagePath: '',
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
      completedAt: updates.status === 'COMPLETED' ? (updates.completedAt || new Date().toISOString()) : existing.completedAt,
    };

    assetRegistry.set(id, updated);
    return updated;
  }

  /**
   * Get an asset by ID.
   */
  static getAsset(id: string): CreativeAsset | null {
    return assetRegistry.get(id) || null;
  }

  /**
   * List all assets for an organization.
   */
  static listAssets(organizationId?: string): CreativeAsset[] {
    const all = Array.from(assetRegistry.values());
    if (!organizationId || organizationId === 'all') return all.reverse();
    return all.filter(a => a.organizationId === organizationId || a.organizationId === 'default-org').reverse();
  }

  /**
   * Delete an asset by ID.
   */
  static deleteAsset(id: string): boolean {
    const existing = assetRegistry.get(id);
    if (!existing) return false;

    if (existing.storagePath && fs.existsSync(existing.storagePath)) {
      try {
        fs.unlinkSync(existing.storagePath);
      } catch {}
    }

    return assetRegistry.delete(id);
  }
}
