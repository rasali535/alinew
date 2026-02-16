import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '../src/data');
const distDir = path.join(__dirname, '../dist/data');

if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

const files = ['portfolio.json'];

files.forEach(file => {
    const srcFile = path.join(srcDir, file);
    const distFile = path.join(distDir, file);

    if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, distFile);
        console.log(`Copied ${file} to dist/data`);
    } else {
        console.warn(`Warning: ${file} not found in src/data`);
    }
});
