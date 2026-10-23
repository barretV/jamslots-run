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

function isStarPixel(r, g, b) {
  const lum = (r + g + b) / 3;
  return lum > 30 && (r > 42 || g > 42 || b > 52);
}

function bandFill(x0, x1, y0, y1) {
  let bright = 0;
  let total = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      total++;
      if (isStarPixel(data[i], data[i + 1], data[i + 2])) bright++;
    }
  }
  return total > 0 ? bright / total : 0;
}

const marginX = Math.floor(width * 0.1);
const marginY = Math.floor(height * 0.14);
const edge = bandFill(0, width, marginY, height);
const center = bandFill(
  Math.floor(width * 0.3),
  Math.floor(width * 0.7),
  Math.floor(height * 0.3),
  Math.floor(height * 0.7),
);

let planetLike = false;
for (let y = marginY; y < height - marginY; y++) {
  let run = 0;
  let lastKey = '';
  for (let x = marginX; x < width - marginX; x++) {
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

const reachesEdges = edge > 0.055 && edge >= center * 0.22;
const pass = !planetLike && reachesEdges;

console.log(JSON.stringify({ path, width, height, edgeFill: edge, centerFill: center, planetLike, pass }));
process.exit(pass ? 0 : 1);
