/**
 * Ralion OS Desktop Renderer Build & Bundle Helper
 * Builds the Ralion web application and copies the static renderer payload into
 * apps/desktop/dist/renderer. Desktop packaging must fail if this step is not
 * healthy; shipping a stale renderer is worse than failing the build.
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const webDir = path.join(__dirname, '..', '..', 'ralion');
const desktopRendererDir = path.join(__dirname, '..', 'dist', 'renderer');
const ralionPackage = path.join(webDir, 'package.json');

function fail(message, error) {
  console.error(`❌ [Build Renderer] ${message}`);
  if (error && error.message) console.error(error.message);
  process.exit(1);
}

if (!fs.existsSync(ralionPackage)) {
  fail(`Ralion package.json was not found at ${ralionPackage}`);
}

console.log('🚀 [Build Renderer] Step 1: Building apps/ralion Next.js application...');
try {
  execSync('npm run build', { cwd: webDir, stdio: 'inherit' });
} catch (error) {
  fail('Ralion web build failed. Desktop renderer will not be packaged.', error);
}

console.log('📂 [Build Renderer] Step 2: Copying renderer files to apps/desktop/dist/renderer...');
try {
  require('./copy-renderer');
} catch (error) {
  fail('Renderer copy step failed.', error);
}

console.log('🔎 [Build Renderer] Step 3: Validating packaged renderer entry points...');
const dashboardCandidates = [
  path.join(desktopRendererDir, 'ralion', 'dashboard', 'index.html'),
  path.join(desktopRendererDir, 'ralion', 'dashboard.html'),
  path.join(desktopRendererDir, 'dashboard', 'index.html'),
  path.join(desktopRendererDir, 'dashboard.html'),
];
const staticDir = path.join(desktopRendererDir, '_next', 'static');

if (!dashboardCandidates.some(candidate => fs.existsSync(candidate))) {
  fail('No dashboard HTML entry point was produced for the desktop renderer.');
}

if (!fs.existsSync(staticDir) || fs.readdirSync(staticDir).length === 0) {
  fail('Next.js static assets are missing from the desktop renderer bundle.');
}

console.log('✅ [Build Renderer] Success! Ralion OS renderer is build-valid and bundled.');
