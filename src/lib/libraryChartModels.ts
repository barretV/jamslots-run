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

function nebulaPosition(p: ChartGamePoint): [number, number, number] {
  const j = hashId(p.game.gameId);
  const j2 = hashId(p.game.gameId, 'b');
  const j3 = hashId(p.game.gameId, 'c');
  const spread = 0.18;
  const scale = 2.8;
  return [
    (p.votesNorm - 0.5) * scale + (j - 0.5) * spread,
    (p.playsNorm - 0.5) * scale + (j2 - 0.5) * spread,
    (p.todayNorm - 0.5) * scale + (j3 - 0.5) * spread,
  ];
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

function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

export function colorForPoint(p: ChartGamePoint, mode: NebulaColorMode): string {
  if (mode === 'playstyle') return CLUSTER_COLORS[p.cluster];
  if (mode === 'votes') return lerpColor('#0e7490', '#f97316', p.votesNorm);
  if (mode === 'plays') return lerpColor('#312e81', '#a78bfa', p.playsNorm);
  return lerpColor('#1e3a5f', '#fbbf24', p.todayNorm);
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
