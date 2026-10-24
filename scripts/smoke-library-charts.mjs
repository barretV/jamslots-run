import { chromium } from 'playwright';

const base = 'http://localhost:5290/';
const outDir = process.env.SMOKE_OUT ?? 'smoke-screenshots';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const log = [];

try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#tab-library', { timeout: 90000 });
  await page.locator('#tab-library').click();
  await page.getByRole('button', { name: 'Charts' }).click();
  await page.waitForSelector('#library-charts-title', { timeout: 30000 });

  log.push(`modal: ${await page.locator('#library-charts-title').textContent()}`);
  log.push(`count: ${await page.locator('.library-charts-filters__count').textContent()}`);

  await page.screenshot({ path: `${outDir}/01-nebula.png`, fullPage: true });

  await page.locator('.library-charts-nebula__modes').getByRole('button', { name: 'Votes', exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/02-nebula-votes-color.png`, fullPage: true });

  await page.locator('.library-charts-filters__chips').getByRole('button', { name: /Votes > plays/i }).click();
  await page.waitForTimeout(300);
  log.push(`filter: ${await page.locator('.library-charts-filters__count').textContent()}`);

  await page.getByRole('tab', { name: 'Leaders' }).click();
  await page.waitForTimeout(800);
  const leaderTick = await page.locator('.recharts-yAxis .recharts-cartesian-axis-tick-value').first().textContent();
  log.push(`leaders-first-title: ${leaderTick?.trim()}`);
  await page.screenshot({ path: `${outDir}/03-leaders.png`, fullPage: true });

  await page.getByRole('tab', { name: 'Scatter' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/04-scatter.png`, fullPage: true });

  await page.getByRole('tab', { name: 'Compare' }).click();
  await page.waitForTimeout(800);
  const legend = await page.locator('.recharts-legend-item-text').allTextContents();
  log.push(`compare-legend: ${legend.join(' | ')}`);
  await page.screenshot({ path: `${outDir}/05-compare.png`, fullPage: true });

  await page.getByRole('button', { name: 'Clear' }).click();
  console.log(JSON.stringify({ ok: true, log }, null, 2));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e), log }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
