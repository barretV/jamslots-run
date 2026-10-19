import type { ReactNode } from 'react';
import { usePosterGridKeyboard } from '../lib/usePosterGridKeyboard';
import { usePosterGridScrollMotion } from '../lib/usePosterGridScrollMotion';
import { PosterGridTile } from './PosterGridTile';

export interface PosterGridItem {
  key: string;
  gameId: string;
  title: string;
  thumbnailUrl: string;
  creatorName?: string;
  description?: string;
  totalPlays?: number;
  votes?: number;
  votesToday?: number;
}

interface GamePosterGridProps {
  items: PosterGridItem[];
  onOpen: (item: PosterGridItem) => void;
  emptyMessage: ReactNode;
  embedded?: boolean;
  jamSlug?: string;
  isFavorite?: (gameId: string) => boolean;
  onToggleFavorite?: (gameId: string) => void;
}

export function GamePosterGrid({
  items,
  onOpen,
  emptyMessage,
  embedded = false,
  jamSlug = 'octoberjam',
  isFavorite,
  onToggleFavorite,
}: GamePosterGridProps) {
  const scrollRef = usePosterGridScrollMotion();
  const onGridKeyDown = usePosterGridKeyboard(scrollRef, items.length, items.length > 0);

  const scrollWrapClass = embedded
    ? 'poster-grid-scroll min-h-0 flex-1'
    : 'poster-grid-scroll max-h-[min(70vh,28rem)]';

  const showStar = Boolean(onToggleFavorite);

  if (items.length === 0) {
    return <p className="text-[1.1rem] text-zinc-500">{emptyMessage}</p>;
  }

  return (
    <div
      ref={scrollRef}
      className={`${scrollWrapClass} touch-pan-y poster-grid-keyboard`}
      onKeyDown={onGridKeyDown}
    >
      <ul className="poster-grid">
        {items.map((item) => (
          <PosterGridTile
            key={item.key}
            item={item}
            jamSlug={jamSlug}
            favorited={isFavorite?.(item.gameId) ?? false}
            showStar={showStar}
            onOpen={onOpen}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </ul>
    </div>
  );
}
