import { chromium } from 'playwright';

const base = process.env.CITY_BASE ?? 'http://localhost:5290/?fresh=1';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForSelector('#tab-library', { timeout: 90000 });
await page.locator('#tab-library').click();
await page.getByRole('button', { name: 'Interactive City' }).click();
await page.waitForSelector('#interactive-city-title', { timeout: 30000 });
await page.waitForFunction(() => window.__cityCraft && window.__cityFocus, { timeout: 20000 });
await page.waitForTimeout(2000);

const before = await page.evaluate(() => {
  const c = window.__cityCraft;
  const f = window.__cityFocus;
  return Math.hypot(c.x - f.x, c.z - f.z);
});

await page.keyboard.down('KeyW');
await page.waitForTimeout(2200);
await page.keyboard.up('KeyW');
await page.waitForTimeout(500);

const after = await page.evaluate(() => {
  const c = window.__cityCraft;
  const f = window.__cityFocus;
  return Math.hypot(c.x - f.x, c.z - f.z);
});

const movedTowardCity = after < before - 4;

console.log(JSON.stringify({ distBefore: before, distAfter: after, movedTowardCity }, null, 2));
await browser.close();
process.exit(movedTowardCity ? 0 : 1);
