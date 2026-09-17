const fs = require('fs');
const path = require('path');

const rendererRoot = path.join(__dirname, '..', 'dist', 'renderer');
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

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes(EXPECTED_PUBLISHABLE_KEY)) hasPublishableKey = true;
  if (source.includes(EXPECTED_API_BASE)) hasApiBase = true;
  if (hasPublishableKey && hasApiBase) break;
}

if (!hasPublishableKey) {
  console.error('[Desktop Runtime Config] Active Supabase publishable key is absent from the packaged renderer.');
  process.exit(1);
}

if (!hasApiBase) {
  console.error('[Desktop Runtime Config] Canonical Ralion production API base is absent from the packaged renderer.');
  process.exit(1);
}

console.log('[Desktop Runtime Config] Supabase publishable client configuration: VERIFIED');
console.log('[Desktop Runtime Config] Ralion production API routing: VERIFIED');
console.log('[Desktop Runtime Config] Packaged renderer runtime configuration is ready.');
