/** Tracks which local favorites have already been counted on the global API. */

const REPORTED_KEY = 'jamslots-favorites-reported-v1';

function loadReported(): Set<string> {
  try {
    const raw = localStorage.getItem(REPORTED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0));
  } catch {
    return new Set();
  }
}

function saveReported(reported: Set<string>): void {
  try {
    localStorage.setItem(REPORTED_KEY, JSON.stringify([...reported]));
  } catch {
    /* quota or private mode */
  }
}

export function setFavoriteReported(gameId: string, favorited: boolean): void {
  const reported = loadReported();
  if (favorited) reported.add(gameId);
  else reported.delete(gameId);
  saveReported(reported);
}

/**
 * For favorites saved before global counts existed: POST +1 once per game.
 * Also repairs drift if local favorites and reported set disagree.
 */
export async function syncLocalFavoritesToServer(
  favoriteIds: string[],
  postDelta: (gameId: string, delta: 1 | -1) => Promise<void>,
): Promise<void> {
  const reported = loadReported();
  const favorites = new Set(favoriteIds);

  for (const gameId of favoriteIds) {
    if (!reported.has(gameId)) {
      await postDelta(gameId, 1);
      reported.add(gameId);
    }
  }

  for (const gameId of [...reported]) {
    if (!favorites.has(gameId)) {
      await postDelta(gameId, -1);
      reported.delete(gameId);
    }
  }

  saveReported(reported);
}
