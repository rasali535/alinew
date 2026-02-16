import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, '../src/data');
const distDir = path.resolve(__dirname, '../dist/data');

console.log(`Copying assets from ${srcDir} to ${distDir}`);

if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

const files = ['portfolio.json'];

files.forEach(file => {
    const srcFile = path.join(srcDir, file);
    const distFile = path.join(distDir, file);

    if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, distFile);
        console.log(`Successfully copied ${file}`);
    } else {
        console.warn(`Error: ${file} not found at expected path: ${srcFile}`);
        // Try looking in current working directory as fallback
        const fallbackPath = path.join(process.cwd(), 'src/data', file);
        if (fs.existsSync(fallbackPath)) {
            fs.copyFileSync(fallbackPath, distFile);
            console.log(`Successfully copied ${file} from fallback path: ${fallbackPath}`);
        }
    }
});
