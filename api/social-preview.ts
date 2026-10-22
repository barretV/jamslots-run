import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

const KEY_PREFIX = 'jamslots:share:';
const SITE_FALLBACK = 'https://jamslots-run.vercel.app';

function kvReady(): boolean {
  const kvRest = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  const upstash = Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
  return kvRest || upstash;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  }
  if (raw && typeof raw === 'object' && Array.isArray((raw as { gameIds?: unknown }).gameIds)) {
    return normalizeIds((raw as { gameIds: unknown }).gameIds);
  }
  return [];
}

function parseIdsFromKvPayload(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const ids = normalizeIds(parsed);
    return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  } catch {
    return [];
  }
}

function parseIdsFromFavsParam(raw: string): string[] {
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(ids)];
}

async function resolveShareIds(url: URL): Promise<string[]> {
  const code = url.searchParams.get('f')?.trim() ?? '';
  if (code && /^[a-zA-Z0-9]{6,12}$/.test(code) && kvReady()) {
    const raw = await kv.get<string>(KEY_PREFIX + code);
    if (raw) {
      const ids = parseIdsFromKvPayload(raw);
      if (ids.length > 0) return ids;
    }
  }

  const favs = url.searchParams.get('favs')?.trim() ?? '';
  if (favs) return parseIdsFromFavsParam(favs);

  return [];
}

async function loadTitleMap(origin: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const res = await fetch(`${origin}/games.json`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return map;
    const data = (await res.json()) as { games?: { gameId?: string; title?: string }[] };
    for (const game of data.games ?? []) {
      if (typeof game.gameId === 'string' && typeof game.title === 'string') {
        map.set(game.gameId, game.title);
      }
    }
  } catch {
    /* ignore */
  }
  return map;
}

function buildDescription(ids: string[], titles: Map<string, string>): string {
  if (ids.length === 0) {
    return 'Open JamSlots to browse October Jam games on RUN.';
  }
  const names = ids
    .map((id) => titles.get(id))
    .filter((t): t is string => Boolean(t))
    .slice(0, 4);
  if (names.length === 0) {
    return `${ids.length} jam game${ids.length === 1 ? '' : 's'} shared on JamSlots. Tap to browse posters and play on RUN.`;
  }
  const lead = names.join(', ');
  const rest = ids.length - names.length;
  if (rest > 0) {
    return `${lead}, and ${rest} more. Open JamSlots to play on RUN.`;
  }
  return `${lead}. Open JamSlots to play on RUN.`;
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const origin = url.origin || SITE_FALLBACK;
  const pageUrl = new URL(url.search, `${origin}/`);

  const ids = await resolveShareIds(url);
  const titles = await loadTitleMap(origin);
  const count = ids.length;

  let jamGameCount = 0;
  try {
    const res = await fetch(`${origin}/games.json`, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = (await res.json()) as { count?: number; games?: unknown[] };
      jamGameCount = Number(data.count ?? data.games?.length ?? 0) || 0;
    }
  } catch {
    /* ignore */
  }

  const ogTitle =
    count > 0
      ? `${count} jam favorite${count === 1 ? '' : 's'} · JamSlots`
      : jamGameCount > 0
        ? `JamSlots · ${jamGameCount.toLocaleString()} October Jam games`
        : 'JamSlots · RUN.world October Jam picker';

  const ogDescription =
    count > 0
      ? buildDescription(ids, titles)
      : jamGameCount > 0
        ? `Spin the reels through ${jamGameCount.toLocaleString()} games, star favorites, and jump into the October Jam on RUN.`
        : 'Spin the reels, star your favorites, and jump into October Jam games on RUN.';

  const ogImage = new URL('/api/og-image', origin);
  if (count > 0) ogImage.searchParams.set('count', String(count));
  else if (jamGameCount > 0) ogImage.searchParams.set('games', String(jamGameCount));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(ogTitle)}</title>
  <meta name="description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="JamSlots" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl.toString())}" />
  <meta property="og:image" content="${escapeHtml(ogImage.toString())}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage.toString())}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(pageUrl.toString())}" />
</head>
<body>
  <p><a href="${escapeHtml(pageUrl.toString())}">Open JamSlots</a></p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
