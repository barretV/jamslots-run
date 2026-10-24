import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const base = 'http://localhost:5290/';
const outDir =
  process.env.CITY_SCREENSHOT_DIR ??
  'C:/Users/janit/AppData/Local/Cursor/AgentStores/cursor_agent_stores/bc-27b61a18-4663-4d05-9c98-c020674dfa52/files/media';

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForSelector('#tab-library', { timeout: 90000 });
await page.locator('#tab-library').click();
await page.getByRole('button', { name: 'Interactive City' }).click();
await page.waitForSelector('#interactive-city-title', { timeout: 30000 });
await page.waitForTimeout(3500);

const guideVisible = await page.locator('aside.picker-side-panel').isVisible().catch(() => false);
const tapVisible = await page.getByText('Tap to vote', { exact: false }).isVisible().catch(() => false);
const rootHidden = await page.evaluate(() => {
  const root = document.getElementById('root');
  if (!root) return true;
  return getComputedStyle(root).display === 'none';
});

await page.screenshot({ path: `${outDir}/city-pass-1.png`, fullPage: false });

await page.keyboard.down('KeyW');
await page.waitForTimeout(2200);
await page.keyboard.up('KeyW');
await page.keyboard.down('KeyQ');
await page.waitForTimeout(800);
await page.keyboard.up('KeyQ');
await page.waitForTimeout(2000);

await page.screenshot({ path: `${outDir}/city-pass-2.png`, fullPage: false });

await page.keyboard.down('KeyW');
await page.waitForTimeout(1800);
await page.keyboard.up('KeyW');
await page.waitForTimeout(1500);

await page.screenshot({ path: `${outDir}/city-pass-3.png`, fullPage: false });

console.log(
  JSON.stringify({ guideVisible, tapVisible, rootHidden, outDir }, null, 2),
);

await browser.close();
