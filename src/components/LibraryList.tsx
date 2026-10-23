import { useEffect, useMemo, useState } from 'react';
import type { JamGame } from '../types';
import { useFavoriteCounts } from './FavoriteCountsProvider';
import { GamePosterGrid } from './GamePosterGrid';
import { LibrarySortSelect, sortHintPhrase, type LibrarySortMode } from './LibrarySortSelect';

interface LibraryListProps {
  games: JamGame[];
  onOpen: (game: JamGame) => void;
  isFavorite?: (gameId: string) => boolean;
  onToggleFavorite?: (gameId: string) => void;
  embedded?: boolean;
  jamSlug?: string;
}

function votePlayGap(game: JamGame): number {
  return game.votes - game.totalPlays;
}

function playVoteGap(game: JamGame): number {
  return game.totalPlays - game.votes;
}

function matchesQuery(game: JamGame, query: string): boolean {
  const q = query.toLowerCase();
  if (game.title.toLowerCase().includes(q)) return true;
  if (game.creatorName.toLowerCase().includes(q)) return true;
  if (game.description.toLowerCase().includes(q)) return true;
  return false;
}

function compareByTitle(a: JamGame, b: JamGame): number {
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

function sortGames(
  games: JamGame[],
  mode: LibrarySortMode,
  favoriteCount: (gameId: string) => number,
): JamGame[] {
  let list = [...games];
  if (mode === 'votes-over-plays-desc') {
    list = list.filter((g) => votePlayGap(g) > 0);
    list.sort((a, b) => {
      const gapDiff = votePlayGap(b) - votePlayGap(a);
      if (gapDiff !== 0) return gapDiff;
      const voteDiff = b.votes - a.votes;
      if (voteDiff !== 0) return voteDiff;
      return compareByTitle(a, b);
    });
    return list;
  }
  if (mode === 'plays-over-votes-desc') {
    list = list.filter((g) => playVoteGap(g) > 0);
    list.sort((a, b) => {
      const gapDiff = playVoteGap(b) - playVoteGap(a);
      if (gapDiff !== 0) return gapDiff;
      const playsDiff = b.totalPlays - a.totalPlays;
      if (playsDiff !== 0) return playsDiff;
      const voteDiff = a.votes - b.votes;
      if (voteDiff !== 0) return voteDiff;
      return compareByTitle(a, b);
    });
    return list;
  }
  if (mode === 'votes-today-desc') {
    list = list.filter((g) => (g.votesToday ?? 0) > 0);
    list.sort((a, b) => {
      const todayDiff = (b.votesToday ?? 0) - (a.votesToday ?? 0);
      if (todayDiff !== 0) return todayDiff;
      const voteDiff = b.votes - a.votes;
      if (voteDiff !== 0) return voteDiff;
      return compareByTitle(a, b);
    });
    return list;
  }
  if (mode === 'title-asc') {
    list.sort(compareByTitle);
    return list;
  }
  list.sort((a, b) => {
    if (mode === 'published-desc' || mode === 'published-asc') {
      const pubDiff =
        mode === 'published-desc' ? b.publishedAt - a.publishedAt : a.publishedAt - b.publishedAt;
      if (pubDiff !== 0) return pubDiff;
      return compareByTitle(a, b);
    }
    if (mode === 'favorites-desc' || mode === 'favorites-asc') {
      const favDiff =
        mode === 'favorites-desc'
          ? favoriteCount(b.gameId) - favoriteCount(a.gameId)
          : favoriteCount(a.gameId) - favoriteCount(b.gameId);
      if (favDiff !== 0) return favDiff;
      return compareByTitle(a, b);
    }
    if (mode === 'votes-desc' || mode === 'votes-asc') {
      const voteDiff = mode === 'votes-desc' ? b.votes - a.votes : a.votes - b.votes;
      if (voteDiff !== 0) return voteDiff;
      return compareByTitle(a, b);
    }
    const playsDiff =
      mode === 'plays-desc' ? b.totalPlays - a.totalPlays : a.totalPlays - b.totalPlays;
    if (playsDiff !== 0) return playsDiff;
    return compareByTitle(a, b);
  });
  return list;
}

export function LibraryList({
  games,
  onOpen,
  isFavorite,
  onToggleFavorite,
  embedded = false,
  jamSlug,
}: LibraryListProps) {
  const { getCount } = useFavoriteCounts();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortMode, setSortMode] = useState<LibrarySortMode>('title-asc');
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => window.clearTimeout(id);
  }, [query]);

  const sortedGames = useMemo(
    () => sortGames(games, sortMode, getCount),
    [games, sortMode, getCount],
  );

  const visibleGames = useMemo(() => {
    if (!debouncedQuery) return sortedGames;
    return sortedGames.filter((g) => matchesQuery(g, debouncedQuery));
  }, [sortedGames, debouncedQuery]);

  const shellClass = embedded
    ? 'flex min-h-0 flex-1 flex-col'
    : 'rounded-2xl border border-violet-500/25 bg-violet-950/20 p-4';

  const items = visibleGames.map((game) => ({
    key: game.gameId,
    gameId: game.gameId,
    title: game.title,
    thumbnailUrl: game.thumbnailUrl,
    creatorName: game.creatorName,
    description: game.description,
    totalPlays: game.totalPlays,
    votes: game.votes,
    votesToday: game.votesToday,
  }));

  const sortPhrase = sortHintPhrase(sortMode);
  const votesOverPlaysCount = useMemo(
    () => games.filter((g) => votePlayGap(g) > 0).length,
    [games],
  );
  const playsOverVotesCount = useMemo(
    () => games.filter((g) => playVoteGap(g) > 0).length,
    [games],
  );
  const newVotesTodayCount = useMemo(
    () => games.filter((g) => (g.votesToday ?? 0) > 0).length,
    [games],
  );
  const hint =
    debouncedQuery.length === 0
      ? sortMode === 'votes-over-plays-desc'
        ? votesOverPlaysCount === 0
          ? 'No games have more votes than plays in the current jam list'
          : `${votesOverPlaysCount} game${votesOverPlaysCount === 1 ? '' : 's'} with more votes than plays (RUN totals), sorted ${sortPhrase}`
        : sortMode === 'plays-over-votes-desc'
          ? playsOverVotesCount === 0
            ? 'No games have more plays than votes in the current jam list'
            : `${playsOverVotesCount} game${playsOverVotesCount === 1 ? '' : 's'} with more plays than votes (RUN totals), sorted ${sortPhrase}`
          : sortMode === 'votes-today-desc'
            ? newVotesTodayCount === 0
              ? 'No new votes yet today (UTC). Counts reset at midnight UTC.'
              : `${newVotesTodayCount} game${newVotesTodayCount === 1 ? '' : 's'} with new votes today (UTC), sorted ${sortPhrase}`
          : `All ${games.length} games, sorted ${sortPhrase}`
      : visibleGames.length === 0
        ? 'No matches'
        : `${visibleGames.length} match${visibleGames.length === 1 ? '' : 'es'}, sorted ${sortPhrase}`;

  return (
    <section className={shellClass} role={embedded ? 'presentation' : undefined}>
      <div className="library-toolbar shrink-0">
        <div className="library-toolbar-row">
          <label className="library-search-label" htmlFor="library-search-input">
            Search library
          </label>
          <input
            id="library-search-input"
            type="search"
            className="library-search-input"
            placeholder="Search games or creators…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
          <span className="library-search-label">Sort library</span>
          <LibrarySortSelect value={sortMode} onChange={setSortMode} />
        </div>
        <p className="library-search-hint" aria-live="polite">{hint}</p>
      </div>
      <GamePosterGrid
        items={items}
        onOpen={(item) => {
          const game = games.find((g) => g.gameId === item.gameId);
          if (game) onOpen(game);
        }}
        emptyMessage={
          debouncedQuery
            ? 'No games match your search. Try another title or creator.'
            : sortMode === 'votes-over-plays-desc'
              ? 'No games in this list have more votes than plays.'
              : sortMode === 'plays-over-votes-desc'
                ? 'No games in this list have more plays than votes.'
                : sortMode === 'votes-today-desc'
                  ? 'No games have new votes today yet (UTC).'
                  : 'No games in this jam yet.'
        }
        embedded={embedded}
        jamSlug={jamSlug}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
      />
    </section>
  );
}
