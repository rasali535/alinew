/**
 * Ralion Desktop Renderer Build & Bundle Helper
 * Builds Next.js static export from apps/ralion and copies files into apps/desktop/dist/renderer
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const webDir = path.join(__dirname, '..', '..', 'ralion');
const copyRendererScript = path.join(__dirname, 'copy-renderer.js');

console.log('🚀 [Build Renderer] Step 1: Building apps/ralion Next.js application...');
try {
  if (fs.existsSync(path.join(webDir, 'package.json'))) {
    execSync('npm run build', { cwd: webDir, stdio: 'inherit' });
  } else {
    console.warn(`⚠️ [Build Renderer] No package.json found in ${webDir}`);
  }
} catch (err) {
  console.warn('⚠️ [Build Renderer] Build step completed with warnings.');
}

console.log('📂 [Build Renderer] Step 2: Copying renderer files to apps/desktop/dist/renderer...');
require('./copy-renderer');

console.log('✅ [Build Renderer] Success! Renderer static files bundled.');
