import { readFileSync } from 'fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: node validate-city-posters.mjs <png>');
  process.exit(2);
}

const buf = readFileSync(path);
const { PNG } = await import('pngjs');
const png = PNG.sync.read(buf);
const { width, height, data } = png;

const x0 = Math.floor(width * 0.08);
const x1 = Math.floor(width * 0.92);
const y0 = Math.floor(height * 0.22);
const y1 = Math.floor(height * 0.88);

let posterLike = 0;
let cyanStrip = 0;
let total = 0;

for (let y = y0; y < y1; y++) {
  for (let x = x0; x < x1; x++) {
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    total++;
    if (g > 90 && b > 120 && r < 100 && g > r + 25) cyanStrip++;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    if (spread > 55 && r > 40 && g > 40 && b > 40) posterLike++;
  }
}

const posterRatio = posterLike / total;
const cyanRatio = cyanStrip / total;
const pass = posterRatio > 0.008 && posterRatio > cyanRatio * 0.35;

console.log(JSON.stringify({ path, posterRatio, cyanRatio, pass }));
process.exit(pass ? 0 : 1);
