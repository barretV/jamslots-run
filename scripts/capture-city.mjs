// Repeatable interactive-city screenshot harness.
// Usage: node scripts/capture-city.mjs [label]
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const label = process.argv[2] ?? 'pass';
const base = process.env.CITY_BASE ?? 'http://localhost:5290/?fresh=1';
const outDir = process.env.CITY_SCREENSHOT_DIR ?? 'C:/Users/janit/AppData/Local/Temp/opencode/city-shots';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));

const shots = [];
async function shot(name) {
  const p = `${outDir}/${label}-${name}.png`;
  await page.screenshot({ path: p });
  shots.push(p);
}

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForSelector('#tab-library', { timeout: 90000 });
await page.locator('#tab-library').click();
await page.getByRole('button', { name: 'Interactive City' }).click();
try {
  await page.waitForSelector('#interactive-city-title', { timeout: 30000 });
} catch (err) {
  console.log(JSON.stringify({ label, stage: 'open-failed', logs: logs.slice(-40) }, null, 2));
  await shot('00-open-failed');
  await browser.close();
  process.exit(1);
}
await page.waitForTimeout(9000);
await shot('01-spawn');

// Fly forward.
await page.keyboard.down('KeyW');
await page.waitForTimeout(1600);
await page.keyboard.up('KeyW');
await page.waitForTimeout(700);
await shot('02-forward');

// Fly up + look around a bit.
await page.keyboard.down('KeyE');
await page.waitForTimeout(1200);
await page.keyboard.up('KeyE');
await page.waitForTimeout(600);
await shot('03-high');

// Strafe.
await page.keyboard.down('KeyD');
await page.waitForTimeout(1400);
await page.keyboard.up('KeyD');
await page.waitForTimeout(600);
await shot('04-strafe');

const diag = await page.evaluate(() => ({
  craft: window.__cityCraft ?? null,
  cam: window.__cityCam ?? null,
  focus: window.__cityFocus ?? null,
  postersReady: window.__cityPostersReady ?? false,
}));

await page.keyboard.press('Escape');
console.log(JSON.stringify({ label, outDir, shots, diag, errors: logs.filter((l) => /error|warn/i.test(l)).slice(-25) }, null, 2));
await browser.close();
