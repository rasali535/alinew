import { contextBridge, ipcRenderer } from 'electron';
import * as https from 'https';
import * as zlib from 'zlib';

// Production diagnostics error handlers
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('[Renderer Diagnostics Error]', event.message, event.filename, event.lineno, event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Renderer Unhandled Rejection]', event.reason);
  });
}

type DesktopApiRequest = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
};

type DesktopApiResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
};

const ALLOWED_RALION_HOSTS = new Set(['rasalilabs.com', 'www.rasalilabs.com']);
const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);
const ALLOWED_REQUEST_HEADERS = new Set([
  'authorization',
  'accept',
  'content-type',
  'x-requested-with',
  'apikey',
  'x-api-key',
  'x-client-info',
  'idempotency-key',
  'cache-control',
  'pragma',
  'x-user-id',
  'x-workspace-id',
  'x-organization-id',
  'x-tenant-id',
  'x-tenant',
  'x-workspace',
  'x-org-id',
  'x-admin-key',
  'x-session-id',
  'x-request-id',
  'baggage',
  'sentry-trace',
]);

function sanitizeApiHeaders(headers: Record<string, string> = {}): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const normalized = key.toLowerCase();
    if (ALLOWED_REQUEST_HEADERS.has(normalized) && typeof value === 'string') {
      safe[key] = value;
    }
  }
  return safe;
}

function validateRalionApiUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || !ALLOWED_RALION_HOSTS.has(url.hostname)) {
    throw new Error('Desktop API bridge only permits the canonical Ralion HTTPS host.');
  }
  if (!url.pathname.startsWith('/ralion/api/')) {
    throw new Error('Desktop API bridge only permits Ralion API routes.');
  }
  return url;
}

function decodeResponseBody(buffer: Buffer, encodingHeader: string | string[] | undefined): Buffer {
  const encoding = Array.isArray(encodingHeader) ? encodingHeader[0] : encodingHeader;
  const normalized = String(encoding || '').trim().toLowerCase();
  if (!normalized || normalized === 'identity') return buffer;
  if (normalized.includes('br')) return zlib.brotliDecompressSync(buffer);
  if (normalized.includes('gzip')) return zlib.gunzipSync(buffer);
  if (normalized.includes('deflate')) return zlib.inflateSync(buffer);
  return buffer;
}

function requestRalionApi(payload: DesktopApiRequest, redirectDepth = 0): Promise<DesktopApiResponse> {
  if (!payload || typeof payload.url !== 'string') {
    return Promise.reject(new Error('Invalid desktop API request.'));
  }

  const target = validateRalionApiUrl(payload.url);
  const method = String(payload.method || 'GET').toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    return Promise.reject(new Error(`Unsupported desktop API method: ${method}`));
  }
  if (redirectDepth > 3) {
    return Promise.reject(new Error('Too many redirects while contacting Ralion API.'));
  }

  const headers = sanitizeApiHeaders(payload.headers || {});
  // Keep transport deterministic for the desktop bridge. A decompression fallback
  // below still protects us if a proxy compresses despite this preference.
  headers['Accept-Encoding'] = 'identity';
  headers['User-Agent'] = 'Ralion-OS-Desktop';
  const body = typeof payload.body === 'string' ? payload.body : undefined;
  if (body !== undefined) {
    headers['Content-Length'] = String(Buffer.byteLength(body, 'utf8'));
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: 'https:',
        hostname: target.hostname,
        port: 443,
        path: `${target.pathname}${target.search}`,
        method,
        headers,
        timeout: 30_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', async () => {
          const status = res.statusCode || 500;
          const location = res.headers.location;
          if (location && [301, 302, 303, 307, 308].includes(status)) {
            try {
              const redirected = new URL(location, target);
              validateRalionApiUrl(redirected.toString());
              const redirectMethod = status === 303 ? 'GET' : method;
              const nextPayload: DesktopApiRequest = {
                ...payload,
                url: redirected.toString(),
                method: redirectMethod,
                body: redirectMethod === 'GET' || redirectMethod === 'HEAD' ? null : payload.body,
              };
              resolve(await requestRalionApi(nextPayload, redirectDepth + 1));
            } catch (error) {
              reject(error);
            }
            return;
          }

          try {
            const rawBuffer = Buffer.concat(chunks);
            const decodedBuffer = decodeResponseBody(rawBuffer, res.headers['content-encoding']);
            const responseHeaders: Record<string, string> = {};
            for (const [key, value] of Object.entries(res.headers)) {
              const normalized = key.toLowerCase();
              if (normalized === 'content-encoding' || normalized === 'content-length') continue;
              if (Array.isArray(value)) responseHeaders[key] = value.join(', ');
              else if (value !== undefined) responseHeaders[key] = String(value);
            }
            responseHeaders['content-length'] = String(decodedBuffer.byteLength);

            resolve({
              status,
              statusText: res.statusMessage || '',
              headers: responseHeaders,
              body: decodedBuffer.toString('utf8'),
            });
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    req.on('timeout', () => req.destroy(new Error('Ralion API request timed out.')));
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

// Expose a secure, typed API to the renderer (Next.js web app)
// All privileged calls remain inside the preload/main boundary — no direct Node.js access from renderer.
contextBridge.exposeInMainWorld('ralionDesktop', {
  // Identity
  isDesktop: true,
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),
  getPlatformInfo: () => ipcRenderer.invoke('get-platform-info'),

  // Native Ralion API transport. The preload implementation restricts requests
  // to https://rasalilabs.com[/www]/ralion/api/* and strips unsafe headers.
  apiFetch: (request: DesktopApiRequest) => requestRalionApi(request),

  // License management
  validateLicense: (key: string) => ipcRenderer.invoke('validate-license', key),
  activateLicense: (key: string) => ipcRenderer.invoke('activate-license', key),
  deactivateLicense: () => ipcRenderer.invoke('deactivate-license'),

  // Offline & sync
  getOfflineStatus: () => ipcRenderer.invoke('get-offline-status'),
  queueOfflineAction: (action: any) => ipcRenderer.invoke('queue-offline-action', action),
  getPendingActions: () => ipcRenderer.invoke('get-pending-actions'),
  clearSyncedActions: (ids: string[]) => ipcRenderer.invoke('clear-synced-actions', ids),

  // Native UI
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('show-notification', { title, body }),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  checkUpdates: () => ipcRenderer.invoke('check-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatus: (callback: (status: any) => void) => {
    const listener = (_event: unknown, status: any) => callback(status);
    ipcRenderer.on('update-status', listener);
    return () => ipcRenderer.removeListener('update-status', listener);
  },
  onMariToggle: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('mari:toggle', listener);
    return () => ipcRenderer.removeListener('mari:toggle', listener);
  },

  // Window Controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),

  // Deep Linking / OAuth
  onOAuthCallback: (callback: (data: { access_token: string; refresh_token: string; provider_token?: string }) => void) => {
    ipcRenderer.on('oauth-callback', (_, data) => callback(data));
  },

  // AI Commands
  aiGetHardwareProfile: () => ipcRenderer.invoke('ai-get-hardware-profile'),
  aiCheckStatus: () => ipcRenderer.invoke('ai-check-status'),
  aiInstallEngine: () => ipcRenderer.invoke('ai-install-engine'),
  aiListModels: () => ipcRenderer.invoke('ai-list-models'),
  aiPullModel: (modelName: string) => ipcRenderer.invoke('ai-pull-model', modelName),
  aiRemoveModel: (modelName: string) => ipcRenderer.invoke('ai-remove-model', modelName),
  aiQuery: (prompt: string, localModel?: string, cloudApiKey?: string, offlineMode?: boolean) =>
    ipcRenderer.invoke('ai-query', { prompt, localModel, cloudApiKey, offlineMode }),

  // Vector DB Commands
  aiMemoryAdd: (content: string, metadata: any) => ipcRenderer.invoke('ai-memory-add', { content, metadata }),
  aiMemorySearch: (query: string, limit: number) => ipcRenderer.invoke('ai-memory-search', { query, limit }),
});
