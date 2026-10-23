import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const base = process.env.CITY_BASE ?? 'http://localhost:5290/?fresh=1';
const outDir =
  process.env.CITY_SCREENSHOT_DIR ??
  'C:/Users/janit/AppData/Local/Cursor/AgentStores/cursor_agent_stores/bc-27b61a18-4663-4d05-9c98-c020674dfa52/files/media';

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const logs = [];
page.on('console', (msg) => logs.push(msg.text()));

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForSelector('#tab-library', { timeout: 90000 });
await page.locator('#tab-library').click();
await page.getByRole('button', { name: 'Interactive City' }).click();
await page.waitForSelector('#interactive-city-title', { timeout: 30000 });
await page.waitForTimeout(12000);

await page.screenshot({ path: `${outDir}/city-pass-6-spawn.png`, fullPage: false });

await page.keyboard.down('KeyW');
await page.waitForTimeout(1400);
await page.keyboard.up('KeyW');
await page.waitForTimeout(800);

await page.screenshot({ path: `${outDir}/city-pass-6.png`, fullPage: false });

const cityLogs = logs.filter((l) => l.includes('city-spawn'));
console.log(JSON.stringify({ outDir, base, cityLogs, logTail: logs.slice(-8) }, null, 2));
await browser.close();
