import type { ReactNode } from 'react';
import { usePosterGridKeyboard } from '../lib/usePosterGridKeyboard';
import { usePosterGridScrollMotion } from '../lib/usePosterGridScrollMotion';
import { PosterGridTile } from './PosterGridTile';
import { useOpenVoteStats } from './VoteStatsProvider';

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
  onVotePress?: (item: PosterGridItem) => void;
}

export function GamePosterGrid({
  items,
  onOpen,
  emptyMessage,
  embedded = false,
  jamSlug = 'octoberjam',
  isFavorite,
  onToggleFavorite,
  onVotePress,
}: GamePosterGridProps) {
  const openVoteStats = useOpenVoteStats();
  const scrollRef = usePosterGridScrollMotion();
  const onGridKeyDown = usePosterGridKeyboard(scrollRef, items.length, items.length > 0);

  const handleVotePress =
    onVotePress ??
    ((item: PosterGridItem) => {
      openVoteStats({
        gameId: item.gameId,
        title: item.title,
        votes: item.votes,
      });
    });

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
        {items.map((item, index) => (
          <PosterGridTile
            key={item.key}
            item={item}
            rank={index + 1}
            jamSlug={jamSlug}
            favorited={isFavorite?.(item.gameId) ?? false}
            showStar={showStar}
            onOpen={onOpen}
            onToggleFavorite={onToggleFavorite}
            onVotePress={handleVotePress}
          />
        ))}
      </ul>
    </div>
  );
}
