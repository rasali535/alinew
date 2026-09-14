const fs = require('fs');
const path = require('path');

const targetFiles = [
  '.env',
  'apps/ralion/.env.production',
  'apps/ralion/.env.local',
  'apps/admin/.env.production',
  'apps/website/.env'
];

const replacements = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_placeholder',
  SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_placeholder',
  SUPABASE_SERVICE_KEY: 'sb_secret_placeholder',
  SUPABASE_ANON_KEY: 'sb_publishable_placeholder',
  SUPABASE_KEY: 'sb_publishable_placeholder',
  VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
  VITE_SUPABASE_ANON_KEY: 'sb_publishable_placeholder'
};

let totalReplacements = 0;

for (const relPath of targetFiles) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) continue;

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const newLines = [];
  let fileChanged = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      newLines.push(line);
      continue;
    }
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      if (Object.prototype.hasOwnProperty.call(replacements, key)) {
        newLines.push(`${key}=${replacements[key]}`);
        fileChanged = true;
        totalReplacements++;
        continue;
      }
    }
    newLines.push(line);
  }

  if (fileChanged) {
    fs.writeFileSync(fullPath, newLines.join('\n'), 'utf8');
    console.log(`Sanitized Supabase credentials in ${relPath}`);
  }
}

console.log(`Sanitization complete. Total entries replaced: ${totalReplacements}`);
