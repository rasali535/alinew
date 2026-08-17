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

    // A. Check for standard 'out' directory
    const outDir = path.join(appDir, 'out');
    if (fs.existsSync(outDir)) {
      console.log(`Copying ${appName} from static export: ${outDir} -> ${destDir}`);
      fs.cpSync(outDir, destDir, { recursive: true });
      return;
    }

    // B. Check for pre-rendered pages in .next/server/app
    const serverAppDir = path.join(appDir, '.next', 'server', 'app');
    const staticDir = path.join(appDir, '.next', 'static');
    const publicDir = path.join(appDir, 'public');

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

      // Ensure root index.html exists in destDir
      const indexFile = path.join(destDir, 'index.html');
      if (!fs.existsSync(indexFile)) {
        const dashboardHtml = path.join(destDir, 'dashboard', 'index.html');
        if (fs.existsSync(dashboardHtml)) {
          fs.copyFileSync(dashboardHtml, indexFile);
        }
      }
      console.log(`Successfully populated static pages for ${appName}`);
    } else {
      console.log(`Skipping ${appName} - no build artifacts found.`);
    }
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

  // 4. Ensure .htaccess with subfolder SPA routing is in build root
  const htaccessSrc = path.join(rootDir, 'apps', 'website', 'public', '.htaccess');
  if (fs.existsSync(htaccessSrc)) {
    fs.copyFileSync(htaccessSrc, path.join(outputDir, '.htaccess'));
  }

  console.log('Successfully merged all available builds into', outputDir);

} catch (error) {
  console.error('Failed to merge builds:', error);
  process.exit(1);
}
