const fs = require('fs-extra');
const path = require('path');

const webOutDir = path.join(__dirname, '..', '..', 'ralion', 'out');
const desktopDistRenderer = path.join(__dirname, '..', 'dist', 'renderer');

console.log('📂 [Copy Renderer] Target directory:', desktopDistRenderer);

fs.ensureDirSync(desktopDistRenderer);

if (fs.existsSync(webOutDir)) {
  console.log('📂 [Copy Renderer] Copying static export from:', webOutDir);
  fs.copySync(webOutDir, desktopDistRenderer, { overwrite: true });

  // Fix absolute paths for Electron
  const indexPath = path.join(desktopDistRenderer, 'index.html');
  if (fs.existsSync(indexPath)) {
    let indexHtml = fs.readFileSync(indexPath, 'utf8');
    indexHtml = indexHtml.replace(/(href|src)="\/([^"]+)"/g, '$1="./$2"');
    fs.writeFileSync(indexPath, indexHtml, 'utf8');
    console.log('📂 [Copy Renderer] Converted absolute paths to relative in index.html');
  }
}

const serverDashboardHtml = path.join(__dirname, '..', '..', 'ralion', '.next', 'server', 'app', 'dashboard.html');
const indexHtmlPath = path.join(desktopDistRenderer, 'index.html');
if (fs.existsSync(serverDashboardHtml) && !fs.existsSync(indexHtmlPath)) {
  console.log('📄 [Copy Renderer] Copying pre-rendered Next.js dashboard into renderer index.html...');
  fs.copyFileSync(serverDashboardHtml, indexHtmlPath);
}

console.log('✅ [Copy Renderer] Success! Renderer index.html exists at:', indexHtmlPath);
