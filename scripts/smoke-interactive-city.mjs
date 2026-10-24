import { chromium } from 'playwright';

const base = 'http://localhost:5290/';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const log = [];

try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#tab-library', { timeout: 90000 });
  await page.locator('#tab-library').click();
  await page.getByRole('button', { name: 'Interactive City' }).click();
  await page.waitForSelector('#interactive-city-title', { timeout: 30000 });
  log.push(`opened: ${await page.locator('#interactive-city-title').textContent()}`);

  await page.waitForTimeout(2500);

  const prompt = await page.locator('.interactive-city-hud__land-prompt').textContent().catch(() => '');
  log.push(`land-prompt: ${prompt || '(none yet)'}`);

  const landBtn = page.locator('.interactive-city-touch__btn--land');
  if (await landBtn.count()) {
    await landBtn.click();
    await page.waitForTimeout(1800);
    const playTitle = await page.locator('.interactive-city-landed__title').textContent();
    log.push(`landed-title: ${playTitle}`);
  }

  await page.screenshot({ path: 'smoke-screenshots/city.png', fullPage: true });
  console.log(JSON.stringify({ ok: true, log }, null, 2));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e), log }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
