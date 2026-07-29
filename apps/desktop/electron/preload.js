const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ralionDesktop', {
  isDesktop: true,
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),
  getPlatformInfo: () => ipcRenderer.invoke('get-platform-info'),
  validateLicense: (key) => ipcRenderer.invoke('validate-license', key),
  activateLicense: (key) => ipcRenderer.invoke('activate-license', key),
  deactivateLicense: () => ipcRenderer.invoke('deactivate-license'),
  getOfflineStatus: () => ipcRenderer.invoke('get-offline-status'),
  queueOfflineAction: (action) => ipcRenderer.invoke('queue-offline-action', action),
  getPendingActions: () => ipcRenderer.invoke('get-pending-actions'),
  clearSyncedActions: (ids) => ipcRenderer.invoke('clear-synced-actions', ids),
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  checkUpdates: () => ipcRenderer.invoke('check-updates'),
});
