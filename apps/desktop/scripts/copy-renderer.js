const fs = require('fs-extra');
const path = require('path');

const webOutDir = path.join(__dirname, '..', '..', 'website', 'dist');
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

const indexHtmlPath = path.join(desktopDistRenderer, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  console.log('📄 [Copy Renderer] Creating fallback index.html...');
  const html = `<!DOCTYPE html>
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
  fs.writeFileSync(indexHtmlPath, html, 'utf8');
}

console.log('✅ [Copy Renderer] Success! Renderer index.html exists at:', indexHtmlPath);
