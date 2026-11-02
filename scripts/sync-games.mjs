import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyVoteDailyTracking } from './voteDailyTracking.mjs';

const JAM_SLUG = 'octoberjam';
const API = `https://api.run.world/v1/jams/${JAM_SLUG}`;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPublic = join(root, 'public/games.json');
const outBundle = join(root, 'src/data/games.bundle.json');

const prevTotals = {};
if (existsSync(outBundle)) {
  try {
    const prev = JSON.parse(readFileSync(outBundle, 'utf8'));
    for (const g of prev.games ?? []) prevTotals[g.gameId] = g.votes ?? 0;
  } catch {
    /* ignore corrupt bundle */
  }
}

const res = await fetch(API);
if (!res.ok) {
  console.error(`Failed to fetch ${API}: ${res.status}`);
  process.exit(1);
}

const d = await res.json();
const games = [];
for (const e of d.entries ?? []) {
  if (e.format !== 'games') continue;
  games.push({
    gameId: e.gameId,
    title: e.title,
    creatorName: e.creatorName,
    description: (e.description ?? '').slice(0, 280),
    thumbnailUrl: e.thumbnailUrl ?? '',
    slug: e.slug,
    shareUrl: e.shareUrl,
    votes: e.votes ?? 0,
    totalPlays: e.totalPlays ?? 0,
    publishedAt: e.publishedAt ?? 0,
    rank: e.rank,
  });
}

const LIKE_CONCURRENCY = 8;
const LIKE_GAP_MS = 180;

/** Fill numLikes from each game's RUN record. Failures stay 0 and are logged once. */
async function attachNumLikes(games) {
  let failures = 0;
  let firstError = '';
  let cursor = 0;
  let done = 0;
  let nextSlot = 0;
  let cooldownUntil = 0;

  async function pace() {
    const now = Date.now();
    const slot = Math.max(now, nextSlot, cooldownUntil);
    nextSlot = slot + LIKE_GAP_MS;
    const wait = slot - now;
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  }

  async function readLikes(gameId, attempt = 0) {
    await pace();
    const url = `https://api.run.world/v1/games/${encodeURIComponent(gameId)}`;
    const res = await fetch(url);
    if (res.status === 429 && attempt < 5) {
      const retryAfter = Number(res.headers.get('retry-after'));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(8000, 700 * 2 ** attempt);
      cooldownUntil = Math.max(cooldownUntil, Date.now() + delay);
      return readLikes(gameId, attempt + 1);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    const n = Number(body?.numLikes);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  async function worker() {
    while (cursor < games.length) {
      const game = games[cursor++];
      try {
        game.numLikes = await readLikes(game.gameId);
      } catch (err) {
        failures += 1;
        if (!firstError) firstError = err instanceof Error ? err.message : String(err);
        game.numLikes = 0;
      }
      done += 1;
      if (done % 250 === 0 || done === games.length) {
        console.log(`numLikes ${done}/${games.length}`);
      }
    }
  }

  const workers = Math.min(LIKE_CONCURRENCY, games.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  if (failures > 0) {
    console.warn(
      `numLikes: ${failures} of ${games.length} game fetches failed; those counts defaulted to 0. First error: ${firstError}`,
    );
  }
}

await attachNumLikes(games);

const { votesDayUtc } = applyVoteDailyTracking(root, games, prevTotals);

const payload = {
  source: API,
  syncedAt: Date.now(),
  jamName: d.jam?.name ?? JAM_SLUG,
  jamSlug: d.jam?.slug ?? JAM_SLUG,
  count: games.length,
  games,
  votesDayUtc,
  votingCloseAt: Number(d.jam?.votingCloseAt ?? d.jam?.judgingEndsAt ?? 0) || undefined,
  submissionsCloseAt: Number(d.jam?.submissionsCloseAt ?? 0) || undefined,
};

const json = JSON.stringify(payload);
writeFileSync(outPublic, json);
writeFileSync(outBundle, json);
console.log(`Wrote ${games.length} games to ${outPublic} and ${outBundle} (votesDayUtc=${votesDayUtc})`);
