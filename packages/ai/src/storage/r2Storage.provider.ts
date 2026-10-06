import 'server-only';
import crypto from 'crypto';
import { AwsClient } from 'aws4fetch';
import {
  AssetStorageProvider,
  AssetStorageUploadResult,
  AssetStorageDownloadResult,
  AssetStorageMetadata,
} from './assetStorage.interface';

type R2Config = {
  endpoint: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
};

type SignedRequestOptions = {
  query?: Record<string, string>;
  body?: Buffer;
  headers?: Record<string, string>;
};

function rfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function encodePath(path: string): string {
  return path
    .split('/')
    .map((segment) => rfc3986(segment))
    .join('/');
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function xmlTag(block: string, tag: string): string | undefined {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match ? decodeXml(match[1]) : undefined;
}

export class R2StorageProvider implements AssetStorageProvider {
  private readonly endpoint: URL;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly client: AwsClient;

  constructor(config: R2Config) {
    if (!config.endpoint || !config.bucketName || !config.accessKeyId || !config.secretAccessKey) {
      throw new Error('[R2StorageProvider] Missing required R2 configuration.');
    }

    const accessKeyId = config.accessKeyId.trim();
    if (accessKeyId.length !== 32) {
      throw new Error(
        '[R2StorageProvider] R2_ACCESS_KEY_ID must be the 32-character S3 Access Key ID from the R2 API token screen, not the API token value.'
      );
    }

    const endpoint = new URL(config.endpoint);
    if (endpoint.protocol !== 'https:') {
      throw new Error('[R2StorageProvider] R2 endpoint must use HTTPS.');
    }
    if (!endpoint.hostname.endsWith('.r2.cloudflarestorage.com')) {
      throw new Error('[R2StorageProvider] Refusing non-Cloudflare R2 S3 endpoint.');
    }

    this.endpoint = endpoint;
    this.bucketName = config.bucketName.trim();
    this.region = config.region?.trim() || 'auto';
    this.client = new AwsClient({
      accessKeyId,
      secretAccessKey: config.secretAccessKey,
      service: 's3',
      region: this.region,
      retries: 0,
    });
  }

  getProviderName(): 'R2' {
    return 'R2';
  }

  getBucketName(): string {
    return this.bucketName;
  }

  private normalizeObjectPath(objectPath: string): string {
    const cleanPath = objectPath.replace(/^\/+/, '');
    if (!cleanPath || cleanPath.includes('\\') || cleanPath.includes('\0')) {
      throw new Error('[R2StorageProvider] Invalid object path.');
    }
    const segments = cleanPath.split('/');
    if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
      throw new Error('[R2StorageProvider] Invalid object path segments.');
    }
    return cleanPath;
  }

  private sha256Hex(value: string | Buffer): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  private objectUrl(objectPath?: string): URL {
    const url = new URL(this.endpoint.toString());
    const bucket = rfc3986(this.bucketName);
    url.pathname = objectPath
      ? `/${bucket}/${encodePath(this.normalizeObjectPath(objectPath))}`
      : `/${bucket}`;
    return url;
  }

  private async signedRequest(
    method: 'GET' | 'PUT' | 'HEAD' | 'DELETE',
    objectPath?: string,
    options: SignedRequestOptions = {}
  ): Promise<Response> {
    const url = this.objectUrl(objectPath);
    for (const [key, value] of Object.entries(options.query || {})) {
      url.searchParams.set(key, value);
    }

    const payload = method === 'PUT' ? options.body || Buffer.alloc(0) : undefined;
    const headers: Record<string, string> = { ...(options.headers || {}) };
    if (payload) {
      // Cloudflare R2's S3 PUT endpoint requires an explicit Content-Length.
      // aws4fetch signs the header along with the request, so keep it derived
      // directly from the exact byte payload being sent.
      headers['content-length'] = String(payload.byteLength);
    }

    return this.client.fetch(url.toString(), {
      method,
      headers,
      body: payload ? new Uint8Array(payload) : undefined,
      cache: 'no-store',
    });
  }

  async upload(
    objectPath: string,
    buffer: Buffer,
    options: { contentType: string; metadata?: Record<string, any> }
  ): Promise<AssetStorageUploadResult> {
    const cleanPath = this.normalizeObjectPath(objectPath);
    const sha256 = this.sha256Hex(buffer);
    const headers: Record<string, string> = {
      'content-type': options.contentType,
      'x-amz-meta-sha256': sha256,
    };

    for (const [rawKey, rawValue] of Object.entries(options.metadata || {})) {
      if (!['organizationId', 'workspaceId', 'assetId'].includes(rawKey)) continue;
      const value = String(rawValue);
      if (!/^[\x20-\x7E]{1,512}$/.test(value)) continue;
      const key = rawKey.replace(/[^A-Za-z0-9-]/g, '-').toLowerCase();
      headers[`x-amz-meta-${key}`] = value;
    }

    const response = await this.signedRequest('PUT', cleanPath, { body: buffer, headers });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `[R2StorageProvider] Upload failed (${response.status}) for ${cleanPath}: ${detail.slice(0, 300)}`
      );
    }

    const exists = await this.exists(cleanPath);
    if (!exists) {
      throw new Error(`[R2StorageProvider] Post-upload verification failed for ${cleanPath}.`);
    }

    return {
      storagePath: cleanPath,
      sizeBytes: buffer.byteLength,
      sha256,
      contentType: options.contentType,
    };
  }

  async download(objectPath: string): Promise<AssetStorageDownloadResult | null> {
    const cleanPath = this.normalizeObjectPath(objectPath);
    const response = await this.signedRequest('GET', cleanPath);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`[R2StorageProvider] Download failed (${response.status}) for ${cleanPath}.`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const sha256 = response.headers.get('x-amz-meta-sha256') || this.sha256Hex(buffer);
    return {
      buffer,
      contentType: response.headers.get('content-type') || 'application/octet-stream',
      sizeBytes: buffer.byteLength,
      sha256,
    };
  }

  async exists(objectPath: string): Promise<boolean> {
    const cleanPath = this.normalizeObjectPath(objectPath);
    const response = await this.signedRequest('HEAD', cleanPath);
    if (response.status === 404) return false;
    if (!response.ok) {
      throw new Error(`[R2StorageProvider] HEAD failed (${response.status}) for ${cleanPath}.`);
    }
    return true;
  }

  async metadata(objectPath: string): Promise<AssetStorageMetadata | null> {
    const cleanPath = this.normalizeObjectPath(objectPath);
    const response = await this.signedRequest('HEAD', cleanPath);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`[R2StorageProvider] Metadata lookup failed (${response.status}) for ${cleanPath}.`);
    }

    return {
      sizeBytes: Number(response.headers.get('content-length') || '0'),
      contentType: response.headers.get('content-type') || undefined,
      updatedAt: response.headers.get('last-modified') || undefined,
      sha256: response.headers.get('x-amz-meta-sha256') || undefined,
    };
  }

  async delete(objectPath: string): Promise<boolean> {
    const cleanPath = this.normalizeObjectPath(objectPath);
    const response = await this.signedRequest('DELETE', cleanPath);
    return response.ok || response.status === 404;
  }

  async list(
    folderPath?: string,
    options?: { limit?: number; offset?: number; search?: string }
  ): Promise<Array<{ name: string; id?: string; updatedAt?: string; createdAt?: string; metadata?: any }>> {
    const folder = folderPath ? this.normalizeObjectPath(folderPath) : '';
    const prefix = folder ? `${folder}/` : '';
    const requestedLimit = Math.min(
      Math.max((options?.limit || 100) + (options?.offset || 0), 1),
      1000
    );
    const response = await this.signedRequest('GET', undefined, {
      query: {
        delimiter: '/',
        'list-type': '2',
        'max-keys': String(requestedLimit),
        prefix,
      },
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `[R2StorageProvider] List failed (${response.status}) for prefix ${prefix}: ${detail.slice(0, 300)}`
      );
    }

    const xml = await response.text();
    const items: Array<{ name: string; id?: string; updatedAt?: string; createdAt?: string; metadata?: any }> = [];

    for (const match of xml.matchAll(/<CommonPrefixes>[\s\S]*?<Prefix>([\s\S]*?)<\/Prefix>[\s\S]*?<\/CommonPrefixes>/g)) {
      const commonPrefix = decodeXml(match[1]);
      const name = commonPrefix.slice(prefix.length).replace(/\/$/, '');
      if (name) items.push({ name, metadata: { kind: 'folder' } });
    }

    for (const match of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const block = match[1];
      const key = xmlTag(block, 'Key');
      if (!key || key === prefix || !key.startsWith(prefix)) continue;
      const relativeName = key.slice(prefix.length);
      if (!relativeName || relativeName.includes('/')) continue;
      const updatedAt = xmlTag(block, 'LastModified');
      const size = Number(xmlTag(block, 'Size') || '0');
      const eTag = xmlTag(block, 'ETag')?.replace(/^"|"$/g, '');
      items.push({
        name: relativeName,
        id: eTag,
        updatedAt,
        createdAt: updatedAt,
        metadata: { size, eTag, kind: 'file' },
      });
    }

    let filtered = options?.search
      ? items.filter((item) => item.name.includes(options.search!))
      : items;
    filtered = filtered.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    const offset = Math.max(options?.offset || 0, 0);
    const limit = Math.max(options?.limit || 100, 1);
    return filtered.slice(offset, offset + limit);
  }

  async createSignedUrl(
    objectPath: string,
    expiresInSeconds: number = 900
  ): Promise<{ signedUrl: string; expiresAt: string } | null> {
    const cleanPath = this.normalizeObjectPath(objectPath);
    const expires = Math.min(Math.max(Math.floor(expiresInSeconds), 1), 604800);
    const now = new Date();
    const url = this.objectUrl(cleanPath);
    url.searchParams.set('X-Amz-Expires', String(expires));

    const signedRequest = await this.client.sign(new Request(url.toString()), {
      aws: { signQuery: true },
    });

    return {
      signedUrl: signedRequest.url,
      expiresAt: new Date(now.getTime() + expires * 1000).toISOString(),
    };
  }
}
