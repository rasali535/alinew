/**
 * Release Metadata Generator for Ras Ali Labs Website (/downloads)
 * Writes release.json with version, exact size, checksum, and filename
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const releaseDir = path.join(__dirname, '..', 'release');
const pkg = require('../package.json');

if (!fs.existsSync(releaseDir)) {
  console.error('❌ Release directory missing:', releaseDir);
  process.exit(1);
}

const exeFiles = fs.readdirSync(releaseDir).filter(f => f.endsWith('.exe'));

if (exeFiles.length === 0) {
  console.error('❌ No .exe binary found in release folder');
  process.exit(1);
}

const targetFile = exeFiles[0];
const filePath = path.join(releaseDir, targetFile);
const stats = fs.statSync(filePath);

// Calculate SHA256 checksum
const fileBuffer = fs.readFileSync(filePath);
const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

const releaseMetadata = {
  product: 'Ralion',
  version: pkg.version || '2.4.2',
  platform: 'windows',
  architecture: 'x64',
  filename: targetFile,
  filesize: stats.size,
  checksum: checksum,
  releaseDate: new Date().toISOString()
};

const releaseJsonPath = path.join(releaseDir, 'release.json');
fs.writeFileSync(releaseJsonPath, JSON.stringify(releaseMetadata, null, 2));

console.log('✅ Generated release.json successfully:');
console.log(JSON.stringify(releaseMetadata, null, 2));
