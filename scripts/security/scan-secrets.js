#!/usr/bin/env node

/**
 * Ralion OS tracked-source secret scanner.
 *
 * Intentionally focuses on high-confidence credential patterns so it can run in CI
 * without becoming noisy. It scans files tracked by Git and never prints matched
 * credential values.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const MAX_TEXT_FILE_BYTES = 5 * 1024 * 1024;

const ignoredPathPrefixes = [
  'node_modules/',
  '.git/',
];

const placeholderFragments = [
  'your_',
  'your-',
  '<redacted>',
  '[redacted]',
  'changeme',
  'change_me',
  'example',
  'placeholder',
  'dummy',
  'fake',
  'test-only',
  'test_only',
];

const detectors = [
  {
    name: 'PRIVATE_KEY',
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    name: 'STRIPE_LIVE_SECRET_KEY',
    regex: /\bsk_live_[A-Za-z0-9]{20,}\b/g,
  },
  {
    name: 'GITHUB_TOKEN',
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/g,
  },
  {
    name: 'OPENAI_SECRET_KEY',
    regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/g,
  },
  {
    name: 'META_ACCESS_TOKEN',
    regex: /\bEAA[A-Za-z0-9]{30,}\b/g,
  },
  {
    name: 'GOOGLE_API_KEY',
    regex: /\bAIza[0-9A-Za-z_-]{30,}\b/g,
  },
];

function getTrackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return output.split('\0').filter(Boolean);
}

function isProbablyText(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  return !sample.includes(0);
}

function isPlaceholder(value) {
  const lower = value.toLowerCase();
  return placeholderFragments.some((fragment) => lower.includes(fragment));
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function scanJwtSecrets(text, findings, file) {
  const jwtRegex = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
  for (const match of text.matchAll(jwtRegex)) {
    const token = match[0];
    const payload = decodeJwtPayload(token);
    if (!payload) continue;

    const role = String(payload.role || '').toLowerCase();
    if (role === 'service_role') {
      findings.push({ file, type: 'SUPABASE_SERVICE_ROLE_JWT' });
      continue;
    }

    if (payload.private_key || payload.client_secret) {
      findings.push({ file, type: 'JWT_EMBEDDED_PRIVILEGED_SECRET' });
    }
  }
}

function scanAssignedSecrets(text, findings, file) {
  const assignmentRegex = /\b(?:SUPABASE_SERVICE_ROLE_KEY|FACEBOOK_APP_SECRET|META_APP_SECRET|OAUTH_ENCRYPTION_KEY|JWT_SECRET|PAYPAL_CLIENT_SECRET|STRIPE_SECRET_KEY|RESEND_API_KEY|SMTP_PASS(?:WORD)?|DATABASE_URL)\s*[:=]\s*['\"]?([^'\"\s,;]+)/gi;

  for (const match of text.matchAll(assignmentRegex)) {
    const value = (match[1] || '').trim();
    if (!value || isPlaceholder(value) || value.startsWith('process.env.') || value.startsWith('${')) {
      continue;
    }

    // Normal public/database configuration without embedded credentials is not a secret.
    if (/^https?:\/\//i.test(value) && !/@/.test(value)) continue;

    findings.push({ file, type: 'HARDCODED_PRIVILEGED_ASSIGNMENT' });
  }
}

function scanFile(file, findings) {
  if (ignoredPathPrefixes.some((prefix) => file.startsWith(prefix))) return;

  const absolute = path.join(repoRoot, file);
  let stat;
  try {
    stat = fs.statSync(absolute);
  } catch {
    return;
  }

  if (!stat.isFile() || stat.size > MAX_TEXT_FILE_BYTES) return;

  const buffer = fs.readFileSync(absolute);
  if (!isProbablyText(buffer)) return;

  const text = buffer.toString('utf8');

  for (const detector of detectors) {
    for (const match of text.matchAll(detector.regex)) {
      const value = match[0];
      if (isPlaceholder(value)) continue;
      findings.push({ file, type: detector.name });
    }
  }

  scanJwtSecrets(text, findings, file);
  scanAssignedSecrets(text, findings, file);
}

function main() {
  const findings = [];
  let files;

  try {
    files = getTrackedFiles();
  } catch (error) {
    console.error('[security:secrets] Unable to enumerate tracked files.');
    process.exit(2);
  }

  for (const file of files) {
    scanFile(file, findings);
  }

  const unique = Array.from(
    new Map(findings.map((finding) => [`${finding.file}:${finding.type}`, finding])).values()
  );

  if (unique.length > 0) {
    console.error(`[security:secrets] FAILED — ${unique.length} high-confidence finding(s).`);
    for (const finding of unique) {
      console.error(` - ${finding.file}: ${finding.type} [REDACTED]`);
    }
    process.exit(1);
  }

  console.log(`[security:secrets] PASS — scanned ${files.length} tracked file(s); no high-confidence privileged credentials found.`);
}

main();
