import { contextBridge, ipcRenderer } from 'electron';

// Production diagnostics error handlers
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('[Renderer Diagnostics Error]', event.message, event.filename, event.lineno, event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Renderer Unhandled Rejection]', event.reason);
  });
}

// Expose a secure, typed API to the renderer (Next.js web app)
// All calls go through IPC — no direct Node.js access from renderer
contextBridge.exposeInMainWorld('ralionDesktop', {
  // Identity
  isDesktop: true,
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),
  getPlatformInfo: () => ipcRenderer.invoke('get-platform-info'),

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
  checkUpdates: () => ipcRenderer.invoke('check-updates'),

  // Window Controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),

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
