import { readFileSync } from 'fs';

const raw = JSON.parse(readFileSync('public/games.json', 'utf8'));
const games = Array.isArray(raw) ? raw : raw.games;
const spread = 0.23;
const scale = 2.8;

function hashId(id, salt = '') {
  let h = 2166136261;
  const s = id + salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function minMax(arr) {
  return { min: Math.min(...arr), max: Math.max(...arr) };
}
function norm(v, min, max) {
  if (max <= min) return 0.5;
  return (v - min) / (max - min);
}

const votes = games.map((g) => g.votes);
const plays = games.map((g) => g.totalPlays);
const today = games.map((g) => g.votesToday ?? 0);
const vMm = minMax(votes);
const pMm = minMax(plays);
const tMm = minMax(today);

const positions = games.map((g) => {
  const j = hashId(g.gameId);
  const j2 = hashId(g.gameId, 'b');
  const j3 = hashId(g.gameId, 'c');
  const vn = norm(g.votes, vMm.min, vMm.max);
  const pn = norm(g.totalPlays, pMm.min, pMm.max);
  const tn = norm(g.votesToday ?? 0, tMm.min, tMm.max);
  return [
    (vn - 0.5) * scale + (j - 0.5) * spread,
    (pn - 0.5) * scale + (j2 - 0.5) * spread,
    (tn - 0.5) * scale + (j3 - 0.5) * spread,
  ];
});

let cx = 0;
let cy = 0;
let cz = 0;
for (const p of positions) {
  cx += p[0];
  cy += p[1];
  cz += p[2];
}
cx /= positions.length;
cy /= positions.length;
cz /= positions.length;
let radius = 0.25;
for (const p of positions) {
  const dx = p[0] - cx;
  const dy = p[1] - cy;
  const dz = p[2] - cz;
  radius = Math.max(radius, Math.sqrt(dx * dx + dy * dy + dz * dz));
}
console.log(JSON.stringify({ n: games.length, center: [cx, cy, cz], radius: radius + 0.18 }, null, 2));
