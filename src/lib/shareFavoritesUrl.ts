const FAVS_PARAM = 'favs';
const SHORT_PARAM = 'f';

function pageUrl(): URL {
  return new URL(window.location.href);
}

/** Long fallback link: `?favs=id1,id2` (no server). */
export function buildLongShareFavoritesUrl(gameIds: string[]): string {
  const unique = [...new Set(gameIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) {
    const url = pageUrl();
    url.search = '';
    return url.toString();
  }

  const url = pageUrl();
  url.search = '';
  url.searchParams.set(FAVS_PARAM, unique.join(','));
  return url.toString();
}

/** Short link via `/api/share-favorites`, falls back to long URL if API unavailable. */
export async function createShareFavoritesUrl(gameIds: string[]): Promise<string> {
  const unique = [...new Set(gameIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return buildLongShareFavoritesUrl([]);

  try {
    const res = await fetch('/api/share-favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameIds: unique }),
    });
    if (res.ok) {
      const data = (await res.json()) as { code?: string };
      const code = typeof data.code === 'string' ? data.code.trim() : '';
      if (code) {
        const url = pageUrl();
        url.search = '';
        url.searchParams.set(SHORT_PARAM, code);
        return url.toString();
      }
    }
  } catch {
    /* offline or dev without KV */
  }

  return buildLongShareFavoritesUrl(unique);
}

export function parseShortShareCodeFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const code = new URLSearchParams(window.location.search).get(SHORT_PARAM)?.trim() ?? '';
  if (!code || !/^[a-zA-Z0-9]{6,12}$/.test(code)) return null;
  return code;
}

/** Parse `?favs=id1,id2` from the current page URL. */
export function parseLegacyFavoritesFromLocation(): string[] | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get(FAVS_PARAM);
  if (!raw) return null;
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length > 0 ? [...new Set(ids)] : null;
}

/** @deprecated Use parseLegacyFavoritesFromLocation or short-code resolve. */
export function parseShareFavoritesFromLocation(): string[] | null {
  return parseLegacyFavoritesFromLocation();
}

export async function resolveShortShareCode(code: string): Promise<string[] | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;
  try {
    const res = await fetch(
      `/api/share-favorites?code=${encodeURIComponent(trimmed)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { gameIds?: unknown };
    if (!Array.isArray(data.gameIds)) return null;
    const ids = data.gameIds
      .filter((id): id is string => typeof id === 'string')
      .map((id) => id.trim())
      .filter(Boolean);
    return ids.length > 0 ? [...new Set(ids)] : null;
  } catch {
    return null;
  }
}

export function clearShareFavoritesFromLocation(): void {
  const url = pageUrl();
  url.searchParams.delete(FAVS_PARAM);
  url.searchParams.delete(SHORT_PARAM);
  const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '');
  window.history.replaceState({}, '', next);
}
