import { chromium } from 'playwright';

const base = 'http://localhost:5290/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForSelector('#tab-library', { timeout: 90000 });
await page.locator('#tab-library').click();
await page.getByRole('button', { name: 'Charts' }).click();
await page.waitForSelector('.library-charts-toolbar', { timeout: 30000 });
await page.waitForTimeout(3500);

const guide = await page.locator('aside.picker-side-panel').isVisible().catch(() => false);
const rootHidden = await page.evaluate(() => {
  const root = document.getElementById('root');
  return root ? getComputedStyle(root).display === 'none' : true;
});
const tabs = await page.locator('.library-charts-toolbar__tab').allTextContents();

await page.screenshot({ path: 'smoke-screenshots/charts-nebula.png' });

await page.getByRole('tab', { name: 'Leaders' }).click();
await page.waitForSelector('.library-charts-leaders__chart', { timeout: 30000 });
await page.waitForTimeout(800);
const firstLeader = await page
  .locator('.library-charts-leaders__chart .recharts-yAxis text')
  .first()
  .textContent()
  .catch(() => null);
await page.screenshot({ path: 'smoke-screenshots/charts-leaders.png' });

console.log(JSON.stringify({ guide, rootHidden, tabs, firstLeader: firstLeader?.trim() }, null, 2));
await browser.close();
