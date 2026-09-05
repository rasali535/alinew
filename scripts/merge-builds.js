const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const outputDir = path.join(rootDir, 'build');

console.log('Merging workspace builds into single output directory:', outputDir);

try {
  // 1. Create fresh output directory
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });

  // 2. Copy main marketing website into root of outputDir
  const websitePaths = [
    path.join(rootDir, 'apps', 'website', 'dist'),
    path.join(rootDir, 'apps', 'website', 'build'),
  ];
  let websiteFound = false;
  for (const src of websitePaths) {
    if (fs.existsSync(src)) {
      console.log(`Copying main website from ${src} to ${outputDir}`);
      fs.cpSync(src, outputDir, { recursive: true });
      websiteFound = true;
      break;
    }
  }
  if (!websiteFound) {
    console.warn('Warning: Main website build not found.');
  }

  // 3. Helper: Copy Next.js app static export or pre-rendered pages
  function copyNextApp(appName, appDir, destSubdir) {
    const destDir = path.join(outputDir, destSubdir);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const serverAppDir = path.join(appDir, '.next', 'server', 'app');
    const staticDir = path.join(appDir, '.next', 'static');
    const publicDir = path.join(appDir, 'public');
    const outDir = path.join(appDir, 'out');

    // 1. Prioritize fresh pre-rendered pages and chunks in .next
    if (fs.existsSync(serverAppDir)) {
      console.log(`Copying pre-rendered Next.js pages for ${appName} from ${serverAppDir} -> ${destDir}`);

      // Copy public assets if present
      if (fs.existsSync(publicDir)) {
        fs.cpSync(publicDir, destDir, { recursive: true });
      }

      // Copy static JS/CSS chunks to _next/static
      if (fs.existsSync(staticDir)) {
        const nextStaticDest = path.join(destDir, '_next', 'static');
        fs.mkdirSync(nextStaticDest, { recursive: true });
        fs.cpSync(staticDir, nextStaticDest, { recursive: true });
      }

      // Recursively copy HTML files
      function copyHtmlPages(currentSrc, relativeDir = '') {
        const entries = fs.readdirSync(currentSrc, { withFileTypes: true });
        for (const entry of entries) {
          const entryPath = path.join(currentSrc, entry.name);
          if (entry.isDirectory()) {
            if (entry.name === 'api' || entry.name.startsWith('(') || entry.name === '_not-found') {
              continue;
            }
            copyHtmlPages(entryPath, path.join(relativeDir, entry.name));
          } else if (entry.isFile() && entry.name.endsWith('.html')) {
            const pageName = entry.name.replace('.html', '');
            const targetSubdir = relativeDir ? path.join(destDir, relativeDir) : destDir;

            if (pageName === 'index') {
              fs.mkdirSync(targetSubdir, { recursive: true });
              fs.copyFileSync(entryPath, path.join(targetSubdir, 'index.html'));
            } else {
              // Create both /page/index.html (for directory routing) and /page.html
              const pageDir = path.join(targetSubdir, pageName);
              fs.mkdirSync(pageDir, { recursive: true });
              fs.copyFileSync(entryPath, path.join(pageDir, 'index.html'));
              fs.copyFileSync(entryPath, path.join(targetSubdir, `${pageName}.html`));
            }
          }
        }
      }

      copyHtmlPages(serverAppDir);

      // Ensure root index.html is the rich dashboard/admin entry page
      const indexSrc = path.join(serverAppDir, 'index.html');
      const dashboardSrc = path.join(serverAppDir, 'dashboard.html');
      const adminSrc = path.join(serverAppDir, 'admin.html');
      const targetIndex = path.join(destDir, 'index.html');

      if (fs.existsSync(indexSrc)) {
        fs.copyFileSync(indexSrc, targetIndex);
      } else if (fs.existsSync(dashboardSrc)) {
        fs.copyFileSync(dashboardSrc, targetIndex);
      } else if (fs.existsSync(adminSrc)) {
        fs.copyFileSync(adminSrc, targetIndex);
      } else if (fs.existsSync(path.join(destDir, 'admin', 'index.html'))) {
        fs.copyFileSync(path.join(destDir, 'admin', 'index.html'), targetIndex);
      }
      console.log(`Successfully populated full Next.js static application for ${appName}`);
      return;
    }

    // 2. Fallback: Check for standard 'out' directory
    if (fs.existsSync(outDir)) {
      console.log(`Copying ${appName} from static export: ${outDir} -> ${destDir}`);
      fs.cpSync(outDir, destDir, { recursive: true });
      return;
    }

    console.log(`Skipping ${appName} - no build artifacts found.`);
  }

  // Copy Ralion OS
  copyNextApp('ralion', path.join(rootDir, 'apps', 'ralion'), 'ralion');

  // Copy Admin Portal
  copyNextApp('admin', path.join(rootDir, 'apps', 'admin'), 'admin');

  // Copy Desktop assets if present
  const desktopDist = path.join(rootDir, 'apps', 'desktop', 'dist');
  if (fs.existsSync(desktopDist)) {
    console.log(`Copying desktop from ${desktopDist} to ${path.join(outputDir, 'desktop')}`);
    fs.cpSync(desktopDist, path.join(outputDir, 'desktop'), { recursive: true });
  }

  // 4. Ensure .htaccess and api_proxy.php are in build root and subfolders
  const htaccessSrc = path.join(rootDir, 'apps', 'website', 'public', '.htaccess');
  const ralionHtaccessSrc = path.join(rootDir, 'apps', 'ralion', 'public', '.htaccess');
  const proxySrc = path.join(rootDir, 'apps', 'website', 'public', 'api_proxy.php');

  if (fs.existsSync(htaccessSrc)) {
    fs.copyFileSync(htaccessSrc, path.join(outputDir, '.htaccess'));
  }
  if (fs.existsSync(proxySrc)) {
    fs.copyFileSync(proxySrc, path.join(outputDir, 'api_proxy.php'));
  }

  const ralionDir = path.join(outputDir, 'ralion');
  if (fs.existsSync(ralionDir)) {
    if (fs.existsSync(ralionHtaccessSrc)) {
      fs.copyFileSync(ralionHtaccessSrc, path.join(ralionDir, '.htaccess'));
    } else if (fs.existsSync(htaccessSrc)) {
      fs.copyFileSync(htaccessSrc, path.join(ralionDir, '.htaccess'));
    }
    if (fs.existsSync(proxySrc)) {
      fs.copyFileSync(proxySrc, path.join(ralionDir, 'api_proxy.php'));
    }
  }

  const adminDir = path.join(outputDir, 'admin');
  if (fs.existsSync(adminDir)) {
    if (fs.existsSync(htaccessSrc)) {
      fs.copyFileSync(htaccessSrc, path.join(adminDir, '.htaccess'));
    }
    if (fs.existsSync(proxySrc)) {
      fs.copyFileSync(proxySrc, path.join(adminDir, 'api_proxy.php'));
    }
  }

  console.log('Successfully merged all available builds into', outputDir);

} catch (error) {
  console.error('Failed to merge builds:', error);
  process.exit(1);
}
