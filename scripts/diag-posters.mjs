// Diagnose rooftop poster textures: capture network responses for thumbnails.
import { chromium } from 'playwright';

const base = process.env.CITY_BASE ?? 'http://localhost:5290/?fresh=1';
const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const net = [];
page.on('response', (res) => {
  const url = res.url();
  if (/\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(url) || /thumb|image|cover/i.test(url)) {
    net.push({ status: res.status(), ct: res.headers()['content-type'] ?? '', url: url.slice(0, 160) });
  }
});
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForSelector('#tab-library', { timeout: 90000 });
await page.locator('#tab-library').click();
await page.getByRole('button', { name: 'Interactive City' }).click();
await page.waitForSelector('#interactive-city-title', { timeout: 30000 });
await page.waitForTimeout(9000);

// Sample the actual rendered pixels if a poster material exposes its map.
console.log(JSON.stringify({ count: net.length, net: net.slice(0, 40), logs: logs.slice(-20) }, null, 2));
await browser.close();
