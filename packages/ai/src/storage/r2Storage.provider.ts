import 'server-only';
import crypto from 'crypto';
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
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;

  constructor(config: R2Config) {
    if (!config.endpoint || !config.bucketName || !config.accessKeyId || !config.secretAccessKey) {
      throw new Error('[R2StorageProvider] Missing required R2 configuration.');
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
    this.accessKeyId = config.accessKeyId.trim();
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region?.trim() || 'auto';
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

  private hmac(key: string | Buffer, value: string): Buffer {
    return crypto.createHmac('sha256', key).update(value).digest();
  }

  private formatAmzDate(date: Date): { amzDate: string; dateStamp: string } {
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    return { amzDate, dateStamp: amzDate.slice(0, 8) };
  }

  private canonicalQuery(query: Record<string, string>): string {
    return Object.entries(query)
      .sort(([aKey, aVal], [bKey, bVal]) =>
        aKey === bKey ? aVal.localeCompare(bVal) : aKey.localeCompare(bKey)
      )
      .map(([key, value]) => `${rfc3986(key)}=${rfc3986(value)}`)
      .join('&');
  }

  private signingKey(dateStamp: string): Buffer {
    const dateKey = this.hmac(`AWS4${this.secretAccessKey}`, dateStamp);
    const regionKey = this.hmac(dateKey, this.region);
    const serviceKey = this.hmac(regionKey, 's3');
    return this.hmac(serviceKey, 'aws4_request');
  }

  private canonicalUri(objectPath?: string): string {
    const bucket = rfc3986(this.bucketName);
    if (!objectPath) return `/${bucket}`;
    return `/${bucket}/${encodePath(this.normalizeObjectPath(objectPath))}`;
  }

  private async signedRequest(
    method: 'GET' | 'PUT' | 'HEAD' | 'DELETE',
    objectPath?: string,
    options: SignedRequestOptions = {}
  ): Promise<Response> {
    const now = new Date();
    const { amzDate, dateStamp } = this.formatAmzDate(now);
    const payload = options.body || Buffer.alloc(0);
    const payloadHash = this.sha256Hex(payload);
    const canonicalUri = this.canonicalUri(objectPath);
    const canonicalQueryString = this.canonicalQuery(options.query || {});

    const requestHeaders: Record<string, string> = {
      ...(options.headers || {}),
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    };

    const canonicalHeadersMap: Record<string, string> = {
      host: this.endpoint.host,
    };
    for (const [key, value] of Object.entries(requestHeaders)) {
      canonicalHeadersMap[key.toLowerCase()] = value.trim().replace(/\s+/g, ' ');
    }

    const signedHeaderNames = Object.keys(canonicalHeadersMap).sort();
    const canonicalHeaders = signedHeaderNames
      .map((key) => `${key}:${canonicalHeadersMap[key]}\n`)
      .join('');
    const signedHeaders = signedHeaderNames.join(';');

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      this.sha256Hex(canonicalRequest),
    ].join('\n');
    const signature = crypto
      .createHmac('sha256', this.signingKey(dateStamp))
      .update(stringToSign)
      .digest('hex');

    requestHeaders.Authorization =
      `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const url = new URL(this.endpoint.toString());
    url.pathname = canonicalUri;
    url.search = canonicalQueryString;

    return fetch(url, {
      method,
      headers: requestHeaders,
      body: method === 'PUT' ? new Uint8Array(payload) : undefined,
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
      throw new Error(`[R2StorageProvider] List failed (${response.status}) for prefix ${prefix}.`);
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
    const { amzDate, dateStamp } = this.formatAmzDate(now);
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const canonicalUri = this.canonicalUri(cleanPath);
    const query: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
      'X-Amz-Credential': `${this.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expires),
      'X-Amz-SignedHeaders': 'host',
    };
    const canonicalQueryString = this.canonicalQuery(query);
    const canonicalHeaders = `host:${this.endpoint.host}\n`;
    const canonicalRequest = [
      'GET',
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      this.sha256Hex(canonicalRequest),
    ].join('\n');
    const signature = crypto
      .createHmac('sha256', this.signingKey(dateStamp))
      .update(stringToSign)
      .digest('hex');

    const url = new URL(this.endpoint.toString());
    url.pathname = canonicalUri;
    url.search = `${canonicalQueryString}&X-Amz-Signature=${signature}`;

    return {
      signedUrl: url.toString(),
      expiresAt: new Date(now.getTime() + expires * 1000).toISOString(),
    };
  }
}
