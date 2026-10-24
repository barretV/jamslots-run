import type { JamGame } from '../types';

export type PlaystyleCluster = 'rusher' | 'tactician' | 'survivor';

export type NebulaColorMode = 'playstyle' | 'votes' | 'plays' | 'today';

export type LeaderMetric = 'votes' | 'plays' | 'today' | 'ratio';

export interface ChartGamePoint {
  game: JamGame;
  votesNorm: number;
  playsNorm: number;
  todayNorm: number;
  cluster: PlaystyleCluster;
  position: [number, number, number];
}

export const CLUSTER_COLORS: Record<PlaystyleCluster, string> = {
  rusher: '#fbbf24',
  tactician: '#22d3ee',
  survivor: '#e879f9',
};

export const CLUSTER_LABELS: Record<PlaystyleCluster, string> = {
  rusher: 'Rusher (votes today)',
  tactician: 'Tactician (balanced)',
  survivor: 'Survivor (plays lead)',
};

function hashId(id: string, salt = ''): number {
  let h = 0;
  const s = id + salt;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h % 1000) / 1000;
}

function minMax(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };
  let min = values[0];
  let max = values[0];
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) return { min, max: min + 1 };
  return { min, max };
}

function norm(value: number, min: number, max: number): number {
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

function tertileTier(value: number, sortedValues: number[]): 'Low' | 'Mid' | 'High' {
  if (sortedValues.length === 0) return 'Low';
  const { min, max } = minMax(sortedValues);
  const t = norm(value, min, max);
  if (t < 1 / 3) return 'Low';
  if (t < 2 / 3) return 'Mid';
  return 'High';
}

function classifyPlaystyleGame(
  game: JamGame,
  todaySorted: number[],
  votesSorted: number[],
  playsSorted: number[],
): PlaystyleCluster {
  const todayT = tertileTier(game.votesToday ?? 0, todaySorted);
  const votesT = tertileTier(game.votes, votesSorted);
  const playsT = tertileTier(game.totalPlays, playsSorted);
  if (todayT === 'High') return 'rusher';
  if (playsT === 'High' && (votesT === 'Low' || game.totalPlays > game.votes * 1.15)) {
    return 'survivor';
  }
  return 'tactician';
}

/** Pull a box-shaped metric cloud into a lumpy, organic blob (metrics still drive X/Y/Z). */
function warpNebulaToBlob(
  bx: number,
  by: number,
  bz: number,
  gameId: string,
  layout: number,
): [number, number, number] {
  const len = Math.hypot(bx, by, bz);
  const jw = hashId(gameId, 'w');
  const jc = hashId(gameId, 'curl');
  const jl = hashId(gameId, 'lump');

  if (len < 1e-5) {
    const a = jw * Math.PI * 2;
    const b = jc * Math.PI;
    const s = 0.07 * layout;
    return [Math.cos(a) * Math.cos(b) * s, Math.sin(a) * Math.cos(b) * s, Math.sin(b) * s];
  }

  const ux = bx / len;
  const uy = by / len;
  const uz = bz / len;

  const e = 0.58;
  const ax = Math.abs(bx);
  const ay = Math.abs(by);
  const az = Math.abs(bz);
  const roundedR =
    Math.pow(Math.pow(ax, 2 / e) + Math.pow(ay, 2 / e) + Math.pow(az, 2 / e), e / 2) || len;

  const lump =
    1 +
    0.13 *
      Math.sin(ux * 2.55 + jw * 6.28) *
      Math.cos(uy * 2.05 + jc * 6.28) *
      Math.sin(uz * 2.3 + jl * 6.28);
  const rad = roundedR * lump;

  const curl = 0.12;
  const t = jl * Math.PI * 2;
  const ox = curl * Math.sin(t + by * 0.42) * Math.cos(bz * 0.36);
  const oy = curl * Math.cos(t * 1.05 + bz * 0.4) * Math.sin(bx * 0.35);
  const oz = curl * Math.sin(t * 0.92 + bx * 0.38) * Math.cos(by * 0.37);

  const extent = 1.14;
  return [
    (ux * rad + ox) * layout * extent,
    (uy * rad + oy) * layout * extent,
    (uz * rad + oz) * layout * extent,
  ];
}

function nebulaPosition(p: ChartGamePoint): [number, number, number] {
  const j = hashId(p.game.gameId);
  const j2 = hashId(p.game.gameId, 'b');
  const j3 = hashId(p.game.gameId, 'c');
  const spread = 0.22;
  const scale = 2.8;
  const layout = 1.2;
  const bx = (p.votesNorm - 0.5) * scale + (j - 0.5) * spread;
  const by = (p.playsNorm - 0.5) * scale + (j2 - 0.5) * spread;
  const bz = (p.todayNorm - 0.5) * scale + (j3 - 0.5) * spread;
  return warpNebulaToBlob(bx, by, bz, p.game.gameId, layout);
}

export function buildChartPoints(games: JamGame[]): ChartGamePoint[] {
  if (games.length === 0) return [];
  const votes = games.map((g) => g.votes);
  const plays = games.map((g) => g.totalPlays);
  const today = games.map((g) => g.votesToday ?? 0);
  const votesSorted = [...votes].sort((a, b) => a - b);
  const playsSorted = [...plays].sort((a, b) => a - b);
  const todaySorted = [...today].sort((a, b) => a - b);
  const vMm = minMax(votes);
  const pMm = minMax(plays);
  const tMm = minMax(today);

  const base = games.map((game) => ({
    game,
    votesNorm: norm(game.votes, vMm.min, vMm.max),
    playsNorm: norm(game.totalPlays, pMm.min, pMm.max),
    todayNorm: norm(game.votesToday ?? 0, tMm.min, tMm.max),
    cluster: classifyPlaystyleGame(game, todaySorted, votesSorted, playsSorted),
    position: [0, 0, 0] as [number, number, number],
  }));

  return base.map((p) => ({ ...p, position: nebulaPosition(p) }));
}

export function computeCentroid(points: ChartGamePoint[]): [number, number, number] {
  if (points.length === 0) return [0, 0, 0];
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of points) {
    x += p.position[0];
    y += p.position[1];
    z += p.position[2];
  }
  const n = points.length;
  return [x / n, y / n, z / n];
}

export function computeCloudRadius(points: ChartGamePoint[], centroid: [number, number, number]): number {
  if (points.length === 0) return 1;
  let maxR = 0.4;
  for (const p of points) {
    const dx = p.position[0] - centroid[0];
    const dy = p.position[1] - centroid[1];
    const dz = p.position[2] - centroid[2];
    maxR = Math.max(maxR, Math.sqrt(dx * dx + dy * dy + dz * dz));
  }
  return maxR;
}

export function computeCloudBoundingSphere(points: ChartGamePoint[]): {
  center: [number, number, number];
  radius: number;
} {
  if (points.length === 0) return { center: [0, 0, 0], radius: 1 };
  const centroid = computeCentroid(points);
  let radius = 0.25;
  for (const p of points) {
    const dx = p.position[0] - centroid[0];
    const dy = p.position[1] - centroid[1];
    const dz = p.position[2] - centroid[2];
    radius = Math.max(radius, Math.sqrt(dx * dx + dy * dy + dz * dz));
  }
  return { center: centroid, radius: Math.max(radius, 0.35) };
}

/** Camera fit: bulk cloud radius (ignore distant outliers that blow the frame). */
export function computeNebulaViewSphere(points: ChartGamePoint[]): {
  center: [number, number, number];
  radius: number;
} {
  if (points.length === 0) return { center: [0, 0, 0], radius: 1 };
  const { center } = computeCloudBoundingSphere(points);
  const [cx, cy, cz] = center;
  const dists: number[] = [];
  for (const p of points) {
    const dx = p.position[0] - cx;
    const dy = p.position[1] - cy;
    const dz = p.position[2] - cz;
    dists.push(Math.sqrt(dx * dx + dy * dy + dz * dz));
  }
  dists.sort((a, b) => a - b);
  const idx = Math.min(dists.length - 1, Math.floor(dists.length * 0.9));
  const bulk = dists[idx];
  return { center, radius: Math.max(bulk * 1.06, 0.42) };
}

function hslColor(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export function nebulaDistinctColor(p: ChartGamePoint, mode: NebulaColorMode): string {
  const idHue = hashId(p.game.gameId) * 360;
  const mix = hashId(p.game.gameId, 'm');
  if (mode === 'playstyle') {
    const clusterHue =
      p.cluster === 'rusher' ? 42 : p.cluster === 'survivor' ? 305 : 192;
    const h = clusterHue * 0.45 + idHue * 0.55;
    return hslColor(h, 78, 56);
  }
  if (mode === 'votes') {
    const h = 210 - p.votesNorm * 175 + mix * 28;
    return hslColor(h, 82, 52 + p.votesNorm * 10);
  }
  if (mode === 'plays') {
    const h = 265 + p.playsNorm * 55 + mix * 22;
    return hslColor(h, 75, 50 + p.playsNorm * 12);
  }
  const h = 220 + p.todayNorm * 95 + mix * 30;
  return hslColor(h, 88, 48 + p.todayNorm * 14);
}

export function nebulaPointSize(p: ChartGamePoint): number {
  const base = 0.038;
  const voteBoost = 0.02 + p.votesNorm * 0.045;
  const todayBoost = p.todayNorm * 0.035;
  return base + voteBoost + todayBoost;
}

export function colorForPoint(p: ChartGamePoint, mode: NebulaColorMode): string {
  return nebulaDistinctColor(p, mode);
}

export function leaderMetricValue(game: JamGame, metric: LeaderMetric): number {
  if (metric === 'votes') return game.votes;
  if (metric === 'plays') return game.totalPlays;
  if (metric === 'today') return game.votesToday ?? 0;
  return game.totalPlays > 0 ? game.votes / game.totalPlays : game.votes;
}

export function truncateTitle(title: string, max = 28): string {
  if (title.length <= max) return title;
  return `${title.slice(0, max - 1)}…`;
}

export function topGamesByMetric(games: JamGame[], metric: LeaderMetric, limit = 15): JamGame[] {
  return [...games]
    .sort((a, b) => leaderMetricValue(b, metric) - leaderMetricValue(a, metric))
    .slice(0, limit);
}

export interface CompareSeries {
  gameId: string;
  label: string;
}

export function defaultCompareSeries(games: JamGame[]): CompareSeries[] {
  if (games.length === 0) return [];
  const byVotes = [...games].sort((a, b) => b.votes - a.votes);
  const byPlays = [...games].sort((a, b) => b.totalPlays - a.totalPlays);
  const byToday = [...games].sort((a, b) => (b.votesToday ?? 0) - (a.votesToday ?? 0));
  const picks: JamGame[] = [];
  const seen = new Set<string>();
  const tryAdd = (g: JamGame | undefined) => {
    if (!g || seen.has(g.gameId) || picks.length >= 3) return;
    seen.add(g.gameId);
    picks.push(g);
  };
  tryAdd(byVotes[0]);
  tryAdd(byPlays[0]);
  tryAdd(byToday[0]);
  for (const g of byVotes) {
    tryAdd(g);
  }
  return picks.map((g) => ({ gameId: g.gameId, label: truncateTitle(g.title, 32) }));
}

export const COMPARE_AXES = ['Votes', 'Plays', 'Today', 'Rank', 'Votes per play'] as const;

export function compareRadarRow(
  game: JamGame,
  games: JamGame[],
): Record<string, number> {
  const votes = games.map((g) => g.votes);
  const plays = games.map((g) => g.totalPlays);
  const today = games.map((g) => g.votesToday ?? 0);
  const ranks = games.map((g) => g.rank ?? games.length);
  const ratios = games.map((g) => (g.totalPlays > 0 ? g.votes / g.totalPlays : g.votes));
  const vMm = minMax(votes);
  const pMm = minMax(plays);
  const tMm = minMax(today);
  const rMm = minMax(ranks);
  const ratioMm = minMax(ratios);
  const rank = game.rank ?? rMm.max;
  const ratio = game.totalPlays > 0 ? game.votes / game.totalPlays : game.votes;

  return {
    Votes: Math.round(norm(game.votes, vMm.min, vMm.max) * 100),
    Plays: Math.round(norm(game.totalPlays, pMm.min, pMm.max) * 100),
    Today: Math.round(norm(game.votesToday ?? 0, tMm.min, tMm.max) * 100),
    Rank: Math.round((1 - norm(rank, rMm.min, rMm.max)) * 100),
    'Votes per play': Math.round(norm(ratio, ratioMm.min, ratioMm.max) * 100),
  };
}

export function buildCompareRadarData(
  games: JamGame[],
  series: CompareSeries[],
): { axis: string; [key: string]: string | number }[] {
  const byId = new Map(games.map((g) => [g.gameId, g]));
  return COMPARE_AXES.map((axis) => {
    const row: { axis: string; [key: string]: string | number } = { axis };
    for (const s of series) {
      const game = byId.get(s.gameId);
      if (!game) {
        row[s.label] = 0;
        continue;
      }
      const metrics = compareRadarRow(game, games);
      row[s.label] = metrics[axis];
    }
    return row;
  });
}

export const COMPARE_COLORS = ['#f472b6', '#22d3ee', '#fbbf24'];
