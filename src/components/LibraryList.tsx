import { useEffect, useMemo, useState } from 'react';
import type { JamGame } from '../types';
import { GamePosterGrid } from './GamePosterGrid';

interface LibraryListProps {
  games: JamGame[];
  onOpen: (game: JamGame) => void;
  isFavorite?: (gameId: string) => boolean;
  onToggleFavorite?: (gameId: string) => void;
  embedded?: boolean;
}

function matchesQuery(game: JamGame, query: string): boolean {
  const q = query.toLowerCase();
  if (game.title.toLowerCase().includes(q)) return true;
  if (game.creatorName.toLowerCase().includes(q)) return true;
  if (game.description.toLowerCase().includes(q)) return true;
  return false;
}

export function LibraryList({
  games,
  onOpen,
  isFavorite,
  onToggleFavorite,
  embedded = false,
}: LibraryListProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => window.clearTimeout(id);
  }, [query]);

  const sortedGames = useMemo(
    () => [...games].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })),
    [games],
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
  }));

  const hint =
    debouncedQuery.length === 0
      ? `All ${games.length} games, A to Z`
      : visibleGames.length === 0
        ? 'No matches'
        : `${visibleGames.length} match${visibleGames.length === 1 ? '' : 'es'}`;

  return (
    <section className={shellClass} role={embedded ? 'presentation' : undefined}>
      <div className="library-search-bar shrink-0">
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
            : 'No games in this jam yet.'
        }
        embedded={embedded}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
      />
    </section>
  );
}
