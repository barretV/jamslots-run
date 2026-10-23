import * as THREE from 'three';
import { chaseCameraFromUfo, pushCameraOutOfColumns, skylineLookAt } from './cityCamera';
import type { JamGame } from '../types';

/** Golden angle in radians (~137.507764°). */
export const GOLDEN_ANGLE = (137.507764 * Math.PI) / 180;

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
  /** Per-floor width scale factors (setbacks). */
  tierScales: number[];
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
    const bite = (seed >> (t * 3)) % 11;
    const taper = 1 - t * 0.055;
    out.push(taper * (0.82 + bite * 0.028));
  }
  return out;
}

export function spiralXZ(index: number, radiusStep: number): { x: number; z: number; angle: number } {
  const angle = index * GOLDEN_ANGLE;
  const r = radiusStep * Math.sqrt(Math.max(0, index));
  return { x: r * Math.cos(angle), z: r * Math.sin(angle), angle };
}

export function buildCityLayout(
  games: JamGame[],
  options?: { radiusStep?: number; roadInset?: number; buildingOutset?: number },
): { buildings: CityBuildingSlot[]; roadPoints: { x: number; z: number }[] } {
  const radiusStep = options?.radiusStep ?? 13.2;
  const roadInset = options?.roadInset ?? 0.62;
  const buildingOutset = options?.buildingOutset ?? 13.5;

  const sorted = sortGamesForCity(games);
  const maxVotes = Math.max(1, ...sorted.map((g) => g.votes));

  const topVoteIds = new Set(sorted.slice(0, 10).map((g) => g.gameId));
  const topToday = [...sorted]
    .sort((a, b) => (b.votesToday ?? 0) - (a.votesToday ?? 0))
    .slice(0, 10)
    .map((g) => g.gameId);
  const topTodayIds = new Set(topToday);

  const buildings: CityBuildingSlot[] = [];
  const roadPoints: { x: number; z: number }[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const game = sorted[i];
    const { x: rx, z: rz, angle } = spiralXZ(i, radiusStep * roadInset);
    if (i >= 18) roadPoints.push({ x: rx, z: rz });

    const seed = hashSeed(game.gameId);
    const lane = ((seed % 7) - 3) * 0.45;
    const rBuild = radiusStep * Math.sqrt(i) + buildingOutset + lane;
    const x = rBuild * Math.cos(angle);
    const z = rBuild * Math.sin(angle);
    const radial = Math.hypot(x, z);

    const topVotes = topVoteIds.has(game.gameId);
    const topToday = topTodayIds.has(game.gameId);
    const voteT = Math.pow(game.votes / maxVotes, 0.52);
    const coreShrink = Math.min(1, 0.2 + radial * 0.011);

    const height =
      5 +
      voteT * 34 +
      (topVotes ? 8 : 0) +
      (topToday ? 3 : 0) +
      (seed % 9) * 0.45;
    const width =
      Math.max(2.6, (2.4 + voteT * 4 + (topVotes ? 1.4 : 0) + (seed % 6) * 0.24) * coreShrink);
    const depth =
      Math.max(2.4, (2.1 + voteT * 3.5 + (topToday ? 0.8 : 0) + ((seed >> 3) % 6) * 0.2) * coreShrink);
    const faceYaw = Math.atan2(x, z);
    const posterSize = 5.12;

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
      faceYaw,
      posterSize,
      topVotes,
      topToday,
      tierScales: tierScalesForSeed(seed, 5),
    });
  }

  return { buildings, roadPoints };
}

export interface CitySpawn {
  x: number;
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
  if (y > b.height + pad + 6) return false;
  const hr = Math.max(b.width, b.depth) * 0.58 + pad;
  const dx = x - b.x;
  const dz = z - b.z;
  return dx * dx + dz * dz <= hr * hr;
}

function cameraFromSpawn(sp: Pick<CitySpawn, 'x' | 'y' | 'z' | 'yaw'>): THREE.Vector3 {
  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), sp.yaw);
  return new THREE.Vector3(sp.x, sp.y, sp.z)
    .addScaledVector(forward, -42)
    .add(new THREE.Vector3(0, 26, 0));
}

function spawnIsClear(x: number, y: number, z: number, yaw: number, buildings: CityBuildingSlot[]): boolean {
  for (const b of buildings) {
    if (spawnHitsBuilding(x, y, z, b, 14)) return false;
  }
  const cam = cameraFromSpawn({ x, y, z, yaw });
  for (const b of buildings) {
    if (spawnHitsBuilding(cam.x, cam.y, cam.z, b, 16)) return false;
    const posterPad = 6;
    const px = b.x + Math.sin(b.faceYaw) * (b.depth / 2 + posterPad);
    const pz = b.z + Math.cos(b.faceYaw) * (b.depth / 2 + posterPad);
    if (spawnHitsBuilding(cam.x, cam.y, cam.z, { ...b, x: px, z: pz, width: b.posterSize, depth: 1.2 }, 2)) {
      return false;
    }
  }
  return true;
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
    if (y > b.height + pad + 10) continue;
    const hr = Math.max(b.width, b.depth) * 0.58 + pad;
    const d = Math.hypot(x - b.x, z - b.z) - hr;
    min = Math.min(min, d);
  }
  return min;
}

/** Exterior spawn with clearance from all building AABBs; faces the inner skyline. */
export function computeCitySpawn(buildings: CityBuildingSlot[]): CitySpawn {
  const fallback: CitySpawn = {
    x: 52,
    y: 34,
    z: 58,
    yaw: -0.85,
    focusX: 0,
    focusY: 16,
    focusZ: 0,
    scenicCamX: 88,
    scenicCamY: 48,
    scenicCamZ: 92,
    scenicLookX: 0,
    scenicLookY: 14,
    scenicLookZ: 0,
  };
  if (buildings.length === 0) return fallback;

  const innerRadius = 48;
  const inner = buildings.filter((b) => Math.hypot(b.x, b.z) <= innerRadius);
  const sample = inner.length >= 12 ? inner : buildings.slice(0, Math.min(32, buildings.length));

  let focusX = 0;
  let focusZ = 0;
  let weightSum = 0;
  let peakRoof = 10;

  for (const b of sample) {
    const w = b.topVotes ? 2.8 : b.topToday ? 1.6 : 1;
    focusX += b.x * w;
    focusZ += b.z * w;
    weightSum += w;
    peakRoof = Math.max(peakRoof, b.roofY);
  }
  focusX /= weightSum;
  focusZ /= weightSum;

  const focusY = peakRoof * 0.32;
  const flyY = peakRoof + 14;

  let spawnAngle = 0.62;
  let spawnR = 58;
  let x = fallback.x;
  let z = fallback.z;
  let yaw = fallback.yaw;
  let bestScore = -Infinity;
  const scenicLook = skylineLookAt(focusX, focusZ, peakRoof, new THREE.Vector3());
  const ufoPt = new THREE.Vector3();
  const camScratch = new THREE.Vector3();
  let scenicCam = new THREE.Vector3(fallback.scenicCamX, fallback.scenicCamY, fallback.scenicCamZ);

  for (let attempt = 0; attempt < 96; attempt++) {
    const angle = spawnAngle + attempt * 0.1;
    const r = spawnR + (attempt % 12) * 3.2;
    const sx = focusX + Math.sin(angle) * r;
    const sz = focusZ + Math.cos(angle) * r;
    const syaw = Math.atan2(focusX - sx, focusZ - sz);
    if (!spawnIsClear(sx, flyY, sz, syaw, buildings)) continue;

    ufoPt.set(sx, flyY, sz);
    chaseCameraFromUfo(ufoPt, scenicLook, buildings, camScratch);
    const ufoClear = minHorizontalClearance(sx, sz, flyY, buildings, 12);
    pushCameraOutOfColumns(camScratch, buildings, 18);
    const camClear = minHorizontalClearance(camScratch.x, camScratch.z, camScratch.y, buildings, 16);
    const score = Math.min(ufoClear, camClear) + r * 0.04;
    if (score > bestScore) {
      bestScore = score;
      x = sx;
      z = sz;
      yaw = syaw;
      scenicCam.copy(camScratch);
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
    scenicCamX: scenicCam.x,
    scenicCamY: scenicCam.y,
    scenicCamZ: scenicCam.z,
    scenicLookX: scenicLook.x,
    scenicLookY: scenicLook.y,
    scenicLookZ: scenicLook.z,
  };
}
