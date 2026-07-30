"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
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
electron_1.contextBridge.exposeInMainWorld('ralionDesktop', {
    // Identity
    isDesktop: true,
    getDeviceId: () => electron_1.ipcRenderer.invoke('get-device-id'),
    getPlatformInfo: () => electron_1.ipcRenderer.invoke('get-platform-info'),
    // License management
    validateLicense: (key) => electron_1.ipcRenderer.invoke('validate-license', key),
    activateLicense: (key) => electron_1.ipcRenderer.invoke('activate-license', key),
    deactivateLicense: () => electron_1.ipcRenderer.invoke('deactivate-license'),
    // Offline & sync
    getOfflineStatus: () => electron_1.ipcRenderer.invoke('get-offline-status'),
    queueOfflineAction: (action) => electron_1.ipcRenderer.invoke('queue-offline-action', action),
    getPendingActions: () => electron_1.ipcRenderer.invoke('get-pending-actions'),
    clearSyncedActions: (ids) => electron_1.ipcRenderer.invoke('clear-synced-actions', ids),
    // Native UI
    showNotification: (title, body) => electron_1.ipcRenderer.invoke('show-notification', { title, body }),
    openExternal: (url) => electron_1.ipcRenderer.invoke('open-external', url),
    checkUpdates: () => electron_1.ipcRenderer.invoke('check-updates'),
});
//# sourceMappingURL=preload.js.map