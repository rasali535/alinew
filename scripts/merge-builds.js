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

  // 2. Define the main website which goes to the root of outputDir
  const websitePaths = [
    path.join(rootDir, 'apps', 'website', 'dist'),
    path.join(rootDir, 'apps', 'website', 'build')
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

  // 3. Define other apps to merge into subdirectories
  const apps = [
    // Ralion Web
    { name: 'ralion', src: path.join(rootDir, 'apps', 'ralion', 'out'), dest: path.join(outputDir, 'ralion') },
    { name: 'ralion (dist)', src: path.join(rootDir, 'apps', 'ralion', 'dist'), dest: path.join(outputDir, 'ralion') },
    { name: 'ralion (build)', src: path.join(rootDir, 'apps', 'ralion', 'build'), dest: path.join(outputDir, 'ralion') },
    // Admin
    { name: 'admin (.next)', src: path.join(rootDir, 'apps', 'admin', '.next'), dest: path.join(outputDir, 'admin', '.next') },
    { name: 'admin (out)', src: path.join(rootDir, 'apps', 'admin', 'out'), dest: path.join(outputDir, 'admin', 'out') },
    // Web
    { name: 'web (.next)', src: path.join(rootDir, 'apps', 'web', '.next'), dest: path.join(outputDir, 'web', '.next') },
    { name: 'web (out)', src: path.join(rootDir, 'apps', 'web', 'out'), dest: path.join(outputDir, 'web', 'out') },
    // Desktop
    { name: 'desktop', src: path.join(rootDir, 'apps', 'desktop', 'dist'), dest: path.join(outputDir, 'desktop') }
  ];

  // Merge loop
  apps.forEach(app => {
    if (fs.existsSync(app.src)) {
      console.log(`Copying ${app.name} from ${app.src} to ${app.dest}`);
      if (!fs.existsSync(app.dest)) {
        fs.mkdirSync(app.dest, { recursive: true });
      }
      fs.cpSync(app.src, app.dest, { recursive: true });
    } else {
      console.log(`Skipping ${app.name} - build output not found at ${app.src}`);
    }
  });

  console.log('Successfully merged all available builds into', outputDir);

} catch (error) {
  console.error('Failed to merge builds:', error);
  process.exit(1);
}
