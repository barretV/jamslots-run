import { readFileSync } from 'fs';

const path = process.argv[2];
if (!path) {
  console.error('usage: node validate-city-screenshot.mjs <png>');
  process.exit(2);
}

const buf = readFileSync(path);
if (buf[0] !== 0x89 || buf.toString('ascii', 1, 4) !== 'PNG') {
  console.error('not a png');
  process.exit(2);
}

// Minimal PNG RGBA decode via dynamic import of pngjs (devDependency)
const { PNG } = await import('pngjs');
const png = PNG.sync.read(buf);
const { width, height, data } = png;
const total = width * height;

let hotPink = 0;
let hotMagenta = 0;
let darkSky = 0;
let lavender = 0;
let colorBins = new Map();

for (let i = 0; i < total; i++) {
  const r = data[i * 4];
  const g = data[i * 4 + 1];
  const b = data[i * 4 + 2];
  const key = `${r >> 4},${g >> 4},${b >> 4}`;
  colorBins.set(key, (colorBins.get(key) ?? 0) + 1);

  if (r > 200 && g < 140 && b > 160 && r - g > 60) hotPink++;
  if (r > 180 && g < 100 && b > 180) hotMagenta++;
  if (r < 40 && g < 30 && b < 50) darkSky++;
  if (r > 150 && g > 110 && b > 200 && r - g < 50) lavender++;
}

const sorted = [...colorBins.entries()].sort((a, b) => b[1] - a[1]);
const top = sorted[0];
const topRatio = top[1] / total;
const pinkRatio = (hotPink + hotMagenta) / total;
const skyRatio = darkSky / total;
const lavenderRatio = lavender / total;

let towerPixels = 0;
for (let i = 0; i < total; i++) {
  const r = data[i * 4];
  const g = data[i * 4 + 1];
  const b = data[i * 4 + 2];
  if (r > 35 && r < 120 && g < 70 && b > 70) towerPixels++;
}
const towerRatio = towerPixels / total;

function isTowerPixel(r, g, b) {
  return r > 35 && r < 120 && g < 70 && b > 70;
}

let maxTowerRun = 0;
for (let y = Math.floor(height * 0.2); y < Math.floor(height * 0.82); y++) {
  let run = 0;
  for (let x = 0; x < width; x++) {
    const i = y * width + x;
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    if (isTowerPixel(r, g, b)) {
      run++;
      maxTowerRun = Math.max(maxTowerRun, run);
    } else {
      run = 0;
    }
  }
}

const pass =
  pinkRatio < 0.08 &&
  lavenderRatio < 0.22 &&
  towerRatio > 0.007 &&
  maxTowerRun >= 18 &&
  !(topRatio > 0.45 && lavenderRatio > 0.12);

console.log(
  JSON.stringify({
    path,
    width,
    height,
    pinkRatio,
    lavenderRatio,
    topColorBin: top[0],
    topRatio,
    skyRatio,
    towerRatio,
    maxTowerRun,
    pass,
  }),
);

process.exit(pass ? 0 : 1);
