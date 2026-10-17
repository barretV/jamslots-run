import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const JAM_SLUG = 'octoberjam';
const API = `https://api.run.world/v1/jams/${JAM_SLUG}`;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPublic = join(root, 'public/games.json');
const outBundle = join(root, 'src/data/games.bundle.json');

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

const payload = {
  source: API,
  syncedAt: Date.now(),
  jamName: d.jam?.name ?? JAM_SLUG,
  jamSlug: d.jam?.slug ?? JAM_SLUG,
  count: games.length,
  games,
};

const json = JSON.stringify(payload);
writeFileSync(outPublic, json);
writeFileSync(outBundle, json);
console.log(`Wrote ${games.length} games to ${outPublic} and ${outBundle}`);
