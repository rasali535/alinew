const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const websiteDist = path.join(__dirname, '..', 'apps', 'website', 'dist');
const ralionOut = path.join(__dirname, '..', 'apps', 'ralion', 'out');
const ralionDest = path.join(websiteDist, 'ralion');

console.log('Merging Ralion Web into Website Dist...');

try {
  // Check if website dist exists
  if (!fs.existsSync(websiteDist)) {
    console.error('Website dist directory not found!');
    process.exit(1);
  }

  // Check if ralion out exists
  if (!fs.existsSync(ralionOut)) {
    console.error('Ralion out directory not found!');
    process.exit(1);
  }

  // Copy the entire Next.js export (out folder) into websiteDist/ralion
  const sourcePath = ralionOut;

  // Copy to websiteDist/ralion
  if (!fs.existsSync(ralionDest)) {
    fs.mkdirSync(ralionDest, { recursive: true });
  }

  fs.cpSync(sourcePath, ralionDest, { recursive: true });
  console.log('Successfully merged Ralion web into Website dist.');
  
  // Update website build folder for Hostinger compatibility
  const websiteBuild = path.join(__dirname, '..', 'apps', 'website', 'build');
  if (fs.existsSync(websiteBuild)) {
    fs.cpSync(websiteDist, websiteBuild, { recursive: true });
    console.log('Successfully updated website build directory with merged Ralion OS.');
  }

} catch (error) {
  console.error('Failed to merge builds:', error);
  process.exit(1);
}
