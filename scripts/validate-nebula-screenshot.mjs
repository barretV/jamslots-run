import { readFileSync } from 'fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: node validate-nebula-screenshot.mjs <png>');
  process.exit(2);
}

const buf = readFileSync(path);
const { PNG } = await import('pngjs');
const png = PNG.sync.read(buf);
const { width, height, data } = png;

const x0 = Math.floor(width * 0.12);
const x1 = Math.floor(width * 0.88);
const y0 = Math.floor(height * 0.14);
const y1 = Math.floor(height * 0.86);
let bright = 0;
let total = 0;

for (let y = y0; y < y1; y++) {
  for (let x = x0; x < x1; x++) {
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    total++;
    const lum = (r + g + b) / 3;
    if (lum > 28 && (r > 40 || g > 40 || b > 55)) bright++;
  }
}

const fillRatio = bright / total;
const pass = fillRatio >= 0.11;

console.log(JSON.stringify({ path, width, height, fillRatio, pass }));
process.exit(pass ? 0 : 1);
