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
    thumbnailUrl: e.thumbnailUrl,
    slug: e.slug,
    shareUrl: e.shareUrl,
    votes: e.votes ?? 0,
    totalPlays: e.totalPlays ?? 0,
    publishedAt: e.publishedAt ?? 0,
    rank: e.rank,
  });
}

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
