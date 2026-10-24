import type { JamGame } from '../types';

/** Golden angle in radians (~137.507764°). */
export const GOLDEN_ANGLE = (137.507764 * Math.PI) / 180;

/** Distance between building centres, in world units. */
export const CITY_CELL = 32;
/** Width of the street gap between two blocks. */
export const CITY_STREET_GAP = 8;
/** Max footprint a building may occupy inside its cell. */
export const CITY_MAX_FOOTPRINT = CITY_CELL - CITY_STREET_GAP;

/** Height of the deepest downtown towers, in world units. */
const CITY_PEAK_HEIGHT = 260;
/** Lowest suburban blocks, so the outskirts still read as a city. */
const CITY_BASE_HEIGHT = 28;

export interface CityBuildingSlot {
  game: JamGame;
  index: number;
  x: number;
  z: number;
  height: number;
  width: number;
  depth: number;
  seed: number;
  roofY: number;
  faceYaw: number;
  posterSize: number;
  topVotes: boolean;
  topToday: boolean;
  /** 1 = most voted landmark, through 10. 0 for every other tower. */
  voteRank: number;
  /** Per-floor width scale factors (setbacks). */
  tierScales: number[];
  /** Neon palette index. */
  theme: number;
  /** 0..1 normalised lifetime plays, drives street traffic nearby. */
  playsNorm: number;
}

export interface CityStreet {
  /** Travel direction: `x` = runs along X (east/west), `z` = runs along Z. */
  axis: 'x' | 'z';
  /** Fixed coordinate (z for an `x` street, x for a `z` street). */
  coord: number;
  from: number;
  to: number;
  /** Summed plays of the blocks lining this street. */
  plays: number;
}

export interface CityLayout {
  buildings: CityBuildingSlot[];
  streets: CityStreet[];
  /** Half-extent of the city footprint. */
  half: number;
}

export function sortGamesForCity(games: JamGame[]): JamGame[] {
  return [...games].sort((a, b) => {
    const voteDiff = b.votes - a.votes;
    if (voteDiff !== 0) return voteDiff;
    const todayDiff = (b.votesToday ?? 0) - (a.votesToday ?? 0);
    if (todayDiff !== 0) return todayDiff;
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });
}

function hashSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function tierScalesForSeed(seed: number, tiers: number): number[] {
  const out: number[] = [];
  for (let t = 0; t < tiers; t++) {
    const bite = (seed >> (t * 3)) % 9;
    const taper = 1 - t * 0.045;
    out.push(taper * (0.93 + bite * 0.02));
  }
  return out;
}

const THEME_COUNT = 6;

/**
 * Blocks of a neon city on a regular grid. Games are dropped in from the
 * centre outward in vote order, so the highest-voted jam entries become the
 * downtown towers and the skyline tapers toward the edges.
 */
export function buildCityLayout(
  games: JamGame[],
  options?: { cell?: number; streetGap?: number },
): CityLayout {
  const cell = options?.cell ?? CITY_CELL;
  const streetGap = options?.streetGap ?? CITY_STREET_GAP;
  const maxFootprint = cell - streetGap;

  const sorted = sortGamesForCity(games);
  const count = sorted.length;
  if (count === 0) return { buildings: [], streets: [], half: 0 };

  const maxVotes = Math.max(1, ...sorted.map((g) => g.votes));
  const maxPlays = Math.max(1, ...sorted.map((g) => g.totalPlays));

  const topVoteIds = new Set(sorted.slice(0, 12).map((g) => g.gameId));
  const voteRankById = new Map(sorted.slice(0, 10).map((g, i) => [g.gameId, i + 1]));
  const topTodayIds = new Set(
    [...sorted]
      .sort((a, b) => (b.votesToday ?? 0) - (a.votesToday ?? 0))
      .slice(0, 12)
      .map((g) => g.gameId),
  );

  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));

  // Centre-out cell order so the strongest games land downtown.
  const cells: { r: number; c: number; d: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dx = c - (cols - 1) / 2;
      const dz = r - (rows - 1) / 2;
      cells.push({ r, c, d: dx * dx + dz * dz });
    }
  }
  cells.sort((a, b) => a.d - b.d);

  const buildings: CityBuildingSlot[] = [];
  const radialMax = Math.max(1, Math.hypot((cols - 1) / 2, (rows - 1) / 2));
  for (let i = 0; i < count; i++) {
    const game = sorted[i];
    const { r, c } = cells[i];
    const seed = hashSeed(game.gameId);
    const dxc = c - (cols - 1) / 2;
    const dzc = r - (rows - 1) / 2;
    const jitterX = (((seed % 100) / 100) - 0.5) * (cell * 0.06);
    const jitterZ = ((((seed >> 7) % 100) / 100) - 0.5) * (cell * 0.06);
    const x = (c - (cols - 1) / 2) * cell + jitterX;
    const z = (r - (rows - 1) / 2) * cell + jitterZ;

    const topVotes = topVoteIds.has(game.gameId);
    const topToday = topTodayIds.has(game.gameId);
    const voteT = Math.pow(game.votes / maxVotes, 0.5);
    const playsNorm = Math.pow(game.totalPlays / maxPlays, 0.55);
    const rnd = (seed % 97) / 97;
    const rnd2 = ((seed >> 9) % 97) / 97;

    // Radial downtown profile: the skyline peaks at the centre and tapers to
    // low blocks at the rim, so the silhouette reads as a real city instead of
    // a flat carpet (most jam games have near-zero votes, so votes alone can
    // never shape the skyline).
    const rad = Math.min(1.25, Math.hypot(dxc, dzc) / radialMax);
    const coreT = Math.max(0, 1 - rad / 0.42);
    const coreBoost = Math.pow(coreT, 1.1);

    // Deep-core towers are also chunkier so they can carry the extra height.
    let width = Math.min(maxFootprint, 4.9 + coreBoost * 2.5 + voteT * 2.2 + rnd * 1.0);
    let depth = Math.min(maxFootprint, 4.6 + coreBoost * 2.3 + voteT * 1.8 + rnd2 * 1.0);
    let height =
      CITY_BASE_HEIGHT +
      coreBoost * CITY_PEAK_HEIGHT * (0.62 + rnd2 * 0.62) +
      coreBoost * voteT * 46 +
      (topVotes ? 26 : 0) +
      (topToday ? 12 : 0) +
      playsNorm * 6;

    const footprint = Math.max(width, depth);
    const maxAspect = 21;
    if (height / footprint > maxAspect) height = footprint * maxAspect;

    buildings.push({
      game,
      index: i,
      x,
      z,
      height,
      width,
      depth,
      seed,
      roofY: height,
      faceYaw: ((((seed >> 11) % 5) - 2) * 0.012),
      posterSize: topVotes || topToday ? 8.6 : 7.2,
      topVotes,
      topToday,
      voteRank: voteRankById.get(game.gameId) ?? 0,
      tierScales: tierScalesForSeed(seed, 9),
      theme: seed % THEME_COUNT,
      playsNorm,
    });
  }

  // Streets run through the gaps between block rows/columns.
  const xMin = -((cols - 1) / 2) * cell - cell * 0.5;
  const xMax = -xMin;
  const zMin = -((rows - 1) / 2) * cell - cell * 0.5;
  const zMax = -zMin;

  const rowPlays = new Array(rows + 1).fill(0);
  const colPlays = new Array(cols + 1).fill(0);
  for (const b of buildings) {
    const cIdx = Math.round(b.x / cell + (cols - 1) / 2);
    const rIdx = Math.round(b.z / cell + (rows - 1) / 2);
    rowPlays[Math.min(rows, Math.max(0, rIdx))] += b.game.totalPlays;
    rowPlays[Math.min(rows, Math.max(0, rIdx + 1))] += b.game.totalPlays;
    colPlays[Math.min(cols, Math.max(0, cIdx))] += b.game.totalPlays;
    colPlays[Math.min(cols, Math.max(0, cIdx + 1))] += b.game.totalPlays;
  }

  const streets: CityStreet[] = [];
  for (let i = 0; i <= rows; i++) {
    const z = (i - rows / 2) * cell;
    streets.push({ axis: 'x', coord: z, from: xMin, to: xMax, plays: rowPlays[i] ?? 0 });
  }
  for (let i = 0; i <= cols; i++) {
    const x = (i - cols / 2) * cell;
    streets.push({ axis: 'z', coord: x, from: zMin, to: zMax, plays: colPlays[i] ?? 0 });
  }

  return { buildings, streets, half: Math.max(xMax, zMax) };
}

export interface CitySpawn {  x: number;
  y: number;
  z: number;
  yaw: number;
  focusX: number;
  focusY: number;
  focusZ: number;
  scenicCamX: number;
  scenicCamY: number;
  scenicCamZ: number;
  scenicLookX: number;
  scenicLookY: number;
  scenicLookZ: number;
}

function spawnHitsBuilding(x: number, y: number, z: number, b: CityBuildingSlot, pad: number): boolean {
  if (y > b.height + pad + 4) return false;
  const hx = b.width * 0.5 + pad;
  const hz = b.depth * 0.5 + pad;
  return Math.abs(x - b.x) <= hx && Math.abs(z - b.z) <= hz;
}

function minHorizontalClearance(
  x: number,
  z: number,
  y: number,
  buildings: CityBuildingSlot[],
  pad: number,
): number {
  let min = Infinity;
  for (const b of buildings) {
    if (y > b.height + pad + 8) continue;
    const dx = Math.max(Math.abs(x - b.x) - b.width * 0.5, 0);
    const dz = Math.max(Math.abs(z - b.z) - b.depth * 0.5, 0);
    min = Math.min(min, Math.hypot(dx, dz) - pad);
  }
  return min;
}

/** Clamp helper kept local so this module stays dependency-free. */
function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Cinematic establishing position outside the downtown, facing the skyline. */
export function computeCitySpawn(buildings: CityBuildingSlot[]): CitySpawn {
  const fallback: CitySpawn = {
    x: 120,
    y: 58,
    z: 120,
    yaw: -2.35,
    focusX: 0,
    focusY: 40,
    focusZ: 0,
    scenicCamX: 150,
    scenicCamY: 70,
    scenicCamZ: 150,
    scenicLookX: 0,
    scenicLookY: 46,
    scenicLookZ: 0,
  };
  if (buildings.length === 0) return fallback;

  // Downtown = weighted centre of the tallest inner buildings.
  let focusX = 0;
  let focusZ = 0;
  let weightSum = 0;
  let peakRoof = 20;
  for (const b of buildings) {
    const w = b.topVotes ? 3 : b.topToday ? 1.8 : 1;
    focusX += b.x * w;
    focusZ += b.z * w;
    weightSum += w;
    peakRoof = Math.max(peakRoof, b.roofY);
  }
  focusX /= weightSum;
  focusZ /= weightSum;

  const focusY = Math.max(40, peakRoof * 0.46);

  // Radius of the tall downtown, so the camera can ring just outside it.
  let coreRadius = 40;
  for (const b of buildings) {
    const d = Math.hypot(b.x - focusX, b.z - focusZ);
    if (b.roofY >= peakRoof * 0.55) coreRadius = Math.max(coreRadius, d);
  }

  // Hero vantage: fly just outside the downtown at roughly mid-tower height, so
  // the skyline looms across the frame instead of being seen from orbit.
  const flyY = clamp(peakRoof * 0.46, 50, 104);

  let bestScore = -Infinity;
  let x = fallback.x;
  let z = fallback.z;
  let yaw = fallback.yaw;

  for (let attempt = 0; attempt < 200; attempt++) {
    const angle = 0.6 + attempt * 0.0553;
    const r = coreRadius * (1.18 + (attempt % 16) * 0.055);
    const sx = focusX + Math.sin(angle) * r;
    const sz = focusZ + Math.cos(angle) * r;
    const syaw = Math.atan2(focusX - sx, focusZ - sz);

    let blocked = false;
    for (const b of buildings) {
      if (spawnHitsBuilding(sx, flyY, sz, b, 8)) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    // Camera sits behind the craft, must also be in the open.
    const camX = sx - Math.sin(syaw) * 16;
    const camZ = sz - Math.cos(syaw) * 16;
    const camY = flyY + 7;
    let camBlocked = false;
    for (const b of buildings) {
      if (spawnHitsBuilding(camX, camY, camZ, b, 7)) {
        camBlocked = true;
        break;
      }
    }
    if (camBlocked) continue;

    // Prefer the open lane with the most downtown in front of us.
    const ahead = minHorizontalClearance(sx, sz, flyY, buildings, 6);
    const score = ahead - r * 0.35;
    if (score > bestScore) {
      bestScore = score;
      x = sx;
      z = sz;
      yaw = syaw;
    }
  }

  return {
    x,
    y: flyY,
    z,
    yaw,
    focusX,
    focusY,
    focusZ,
    scenicCamX: x - Math.sin(yaw) * 16,
    scenicCamY: flyY + 7,
    scenicCamZ: z - Math.cos(yaw) * 16,
    scenicLookX: focusX,
    scenicLookY: focusY,
    scenicLookZ: focusZ,
  };
}
