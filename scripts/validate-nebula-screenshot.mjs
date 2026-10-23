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

const x0 = Math.floor(width * 0.1);
const x1 = Math.floor(width * 0.9);
const y0 = Math.floor(height * 0.14);
const y1 = Math.floor(height * 0.9);

function isStarPixel(r, g, b) {
  const lum = (r + g + b) / 3;
  return lum > 30 && (r > 42 || g > 42 || b > 52);
}

let planetLike = false;
for (let y = y0; y < y1; y++) {
  let run = 0;
  let lastKey = '';
  for (let x = x0; x < x1; x++) {
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (!isStarPixel(r, g, b)) {
      run = 0;
      lastKey = '';
      continue;
    }
    const key = `${r >> 4},${g >> 4},${b >> 4}`;
    if (key === lastKey) run++;
    else {
      run = 1;
      lastKey = key;
    }
    if (run > 88) {
      planetLike = true;
      break;
    }
  }
  if (planetLike) break;
}

const pass = !planetLike;
console.log(JSON.stringify({ path, width, height, planetLike, pass }));
process.exit(pass ? 0 : 1);
