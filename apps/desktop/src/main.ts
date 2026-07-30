import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Tray,
  nativeImage,
  Notification,
  shell,
  dialog
} from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import * as fs from 'fs';
import Store from 'electron-store';

import { OllamaManager } from './ai/ollama-manager';
import { ModelManager } from './ai/model-manager';
import { HardwareDetector } from './ai/hardware-detect';
import { AiRouter } from './ai/ai-router';
import { VectorDB } from './ai/vector-db';

// Safely attempt electron-log require
let log: any = console;
try {
  log = require('electron-log');
  if (log.transports && log.transports.file) {
    log.transports.file.level = 'info';
  }
} catch (e) {
  // fallback to console
}

process.on('uncaughtException', (err) => {
  log.error('[Uncaught Exception]', err);
});

process.on('unhandledRejection', (reason) => {
  log.error('[Unhandled Rejection]', reason);
});

// Enforce NODE_ENV=production when packaged
if (app.isPackaged) {
  process.env.NODE_ENV = 'production';
}

// ─── Globals ───────────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const store = new Store<{
  licenseKey: string;
  deviceId: string;
  lastLicenseCheck: number;
  session: { token: string; userId: string; orgId: string } | null;
  offlinePendingActions: any[];
}>();

const RALION_API = process.env.RALION_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://rasalilabs.com';
const OFFLINE_GRACE_DAYS = 7;

let autoUpdater: any = null;
try {
  const updaterModule = require('electron-updater');
  autoUpdater = updaterModule.autoUpdater;
  if (autoUpdater && log.info) autoUpdater.logger = log;
} catch (e) {
  // fallback console
}

// ─── Device & License Utilities ───────────────────────────────────────────────
function getDeviceId(): string {
  const cached = store.get('deviceId');
  if (cached) return cached;

  const raw = `${os.hostname()}-${os.platform()}-${os.arch()}-${os.cpus()[0]?.model || 'cpu'}`;
  const id = 'RALION-' + crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24).toUpperCase();
  store.set('deviceId', id);
  return id;
}

async function validateLicense(key: string): Promise<{ valid: boolean; edition?: string; orgName?: string; error?: string }> {
  try {
    const deviceId = getDeviceId();
    const res = await fetch(`${RALION_API}/api/license/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: key, deviceId, platform: process.platform }),
    });

    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const data = (await res.json()) as any;
    store.set('lastLicenseCheck', Date.now());
    return data;
  } catch (err: any) {
    if (log.warn) log.warn('[License] Could not reach server, checking offline grace period...', err.message);

    const lastCheck = store.get('lastLicenseCheck') || 0;
    const daysSinceCheck = (Date.now() - lastCheck) / (1000 * 60 * 60 * 24);

    if (lastCheck > 0 && daysSinceCheck < OFFLINE_GRACE_DAYS) {
      if (log.info) log.info(`[License] Offline grace period active. ${Math.floor(OFFLINE_GRACE_DAYS - daysSinceCheck)} days remaining.`);
      return {
        valid: true,
        edition: 'offline_grace',
        orgName: 'Offline Mode',
        error: `Offline — ${Math.floor(OFFLINE_GRACE_DAYS - daysSinceCheck)} grace days remaining`
      };
    }

    return { valid: false, error: 'Cannot verify license. Please connect to the internet.' };
  }
}

// ─── Window Creation ────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Ralion — Empowered to Prosper',
    backgroundColor: '#09090b',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay: process.platform === 'win32' ? { color: '#09090b', symbolColor: '#ffffff', height: 32 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: false,
    },
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev) {
    const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:6509';
    log.info('[Renderer] Loading Development:', devUrl);
    mainWindow.loadURL(devUrl).catch(err => {
      log.error('[Renderer Load Failure]', err);
    });
  } else {
    // Intercept file protocol to fix absolute paths for Next.js and Vite static exports
    const { protocol } = require('electron');
    protocol.interceptFileProtocol('file', (request: any, callback: any) => {
      let urlPath = request.url.replace(/^file:\/\//i, '');
      if (process.platform === 'win32' && urlPath.match(/^\/[a-zA-Z]:\//)) {
        urlPath = urlPath.substring(1);
      }
      urlPath = decodeURIComponent(urlPath);
      
      // Next.js basePath is '/ralion', so all absolute paths start with C:/ralion/
      const driveRootRegex = process.platform === 'win32' ? /^[a-zA-Z]:[\\/]ralion[\\/]/i : /^\/ralion\//i;
      
      if (driveRootRegex.test(urlPath)) {
        // Map it to the local renderer folder by stripping the basePath 'ralion'
        const parts = urlPath.split(/[\\/]/);
        const folderIndex = parts.findIndex((p: any) => p.toLowerCase() === 'ralion');
        // Take everything after the first 'ralion'
        const relativePath = parts.slice(folderIndex + 1).join(path.sep);
        let targetPath = path.join(__dirname, 'renderer', relativePath);
        
        // Fallback to check if it's inside the ralion/ subfolder
        if (!fs.existsSync(targetPath)) {
            const fallbackPath = path.join(__dirname, 'renderer', 'ralion', relativePath);
            if (fs.existsSync(fallbackPath)) {
                targetPath = fallbackPath;
            }
        }
        
        return callback({ path: targetPath });
      }
      
      callback({ path: urlPath });
    });

    // Load local bundled static Next.js export (Ralion App) instead of website homepage
    const rendererPath = path.join(__dirname, 'renderer', 'login', 'index.html');
    log.info('[Renderer] Loading Production:', rendererPath);
    mainWindow.loadFile(rendererPath).catch(err => {
      log.error('[Renderer Load Failure] Local index.html missing or unreadable:', rendererPath, err);
    });
  }

  // Intercept navigation to load local subfolder index.html for Next static export routes
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) {
      try {
        const parsedUrl = new URL(url);
        let pathname = parsedUrl.pathname;
        if (!pathname.includes('renderer')) {
          event.preventDefault();
          let cleanPath = pathname.replace(/^\/[A-Z]:/i, '').replace(/^\//, '');
          if (cleanPath.toLowerCase().startsWith('ralion/')) {
            cleanPath = cleanPath.substring(7);
          } else if (cleanPath.toLowerCase() === 'ralion') {
            cleanPath = '';
          }
          let targetHtml = path.join(__dirname, 'renderer', cleanPath, 'index.html');
          
          if (!fs.existsSync(targetHtml)) {
            const fallbackHtml = path.join(__dirname, 'renderer', 'ralion', cleanPath, 'index.html');
            if (fs.existsSync(fallbackHtml)) {
              targetHtml = fallbackHtml;
            }
          }

          if (fs.existsSync(targetHtml)) {
            log.info('[Renderer Navigation] Redirecting file:// route to static HTML:', targetHtml);
            mainWindow?.loadFile(targetHtml);
          } else {
            log.warn(`[Renderer Navigation] Subfolder index.html not found for ${cleanPath}, falling back to login index.html`);
            mainWindow?.loadFile(path.join(__dirname, 'renderer', 'login', 'index.html'));
          }
        }
      } catch (e: any) {
        log.error('[Renderer Navigation Error]', e?.message || e);
      }
    }
  });

  // Diagnostics: fail load logging
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    const failLog = `[Renderer Did Fail Load] Attempted URL: ${validatedURL}, Error Code: ${errorCode}, Description: ${errorDescription}`;
    console.error(failLog);
    log.error(failLog);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    log.error(`[Renderer Process Crashed] Reason: ${details.reason}, Exit Code: ${details.exitCode}`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('[Renderer] Page finished loading cleanly');
    mainWindow?.webContents.executeJavaScript(
      `window.__RALION_DESKTOP__ = true; window.__RALION_VERSION__ = '${app.getVersion()}';`
    );
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (app.isPackaged && process.env.ENABLE_AUTO_UPDATE === 'true') {
    setupAutoUpdater();
  }
}

// ─── System Tray ───────────────────────────────────────────────────────────────
function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Ralion — Empowered to Prosper', enabled: false },
    { type: 'separator' },
    { label: 'Open Ralion', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: 'Check for Updates', click: () => { if (autoUpdater) autoUpdater.checkForUpdatesAndNotify(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setToolTip('Ralion Platform by Ras Ali Labs');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

// ─── Auto Updater ─────────────────────────────────────────────────────────────
function setupAutoUpdater() {
  if (!autoUpdater) return;

  try {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: `${RALION_API}/api/version/releases`,
    });

    autoUpdater.on('error', (err: any) => {
      if (log.warn) log.warn('[AutoUpdater Warning - Offline or Unreachable]', err?.message || err);
    });

    autoUpdater.on('update-available', (info: any) => {
      log.info('[AutoUpdater] Update available:', info?.version);
      if (Notification.isSupported()) {
        new Notification({
          title: 'Ralion Update Available',
          body: `Version ${info?.version} is downloading in the background.`,
        }).show();
      }
    });

    autoUpdater.on('update-downloaded', (info: any) => {
      log.info('[AutoUpdater] Update downloaded:', info?.version);
      if (mainWindow) {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Update Ready',
          message: `Ralion ${info?.version} is ready to install. Restart now?`,
          buttons: ['Restart Now', 'Later'],
        }).then(({ response }) => {
          if (response === 0) autoUpdater.quitAndInstall();
        });
      }
    });

    setTimeout(() => {
      try {
        autoUpdater.checkForUpdatesAndNotify();
      } catch (e: any) {
        log.warn('[AutoUpdater Check Warning]', e?.message || e);
      }
    }, 5000);
  } catch (e: any) {
    log.warn('[AutoUpdater Setup Warning]', e?.message || e);
  }
}

// ─── App Menu ─────────────────────────────────────────────────────────────────
function buildAppMenu() {
  const template: any[] = [
    {
      label: 'Ralion',
      submenu: [
        { label: 'About Ralion', role: 'about' },
        { type: 'separator' },
        { label: 'Check for Updates', click: () => { if (autoUpdater) autoUpdater.checkForUpdatesAndNotify(); } },
        { type: 'separator' },
        { label: 'Quit Ralion', accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4', role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Ras Ali Labs Support', click: () => shell.openExternal('https://rasalilabs.com/support') },
        { label: 'Documentation', click: () => shell.openExternal('https://docs.rasalilabs.com') },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── IPC Handlers ──────────────────────────────────────────────────────────────
function registerIpcHandlers() {
  ipcMain.handle('get-device-id', () => getDeviceId());

  ipcMain.handle('get-platform-info', () => ({
    platform: process.platform,
    arch: process.arch,
    version: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    osVersion: os.release(),
    hostname: os.hostname(),
  }));

  ipcMain.handle('validate-license', async (_, key: string) => validateLicense(key));

  ipcMain.handle('activate-license', async (_, key: string) => {
    try {
      const deviceId = getDeviceId();
      const res = await fetch(`${RALION_API}/api/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: key,
          deviceId,
          deviceName: os.hostname(),
          platform: process.platform,
        }),
      });
      const data = (await res.json()) as any;
      if (data && data.success) {
        store.set('licenseKey', key);
        store.set('lastLicenseCheck', Date.now());
      }
      return data;
    } catch (err: any) {
      log.error('[IPC Activate License Error]', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('deactivate-license', async () => {
    const key = store.get('licenseKey');
    const deviceId = getDeviceId();
    if (!key) return { success: false, error: 'No license stored' };
    try {
      const res = await fetch(`${RALION_API}/api/license/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key, deviceId }),
      });
      store.delete('licenseKey');
      return res.json();
    } catch (err: any) {
      log.error('[IPC Deactivate License Error]', err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('get-offline-status', () => {
    const lastCheck = store.get('lastLicenseCheck') || 0;
    const daysSince = (Date.now() - lastCheck) / (1000 * 60 * 60 * 24);
    return {
      isOffline: false,
      graceDaysRemaining: Math.max(0, Math.floor(OFFLINE_GRACE_DAYS - daysSince)),
      lastSyncTimestamp: new Date(lastCheck).toISOString(),
      pendingActions: (store.get('offlinePendingActions') || []).length,
    };
  });

  ipcMain.handle('queue-offline-action', (_, action: any) => {
    const pending = store.get('offlinePendingActions') || [];
    pending.push({ ...action, queuedAt: new Date().toISOString() });
    store.set('offlinePendingActions', pending);
    return { queued: true, total: pending.length };
  });

  ipcMain.handle('get-pending-actions', () => store.get('offlinePendingActions') || []);

  ipcMain.handle('clear-synced-actions', (_, syncedIds: string[]) => {
    const pending = (store.get('offlinePendingActions') || []).filter(
      (a: any) => !syncedIds.includes(a.id)
    );
    store.set('offlinePendingActions', pending);
    return { remaining: pending.length };
  });

  ipcMain.handle('show-notification', (_, { title, body }: { title: string; body: string }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });

  ipcMain.handle('check-updates', () => {
    if (autoUpdater) {
      try {
        autoUpdater.checkForUpdatesAndNotify();
      } catch (e: any) {
        log.warn('[AutoUpdater Manual Check Warning]', e?.message || e);
      }
    }
  });

  ipcMain.handle('open-external', (_, url: string) => shell.openExternal(url));

  // --- AI Architecture IPC Handlers ---
  ipcMain.handle('ai-get-hardware-profile', async () => {
    return await HardwareDetector.getProfile();
  });

  ipcMain.handle('ai-check-status', async () => {
    const isInstalled = await OllamaManager.checkInstallation();
    if (isInstalled) {
      await OllamaManager.startDaemon();
    }
    return { isInstalled };
  });

  ipcMain.handle('ai-install-engine', async (event) => {
    try {
      await OllamaManager.install((msg) => {
        event.sender.send('ai-install-progress', msg);
      });
      await OllamaManager.startDaemon();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai-list-models', async () => {
    try {
      return await ModelManager.listModels();
    } catch (error) {
      return [];
    }
  });

  ipcMain.handle('ai-pull-model', async (event, modelName: string) => {
    try {
      await ModelManager.pullModel(modelName, (msg) => {
        event.sender.send('ai-pull-progress', { model: modelName, msg });
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai-remove-model', async (_, modelName: string) => {
    try {
      await ModelManager.removeModel(modelName);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai-query', async (_, { prompt, localModel, cloudApiKey, offlineMode }) => {
    try {
      const response = await AiRouter.query(prompt, localModel, cloudApiKey, offlineMode);
      return { success: true, response };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // --- Ralion Knowledge Memory IPC ---
  ipcMain.handle('ai-memory-add', async (_, { content, metadata }) => {
    try {
      const id = await VectorDB.addDocument(content, metadata);
      return { success: true, id };
    } catch (error: any) {
      log.error('[VectorDB IPC Add Error]', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ai-memory-search', async (_, { query, limit }) => {
    try {
      const results = await VectorDB.search(query, limit);
      return { success: true, results };
    } catch (error: any) {
      log.error('[VectorDB IPC Search Error]', error);
      return { success: false, error: error.message };
    }
  });
}

// ─── Single Instance & Lifecycle ───────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  log.info('[App] Second instance attempt. Quitting...');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    log.info('[App] Ralion Desktop app ready. Initializing window & IPC...');
    
    // Check and start AI Engine silently in background if installed
    try {
      const installed = await OllamaManager.checkInstallation();
      if (installed) {
        log.info('[AI] Ollama installed. Starting daemon...');
        await OllamaManager.startDaemon();
      }
    } catch (e) {
      log.warn('[AI] Failed to check Ollama on boot:', e);
    }

    // Initialize Ralion Knowledge Memory (Vector DB)
    VectorDB.initialize();

    registerIpcHandlers();
    buildAppMenu();
    createTray();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    log.info('[App] All windows closed.');
    if (process.platform !== 'darwin') app.quit();
  });
}
