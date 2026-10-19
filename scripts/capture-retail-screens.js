const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = path.resolve('C:\\Users\\Ras Ali Labs\\.gemini\\antigravity-ide\\brain\\d1e037cd-94f7-4028-ba3c-06ab50822fe8\\screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const targets = [
  { url: 'http://localhost:6509/ralion/retail', name: 'retail_dashboard.png' },
  { url: 'http://localhost:6509/ralion/retail/pos', name: 'retail_pos.png' },
  { url: 'http://localhost:6509/ralion/retail/inventory', name: 'retail_inventory.png' },
  { url: 'http://localhost:6509/ralion/retail/reports', name: 'retail_reports.png' }
];

for (const t of targets) {
  const dest = path.join(outDir, t.name);
  console.log(`Capturing ${t.url} -> ${dest}`);
  try {
    const stdout = execFileSync(chromePath, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--window-size=1440,900',
      '--virtual-time-budget=5000',
      `--screenshot=${dest}`,
      t.url
    ], { encoding: 'utf8' });
    const exists = fs.existsSync(dest);
    const size = exists ? fs.statSync(dest).size : 0;
    console.log(`Saved ${t.name}: exists=${exists}, size=${size} bytes`);
  } catch (err) {
    console.error(`Error capturing ${t.name}:`, err.message);
  }
}
