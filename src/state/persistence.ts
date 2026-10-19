import type { HistoryEntry, PickerStats } from '../types';

const STORAGE_KEY = 'october-jam-gamepicker-v1';
const HISTORY_MAX = 40;

const DEFAULTS: PickerStats = {
  playCounts: {},
  favorites: [],
  history: [],
};

function loadRaw(): PickerStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<PickerStats>;
    return {
      playCounts: parsed.playCounts ?? {},
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return { ...DEFAULTS };
  }
}

let cache = loadRaw();

function flush(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* quota or private mode */
  }
}

export function getStats(): PickerStats {
  return cache;
}

export function recordPlay(gameId: string, title: string, shareUrl: string): void {
  cache = {
    ...cache,
    playCounts: {
      ...cache.playCounts,
      [gameId]: (cache.playCounts[gameId] ?? 0) + 1,
    },
    history: [
      { gameId, title, shareUrl, playedAt: Date.now() },
      ...cache.history.filter((h) => h.gameId !== gameId),
    ].slice(0, HISTORY_MAX),
  };
  flush();
}

export function toggleFavorite(gameId: string): boolean {
  const set = new Set(cache.favorites);
  if (set.has(gameId)) set.delete(gameId);
  else set.add(gameId);
  cache = { ...cache, favorites: [...set] };
  flush();
  return set.has(gameId);
}

export function isFavorite(gameId: string): boolean {
  return cache.favorites.includes(gameId);
}

export function totalPlays(): number {
  return Object.values(cache.playCounts).reduce((a, b) => a + b, 0);
}

export function clearHistory(): void {
  cache = { ...cache, history: [] };
  flush();
}

/** Drop local stars/plays/history for games no longer in the synced jam list. */
export function pruneStatsToJamPool(validGameIds: ReadonlySet<string>): boolean {
  const favorites = cache.favorites.filter((id) => validGameIds.has(id));
  const history = cache.history.filter((h) => validGameIds.has(h.gameId));
  const playCounts: Record<string, number> = {};
  for (const [id, n] of Object.entries(cache.playCounts)) {
    if (validGameIds.has(id)) playCounts[id] = n;
  }
  const changed =
    favorites.length !== cache.favorites.length ||
    history.length !== cache.history.length ||
    Object.keys(playCounts).length !== Object.keys(cache.playCounts).length;
  if (!changed) return false;
  cache = { ...cache, favorites, history, playCounts };
  flush();
  return true;
}

export type { HistoryEntry };
