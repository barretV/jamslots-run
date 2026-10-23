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

export function spiralXZ(index: number, radiusStep: number): { x: number; z: number; angle: number } {
  const angle = index * GOLDEN_ANGLE;
  const r = radiusStep * Math.sqrt(Math.max(0, index));
  return { x: r * Math.cos(angle), z: r * Math.sin(angle), angle };
}

export function buildCityLayout(
  games: JamGame[],
  options?: { radiusStep?: number; roadInset?: number; buildingOutset?: number },
): { buildings: CityBuildingSlot[]; roadPoints: { x: number; z: number }[] } {
  const radiusStep = options?.radiusStep ?? 6.8;
  const roadInset = options?.roadInset ?? 0.72;
  const buildingOutset = options?.buildingOutset ?? 4.2;

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
    roadPoints.push({ x: rx, z: rz });

    const seed = hashSeed(game.gameId);
    const lane = ((seed % 7) - 3) * 0.35;
    const rBuild = radiusStep * Math.sqrt(i) + buildingOutset + lane;
    const x = rBuild * Math.cos(angle);
    const z = rBuild * Math.sin(angle);

    const topVotes = topVoteIds.has(game.gameId);
    const topToday = topTodayIds.has(game.gameId);
    const voteT = Math.pow(game.votes / maxVotes, 0.58);
    const height = 6 + voteT * 48 + (topVotes ? 8 : 0) + (topToday ? 3 : 0);
    const width = Math.max(4.6, 4.2 + voteT * 8 + (topVotes ? 2.8 : 0) + (seed % 4) * 0.4);
    const depth = Math.max(4.2, 3.8 + voteT * 6.2 + (topToday ? 1.4 : 0) + ((seed >> 3) % 4) * 0.35);
    const faceYaw = Math.atan2(x, z);
    const posterSize = topVotes ? 5.12 : topToday ? 4.8 : 4.2;

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
    });
  }

  return { buildings, roadPoints };
}
