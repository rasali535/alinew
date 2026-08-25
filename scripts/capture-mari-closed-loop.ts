import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:6509/ralion/mari-ai', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const inp = page.locator('input[placeholder*="Ask Mari"], input[placeholder*="focus on today"], textarea').first();
  await inp.fill('What did we learn from our latest Facebook campaign?');
  await page.keyboard.press('Enter');
  
  // Wait until loading indicator detaches or text appears
  try {
    await page.waitForSelector('text=Mari is analyzing', { state: 'detached', timeout: 25000 });
  } catch {}
  await page.waitForTimeout(3000);

  const dest = 'C:\\Users\\Ras Ali Labs\\.gemini\\antigravity-ide\\brain\\4561318a-1653-41ec-9337-def4bb341673\\phase8_mari_closed_loop_response.png';
  await page.screenshot({ path: dest, fullPage: true });
  await browser.close();
  console.log('Saved screenshot to', dest);
}

main();
