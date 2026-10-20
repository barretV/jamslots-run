import bundled from '../data/games.bundle.json';
import { bundleFromJamApi } from './jamApi';
import type { GamesBundle, JamGame } from '../types';

function isBundle(value: unknown): value is GamesBundle {
  if (!value || typeof value !== 'object') return false;
  const g = (value as GamesBundle).games;
  return Array.isArray(g) && g.length > 0;
}

function normalizeBundle(raw: GamesBundle): GamesBundle {
  const games: JamGame[] = raw.games.map((g) => ({
    ...g,
    thumbnailUrl: typeof g.thumbnailUrl === 'string' ? g.thumbnailUrl.trim() : '',
    votes: Number(g.votes ?? 0),
    votesToday: g.votesToday != null ? Math.max(0, Number(g.votesToday)) : undefined,
    totalPlays: Number(g.totalPlays ?? 0),
    publishedAt: Number(g.publishedAt ?? 0),
  }));
  return {
    ...raw,
    count: games.length,
    games,
    votingCloseAt: raw.votingCloseAt ? Number(raw.votingCloseAt) : undefined,
    submissionsCloseAt: raw.submissionsCloseAt ? Number(raw.submissionsCloseAt) : undefined,
    votesDayUtc: typeof raw.votesDayUtc === 'string' ? raw.votesDayUtc : undefined,
  };
}

async function tryFetchBundle(url: string): Promise<GamesBundle | null> {
  try {
    const fetchUrl = url.includes('?') ? url : `${url}?t=${Date.now()}`;
    const res = await fetch(fetchUrl, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    return isBundle(json) ? json : null;
  } catch {
    return null;
  }
}

/** Load games: public games.json first, then bundled JSON, then dev proxy to RUN API. */
export async function loadGames(): Promise<GamesBundle> {
  const base = import.meta.env.BASE_URL ?? '/';
  const publicPaths = [
    '/games.json',
    `${base}games.json`.replace(/([^:]\/)\/+/g, '$1'),
    new URL('games.json', window.location.href).href,
  ];

  for (const path of publicPaths) {
    const b = await tryFetchBundle(path);
    if (b) return normalizeBundle(b);
  }

  if (isBundle(bundled)) return normalizeBundle(bundled);

  try {
    const res = await fetch('/api/run-jam');
    if (res.ok) {
      const api = (await res.json()) as { jam?: { name?: string; slug?: string }; entries?: [] };
      const b = bundleFromJamApi(api);
      if (b.games.length > 0) return normalizeBundle(b);
    }
  } catch {
    /* proxy only in dev */
  }

  throw new Error('No game list (bundle, games.json, or API)');
}

/** Pick `count` distinct games uniformly at random. */
export function pickRandom(pool: JamGame[], count: number, excludeIds: Set<string> = new Set()): JamGame[] {
  const candidates = pool.filter((g) => !excludeIds.has(g.gameId));
  const source = candidates.length >= count ? candidates : pool;
  const bag = [...source];
  const out: JamGame[] = [];
  while (out.length < count && bag.length > 0) {
    const i = Math.floor(Math.random() * bag.length);
    out.push(bag[i]);
    bag.splice(i, 1);
  }
  return out;
}
