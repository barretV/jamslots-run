import { useVirtualizer } from '@tanstack/react-virtual';
import { useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
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

function minColumnWidth(viewportWidth: number): number {
  if (viewportWidth >= 1024) return 128;
  if (viewportWidth >= 640) return 112;
  return 118;
}

function columnGapPx(viewportWidth: number): number {
  if (viewportWidth >= 1024) return 8.8;
  if (viewportWidth >= 640) return 8;
  return 7.2;
}

function rowGapPx(viewportWidth: number): number {
  if (viewportWidth >= 1024) return 10.4;
  if (viewportWidth >= 640) return 8.8;
  return 8;
}

function columnCount(viewportWidth: number): number {
  const minCol = minColumnWidth(viewportWidth);
  const gap = columnGapPx(viewportWidth);
  return Math.max(1, Math.floor((viewportWidth + gap) / (minCol + gap)));
}

function estimateRowHeight(viewportWidth: number, cols: number): number {
  const gap = columnGapPx(viewportWidth);
  const cellW = (viewportWidth - gap * (cols - 1)) / cols;
  const posterH = cellW * 1.5;
  const metaH = 52;
  return posterH + metaH + rowGapPx(viewportWidth);
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
  const [viewportWidth, setViewportWidth] = useState(360);
  const colCount = columnCount(viewportWidth);
  const rowCount = Math.ceil(items.length / colCount) || 0;
  const rowHeightEstimate = estimateRowHeight(viewportWidth, colCount);

  const scrollMotionKey = useMemo(
    () => `${items.length}:${colCount}`,
    [items.length, colCount],
  );
  const scrollRef = usePosterGridScrollMotion(scrollMotionKey);
  const onGridKeyDown = usePosterGridKeyboard(scrollRef, items.length, items.length > 0);

  useLayoutEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const measure = () => {
      setViewportWidth(root.clientWidth || 360);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [scrollRef]);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeightEstimate,
    overscan: 3,
  });

  const scrollWrapClass = embedded
    ? 'poster-grid-scroll min-h-0 flex-1'
    : 'poster-grid-scroll max-h-[min(70vh,28rem)]';

  const showStar = Boolean(onToggleFavorite);

  if (items.length === 0) {
    return <p className="text-[1.1rem] text-zinc-500">{emptyMessage}</p>;
  }

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div
      ref={scrollRef}
      className={`${scrollWrapClass} touch-pan-y poster-grid-keyboard`}
      onKeyDown={onGridKeyDown}
    >
      <div
        className="poster-grid-virtual-spacer"
        style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}
      >
        {virtualRows.map((virtualRow) => {
          const rowIndex = virtualRow.index;
          const rowStart = rowIndex * colCount;
          return (
            <ul
              key={virtualRow.key}
              className="poster-grid poster-grid-virtual-row"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: colCount }, (_, col) => {
                const itemIndex = rowStart + col;
                if (itemIndex >= items.length) return null;
                const item = items[itemIndex];
                return (
                  <PosterGridTile
                    key={item.key}
                    item={item}
                    jamSlug={jamSlug}
                    favorited={isFavorite?.(item.gameId) ?? false}
                    showStar={showStar}
                    onOpen={onOpen}
                    onToggleFavorite={onToggleFavorite}
                  />
                );
              })}
            </ul>
          );
        })}
      </div>
    </div>
  );
}
