import { useMemo, type ReactNode } from 'react';
import { runJamVoteGameUrl } from '../lib/runVoteUrl';
import { usePosterGridKeyboard } from '../lib/usePosterGridKeyboard';
import { usePosterGridScrollMotion } from '../lib/usePosterGridScrollMotion';
import { DescriptionTooltip } from './DescriptionTooltip';
import { CoverStatsRow } from './CoverStatsRow';
import { CoverVoteBadge } from './CoverVoteBadge';
import { GameThumbnail } from './GameThumbnail';

export interface PosterGridItem {
  key: string;
  gameId: string;
  title: string;
  thumbnailUrl: string;
  creatorName?: string;
  description?: string;
  totalPlays?: number;
  votes?: number;
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

function titleTextClass(title: string): string {
  const len = title.length;
  if (len > 36) return 'text-[0.95rem] leading-tight';
  if (len > 24) return 'text-[1.05rem] leading-snug';
  return 'text-[1.1rem] leading-snug';
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
  const itemKeys = useMemo(() => items.map((i) => i.key), [items]);
  const scrollRef = usePosterGridScrollMotion(itemKeys);
  const onGridKeyDown = usePosterGridKeyboard(scrollRef, items.length, items.length > 0);

  const scrollWrapClass = embedded
    ? 'poster-grid-scroll min-h-0 flex-1'
    : 'poster-grid-scroll max-h-[min(70vh,28rem)]';

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
        {items.map((item) => {
          const favorited = isFavorite?.(item.gameId) ?? false;
          const showStar = Boolean(onToggleFavorite);

          return (
            <li key={item.key} data-poster-tile className="poster-tile min-w-0">
              <div className="poster-tile-card group">
                <div className="poster-tile-poster">
                  <DescriptionTooltip
                    description={item.description ?? ''}
                    placement="overlay"
                  >
                    <button
                      type="button"
                      className="poster-tile-open"
                      onClick={() => onOpen(item)}
                    >
                      <GameThumbnail
                        key={item.gameId}
                        url={item.thumbnailUrl}
                        title={item.title}
                        className="poster-tile-thumb"
                        fit="cover"
                        loading="lazy"
                      />
                    </button>
                  </DescriptionTooltip>
                  <CoverVoteBadge
                    votes={item.votes}
                    voteUrl={runJamVoteGameUrl(jamSlug, item.gameId)}
                  />
                  <CoverStatsRow
                    gameId={item.gameId}
                    totalPlays={item.totalPlays}
                    density="compact"
                  />
                  {showStar && (
                    <button
                      type="button"
                      className={`poster-tile-star ${favorited ? 'poster-tile-star--on' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite?.(item.gameId);
                      }}
                      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {favorited ? '★' : '☆'}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="poster-tile-meta"
                  onClick={() => onOpen(item)}
                >
                  <span className={`poster-tile-title line-clamp-2 ${titleTextClass(item.title)}`}>
                    {item.title}
                  </span>
                  {item.creatorName ? (
                    <span className="poster-tile-creator line-clamp-1 text-[1.1rem] text-zinc-500">
                      {item.creatorName}
                    </span>
                  ) : null}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
