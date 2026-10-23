import { memo } from 'react';
import { runJamVoteGameUrl } from '../lib/runVoteUrl';
import { DescriptionTooltip } from './DescriptionTooltip';
import { CoverStatsRow } from './CoverStatsRow';
import { GameThumbnail } from './GameThumbnail';
import { PosterMetaChip } from './PosterMetaChip';
import type { PosterGridItem } from './GamePosterGrid';

function titleTextClass(title: string): string {
  const len = title.length;
  if (len > 36) return 'text-[0.95rem] leading-tight';
  if (len > 24) return 'text-[1.05rem] leading-snug';
  return 'text-[1.1rem] leading-snug';
}

export interface PosterGridTileProps {
  item: PosterGridItem;
  rank: number;
  jamSlug: string;
  favorited: boolean;
  showStar: boolean;
  onOpen: (item: PosterGridItem) => void;
  onToggleFavorite?: (gameId: string) => void;
  onVotePress?: (item: PosterGridItem) => void;
}

export const PosterGridTile = memo(function PosterGridTile({
  item,
  rank,
  jamSlug,
  favorited,
  showStar,
  onOpen,
  onToggleFavorite,
  onVotePress,
}: PosterGridTileProps) {
  return (
    <li data-poster-tile className="poster-tile min-w-0">
      <div className="poster-tile-card group">
        <div className="poster-tile-poster">
          <DescriptionTooltip description={item.description ?? ''} placement="overlay">
            <button type="button" className="poster-tile-open" onClick={() => onOpen(item)}>
              <GameThumbnail
                url={item.thumbnailUrl}
                title={item.title}
                className="poster-tile-thumb"
                fit="cover"
                loading="eager"
              />
            </button>
          </DescriptionTooltip>
          <PosterMetaChip
            rank={rank}
            votes={item.votes}
            votesToday={item.votesToday}
            voteUrl={runJamVoteGameUrl(jamSlug, item.gameId)}
            favorited={favorited}
            showFavorite={showStar}
            onToggleFavorite={() => onToggleFavorite?.(item.gameId)}
            onVotePress={onVotePress ? () => onVotePress(item) : undefined}
          />
          <CoverStatsRow gameId={item.gameId} totalPlays={item.totalPlays} density="compact" />
        </div>
        <button type="button" className="poster-tile-meta" onClick={() => onOpen(item)}>
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
});
