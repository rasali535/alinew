const fs = require('fs');
const path = require('path');

// Paths
const frontendBuildDir = path.join(__dirname, 'frontend', 'build');
const backendPublicDir = path.join(__dirname, 'public');

// Ensure frontend build exists
if (!fs.existsSync(frontendBuildDir)) {
    console.error('Frontend build directory not found. Run "npm run build" first.');
    process.exit(1);
}

// Remove existing backend/public if it exists
if (fs.existsSync(backendPublicDir)) {
    console.log('Removing existing backend/public...');
    fs.rmSync(backendPublicDir, { recursive: true, force: true });
}

// Move (or Copy) directory
console.log(`Moving build artifacts from ${frontendBuildDir} to ${backendPublicDir}...`);

try {
    fs.renameSync(frontendBuildDir, backendPublicDir);
    console.log('Build moved successfully!');
} catch (error) {
    // If rename fails (e.g. across partitions), try copy
    console.log('Move failed, attempting copy...');
    fs.cpSync(frontendBuildDir, backendPublicDir, { recursive: true });
    console.log('Build copied successfully!');
}
