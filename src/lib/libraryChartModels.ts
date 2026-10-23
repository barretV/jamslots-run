import type { JamGame } from '../types';

export type PlaystyleCluster = 'rusher' | 'tactician' | 'survivor';

export interface PlaystylePoint {
  gameId: string;
  title: string;
  x: number;
  y: number;
  z: number;
  cluster: PlaystyleCluster;
}

export interface SankeyNodeDatum {
  name: string;
}

export interface SankeyLinkDatum {
  source: number;
  target: number;
  value: number;
}

export interface SankeyChartData {
  nodes: SankeyNodeDatum[];
  links: SankeyLinkDatum[];
}

export interface RadarAxisRow {
  axis: string;
  byVotes: number;
  byPlays: number;
  byToday: number;
}

export interface HeatmapCell {
  voteQ: number;
  playQ: number;
  count: number;
  ratio: number;
}

export interface WaffleCell {
  tier: string;
  filled: boolean;
}

export const VOTE_TIERS = [
  { id: '0', label: '0 votes', min: 0, max: 0 },
  { id: '1-9', label: '1–9', min: 1, max: 9 },
  { id: '10-49', label: '10–49', min: 10, max: 49 },
  { id: '50-99', label: '50–99', min: 50, max: 99 },
  { id: '100+', label: '100+', min: 100, max: Infinity },
] as const;

function minMax(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };
  let min = values[0];
  let max = values[0];
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

function norm(value: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  return (value - min) / (max - min);
}

function tertileLabel(value: number, t33: number, t66: number): 'Low' | 'Mid' | 'High' {
  if (value <= t33) return 'Low';
  if (value <= t66) return 'Mid';
  return 'High';
}

function quintileIndex(value: number, sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const { min, max } = minMax(sorted);
  const t = norm(value, min, max);
  return Math.min(4, Math.floor(t * 5));
}

export function voteTierLabel(votes: number): string {
  for (const tier of VOTE_TIERS) {
    if (votes >= tier.min && votes <= tier.max) return tier.label;
  }
  return '100+';
}

export function voteTierId(votes: number): string {
  for (const tier of VOTE_TIERS) {
    if (votes >= tier.min && votes <= tier.max) return tier.id;
  }
  return '100+';
}

function classifyPlaystyle(
  votesN: number,
  playsN: number,
  todayN: number,
): PlaystyleCluster {
  if (todayN >= 0.55) return 'rusher';
  if (playsN >= 0.55 && votesN < 0.45) return 'survivor';
  if (Math.abs(votesN - playsN) <= 0.22) return 'tactician';
  if (playsN > votesN) return 'survivor';
  return 'tactician';
}

export function buildPlaystylePoints(games: JamGame[]): PlaystylePoint[] {
  if (games.length === 0) return [];
  const votes = games.map((g) => g.votes);
  const plays = games.map((g) => g.totalPlays);
  const today = games.map((g) => g.votesToday ?? 0);
  const vMm = minMax(votes);
  const pMm = minMax(plays);
  const tMm = minMax(today);

  return games.map((g) => {
    const votesN = norm(g.votes, vMm.min, vMm.max);
    const playsN = norm(g.totalPlays, pMm.min, pMm.max);
    const todayN = norm(g.votesToday ?? 0, tMm.min, tMm.max);
    return {
      gameId: g.gameId,
      title: g.title,
      x: votesN * 2 - 1,
      y: playsN * 2 - 1,
      z: todayN * 2 - 1,
      cluster: classifyPlaystyle(votesN, playsN, todayN),
    };
  });
}

export const PLAYSTYLE_COLORS: Record<PlaystyleCluster, string> = {
  rusher: '#f472b6',
  tactician: '#22d3ee',
  survivor: '#fbbf24',
};

export function buildSankeyData(games: JamGame[]): SankeyChartData {
  const empty: SankeyChartData = { nodes: [], links: [] };
  if (games.length === 0) return empty;

  const voteVals = games.map((g) => g.votes).sort((a, b) => a - b);
  const playVals = games.map((g) => g.totalPlays).sort((a, b) => a - b);
  const v33 = voteVals[Math.floor(voteVals.length * 0.33)] ?? 0;
  const v66 = voteVals[Math.floor(voteVals.length * 0.66)] ?? 0;
  const p33 = playVals[Math.floor(playVals.length * 0.33)] ?? 0;
  const p66 = playVals[Math.floor(playVals.length * 0.66)] ?? 0;

  const voteNodes = ['Low votes', 'Mid votes', 'High votes'];
  const playNodes = ['Low plays', 'Mid plays', 'High plays'];
  const nodes = [...voteNodes, ...playNodes].map((name) => ({ name }));

  const flow = new Map<string, number>();
  for (const g of games) {
    const v = tertileLabel(g.votes, v33, v66);
    const p = tertileLabel(g.totalPlays, p33, p66);
    const key = `${v}->${p}`;
    flow.set(key, (flow.get(key) ?? 0) + 1);
  }

  const vIndex = { Low: 0, Mid: 1, High: 2 };
  const pIndex = { Low: 3, Mid: 4, High: 5 };
  const links: SankeyLinkDatum[] = [];
  for (const [key, value] of flow) {
    const [v, p] = key.split('->') as ['Low' | 'Mid' | 'High', 'Low' | 'Mid' | 'High'];
    links.push({ source: vIndex[v], target: pIndex[p], value });
  }

  return { nodes, links };
}

function topBy(games: JamGame[], pick: (g: JamGame) => number): JamGame | null {
  if (games.length === 0) return null;
  return games.reduce((best, g) => (pick(g) > pick(best) ? g : best));
}

function radarMetrics(g: JamGame, games: JamGame[]): Record<string, number> {
  const votes = games.map((x) => x.votes);
  const plays = games.map((x) => x.totalPlays);
  const today = games.map((x) => x.votesToday ?? 0);
  const ranks = games.map((x) => x.rank ?? games.length);
  const vMm = minMax(votes);
  const pMm = minMax(plays);
  const tMm = minMax(today);
  const rMm = minMax(ranks);

  const ratio = g.totalPlays > 0 ? g.votes / g.totalPlays : g.votes;
  const ratios = games.map((x) => (x.totalPlays > 0 ? x.votes / x.totalPlays : x.votes));
  const ratioMm = minMax(ratios);

  const rank = g.rank ?? rMm.max;
  const utility = 1 - norm(rank, rMm.min, rMm.max);

  return {
    Attack: norm(g.votes, vMm.min, vMm.max),
    Defense: norm(g.totalPlays, pMm.min, pMm.max),
    Mobility: norm(g.votesToday ?? 0, tMm.min, tMm.max),
    Utility: utility,
    Versatility: norm(ratio, ratioMm.min, ratioMm.max),
  };
}

export function buildRadarRows(games: JamGame[]): RadarAxisRow[] {
  if (games.length === 0) return [];
  const byVotes = topBy(games, (g) => g.votes);
  const byPlays = topBy(games, (g) => g.totalPlays);
  const byToday = topBy(games, (g) => g.votesToday ?? 0);
  if (!byVotes || !byPlays || !byToday) return [];

  const axes = ['Attack', 'Defense', 'Mobility', 'Utility', 'Versatility'];
  const vM = radarMetrics(byVotes, games);
  const pM = radarMetrics(byPlays, games);
  const tM = radarMetrics(byToday, games);

  return axes.map((axis) => ({
    axis,
    byVotes: Math.round(vM[axis] * 100),
    byPlays: Math.round(pM[axis] * 100),
    byToday: Math.round(tM[axis] * 100),
  }));
}

export function buildHeatmapCells(games: JamGame[]): HeatmapCell[] {
  if (games.length === 0) return [];
  const voteVals = games.map((g) => g.votes);
  const playVals = games.map((g) => g.totalPlays);
  const cells = new Map<string, { count: number; ratioSum: number }>();

  for (const g of games) {
    const vq = quintileIndex(g.votes, voteVals);
    const pq = quintileIndex(g.totalPlays, playVals);
    const key = `${vq}-${pq}`;
    const ratio = g.totalPlays > 0 ? g.votes / g.totalPlays : g.votes;
    const prev = cells.get(key) ?? { count: 0, ratioSum: 0 };
    cells.set(key, { count: prev.count + 1, ratioSum: prev.ratioSum + ratio });
  }

  const out: HeatmapCell[] = [];
  for (let vq = 0; vq < 5; vq++) {
    for (let pq = 0; pq < 5; pq++) {
      const key = `${vq}-${pq}`;
      const cell = cells.get(key) ?? { count: 0, ratioSum: 0 };
      out.push({
        voteQ: vq,
        playQ: pq,
        count: cell.count,
        ratio: cell.count > 0 ? cell.ratioSum / cell.count : 0,
      });
    }
  }
  return out;
}

export function heatmapColor(ratio: number, count: number, maxRatio: number): string {
  if (count === 0) return 'rgba(113, 113, 122, 0.35)';
  const t = maxRatio > 0 ? Math.min(1, ratio / maxRatio) : 0.5;
  const r = Math.round(80 + t * 140);
  const b = Math.round(180 - t * 120);
  const g = Math.round(100 + (1 - Math.abs(t - 0.5) * 2) * 40);
  return `rgb(${r}, ${g}, ${b})`;
}

export function buildWaffleCells(games: JamGame[]): WaffleCell[] {
  const cells: WaffleCell[] = Array.from({ length: 100 }, () => ({
    tier: '',
    filled: false,
  }));
  if (games.length === 0) return cells;

  const tierOrder = VOTE_TIERS.map((t) => t.id);
  const buckets = new Map<string, number>();
  for (const tier of tierOrder) buckets.set(tier, 0);
  for (const g of games) {
    const id = voteTierId(g.votes);
    buckets.set(id, (buckets.get(id) ?? 0) + 1);
  }

  let idx = 0;
  for (const tier of tierOrder) {
    const share = Math.round(((buckets.get(tier) ?? 0) / games.length) * 100);
    for (let i = 0; i < share && idx < 100; i++, idx++) {
      cells[idx] = { tier, filled: true };
    }
  }
  while (idx < 100) {
    cells[idx] = { tier: 'pad', filled: false };
    idx++;
  }
  return cells;
}

export const WAFFLE_TIER_COLORS: Record<string, string> = {
  '0': '#52525b',
  '1-9': '#67e8f9',
  '10-49': '#a78bfa',
  '50-99': '#f472b6',
  '100+': '#fbbf24',
  pad: 'rgba(255,255,255,0.06)',
};
