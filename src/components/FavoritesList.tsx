import type { JamGame } from '../types';
import { GamePosterGrid } from './GamePosterGrid';

interface FavoritesListProps {
  games: JamGame[];
  onOpen: (game: JamGame) => void;
  onToggleFavorite?: (gameId: string) => void;
  embedded?: boolean;
  jamSlug?: string;
  emptyMessage?: string;
}

export function FavoritesList({
  games,
  onOpen,
  onToggleFavorite,
  embedded = false,
  jamSlug,
  emptyMessage,
}: FavoritesListProps) {
  const shellClass = embedded
    ? 'flex min-h-0 flex-1 flex-col'
    : 'rounded-2xl border border-pink-500/25 bg-pink-950/20 p-4';

  const items = games.map((game) => ({
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

  return (
    <section
      aria-labelledby={embedded ? undefined : 'favorites-heading'}
      className={shellClass}
      role={embedded ? 'presentation' : undefined}
    >
      {!embedded && (
        <>
          <h2
            id="favorites-heading"
            className="mb-2 font-display text-[1.25rem] font-bold text-amber-200"
          >
            Favorites
          </h2>
          <p className="mb-3 text-[1.1rem] text-zinc-400">Tap a poster to open that game.</p>
        </>
      )}
      <GamePosterGrid
        items={items}
        onOpen={(item) => {
          const game = games.find((g) => g.gameId === item.gameId);
          if (game) onOpen(game);
        }}
        emptyMessage={
          emptyMessage ?? 'No favorites yet. Tap the star on a reel or in Played.'
        }
        embedded={embedded}
        jamSlug={jamSlug}
        isFavorite={() => true}
        onToggleFavorite={onToggleFavorite}
      />
    </section>
  );
}
