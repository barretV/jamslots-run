import { useEffect, useMemo, useState } from 'react';
import type { JamGame } from '../types';
import { useFavoriteCounts } from './FavoriteCountsProvider';
import { GamePosterGrid } from './GamePosterGrid';

interface LibraryListProps {
  games: JamGame[];
  onOpen: (game: JamGame) => void;
  isFavorite?: (gameId: string) => boolean;
  onToggleFavorite?: (gameId: string) => void;
  embedded?: boolean;
  jamSlug?: string;
}

type LibrarySortMode =
  | 'title-asc'
  | 'published-desc'
  | 'published-asc'
  | 'plays-desc'
  | 'plays-asc'
  | 'favorites-desc'
  | 'favorites-asc'
  | 'votes-desc'
  | 'votes-asc'
  | 'votes-over-plays-desc';

function votePlayGap(game: JamGame): number {
  return game.votes - game.totalPlays;
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

function sortLabel(mode: LibrarySortMode): string {
  switch (mode) {
    case 'title-asc':
      return 'A to Z';
    case 'published-desc':
      return 'newest first';
    case 'published-asc':
      return 'oldest first';
    case 'plays-desc':
      return 'most plays';
    case 'plays-asc':
      return 'least plays';
    case 'favorites-desc':
      return 'most favorited';
    case 'favorites-asc':
      return 'least favorited';
    case 'votes-desc':
      return 'most votes';
    case 'votes-asc':
      return 'least votes';
    case 'votes-over-plays-desc':
      return 'votes over plays (biggest gap first)';
  }
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
  }));

  const sortPhrase = sortLabel(sortMode);
  const votesOverPlaysCount = useMemo(
    () => games.filter((g) => votePlayGap(g) > 0).length,
    [games],
  );
  const hint =
    debouncedQuery.length === 0
      ? sortMode === 'votes-over-plays-desc'
        ? votesOverPlaysCount === 0
          ? 'No games have more votes than plays in the current jam list'
          : `${votesOverPlaysCount} game${votesOverPlaysCount === 1 ? '' : 's'} with more votes than plays (RUN totals), sorted ${sortPhrase}`
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
          <label className="library-search-label" htmlFor="library-sort-select">
            Sort library
          </label>
          <select
            id="library-sort-select"
            className="library-sort-select"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as LibrarySortMode)}
            aria-label="Sort library"
          >
            <option value="title-asc">A to Z</option>
            <option value="published-desc">Newest</option>
            <option value="published-asc">Oldest</option>
            <option value="plays-desc">Most plays</option>
            <option value="plays-asc">Least plays</option>
            <option value="favorites-desc">Most favorited</option>
            <option value="favorites-asc">Least favorited</option>
            <option value="votes-desc">Most votes</option>
            <option value="votes-asc">Least votes</option>
            <option value="votes-over-plays-desc">More votes than plays</option>
          </select>
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
