import { jamPoolSignature } from '../lib/jamPoolSignature';
import type { HistoryEntry, PickerStats } from '../types';

const STORAGE_KEY = 'october-jam-gamepicker-v1';
const JAM_POOL_SIG_KEY = 'jamslots-applied-pool-signature';
const HISTORY_MAX = 40;

const DEFAULTS: PickerStats = {
  playCounts: {},
  favorites: [],
  history: [],
  rollSeenIds: [],
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
      rollSeenIds: Array.isArray(parsed.rollSeenIds) ? parsed.rollSeenIds : [],
      seenGameIds: Array.isArray(parsed.seenGameIds) ? parsed.seenGameIds : undefined,
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

/**
 * Align local favorites, played history, and play counts with the deployed jam list.
 */
export function syncLocalSessionWithJamBundle(
  games: { gameId: string }[],
  syncedAt: number,
): boolean {
  const ids = games.map((g) => g.gameId);
  const signature = jamPoolSignature(syncedAt, ids);
  let prevSig: string | null = null;
  try {
    prevSig = localStorage.getItem(JAM_POOL_SIG_KEY);
  } catch {
    /* private mode */
  }
  const pruned = pruneStatsToJamPool(new Set(ids));
  const signatureChanged = prevSig !== signature;
  if (signatureChanged) {
    try {
      localStorage.setItem(JAM_POOL_SIG_KEY, signature);
    } catch {
      /* private mode */
    }
  }
  return pruned || signatureChanged;
}

/** Drop local stars/plays/history for games no longer in the synced jam list. */
export function getRollSeenIds(): Set<string> {
  return new Set(cache.rollSeenIds ?? []);
}

export function noteRollExposure(gameIds: string[]): void {
  if (gameIds.length === 0) return;
  const set = new Set(cache.rollSeenIds ?? []);
  for (const id of gameIds) {
    if (id) set.add(id);
  }
  cache = { ...cache, rollSeenIds: [...set] };
  flush();
}

export function resetRollSeenIds(): void {
  if (!cache.rollSeenIds?.length) return;
  cache = { ...cache, rollSeenIds: [] };
  flush();
}

export function pruneStatsToJamPool(validGameIds: ReadonlySet<string>): boolean {
  const favorites = cache.favorites.filter((id) => validGameIds.has(id));
  const history = cache.history.filter((h) => validGameIds.has(h.gameId));
  const rollSeenIds = (cache.rollSeenIds ?? []).filter((id) => validGameIds.has(id));
  const seenGameIds = cache.seenGameIds?.filter((id) => validGameIds.has(id));
  const playCounts: Record<string, number> = {};
  for (const [id, n] of Object.entries(cache.playCounts)) {
    if (validGameIds.has(id)) playCounts[id] = n;
  }
  const changed =
    favorites.length !== cache.favorites.length ||
    history.length !== cache.history.length ||
    rollSeenIds.length !== (cache.rollSeenIds ?? []).length ||
    Object.keys(playCounts).length !== Object.keys(cache.playCounts).length ||
    (cache.seenGameIds != null && seenGameIds != null && seenGameIds.length !== cache.seenGameIds.length);
  if (!changed) return false;
  cache = {
    ...cache,
    favorites,
    history,
    playCounts,
    rollSeenIds,
    ...(cache.seenGameIds != null && seenGameIds != null ? { seenGameIds } : {}),
  };
  flush();
  return true;
}

/** Ids that are new for this page load. Null until the visit is recorded. */
let sessionNewIds: Set<string> | null = null;

/**
 * Compare the current jam ids with the set saved on the previous visit.
 * First visit (no saved set) marks nothing new and stores the current ids.
 * Later visits keep the newcomers green in memory, then store the current ids
 * so the same games are not new on the next visit.
 */
export function noteSeenGames(currentIds: string[]): Set<string> {
  if (sessionNewIds) return sessionNewIds;
  const ids = currentIds.filter((id) => id.length > 0);
  if (ids.length === 0) return new Set();
  const stored = cache.seenGameIds;
  if (!stored) sessionNewIds = new Set();
  else {
    const prev = new Set(stored);
    sessionNewIds = new Set(ids.filter((id) => !prev.has(id)));
  }
  cache = { ...cache, seenGameIds: ids };
  flush();
  const w = window as typeof window & { __visitNewIds?: string[] };
  w.__visitNewIds = [...sessionNewIds];
  return sessionNewIds;
}

export function isNewThisVisit(gameId: string): boolean {
  return sessionNewIds?.has(gameId) ?? false;
}

export type { HistoryEntry };
