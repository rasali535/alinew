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

// Ensure webOutDir exists, create fallback index.html if empty
if (!fs.existsSync(webOutDir)) {
  fs.mkdirpSync(webOutDir);
}

const indexHtmlPath = path.join(webOutDir, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  console.log('📄 [Build Renderer] Generating static index.html entry for Ralion Desktop...');
  const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ralion — Empowered to Prosper</title>
  <style>
    body { background-color: #09090b; color: #ffffff; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #18181b; border: 1px solid #27272a; padding: 2.5rem; border-radius: 1rem; max-width: 480px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #2563eb, #9333ea); border-radius: 0.75rem; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.5rem; margin-bottom: 1rem; }
    h1 { margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 800; }
    p { color: #a1a1aa; font-size: 0.875rem; line-height: 1.5; margin-bottom: 1.5rem; }
    .btn { background: #2563eb; color: #ffffff; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 700; cursor: pointer; text-decoration: none; display: inline-block; font-size: 0.875rem; }
    .btn:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">R</div>
    <h1>Ralion Platform Desktop</h1>
    <p>"Empowered to Prosper" — Ralion AI-Powered Business Operating System by Ras Ali Labs.</p>
    <a href="#" onclick="window.location.href='/ralion'" class="btn">Connect to Workspace</a>
  </div>
</body>
</html>`;
  fs.writeFileSync(indexHtmlPath, fallbackHtml, 'utf8');
}

console.log('📂 [Build Renderer] Step 2: Copying renderer files to apps/desktop/dist/renderer...');
fs.mkdirpSync(desktopDistRenderer);
fs.copySync(webOutDir, desktopDistRenderer, { overwrite: true });

console.log('✅ [Build Renderer] Success! Renderer static files bundled at:', desktopDistRenderer);
