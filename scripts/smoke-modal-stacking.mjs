import { chromium } from 'playwright';

const base = 'http://localhost:5290/';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const log = [];

try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#tab-library', { timeout: 90000 });
  await page.locator('#tab-library').click();

  await page.getByRole('button', { name: 'Charts' }).click();
  await page.waitForSelector('#library-charts-title', { timeout: 30000 });

  const aside = page.locator('aside.picker-side-panel');
  const guideVisible = await aside.isVisible().catch(() => false);
  const tapVisible = await page.getByText('Tap to vote', { exact: false }).isVisible().catch(() => false);
  log.push(`charts-quick-guide-visible: ${guideVisible}`);
  log.push(`charts-tap-to-vote-visible: ${tapVisible}`);

  const tabs = await page.locator('.library-charts-modal__tab').allTextContents();
  log.push(`tabs: ${tabs.map((t) => t.trim()).join(' | ')}`);

  const legend = await page.locator('.library-charts-legend--below').textContent().catch(() => '');
  log.push(`legend-below: ${(legend ?? '').includes('Tactician')}`);

  await page.getByRole('button', { name: 'Back' }).click();
  const guideBack = await aside.isVisible().catch(() => false);
  log.push(`after-charts-back-guide-visible: ${guideBack}`);
  await page.getByRole('button', { name: 'Interactive City' }).click();
  await page.waitForSelector('#interactive-city-title', { timeout: 30000 });

  const cityGuide = await aside.isVisible().catch(() => false);
  const cityTap = await page.getByText('Tap to vote', { exact: false }).isVisible().catch(() => false);
  log.push(`city-quick-guide-visible: ${cityGuide}`);
  log.push(`city-tap-to-vote-visible: ${cityTap}`);

  await page.getByRole('button', { name: 'Back' }).click();
  const guideAfterCity = await aside.isVisible().catch(() => false);
  log.push(`after-city-back-guide-visible: ${guideAfterCity}`);

  console.log(
    JSON.stringify(
      {
        ok: !guideVisible && !tapVisible && !cityGuide && !cityTap && guideBack && guideAfterCity,
        log,
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e), log }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
