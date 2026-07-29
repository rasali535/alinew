const fs = require('fs');
const path = require('path');

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

  // Next.js with basePath '/ralion' outputs to 'out/ralion' inside 'apps/ralion/out'.
  // Let's verify if the basePath 'ralion' exists inside 'out'.
  const ralionInnerPath = path.join(ralionOut, 'ralion');
  const sourcePath = fs.existsSync(ralionInnerPath) ? ralionInnerPath : ralionOut;

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
