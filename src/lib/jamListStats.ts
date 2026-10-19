const STORAGE_KEY = 'jamslots-last-seen-game-count';

export function readLastSeenGameCount(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
  } catch {
    return null;
  }
}

export function writeLastSeenGameCount(count: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.max(0, Math.floor(count))));
  } catch {
    /* private mode */
  }
}
