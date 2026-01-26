const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper to execute commands
const run = (command, cwd) => {
    console.log(`\n> ${command} (in ${cwd || '.'})`);
    try {
        execSync(command, { stdio: 'inherit', cwd: cwd || process.cwd() });
    } catch (err) {
        console.error(`Command failed: ${command}`);
        process.exit(1);
    }
};

// Paths
const rootDir = __dirname;
const frontendDir = path.join(rootDir, 'frontend');
const frontendBuildDir = path.join(frontendDir, 'build');
// Deployments often look for 'build' or 'dist' folder. 'public' can be confused with source public.
const publicDir = path.join(rootDir, 'build');

console.log('--- STARTING PRODUCTION BUILD ---');

// 1. Install frontend dependencies
console.log('Installing frontend dependencies...');
run('npm install', frontendDir);

// 2. Build frontend
console.log('Building frontend...');
// Ensure CI=false so warnings don't break the build (Hostinger often sets CI=true)
// Windows support: set CI=false && ... vs Linux CI=false ...
const isWin = process.platform === "win32";
const buildCmd = isWin ? 'set CI=false && npm run build' : 'CI=false npm run build';
run(buildCmd, frontendDir);

// 3. Move Artifacts
console.log('Moving build artifacts...');

// Clean existing public dir
if (fs.existsSync(publicDir)) {
    console.log('Cleaning command...');
    fs.rmSync(publicDir, { recursive: true, force: true });
}

// Move (rename) build folder to public
// Note: We use renameSync which is fast, but if it fails (cross-device), we fallback to copy
try {
    fs.renameSync(frontendBuildDir, publicDir);
} catch (err) {
    console.log('Rename failed, falling back to copy...');
    fs.cpSync(frontendBuildDir, publicDir, { recursive: true });
}

console.log('--- BUILD COMPLETE ---');
console.log('Static files are now in /public');
