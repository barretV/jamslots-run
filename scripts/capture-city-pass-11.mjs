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
const posterScript = join(here, 'validate-city-posters.mjs');

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  channel: 'chrome',
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForSelector('#tab-library', { timeout: 90000 });
await page.locator('#tab-library').click();
await page.getByRole('button', { name: 'Interactive City' }).click();
await page.waitForSelector('#interactive-city-title', { timeout: 30000 });
await page.waitForFunction(() => window.__cityPostersReady === true, { timeout: 90000 }).catch(() => {});
await page.waitForTimeout(8000);
await page.locator('.interactive-city-modal__canvas-wrap').click({ position: { x: 400, y: 300 } });
await page.waitForTimeout(800);

const passPath = `${outDir}/city-pass-11.png`;
await page.screenshot({ path: passPath, fullPage: false, animations: 'disabled', timeout: 60000 });

// Fly inward until land prompt can appear (still in fly mode).
for (let i = 0; i < 12; i++) {
  const hasLand = await page.evaluate(
    () => !!document.querySelector('.interactive-city-hud__land-prompt'),
  );
  if (hasLand) break;
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(120);
}

const before = await page.evaluate(() => {
  const c = window.__cityCraft;
  const landPrompt = document.querySelector('.interactive-city-hud__land-prompt');
  return {
    craft: c ? { x: c.x, z: c.z } : null,
    landPromptVisible: !!landPrompt,
  };
});

await page.keyboard.down('KeyW');
await page.waitForTimeout(1200);
await page.keyboard.up('KeyW');
await page.waitForTimeout(400);

const after = await page.evaluate(() => {
  const c = window.__cityCraft;
  const landPrompt = document.querySelector('.interactive-city-hud__land-prompt');
  return {
    craft: c ? { x: c.x, z: c.z } : null,
    landPromptVisible: !!landPrompt,
    flyHint: document.querySelector('.interactive-city-hud__hint')?.textContent ?? '',
  };
});

const wMoved =
  before.craft &&
  after.craft &&
  Math.hypot(after.craft.x - before.craft.x, after.craft.z - before.craft.z) > 5;
const flyWhileLandPrompt =
  (before.landPromptVisible || after.landPromptVisible) && after.flyHint.includes('WASD');

await browser.close();

const passCheck = spawnSync(process.execPath, [validateScript, passPath], { encoding: 'utf8' });
const posterCheck = spawnSync(process.execPath, [posterScript, passPath], { encoding: 'utf8' });

let topSkyOk = true;
try {
  const { PNG } = await import('pngjs');
  const { readFileSync } = await import('fs');
  const png = PNG.sync.read(readFileSync(passPath));
  let darkTop = 0;
  let topTotal = 0;
  const yEnd = Math.floor(png.height * 0.22);
  for (let y = 0; y < yEnd; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      const r = png.data[i];
      const g = png.data[i + 1];
      const b = png.data[i + 2];
      topTotal++;
      if (r < 28 && g < 22 && b < 40) darkTop++;
    }
  }
  const darkTopRatio = darkTop / topTotal;
  topSkyOk = darkTopRatio < 0.72;
} catch (e) {
  topSkyOk = false;
}

const passOk =
  passCheck.status === 0 && posterCheck.status === 0 && wMoved && topSkyOk && flyWhileLandPrompt;

console.log(
  JSON.stringify(
    {
      outDir,
      passPath,
      wMoved,
      flyWhileLandPrompt,
      landPromptBefore: before.landPromptVisible,
      landPromptAfter: after.landPromptVisible,
      distDelta:
        before.craft && after.craft
          ? Math.hypot(after.craft.x - before.craft.x, after.craft.z - before.craft.z)
          : null,
      topSkyOk,
      passValidation: passCheck.stdout || passCheck.stderr,
      posterValidation: posterCheck.stdout || posterCheck.stderr,
      passOk,
    },
    null,
    2,
  ),
);

process.exit(passOk ? 0 : 1);
