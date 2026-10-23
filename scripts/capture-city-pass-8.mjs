import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const base = process.env.CITY_BASE ?? 'http://localhost:5290/?fresh=1';
const outDir =
  process.env.CITY_SCREENSHOT_DIR ??
  'C:/Users/janit/AppData/Local/Cursor/AgentStores/cursor_agent_stores/bc-27b61a18-4663-4d05-9c98-c020674dfa52/files/media';

const here = dirname(fileURLToPath(import.meta.url));
const validateScript = join(here, 'validate-city-screenshot.mjs');

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForSelector('#tab-library', { timeout: 90000 });
await page.locator('#tab-library').click();
await page.getByRole('button', { name: 'Interactive City' }).click();
await page.waitForSelector('#interactive-city-title', { timeout: 30000 });
await page.waitForTimeout(18000);

const spawnPath = `${outDir}/city-pass-8-spawn.png`;
await page.screenshot({ path: spawnPath, fullPage: false });

await page.keyboard.down('KeyW');
await page.waitForTimeout(2200);
await page.keyboard.up('KeyW');
await page.waitForTimeout(600);

const passPath = `${outDir}/city-pass-8.png`;
await page.screenshot({ path: passPath, fullPage: false });
await browser.close();

const spawnCheck = spawnSync(process.execPath, [validateScript, spawnPath], { encoding: 'utf8' });
const passCheck = spawnSync(process.execPath, [validateScript, passPath], { encoding: 'utf8' });

console.log(
  JSON.stringify(
    {
      outDir,
      spawnPath,
      passPath,
      spawnValidation: spawnCheck.stdout || spawnCheck.stderr,
      passValidation: passCheck.stdout || passCheck.stderr,
      spawnOk: spawnCheck.status === 0,
      passOk: passCheck.status === 0,
    },
    null,
    2,
  ),
);

process.exit(spawnCheck.status === 0 && passCheck.status === 0 ? 0 : 1);
