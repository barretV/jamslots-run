import type { ReactNode } from 'react';
import { DescriptionTooltip } from './DescriptionTooltip';
import { GameThumbnail } from './GameThumbnail';

export interface PosterGridItem {
  key: string;
  gameId: string;
  title: string;
  thumbnailUrl: string;
  creatorName?: string;
  description?: string;
}

interface GamePosterGridProps {
  items: PosterGridItem[];
  onOpen: (item: PosterGridItem) => void;
  emptyMessage: ReactNode;
  embedded?: boolean;
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
  isFavorite,
  onToggleFavorite,
}: GamePosterGridProps) {
  const scrollClass = embedded
    ? 'poster-grid-scroll min-h-0 flex-1'
    : 'poster-grid-scroll max-h-[min(70vh,28rem)]';

  if (items.length === 0) {
    return <p className="text-[1.1rem] text-zinc-500">{emptyMessage}</p>;
  }

  return (
    <ul className={`poster-grid ${scrollClass} touch-pan-y`}>
      {items.map((item) => {
        const favorited = isFavorite?.(item.gameId) ?? false;
        const showStar = Boolean(onToggleFavorite);

        return (
          <li key={item.key} className="poster-tile min-w-0">
            <DescriptionTooltip
              description={item.description ?? ''}
              placement="above"
              disabled={!item.description?.trim()}
            >
              <div className="poster-tile-card group">
                <div className="poster-tile-poster">
                  <button
                    type="button"
                    className="poster-tile-open"
                    onClick={() => onOpen(item)}
                  >
                    <GameThumbnail
                      url={item.thumbnailUrl}
                      title={item.title}
                      className="poster-tile-thumb"
                      fit="cover"
                    />
                  </button>
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
            </DescriptionTooltip>
          </li>
        );
      })}
    </ul>
  );
}
