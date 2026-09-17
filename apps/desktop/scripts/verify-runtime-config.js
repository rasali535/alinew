const fs = require('fs');
const path = require('path');

const desktopRoot = path.join(__dirname, '..', 'dist');
const rendererRoot = path.join(desktopRoot, 'renderer');
const preloadPath = path.join(desktopRoot, 'preload.js');
const EXPECTED_PUBLISHABLE_KEY = 'sb_publishable_ZBMkUxUqKAz1b5fQ9aqUcA_xL2SB85N';
const EXPECTED_API_BASE = 'https://rasalilabs.com/ralion';

function collectJavaScriptFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) collectJavaScriptFiles(fullPath, out);
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(fullPath);
  }
  return out;
}

if (!fs.existsSync(rendererRoot)) {
  console.error('[Desktop Runtime Config] Renderer bundle is missing:', rendererRoot);
  process.exit(1);
}

const files = collectJavaScriptFiles(rendererRoot);
if (!files.length) {
  console.error('[Desktop Runtime Config] No JavaScript renderer chunks found.');
  process.exit(1);
}

let hasPublishableKey = false;
let hasApiBase = false;
let hasNetworkBootstrap = false;
let hasDiagnosticsBundle = false;

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes(EXPECTED_PUBLISHABLE_KEY)) hasPublishableKey = true;
  if (source.includes(EXPECTED_API_BASE)) hasApiBase = true;
  if (source.includes('Native Ralion API transport enabled')) hasNetworkBootstrap = true;
  if (source.includes('Ralion OS Diagnostics') && source.includes('Run full validation')) hasDiagnosticsBundle = true;
  if (hasPublishableKey && hasApiBase && hasNetworkBootstrap && hasDiagnosticsBundle) break;
}

if (!hasPublishableKey) {
  console.error('[Desktop Runtime Config] Active Supabase publishable key is absent from the packaged renderer.');
  process.exit(1);
}

if (!hasApiBase) {
  console.error('[Desktop Runtime Config] Canonical Ralion production API base is absent from the packaged renderer.');
  process.exit(1);
}

if (!hasNetworkBootstrap) {
  console.error('[Desktop Runtime Config] Native desktop network bootstrap is absent from the packaged renderer.');
  process.exit(1);
}

if (!hasDiagnosticsBundle) {
  console.error('[Desktop Runtime Config] Installed-app diagnostics UI is absent from the packaged renderer.');
  process.exit(1);
}

const diagnosticsCandidates = [
  path.join(rendererRoot, 'ralion', 'diagnostics', 'index.html'),
  path.join(rendererRoot, 'ralion', 'diagnostics.html'),
  path.join(rendererRoot, 'diagnostics', 'index.html'),
  path.join(rendererRoot, 'diagnostics.html'),
];
if (!diagnosticsCandidates.some(candidate => fs.existsSync(candidate))) {
  console.error('[Desktop Runtime Config] Diagnostics HTML entry point is missing from the packaged renderer.');
  process.exit(1);
}

if (!fs.existsSync(preloadPath)) {
  console.error('[Desktop Runtime Config] Compiled preload bridge is missing:', preloadPath);
  process.exit(1);
}

const preloadSource = fs.readFileSync(preloadPath, 'utf8');
if (!preloadSource.includes('apiFetch') || !preloadSource.includes('/ralion/api/')) {
  console.error('[Desktop Runtime Config] Secure native Ralion API bridge is absent from compiled preload.');
  process.exit(1);
}

console.log('[Desktop Runtime Config] Supabase publishable client configuration: VERIFIED');
console.log('[Desktop Runtime Config] Ralion production API routing: VERIFIED');
console.log('[Desktop Runtime Config] Native desktop API transport: VERIFIED');
console.log('[Desktop Runtime Config] Installed-app diagnostics surface: VERIFIED');
console.log('[Desktop Runtime Config] Packaged renderer runtime configuration is ready.');
