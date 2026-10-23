import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const base = process.env.CHARTS_BASE ?? 'http://localhost:5290/?fresh=1&nebulaCapture=1';
const outDir =
  process.env.CHARTS_SCREENSHOT_DIR ??
  'C:/Users/janit/AppData/Local/Cursor/AgentStores/cursor_agent_stores/bc-27b61a18-4663-4d05-9c98-c020674dfa52/files/media';

const here = dirname(fileURLToPath(import.meta.url));
const validateScript = join(here, 'validate-nebula-screenshot.mjs');
const outName = process.env.NEBULA_PASS_NAME ?? 'charts-nebula-pass-6.png';

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  channel: 'chrome',
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForSelector('#tab-library', { timeout: 90000 });
await page.locator('#tab-library').click();
await page.getByRole('button', { name: 'Charts' }).click();
await page.waitForSelector('.library-charts-toolbar', { timeout: 30000 });
await page.getByRole('tab', { name: 'Nebula' }).click();
await page.getByRole('button', { name: 'Playstyle' }).click();
await page.waitForTimeout(8000);

const passPath = `${outDir}/${outName}`;
await page.locator('.library-charts-nebula__canvas').screenshot({
  path: passPath,
  timeout: 60000,
  animations: 'disabled',
});
await browser.close();

const passCheck = spawnSync(process.execPath, [validateScript, passPath], { encoding: 'utf8' });

console.log(
  JSON.stringify(
    {
      outDir,
      passPath,
      validation: passCheck.stdout || passCheck.stderr,
      passOk: passCheck.status === 0,
    },
    null,
    2,
  ),
);

process.exit(passCheck.status === 0 ? 0 : 1);
