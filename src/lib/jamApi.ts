import type { GamesBundle, JamGame } from '../types';

/** Turn RUN jam API JSON into our GamesBundle shape. */
export function bundleFromJamApi(d: {
  jam?: { name?: string; slug?: string };
  entries?: Array<Record<string, unknown>>;
}): GamesBundle {
  const games: JamGame[] = [];
  for (const e of d.entries ?? []) {
    if (e.format !== 'games') continue;
    games.push({
      gameId: String(e.gameId),
      title: String(e.title),
      creatorName: String(e.creatorName),
      description: String(e.description ?? '').slice(0, 280),
      thumbnailUrl: String(e.thumbnailUrl ?? ''),
      slug: String(e.slug ?? ''),
      shareUrl: String(e.shareUrl ?? ''),
      votes: Number(e.votes ?? 0),
      votesToday: 0,
      totalPlays: Number(e.totalPlays ?? 0),
      publishedAt: Number(e.publishedAt ?? 0),
      rank: e.rank != null ? Number(e.rank) : undefined,
    });
  }
  return {
    source: 'https://api.run.world/v1/jams/octoberjam',
    syncedAt: Date.now(),
    jamName: d.jam?.name ?? 'October Jam',
    jamSlug: d.jam?.slug ?? 'octoberjam',
    count: games.length,
    games,
    votesDayUtc: new Date().toISOString().slice(0, 10),
  };
}
