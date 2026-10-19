const FAVS_PARAM = 'favs';

/** Build a link that opens JamSlots with a read-only favorites grid. */
export function buildShareFavoritesUrl(gameIds: string[]): string {
  const unique = [...new Set(gameIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return window.location.origin + window.location.pathname;

  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set(FAVS_PARAM, unique.join(','));
  return url.toString();
}

/** Parse `?favs=id1,id2` from the current page URL. */
export function parseShareFavoritesFromLocation(): string[] | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get(FAVS_PARAM);
  if (!raw) return null;
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length > 0 ? [...new Set(ids)] : null;
}

export function clearShareFavoritesFromLocation(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(FAVS_PARAM);
  const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '');
  window.history.replaceState({}, '', next);
}
