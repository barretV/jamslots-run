import type { ReactNode } from 'react';
import { descriptionPanelTeaser } from '../lib/descriptionTeaser';
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
  const scrollWrapClass = embedded
    ? 'poster-grid-scroll min-h-0 flex-1'
    : 'poster-grid-scroll max-h-[min(70vh,28rem)]';

  if (items.length === 0) {
    return <p className="text-[1.1rem] text-zinc-500">{emptyMessage}</p>;
  }

  return (
    <div className={`${scrollWrapClass} touch-pan-y`}>
      <ul className="poster-grid">
        {items.map((item) => {
          const favorited = isFavorite?.(item.gameId) ?? false;
          const showStar = Boolean(onToggleFavorite);
          const panelDescription = descriptionPanelTeaser(item.description ?? '');
          const hasPanelDesc = Boolean(panelDescription);

          return (
            <li key={item.key} className="poster-tile min-w-0">
              <div
                className={`poster-tile-card group ${hasPanelDesc ? 'poster-tile-card--has-desc' : ''}`}
              >
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
                  <div className="poster-meta-stack">
                    <div className="poster-meta-face poster-meta-face--info">
                      <span className={`poster-tile-title line-clamp-2 ${titleTextClass(item.title)}`}>
                        {item.title}
                      </span>
                      {item.creatorName ? (
                        <span className="poster-tile-creator line-clamp-1 text-[1.1rem] text-zinc-500">
                          {item.creatorName}
                        </span>
                      ) : null}
                    </div>
                    {hasPanelDesc ? (
                      <p className="poster-meta-face poster-meta-face--desc line-clamp-4 text-[1.05rem] leading-snug text-zinc-400">
                        {panelDescription}
                      </p>
                    ) : null}
                  </div>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
