import { chromium } from 'playwright';

const base = process.env.CHARTS_BASE ?? 'http://localhost:5290/?fresh=1';
const swift = process.env.SWIFT !== '0';

const browser = await chromium.launch({
  headless: true,
  args: swift
    ? ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader']
    : [],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForSelector('#tab-library', { timeout: 90000 });
await page.locator('#tab-library').click();
await page.getByRole('button', { name: 'Charts' }).click();
await page.waitForSelector('.library-charts-toolbar', { timeout: 30000 });
await page.getByRole('tab', { name: 'Nebula' }).click();
await page.getByRole('button', { name: 'Playstyle' }).click();
await page.waitForTimeout(6000);

const info = await page.evaluate(() => {
  const wrap = document.querySelector('.library-charts-nebula__canvas');
  const canvas = wrap?.querySelector('canvas');
  const rect = wrap?.getBoundingClientRect();
  const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
  const debug = gl?.getExtension('WEBGL_debug_renderer_info');
  const renderer = debug
    ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
    : 'unknown';
  const pointSize = gl ? gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) : null;
  const hint = document.querySelector('.library-charts-nebula__hint')?.textContent;
  const empty = document.querySelector('.library-charts-empty')?.textContent;
  return {
    wrap: rect ? { w: rect.width, h: rect.height } : null,
    renderer,
    pointSize,
    hint,
    empty,
  };
});

console.log(JSON.stringify({ swift, info }, null, 2));
await browser.close();
