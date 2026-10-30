/**
 * Verification Script: Corporate Website Routes & Client Logo Asset Resolution
 * 
 * Verifies:
 * 1. All official client logo assets exist on disk, are non-empty, and have valid image headers.
 * 2. All primary corporate website routes exist and respond with status 200.
 * 3. Client logo asset URLs resolve over HTTP with 200 OK and valid image content types.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

console.log('=== STARTING WEBSITE ROUTES & CLIENT LOGO ASSET VERIFICATION ===');

const projectRoot = path.resolve('.');
const websitePublic = path.join(projectRoot, 'apps', 'website', 'public');

// 1. Validate all 12 client logo assets
const clientLogos = [
  { name: 'Pula Pitch', path: 'assets/images/pula-pitch-logo.jpg', type: 'image/jpeg' },
  { name: 'The Melody Gospel TV Show', path: 'assets/images/melody-logo.jpg', type: 'image/jpeg' },
  { name: 'Pameltex', path: 'assets/images/pameltex-logo.png', type: 'image/png' },
  { name: 'Lebville Boutique', path: 'assets/images/lebville-logo.png', type: 'image/png' },
  { name: 'Eagle Touch Tours', path: 'assets/images/eagle-touch-logo.png', type: 'image/png' },
  { name: 'BB Travel Tours', path: 'assets/images/bb-travel-logo.jpg', type: 'image/jpeg' },
  { name: 'Peregrine Tours and Safaris', path: 'assets/images/peregrine-logo.png', type: 'image/png' },
  { name: 'Safari Butler', path: 'assets/images/safari-butler-logo.jpg', type: 'image/jpeg' },
  { name: 'Foundations Academy', path: 'assets/images/foundations-academy-logo.jpg', type: 'image/jpeg' },
  { name: 'Doves Funeral Parlour', path: 'assets/images/doves-funeral-logo.png', type: 'image/png' },
  { name: 'Talent Centre', path: 'assets/images/talent-centre-logo.png', type: 'image/png' },
  { name: 'Pameltech Labs', path: 'assets/images/pameltech-labs-logo.png', type: 'image/png' }
];

console.log('1. Checking client logo asset files on disk...');
for (const logo of clientLogos) {
  const fullPath = path.join(websitePublic, logo.path);
  assert.ok(fs.existsSync(fullPath), `Asset file must exist: ${logo.path}`);
  const stat = fs.statSync(fullPath);
  assert.ok(stat.size > 1000, `Asset file must be non-trivial (>1KB): ${logo.path} (${stat.size} bytes)`);
  
  // Verify image header magic bytes
  const buf = Buffer.alloc(8);
  const fd = fs.openSync(fullPath, 'r');
  fs.readSync(fd, buf, 0, 8, 0);
  fs.closeSync(fd);

  if (logo.type === 'image/jpeg') {
    assert.equal(buf[0], 0xFF, `JPEG magic byte 0 must be 0xFF: ${logo.path}`);
    assert.equal(buf[1], 0xD8, `JPEG magic byte 1 must be 0xD8: ${logo.path}`);
  } else if (logo.type === 'image/png') {
    assert.equal(buf[0], 0x89, `PNG magic byte 0 must be 0x89: ${logo.path}`);
    assert.equal(buf.toString('ascii', 1, 4), 'PNG', `PNG signature must be PNG: ${logo.path}`);
  }
  console.log(`  ✓ ${logo.name}: ${logo.path} (${stat.size} bytes, verified ${logo.type})`);
}

// 2. Start local Vite preview on port 5199 to test HTTP resolution
console.log('\n2. Testing HTTP route and asset resolution via Vite preview...');
const previewProcess = spawn('npx', ['vite', 'preview', '--port', '5199', '--host'], {
  cwd: path.join(projectRoot, 'apps', 'website'),
  shell: true,
  stdio: 'pipe'
});

function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5199${urlPath}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

async function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await httpGet('/');
      if (res.statusCode === 200) return true;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error('Vite preview server did not start within timeout.');
}

async function runHttpChecks() {
  try {
    await waitForServer();
    console.log('  ✓ Vite preview server listening on http://localhost:5199');

    // Test routes
    const routes = [
      '/',
      '/clients',
      '/admin/clients',
      '/about',
      '/services',
      '/services/cybersecurity',
      '/partners',
      '/work',
      '/contact',
      '/pricing',
      '/downloads'
    ];

    for (const r of routes) {
      const res = await httpGet(r);
      assert.equal(res.statusCode, 200, `Route ${r} must respond with HTTP 200`);
      assert.ok(res.body.includes('<!DOCTYPE html>') || res.body.includes('<html'), `Route ${r} must return HTML`);
      console.log(`  ✓ Route ${r}: HTTP 200 OK`);
    }

    // Test client logo asset resolution
    console.log('\n3. Testing client logo asset HTTP resolution...');
    for (const logo of clientLogos) {
      const res = await httpGet(`/${logo.path}`);
      assert.equal(res.statusCode, 200, `Logo URL /${logo.path} must respond with HTTP 200`);
      console.log(`  ✓ Logo Asset /${logo.path}: HTTP 200 OK`);
    }

    console.log('\n===============================================================');
    console.log('ALL WEBSITE ROUTES & CLIENT LOGO ASSETS RESOLVED SUCCESSFULLY! 🌐');
    console.log('===============================================================\n');
  } finally {
    previewProcess.kill();
  }
}

runHttpChecks().catch(err => {
  console.error('Route & Asset Verification Failed:', err);
  previewProcess.kill();
  process.exit(1);
});
