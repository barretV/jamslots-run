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
await page.waitForTimeout(22000);

const passPath = `${outDir}/city-pass-9.png`;
await page.screenshot({ path: passPath, fullPage: false, animations: 'disabled', timeout: 60000 });
await browser.close();

const passCheck = spawnSync(process.execPath, [validateScript, passPath], { encoding: 'utf8' });

console.log(
  JSON.stringify(
    {
      outDir,
      passPath,
      passValidation: passCheck.stdout || passCheck.stderr,
      passOk: passCheck.status === 0,
    },
    null,
    2,
  ),
);

process.exit(passCheck.status === 0 ? 0 : 1);
