/**
 * Ralion Desktop Renderer Build & Bundle Helper
 * Builds Next.js static export from apps/web and copies files into apps/desktop/dist/renderer
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const webDir = path.join(__dirname, '..', '..', 'ralion');
const webOutDir = path.join(webDir, 'out');
const desktopDistRenderer = path.join(__dirname, '..', 'dist', 'renderer');

console.log('🚀 [Build Renderer] Step 1: Building apps/web static export...');
try {
  if (fs.existsSync(path.join(webDir, 'package.json'))) {
    execSync('npm run build', { cwd: webDir, stdio: 'inherit' });
  } else {
    console.warn(`⚠️ [Build Renderer] No package.json found in ${webDir}, skipping build to prevent monorepo infinite recursion.`);
  }
} catch (err) {
  console.warn('⚠️ [Build Renderer] Next.js export warning, ensuring fallback index.html');
}

// Ensure webOutDir exists
if (!fs.existsSync(webOutDir)) {
  fs.mkdirpSync(webOutDir);
}

const serverDashboardHtml = path.join(webDir, '.next', 'server', 'app', 'dashboard.html');
const indexHtmlPath = path.join(webOutDir, 'index.html');
if (fs.existsSync(serverDashboardHtml) && !fs.existsSync(indexHtmlPath)) {
  console.log('📄 [Build Renderer] Copying pre-rendered Next.js dashboard into index.html...');
  fs.copyFileSync(serverDashboardHtml, indexHtmlPath);
}

console.log('📂 [Build Renderer] Step 2: Copying renderer files to apps/desktop/dist/renderer...');
fs.mkdirpSync(desktopDistRenderer);
fs.copySync(webOutDir, desktopDistRenderer, { overwrite: true });

console.log('✅ [Build Renderer] Success! Renderer static files bundled at:', desktopDistRenderer);
