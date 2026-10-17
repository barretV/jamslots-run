import bundled from '../data/games.bundle.json';
import { bundleFromJamApi } from './jamApi';
import type { GamesBundle, JamGame } from '../types';

function isBundle(value: unknown): value is GamesBundle {
  if (!value || typeof value !== 'object') return false;
  const g = (value as GamesBundle).games;
  return Array.isArray(g) && g.length > 0;
}

async function tryFetchBundle(url: string): Promise<GamesBundle | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    return isBundle(json) ? json : null;
  } catch {
    return null;
  }
}

/** Load games: bundled JSON first, then public file, then dev proxy to RUN API. */
export async function loadGames(): Promise<GamesBundle> {
  if (isBundle(bundled)) return bundled;

  const base = import.meta.env.BASE_URL ?? '/';
  const publicPaths = [
    '/games.json',
    `${base}games.json`.replace(/([^:]\/)\/+/g, '$1'),
    new URL('games.json', window.location.href).href,
  ];

  for (const path of publicPaths) {
    const b = await tryFetchBundle(path);
    if (b) return b;
  }

  try {
    const res = await fetch('/api/run-jam');
    if (res.ok) {
      const api = (await res.json()) as { jam?: { name?: string; slug?: string }; entries?: [] };
      const b = bundleFromJamApi(api);
      if (b.games.length > 0) return b;
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
