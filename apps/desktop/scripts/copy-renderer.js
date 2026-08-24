const fs = require('fs-extra');
const path = require('path');

const webDir = path.join(__dirname, '..', '..', 'ralion');
const nextStaticDir = path.join(webDir, '.next', 'static');
const nextServerAppDir = path.join(webDir, '.next', 'server', 'app');
const publicDir = path.join(webDir, 'public');
const desktopDistRenderer = path.join(__dirname, '..', 'dist', 'renderer');

console.log('📂 [Copy Renderer] Target directory:', desktopDistRenderer);

// Clean renderer directory completely to remove any stale chunks
fs.emptyDirSync(desktopDistRenderer);

// 1. Copy Next.js static chunks to /_next/static and /ralion/_next/static
if (fs.existsSync(nextStaticDir)) {
  const destStatic1 = path.join(desktopDistRenderer, '_next', 'static');
  const destStatic2 = path.join(desktopDistRenderer, 'ralion', '_next', 'static');
  fs.copySync(nextStaticDir, destStatic1, { overwrite: true });
  fs.copySync(nextStaticDir, destStatic2, { overwrite: true });
  console.log('✅ [Copy Renderer] Copied Next.js static chunks to _next/static and ralion/_next/static');
} else {
  console.warn('⚠️ [Copy Renderer] No .next/static found in', nextStaticDir);
}

// 2. Copy public directory assets
if (fs.existsSync(publicDir)) {
  fs.copySync(publicDir, desktopDistRenderer, { overwrite: true });
  fs.copySync(publicDir, path.join(desktopDistRenderer, 'ralion'), { overwrite: true });
  console.log('✅ [Copy Renderer] Copied public assets');
}

// 3. Copy prerendered HTML and RSC from .next/server/app
if (fs.existsSync(nextServerAppDir)) {
  const entries = fs.readdirSync(nextServerAppDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(nextServerAppDir, entry.name);
    if (entry.isFile()) {
      if (entry.name.endsWith('.html') || entry.name.endsWith('.rsc') || entry.name.endsWith('.meta')) {
        // Copy to root
        fs.copyFileSync(srcPath, path.join(desktopDistRenderer, entry.name));
        // Copy to ralion/
        fs.ensureDirSync(path.join(desktopDistRenderer, 'ralion'));
        fs.copyFileSync(srcPath, path.join(desktopDistRenderer, 'ralion', entry.name));

        // For .html files (like dashboard.html, login.html), create route subfolders with index.html
        if (entry.name.endsWith('.html')) {
          const routeName = entry.name.replace(/\.html$/, '');
          if (routeName !== 'index' && routeName !== '404' && routeName !== '_not-found') {
            const routeDir1 = path.join(desktopDistRenderer, routeName);
            const routeDir2 = path.join(desktopDistRenderer, 'ralion', routeName);
            fs.ensureDirSync(routeDir1);
            fs.ensureDirSync(routeDir2);
            fs.copyFileSync(srcPath, path.join(routeDir1, 'index.html'));
            fs.copyFileSync(srcPath, path.join(routeDir2, 'index.html'));
          }
        }
      }
    } else if (entry.isDirectory() && !entry.name.startsWith('(') && entry.name !== 'api') {
      fs.copySync(srcPath, path.join(desktopDistRenderer, entry.name), { overwrite: true });
      fs.copySync(srcPath, path.join(desktopDistRenderer, 'ralion', entry.name), { overwrite: true });
    }
  }

  // Ensure index.html exists at root and in ralion/ (pointing to dashboard.html if index.html is missing)
  const dashboardHtml = path.join(nextServerAppDir, 'dashboard.html');
  const indexHtml = path.join(desktopDistRenderer, 'index.html');
  if (!fs.existsSync(indexHtml) && fs.existsSync(dashboardHtml)) {
    fs.copyFileSync(dashboardHtml, indexHtml);
    fs.copyFileSync(dashboardHtml, path.join(desktopDistRenderer, 'ralion', 'index.html'));
  }
}

console.log('✅ [Copy Renderer] Success! Bundled renderer ready at:', desktopDistRenderer);
